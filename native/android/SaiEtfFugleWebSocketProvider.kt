package com.tfasset.app.saietf
import com.tfasset.app.TfAssetMarketFlowDiagnostics

import java.time.Instant
import java.time.ZoneId
import java.util.Locale
import java.util.concurrent.Executors
import java.util.concurrent.ScheduledFuture
import java.util.concurrent.TimeUnit
import kotlin.math.min
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.booleanOrNull
import kotlinx.serialization.json.buildJsonArray
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.doubleOrNull
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.longOrNull
import kotlinx.serialization.json.put
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import okhttp3.WebSocket
import okhttp3.WebSocketListener
import tw.saietf.core.market.MarketDataProvider
import tw.saietf.core.market.MarketEvent
import tw.saietf.core.market.MarketProviderCapability
import tw.saietf.core.market.MarketQuote
import tw.saietf.core.market.MarketSource
import tw.saietf.core.market.ProviderAvailability
import tw.saietf.core.market.ProviderCircuitState
import tw.saietf.core.market.ProviderHealth
import tw.saietf.core.market.QuoteQuality

internal interface FugleSocket {
    fun send(text: String): Boolean
    fun close(code: Int, reason: String): Boolean
    fun cancel()
}

internal interface FugleSocketListener {
    fun onOpen(socket: FugleSocket)
    fun onText(socket: FugleSocket, text: String)
    fun onClosed(socket: FugleSocket, code: Int, reason: String)
    fun onFailure(socket: FugleSocket, error: Throwable)
}

internal interface FugleSocketTransport {
    fun connect(url: String, listener: FugleSocketListener): FugleSocket
}

internal class OkHttpFugleSocketTransport(
    private val client: OkHttpClient = OkHttpClient.Builder()
        .pingInterval(25L, TimeUnit.SECONDS)
        .build(),
) : FugleSocketTransport {
    override fun connect(url: String, listener: FugleSocketListener): FugleSocket {
        val wrapper = OkHttpFugleSocket()
        val request = Request.Builder().url(url).build()
        val socket = client.newWebSocket(
            request,
            object : WebSocketListener() {
                override fun onOpen(webSocket: WebSocket, response: Response) {
                    listener.onOpen(wrapper)
                }

                override fun onMessage(webSocket: WebSocket, text: String) {
                    listener.onText(wrapper, text)
                }

                override fun onClosed(webSocket: WebSocket, code: Int, reason: String) {
                    listener.onClosed(wrapper, code, reason)
                }

                override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
                    listener.onFailure(wrapper, t)
                }
            },
        )
        // Bind after newWebSocket returns. The callback always sees a valid
        // wrapper even if OkHttp opens immediately on another thread.
        wrapper.bind(socket)
        return wrapper
    }

    private class OkHttpFugleSocket : FugleSocket {
        @Volatile private var delegate: WebSocket? = null

        fun bind(socket: WebSocket) { delegate = socket }

        override fun send(text: String): Boolean = delegate?.send(text) ?: false

        override fun close(code: Int, reason: String): Boolean =
            delegate?.close(code, reason) ?: false

        override fun cancel() { delegate?.cancel() }
    }
}

internal class FugleWebSocketProvider(
    private val apiKeyProvider: () -> String?,
    private val transport: FugleSocketTransport = OkHttpFugleSocketTransport(),
    private val clockMillis: () -> Long = System::currentTimeMillis,
    // TF Asset consumes Fugle trades directly on the native socket callback;
    // the diagnostic event buffer is not allowed to gate LIVE valuation.
    private val onTrade: (MarketQuote) -> Unit = {},
    private val onHealth: (ProviderHealth) -> Unit = {},
) : MarketDataProvider {
    override val source: MarketSource = MarketSource.FUGLE
    override val capabilities: Set<MarketProviderCapability> =
        setOf(MarketProviderCapability.STREAM)

    private val json = Json {
        ignoreUnknownKeys = true
        isLenient = true
        explicitNulls = false
    }
    private val taipeiZone = ZoneId.of("Asia/Taipei")
    private val lock = Any()
    private val _events = MutableSharedFlow<MarketEvent>(extraBufferCapacity = 512)
    override val events: Flow<MarketEvent> = _events.asSharedFlow()

    private val desiredSymbols = linkedSetOf<String>()
    private val activeChannelIds = linkedMapOf<String, String>()
    private val pendingSubscribeSymbols = linkedSetOf<String>()
    private val pendingUnsubscribeIds = linkedSetOf<String>()
    private val latestQuotes = linkedMapOf<String, MarketQuote>()
    // Learned only from a server rejection. Never assume a user's account tier.
    private var subscriptionCapacity: Int? = null
    private var serialAdmission = false
    private fun admittedSymbols(): Set<String> = desiredSymbols.take(subscriptionCapacity ?: desiredSymbols.size).toSet()
    fun subscriptionLimitedSymbols(): Set<String> = synchronized(lock) { desiredSymbols - admittedSymbols() }


    private val scheduler = Executors.newSingleThreadScheduledExecutor { runnable ->
        Thread(runnable, "SaiETF-Fugle-WS").apply { isDaemon = true }
    }
    private var reconnectFuture: ScheduledFuture<*>? = null
    private var socket: FugleSocket? = null
    private var authenticated: Boolean = false
    private var connecting: Boolean = false
    private var manualDisconnect: Boolean = true
    private var credentialRejected: Boolean = false
    private var reconnectAttempt: Int = 0
    private var consecutiveFailures: Int = 0
    private var hasAuthenticatedBefore: Boolean = false
    private var recovering: Boolean = false
    private var lastAttemptEpochMillis: Long? = null
    private var lastSuccessEpochMillis: Long? = null
    private var lastMessageEpochMillis: Long? = null
    private var lastHeartbeatEpochMillis: Long? = null
    private var nextReconnectEpochMillis: Long = 0L
    private var subscriptionAttemptAt: Long? = null
    private var receivedMessages = 0L
    private var receivedData = 0L
    private var rejectedData = 0L
    private var lastTradeAt = 0L

    private fun subscriptionsReady(): Boolean =
        admittedSymbols().isNotEmpty() && admittedSymbols().all { it in activeChannelIds } &&
            pendingSubscribeSymbols.isEmpty() && pendingUnsubscribeIds.isEmpty()

    private fun recordSource(reason: String, code: Int? = null, failure: String = "NONE") {
        val row = synchronized(lock) {
            org.json.JSONObject().put("kind", "source").put("reason", reason).put("failure", failure)
                .put("code", code ?: 0).put("auth", authenticated)
                .put("desired", desiredSymbols.size).put("active", activeChannelIds.size)
                .put("pending", pendingSubscribeSymbols.size).put("retry", reconnectAttempt)
                .put("limited", (desiredSymbols - admittedSymbols()).size).put("capacity", subscriptionCapacity ?: 0)
                .put("next", nextReconnectEpochMillis).put("rx", receivedMessages)
                .put("data", receivedData).put("rejected", rejectedData).put("tradeAt", lastTradeAt)
        }
        TfAssetMarketFlowDiagnostics.sourceCheckpoint(row)
    }

    init {
        scheduler.scheduleAtFixedRate(
            { watchdogTick() },
            WATCHDOG_PERIOD_MILLIS,
            WATCHDOG_PERIOD_MILLIS,
            TimeUnit.MILLISECONDS,
        )
    }

    override suspend fun connect() {
        connectNow()
    }

    override suspend fun disconnect() {
        val current = synchronized(lock) {
            manualDisconnect = true
            authenticated = false
            connecting = false
            reconnectFuture?.cancel(false)
            reconnectFuture = null
            nextReconnectEpochMillis = 0L
            activeChannelIds.clear()
            pendingSubscribeSymbols.clear()
            pendingUnsubscribeIds.clear()
            socket.also { socket = null }
        }
        current?.close(NORMAL_CLOSE_CODE, "SaiETF background/disconnect")
        recordSource("PAUSED")
        emitHealth()
    }

    override suspend fun subscribe(symbols: Set<String>) {
        synchronized(lock) {
            desiredSymbols += normalizeSymbols(symbols)
        }
        connectNow()
        syncSubscriptions()
    }

    override suspend fun unsubscribe(symbols: Set<String>) {
        synchronized(lock) {
            desiredSymbols -= normalizeSymbols(symbols)
        }
        syncSubscriptions()
    }

    suspend fun replaceSubscriptions(symbols: Set<String>) {
        synchronized(lock) {
            desiredSymbols.clear()
            desiredSymbols += normalizeSymbols(symbols)
        }
        if (desiredSymbolsSnapshot().isNotEmpty()) {
            connectNow()
        }
        syncSubscriptions()
    }

    override suspend fun fetchSnapshot(symbols: Set<String>): Map<String, MarketQuote> {
        val requested = normalizeSymbols(symbols)
        return synchronized(lock) {
            latestQuotes.filterKeys { it in requested }.toMap()
        }
    }

    fun isSubscribed(symbol: String, nowEpochMillis: Long): Boolean = synchronized(lock) {
        authenticated && !manualDisconnect && heartbeatIsHealthy(nowEpochMillis) && symbol in activeChannelIds
    }

    override fun health(nowEpochMillis: Long): ProviderHealth {
        val hasCredential = !apiKeyProvider().isNullOrBlank()
        return synchronized(lock) {
            val circuitState = when {
                !hasCredential || credentialRejected -> ProviderCircuitState.COOLDOWN
                authenticated && !heartbeatIsHealthy(nowEpochMillis) -> ProviderCircuitState.COOLDOWN
                socket == null && nowEpochMillis < nextReconnectEpochMillis -> ProviderCircuitState.COOLDOWN
                authenticated && (desiredSymbols.size > admittedSymbols().size || !subscriptionsReady()) -> ProviderCircuitState.DEGRADED
                authenticated && recovering -> ProviderCircuitState.RECOVERING
                authenticated -> ProviderCircuitState.HEALTHY
                consecutiveFailures >= 2 -> ProviderCircuitState.COOLDOWN
                consecutiveFailures == 1 || socket != null || connecting -> ProviderCircuitState.DEGRADED
                else -> ProviderCircuitState.DEGRADED
            }
            val availability = when (circuitState) {
                ProviderCircuitState.HEALTHY -> ProviderAvailability.READY
                ProviderCircuitState.DEGRADED,
                ProviderCircuitState.RECOVERING,
                -> ProviderAvailability.THROTTLED
                ProviderCircuitState.COOLDOWN -> ProviderAvailability.COOLDOWN
            }
            ProviderHealth(
                source = source,
                availability = availability,
                consecutiveFailures = consecutiveFailures,
                lastAttemptEpochMillis = lastAttemptEpochMillis,
                lastSuccessEpochMillis = lastSuccessEpochMillis,
                nextAllowedEpochMillis = nextReconnectEpochMillis,
                circuitState = circuitState,
            )
        }
    }

    fun onCredentialChanged() {
        val old = synchronized(lock) {
            credentialRejected = false
            subscriptionCapacity = null
            serialAdmission = false
            reconnectAttempt = 0
            consecutiveFailures = 0
            manualDisconnect = true
            authenticated = false
            connecting = false
            reconnectFuture?.cancel(false)
            reconnectFuture = null
            nextReconnectEpochMillis = 0L
            activeChannelIds.clear()
            pendingSubscribeSymbols.clear()
            pendingUnsubscribeIds.clear()
            socket.also { socket = null }
        }
        old?.close(NORMAL_CLOSE_CODE, "SaiETF credential changed")
        if (!apiKeyProvider().isNullOrBlank() && desiredSymbolsSnapshot().isNotEmpty()) {
            connectNow()
        } else {
            emitHealth()
        }
    }

    fun desiredSymbolsSnapshot(): Set<String> = synchronized(lock) {
        desiredSymbols.toSet()
    }

    internal fun handleSocketMessageForTest(text: String) {
        handleMessage(text)
    }

    internal fun shutdownForTest() {
        scheduler.shutdownNow()
        synchronized(lock) {
            socket?.cancel()
            socket = null
        }
    }

    private fun connectNow() {
        val apiKey = apiKeyProvider()?.trim().orEmpty()
        if (apiKey.isBlank()) {
            emitHealth()
            return
        }

        synchronized(lock) {
            if (credentialRejected || socket != null || connecting || clockMillis() < nextReconnectEpochMillis) return
            manualDisconnect = false
            connecting = true
            lastAttemptEpochMillis = clockMillis()
        }

        // OkHttp can call onOpen/onFailure before connect() publishes
        // the returned socket. Never lose authentication on that race.
        var openedBeforeRegistration = false
        var failureBeforeRegistration: Throwable? = null
        val listener = object : FugleSocketListener {
            override fun onOpen(socket: FugleSocket) {
                val registered = synchronized(lock) {
                    if (this@FugleWebSocketProvider.socket !== socket) {
                        if (this@FugleWebSocketProvider.socket == null && connecting)
                            openedBeforeRegistration = true
                        false
                    } else {
                        connecting = false
                        lastMessageEpochMillis = clockMillis()
                        true
                    }
                }
                if (registered) {
                    if (!socket.send(authMessage(apiKey))) reconnectAfterSendFailure(socket)
                    emitHealth()
                }
            }

            override fun onText(socket: FugleSocket, text: String) {
                if (synchronized(lock) { this@FugleWebSocketProvider.socket !== socket }) return
                handleMessage(text)
            }

            override fun onClosed(socket: FugleSocket, code: Int, reason: String) {
                val early = synchronized(lock) {
                    if (this@FugleWebSocketProvider.socket == null && connecting) {
                        failureBeforeRegistration = IllegalStateException("Fugle socket closed before registration")
                        true
                    } else false
                }
                if (!early) handleDisconnect(socket, null, code)
            }

            override fun onFailure(socket: FugleSocket, error: Throwable) {
                val early = synchronized(lock) {
                    if (this@FugleWebSocketProvider.socket == null && connecting) {
                        failureBeforeRegistration = error
                        true
                    } else false
                }
                if (!early) handleDisconnect(socket, error)
            }
        }

        recordSource("CONNECTING")
        val created = runCatching { transport.connect(STREAMING_URL, listener) }
            .getOrElse { error ->
                synchronized(lock) {
                    connecting = false
                    consecutiveFailures += 1
                }
                scheduleReconnect()
                recordSource("DISCONNECTED", failure = "TRANSPORT_FAILED")
                emitHealth()
                return
            }

        val closeWithoutRegister: Boolean
        val earlyFailure: Throwable?
        val sendDeferredAuth: Boolean
        synchronized(lock) {
            closeWithoutRegister = manualDisconnect
            earlyFailure = failureBeforeRegistration
            if (!manualDisconnect) socket = created
            sendDeferredAuth = !manualDisconnect && earlyFailure == null &&
                openedBeforeRegistration
            if (sendDeferredAuth) {
                connecting = false
                lastMessageEpochMillis = clockMillis()
            }
        }
        if (closeWithoutRegister) {
            created.close(NORMAL_CLOSE_CODE, "TF Asset stream not required")
        } else if (earlyFailure != null) {
            handleDisconnect(created, earlyFailure)
        } else if (sendDeferredAuth) {
            if (!created.send(authMessage(apiKey))) reconnectAfterSendFailure(created)
            emitHealth()
        }
    }

    private fun handleMessage(text: String) {
        synchronized(lock) { receivedMessages += 1 }
        val root = runCatching { json.parseToJsonElement(text).jsonObject }.getOrNull() ?: return
        val event = root.string("event") ?: return
        val now = clockMillis()
        synchronized(lock) {
            lastMessageEpochMillis = now
        }

        when (event) {
            "authenticated" -> {
                synchronized(lock) {
                    authenticated = true
                    connecting = false
                    credentialRejected = false
                    recovering = hasAuthenticatedBefore && (consecutiveFailures > 0 || reconnectAttempt > 0)
                    hasAuthenticatedBefore = true
                    // Authentication is not proof that trades subscriptions recovered.
                    lastSuccessEpochMillis = now
                    lastHeartbeatEpochMillis = now
                }
                syncSubscriptions()
                recordSource("AUTHENTICATED")
                emitHealth()
            }

            "heartbeat", "pong" -> {
                synchronized(lock) {
                    lastHeartbeatEpochMillis = now
                    lastSuccessEpochMillis = now
                    recovering = false
                }
                emitHealth()
            }

            "subscribed" -> handleSubscribed(root["data"])
            "unsubscribed" -> handleUnsubscribed(root["data"])
            "data" -> handleMarketData(root)
            "error" -> handleServerError(root)
        }
    }

    private fun handleSubscribed(data: JsonElement?) {
        subscriptionObjects(data).forEach { row ->
            val id = row.string("id") ?: return@forEach
            val symbol = row.string("symbol")?.normalizeSymbol() ?: return@forEach
            val channel = row.string("channel")
            if (channel != TRADE_CHANNEL) return@forEach

            val unsubscribeImmediately = synchronized(lock) {
                pendingSubscribeSymbols.remove(symbol)
                if (pendingSubscribeSymbols.isEmpty() && pendingUnsubscribeIds.isEmpty()) subscriptionAttemptAt = null
                activeChannelIds[symbol] = id
                symbol !in admittedSymbols()
            }
            if (unsubscribeImmediately) {
                sendUnsubscribe(listOf(id))
            }
        }
        synchronized(lock) {
            if (subscriptionsReady()) {
                reconnectAttempt = 0
                consecutiveFailures = 0
                recovering = false
            }
        }
        syncSubscriptions()
        recordSource("SUBSCRIBED")
        emitHealth()
    }

    private fun handleUnsubscribed(data: JsonElement?) {
        val ids = subscriptionObjects(data).mapNotNull { it.string("id") }.toSet()
        if (ids.isEmpty()) return
        synchronized(lock) {
            pendingUnsubscribeIds.removeAll(ids)
            activeChannelIds.entries.removeAll { it.value in ids }
            if (pendingSubscribeSymbols.isEmpty() && pendingUnsubscribeIds.isEmpty()) subscriptionAttemptAt = null
        }
        syncSubscriptions()
        recordSource("UNSUBSCRIBED")
        emitHealth()
    }

    private fun handleMarketData(root: JsonObject) {
        synchronized(lock) { receivedData += 1 }
        fun reject() { synchronized(lock) { rejectedData += 1 } }
        if (root.string("channel") != TRADE_CHANNEL) { reject(); return }
        val data = root["data"] as? JsonObject ?: run { reject(); return }
        if (data.boolean("isTrial") == true) { reject(); return }

        val symbol = data.string("symbol")?.normalizeSymbol() ?: run { reject(); return }
        val price = data.double("price")?.takeIf { it.isFinite() && it > 0.0 } ?: run { reject(); return }
        val now = clockMillis()
        val sourceTime = normalizeEpochMillis(data.long("time"), now)
        val sessionDate = Instant.ofEpochMilli(sourceTime)
            .atZone(taipeiZone)
            .toLocalDate()
            .toString()

        val quote = MarketQuote(
            symbol = symbol,
            exchange = data.string("exchange"),
            market = data.string("market"),
            price = price,
            volume = data.long("volume")?.coerceAtLeast(0L),
            bid = data.double("bid")?.positiveOrNull(),
            ask = data.double("ask")?.positiveOrNull(),
            asOfEpochMillis = sourceTime,
            source = MarketSource.FUGLE,
            quality = QuoteQuality.LIVE,
            sourceTimestampEpochMillis = sourceTime,
            receivedAtEpochMillis = now,
            sessionDate = sessionDate,
            fallbackLevel = 0,
            sequence = data.long("serial"),
            isTrial = false,
            isClose = data.boolean("isClose") == true,
        )

        synchronized(lock) {
            latestQuotes[symbol] = quote
            lastSuccessEpochMillis = now
            lastTradeAt = now
            if (subscriptionsReady()) {
                consecutiveFailures = 0
                reconnectAttempt = 0
                recovering = false
            }
        }
        // Never gate the price feed on SharedFlow.tryEmit: a saturated buffer
        // would otherwise silently drop a genuine Fugle trade.
        TfAssetMarketFlowDiagnostics.trades.incrementAndGet()
        onTrade(quote)
        _events.tryEmit(MarketEvent.Quote(quote))
        emitHealth()
    }

    private fun handleServerError(root: JsonObject) {
        val errorData = root["data"] as? JsonObject
        val message = errorData?.string("message").orEmpty()
        val code = errorData?.long("code")?.takeIf { it in 0..999999 }?.toInt()
        val authFailure = message.contains("auth", ignoreCase = true) ||
            message.contains("credential", ignoreCase = true) ||
            message.contains("api key", ignoreCase = true)

        val subscriptionQuota = !authFailure && message.contains("subscription", true) &&
            listOf("limit", "maximum", "exceed", "reached").any { message.contains(it, true) }
        if (subscriptionQuota) {
            val retained = synchronized(lock) {
                when {
                    // A rejected multi-symbol request reveals no capacity. Probe
                    // one at a time and wait for each real subscription ACK.
                    authenticated && !serialAdmission && pendingSubscribeSymbols.size > 1 -> {
                        serialAdmission = true
                        pendingSubscribeSymbols.clear(); subscriptionAttemptAt = null
                        true
                    }
                    authenticated && pendingSubscribeSymbols.size == 1 && activeChannelIds.isNotEmpty() -> {
                        subscriptionCapacity = activeChannelIds.size
                        serialAdmission = true
                        pendingSubscribeSymbols.clear(); subscriptionAttemptAt = null
                        true
                    }
                    else -> {
                        // A quota failure with no accepted slot must back off.
                        // Keep later retries serial even when the desired list grows.
                        if (authenticated && pendingSubscribeSymbols.size == 1) serialAdmission = true
                        false
                    }
                }
            }
            if (retained) {
                recordSource("SERVER_ERROR", code, "SUBSCRIPTION_LIMIT")
                syncSubscriptions()
                emitHealth()
                return
            }
        }

        val current = synchronized(lock) {
            consecutiveFailures += 1
            if (authFailure) {
                credentialRejected = true
                manualDisconnect = true
            }
            authenticated = false
            connecting = false
            activeChannelIds.clear()
            pendingSubscribeSymbols.clear()
            pendingUnsubscribeIds.clear()
            socket.also { socket = null }
        }
        current?.close(POLICY_CLOSE_CODE, "Fugle server error")
        if (!authFailure) scheduleReconnect()
        val failure = when {
            authFailure -> "CREDENTIAL_REJECTED"
            message.contains("subscription", true) -> "SUBSCRIPTION_REJECTED"
            message.contains("connection", true) -> "CONNECTION_REJECTED"
            message.contains("limit", true) -> "LIMIT_REJECTED"
            else -> "SERVER_REJECTED"
        }
        recordSource("SERVER_ERROR", code, failure)
        emitHealth()
    }

    private fun handleDisconnect(disconnected: FugleSocket, error: Throwable?, closeCode: Int? = null) {
        val shouldReconnect = synchronized(lock) {
            if (socket !== disconnected) return
            socket = null
            authenticated = false
            connecting = false
            activeChannelIds.clear()
            pendingSubscribeSymbols.clear()
            pendingUnsubscribeIds.clear()
            if (error != null) consecutiveFailures += 1
            recovering = false
            !manualDisconnect && !credentialRejected && desiredSymbols.isNotEmpty()
        }
        if (shouldReconnect) scheduleReconnect()
        recordSource("DISCONNECTED", closeCode, failure = if (error == null) "SOCKET_CLOSED" else "TRANSPORT_FAILED")
        emitHealth()
    }

    private fun reconnectAfterSendFailure(failed: FugleSocket) {
        handleDisconnect(failed, IllegalStateException("Fugle transport send failed"))
        failed.cancel()
    }

    private fun syncSubscriptions() {
        val currentSocket: FugleSocket
        val subscribeSymbols: List<String>
        val unsubscribeIds: List<String>

        synchronized(lock) {
            if (!authenticated) return
            currentSocket = socket ?: return

            val admitted = admittedSymbols()
            val removeSymbols = activeChannelIds.keys.filter { it !in admitted }
            // A replacement must release its old server-side slot first.
            // Adding first can exceed a plan's limit even with an unchanged final count.
            subscribeSymbols = if (removeSymbols.isEmpty() && pendingUnsubscribeIds.isEmpty() &&
                pendingSubscribeSymbols.none { it !in admitted } && (!serialAdmission || pendingSubscribeSymbols.isEmpty())) admitted
                .filter { it !in activeChannelIds && it !in pendingSubscribeSymbols }
                .let { if (serialAdmission) it.take(1) else it } else emptyList()
            pendingSubscribeSymbols += subscribeSymbols
            if (subscribeSymbols.isNotEmpty()) subscriptionAttemptAt = clockMillis()
            unsubscribeIds = removeSymbols
                .mapNotNull { activeChannelIds[it] }
                .filter { it !in pendingUnsubscribeIds }
            pendingUnsubscribeIds += unsubscribeIds
            if (unsubscribeIds.isNotEmpty()) subscriptionAttemptAt = clockMillis()
        }

        if (subscribeSymbols.isNotEmpty()) {
            val sent = currentSocket.send(subscribeMessage(subscribeSymbols))
            if (!sent) {
                reconnectAfterSendFailure(currentSocket)
            }
        }
        if (unsubscribeIds.isNotEmpty()) {
            val sent = currentSocket.send(unsubscribeMessage(unsubscribeIds))
            if (!sent) {
                reconnectAfterSendFailure(currentSocket)
            }
        }
    }

    private fun sendUnsubscribe(ids: List<String>) {
        if (ids.isEmpty()) return
        val current = synchronized(lock) {
            pendingUnsubscribeIds += ids
            subscriptionAttemptAt = clockMillis()
            socket
        } ?: return
        if (!current.send(unsubscribeMessage(ids))) {
            reconnectAfterSendFailure(current)
        }
    }

    private fun scheduleReconnect() {
        val delay = synchronized(lock) {
            if (manualDisconnect || credentialRejected || desiredSymbols.isEmpty()) return
            if (reconnectFuture?.isDone == false) return

            val exponential = min(
                RECONNECT_MAX_MILLIS,
                RECONNECT_BASE_MILLIS * (1L shl reconnectAttempt.coerceIn(0, 5)),
            )
            val jitter = (reconnectAttempt * 137L) % RECONNECT_JITTER_MILLIS
            reconnectAttempt += 1
            val delayMillis = exponential + jitter
            nextReconnectEpochMillis = clockMillis() + delayMillis
            delayMillis
        }

        reconnectFuture = scheduler.schedule(
            {
                synchronized(lock) {
                    reconnectFuture = null
                    nextReconnectEpochMillis = 0L
                }
                connectNow()
            },
            delay,
            TimeUnit.MILLISECONDS,
        )
    }

    private fun watchdogTick() {
        val now = clockMillis()
        val action = synchronized(lock) {
            if (socket == null || manualDisconnect) return
            val last = lastMessageEpochMillis ?: lastHeartbeatEpochMillis ?: now
            when {
                !authenticated && now - (lastAttemptEpochMillis ?: now) >= HANDSHAKE_TIMEOUT_MILLIS -> 2
                !authenticated -> 0
                (pendingSubscribeSymbols.isNotEmpty() || pendingUnsubscribeIds.isNotEmpty()) && now - (subscriptionAttemptAt ?: now) >= HANDSHAKE_TIMEOUT_MILLIS -> 2
                now - last >= HEARTBEAT_TIMEOUT_MILLIS -> 2
                now - last >= PING_AFTER_SILENCE_MILLIS -> 1
                else -> 0
            }
        }

        when (action) {
            1 -> {
                synchronized(lock) { socket }?.send(pingMessage(now))
            }

            2 -> {
                val timeoutFailure = synchronized(lock) {
                    when {
                        !authenticated -> "AUTH_TIMEOUT"
                        pendingSubscribeSymbols.isNotEmpty() || pendingUnsubscribeIds.isNotEmpty() -> "SUBSCRIPTION_ACK_TIMEOUT"
                        else -> "HEARTBEAT_TIMEOUT"
                    }
                }
                val current = synchronized(lock) {
                    authenticated = false
                    connecting = false
                    consecutiveFailures += 1
                    recovering = false
                    activeChannelIds.clear()
                    pendingSubscribeSymbols.clear()
                    pendingUnsubscribeIds.clear()
                    socket.also { socket = null }
                }
                current?.cancel()
                scheduleReconnect()
                recordSource("TIMEOUT", failure = timeoutFailure)
                emitHealth()
            }
        }
    }

    private fun heartbeatIsHealthy(nowEpochMillis: Long): Boolean {
        val last = lastMessageEpochMillis ?: lastHeartbeatEpochMillis ?: return false
        return nowEpochMillis - last <= HEARTBEAT_TIMEOUT_MILLIS
    }

    private fun emitHealth() {
        val state = health(clockMillis())
        onHealth(state)
        _events.tryEmit(MarketEvent.ProviderState(state))
    }

    private fun authMessage(apiKey: String): String =
        buildJsonObject {
            put("event", "auth")
            put(
                "data",
                buildJsonObject {
                    put("apikey", apiKey)
                },
            )
        }.toString()

    private fun subscribeMessage(symbols: List<String>): String =
        buildJsonObject {
            put("event", "subscribe")
            put(
                "data",
                buildJsonObject {
                    put("channel", TRADE_CHANNEL)
                    put(
                        "symbols",
                        buildJsonArray {
                            symbols.forEach { add(kotlinx.serialization.json.JsonPrimitive(it)) }
                        },
                    )
                },
            )
        }.toString()

    private fun unsubscribeMessage(ids: List<String>): String =
        buildJsonObject {
            put("event", "unsubscribe")
            put(
                "data",
                buildJsonObject {
                    put(
                        "ids",
                        buildJsonArray {
                            ids.forEach { add(kotlinx.serialization.json.JsonPrimitive(it)) }
                        },
                    )
                },
            )
        }.toString()

    private fun pingMessage(state: Long): String =
        buildJsonObject {
            put("event", "ping")
            put(
                "data",
                buildJsonObject {
                    put("state", state)
                },
            )
        }.toString()

    private fun subscriptionObjects(data: JsonElement?): List<JsonObject> =
        when (data) {
            is JsonObject -> listOf(data)
            is JsonArray -> data.mapNotNull { it as? JsonObject }
            else -> emptyList()
        }

    private fun JsonObject.string(key: String): String? =
        this[key]?.jsonPrimitive?.contentOrNull

    private fun JsonObject.long(key: String): Long? =
        this[key]?.jsonPrimitive?.longOrNull

    private fun JsonObject.double(key: String): Double? =
        this[key]?.jsonPrimitive?.doubleOrNull

    private fun JsonObject.boolean(key: String): Boolean? =
        this[key]?.jsonPrimitive?.booleanOrNull

    private fun String.normalizeSymbol(): String =
        trim().uppercase(Locale.US)

    private fun normalizeSymbols(symbols: Set<String>): Set<String> =
        symbols.map { it.normalizeSymbol() }
            .filter { it.isNotBlank() }
            .toSet()

    private fun normalizeEpochMillis(raw: Long?, receivedAt: Long): Long {
        val value = raw ?: return receivedAt
        return when {
            value >= 100_000_000_000_000L -> value / 1_000L
            value >= 100_000_000_000L -> value
            value >= 100_000_000L -> value * 1_000L
            else -> receivedAt
        }
    }

    private fun Double.positiveOrNull(): Double? =
        takeIf { it.isFinite() && it > 0.0 }

    companion object {
        const val STREAMING_URL =
            "wss://api.fugle.tw/marketdata/v1.0/stock/streaming"
        private const val TRADE_CHANNEL = "trades"
        private const val WATCHDOG_PERIOD_MILLIS = 15_000L
        private const val HANDSHAKE_TIMEOUT_MILLIS = 15_000L
        private const val PING_AFTER_SILENCE_MILLIS = 40_000L
        private const val HEARTBEAT_TIMEOUT_MILLIS = 75_000L
        private const val RECONNECT_BASE_MILLIS = 1_000L
        private const val RECONNECT_MAX_MILLIS = 30_000L
        private const val RECONNECT_JITTER_MILLIS = 500L
        private const val NORMAL_CLOSE_CODE = 1000
        private const val POLICY_CLOSE_CODE = 1008
    }
}
