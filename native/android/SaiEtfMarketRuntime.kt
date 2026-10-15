package com.tfasset.app.saietf

import android.content.Context
import com.tfasset.app.TfAssetMarketSchedule
import java.time.Instant
import java.time.LocalTime
import java.time.ZoneId
import java.util.Locale
import java.util.concurrent.atomic.AtomicLong
import java.util.concurrent.atomic.AtomicBoolean
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import kotlinx.coroutines.flow.collectLatest
import org.json.JSONArray
import org.json.JSONObject
import tw.saietf.core.market.MarketBatch
import tw.saietf.core.market.MarketDataCenter
import tw.saietf.core.market.MemoryMarketStore
import tw.saietf.core.market.cachedSaiEtfMarketReferences
import tw.saietf.core.market.MarketQuote
import tw.saietf.core.market.MarketSource
import tw.saietf.core.market.ProviderHealth
import tw.saietf.core.market.QuoteQuality

class SaiEtfMarketRuntime(context: Context, private val clockMillis:()->Long=System::currentTimeMillis, private val onLiveSnapshot: (String) -> Unit = {}) {
    private val appContext = context.applicationContext
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private val taipeiZone = ZoneId.of("Asia/Taipei")
    private val version = AtomicLong(clockMillis())
    @Volatile private var trackedSymbols: Set<String> = emptySet()
    @Volatile private var paused = false
    private val fallbackInFlight = AtomicBoolean(false)
    private val keyStore = FugleApiKeyStore(appContext)
    private val persistence = MarketPersistenceRepository(appContext)
    // SaiETF frozen core takes a MemoryMarketStore at construction; its core
    // does NOT expose the old TF-only mutable restorePersistedQuotes hook.
    private val warmStore = MemoryMarketStore(
        cachedSaiEtfMarketReferences(persistence.persistedQuotes().values,clockMillis()),
    )
    private val center = MarketDataCenter(
        providers = listOf(
            TwseMisQuoteProvider(),
            YahooQuoteProvider(),
        ),
        hotStore = warmStore,
    )
    private val fugleRest = FugleRestQuoteProvider(keyStore::load,clockMillis)
    private val liveQuotes = FugleLiveQuoteSink(center)
    private val closeReconciler = FugleSessionCloseReconciler(
        fetch = { symbols, withinBudget -> fugleRest.fetch(symbols) {
            withinBudget() && FugleSessionCloseReconciler.eligible(TfAssetMarketSchedule.load(appContext),clockMillis())
        } },
        current = center::memoryQuotes,
        admit = { quote ->
            FugleSessionCloseReconciler.eligible(TfAssetMarketSchedule.load(appContext),clockMillis()) &&
                liveQuotes.acceptBaseline(quote,clockMillis(),taipeiDate(clockMillis()))
        },
        clockMillis = clockMillis,
    )
    @Volatile private var streamWasHealthy = false
    // This socket is owned by TF Asset and talks directly to Fugle.
    // No SaiETF process, app, service, database or network relay participates.
    private val fugle = FugleWebSocketProvider(
        apiKeyProvider = keyStore::load,
        clockMillis = clockMillis,
        onTrade = { quote -> if(!paused&&TfAssetMarketSchedule.allows(appContext))liveQuotes.accept(quote,clockMillis(),taipeiDate(clockMillis())) },
        onHealth = { health ->
            val healthy = health.circuitState == tw.saietf.core.market.ProviderCircuitState.HEALTHY
            val recovered = healthy && !streamWasHealthy
            streamWasHealthy = healthy
            if (trackedSymbols.isNotEmpty()) scope.launch {
                version.incrementAndGet()
                onLiveSnapshot(snapshot(trackedSymbols, includeIntraday = false).toString())
                if (!paused && TfAssetMarketSchedule.allows(appContext) && recovered && fallbackInFlight.compareAndSet(false, true)) {
                    try { refresh(trackedSymbols) }
                    finally { fallbackInFlight.set(false) }
                }
            }
        },
    )
    private val calendarPrefs = appContext.getSharedPreferences("market-trading-calendar", Context.MODE_PRIVATE)
    init {
        TradingCalendar.restore(calendarPrefs.getStringSet("closedDates", emptySet()) ?: emptySet())
        scope.launch {
            runCatching {
                val connection = java.net.URL("https://openapi.twse.com.tw/v1/holidaySchedule/holidaySchedule").openConnection() as java.net.HttpURLConnection
                connection.connectTimeout = 8000
                connection.readTimeout = 8000
                try {
                    val rows = JSONArray(connection.inputStream.bufferedReader().use { it.readText() })
                    if (TradingCalendar.acceptOfficialRows(rows)) {
                        calendarPrefs.edit().putStringSet("closedDates", TradingCalendar.snapshot().toSet()).apply()
                        version.incrementAndGet()
                        onLiveSnapshot(snapshot(trackedSymbols).toString())
                    }
                } finally { connection.disconnect() }
            }
        }
    }
    @Volatile private var latestProviderHealth: List<ProviderHealth> =
        center.providerHealthSnapshot(clockMillis())

    private val persistenceController = MarketPersistenceController(
        scope = scope,
        marketDataCenter = center,
        repository = persistence,
    )
    private val streamingController = FugleStreamingController(
        scope = scope,
        provider = fugle,
        marketDataCenter = center,
        allowStreaming = {!paused&&TfAssetMarketSchedule.allows(appContext)},
        // Transport handles reconnect/backoff. No periodic backup price fetch
        // is allowed to compete with the live Fugle subscription.

    )
    init {
        scope.launch {
            center.quotesState.collectLatest { quotes ->
                if (quotes.isEmpty()) return@collectLatest
                version.incrementAndGet()
                runCatching { onLiveSnapshot(snapshot(trackedSymbols, includeIntraday = false).toString()) }
            }
        }
    }

    fun saveFugleKey(apiKey: String): Boolean {
        keyStore.save(apiKey)
        streamingController.onCredentialChanged(if(paused)emptySet() else trackedSymbols)
        return true
    }

    fun loadFugleKey(): String? = keyStore.load()

    fun clearFugleKey(): Boolean {
        keyStore.clear()
        streamingController.onCredentialChanged(if(paused)emptySet() else trackedSymbols)
        return true
    }

    fun updateSymbols(requested: Collection<String>) {
        val symbols = requested.map { it.trim().uppercase(Locale.US) }
            .filter { it.matches(Regex("[0-9A-Z]{4,10}")) }.toSet()
        trackedSymbols = symbols
        if(!TfAssetMarketSchedule.allows(appContext)){pause();return}
        paused = false
        streamingController.updateSymbols(symbols)
    }

    fun resumeTrackedSymbols(){updateSymbols(trackedSymbols)}

    fun subscriptionLimitedSymbols(): Set<String> = fugle.subscriptionLimitedSymbols()

    fun pause() {
        paused = true
        streamingController.pause()
        scope.launch { persistenceController.flushNow() }
    }

    /** Preserve the writer until the final canonical projection is acknowledged. */
    fun settleScheduledClose(onSettled:(Long)->Unit):Boolean {
        val now=clockMillis()
        if(trackedSymbols.isEmpty() || !FugleSessionCloseReconciler.eligible(TfAssetMarketSchedule.load(appContext),now))return false
        val end=Instant.ofEpochMilli(now).atZone(taipeiZone).toLocalDate().atTime(13,30).atZone(taipeiZone).toInstant().toEpochMilli()
        scope.launch {
            var settledVersion=version.get()
            try {
                kotlinx.coroutines.delay((end+FugleSessionCloseReconciler.SETTLEMENT_GRACE_MILLIS-clockMillis()).coerceAtLeast(0L))
                settledVersion=refresh(trackedSymbols).getLong("version")
            } finally { onSettled(settledVersion) }
        }
        return true
    }

    @Synchronized fun refresh(requested: Collection<String>): JSONObject {
        val symbols = requested
            .map { it.trim().uppercase(Locale.US) }
            .filter { it.matches(Regex("[0-9A-Z]{4,10}")) }
            .toSet()
        if (symbols.isEmpty()) return snapshot(symbols)
        if (!TfAssetMarketSchedule.allows(appContext)) {
            if(closeReconciler.reconcile(symbols,TfAssetMarketSchedule.load(appContext))) {
                kotlinx.coroutines.runBlocking { persistenceController.flushNow() }
            }
            if(FugleSessionCloseReconciler.eligible(TfAssetMarketSchedule.load(appContext),clockMillis(),FugleSessionCloseReconciler.SETTLEMENT_GRACE_MILLIS)) {
                val date=taipeiDate(clockMillis())
                val confirmed=center.memoryQuotes(symbols).values.count{it.isClose&&it.sessionDate==date}
                com.tfasset.app.TfAssetMarketFlowDiagnostics.sourceCheckpoint(JSONObject()
                    .put("kind","source").put("reason","SESSION_CLOSE")
                    .put("failure",if(confirmed==symbols.size)"NONE" else "CLOSE_UNCONFIRMED")
                    .put("requested",symbols.size).put("confirmed",confirmed))
            }
            version.incrementAndGet()
            val result=snapshot(symbols)
            onLiveSnapshot(result.toString())
            return result
        }

        val now = clockMillis()
        if (isLiveSession(now)) {
            // Lifecycle/manual/reconnect bootstrap comes from Fugle itself.
            // HTTP completion uses the SAME SaiETF arbitrator as socket ticks.
            fugleRest.fetch(symbols){!paused&&TfAssetMarketSchedule.allows(appContext)}.values.forEach { quote ->
                if(TfAssetMarketSchedule.allows(appContext))liveQuotes.acceptBaseline(quote,clockMillis(),taipeiDate(clockMillis()))
            }
            version.incrementAndGet()
            val result = snapshot(symbols)
            onLiveSnapshot(result.toString())
            return result
        }
        val batch = center.refresh(
            symbols = symbols,
            nowEpochMillis = now,
            currentTaipeiDate = taipeiDate(now),
            tradingSessionActive = isLiveSession(now),
        )
        // Reconcile streaming events that arrived during slower HTTP fallback.
        // SaiETF core stays byte-identical; never publish an older poll quote
        // over a newer accepted Fugle trade at the native UI boundary.
        runCatching {
            kotlinx.coroutines.runBlocking { fugle.fetchSnapshot(symbols) }.values.forEach {
                liveQuotes.accept(it)
            }
        }
        latestProviderHealth = batch.providerHealth
        version.incrementAndGet()
        scope.launch { persistenceController.flushNow() }
        return snapshot(symbols, batch)
    }

    fun snapshot(requested: Collection<String> = emptyList()): JSONObject =
        snapshot(requested.map { it.trim().uppercase(Locale.US) }.filter { it.isNotBlank() }.toSet(), null)

    private fun snapshot(symbols: Set<String>, batch: MarketBatch? = null, includeIntraday: Boolean = true): JSONObject {
        // SaiETF StateFlow / MemoryMarketStore is the only price authority.
        // Presentation may recalculate quote freshness, but MUST NOT alter
        // the native hot store or substitute a price from TF Asset caches.
        val now = clockMillis()
        val currentTaipeiDate = taipeiDate(now)
        val sessionActive = isLiveSession(now)
        val live = center.memoryQuotes(symbols)
        val rows = JSONArray()
        val currentSessionSymbols = mutableSetOf<String>()
        live.values.sortedBy { it.symbol }.forEach { quote ->
            val sourceAt = quote.sourceTimestampEpochMillis
            val sameSession = sourceAt > 0L && taipeiDate(sourceAt) == currentTaipeiDate
            val subscribed = sameSession && sessionActive && quote.source == MarketSource.FUGLE && fugle.isSubscribed(quote.symbol, now)
            val status = when {
                subscribed -> QuoteQuality.LIVE
                !sameSession -> QuoteQuality.STALE
                sessionActive && quote.source == MarketSource.FUGLE -> QuoteQuality.DELAYED
                now - sourceAt > 30_000L -> QuoteQuality.DELAYED
                else -> quote.quality
            }
            if (sameSession && status != QuoteQuality.STALE && status != QuoteQuality.OFFLINE) {
                currentSessionSymbols += quote.symbol
            }
            rows.put(marketQuoteToRuntimeRow(liveQuotes.enrich(quote).copy(quality = status)).put("streamingHealthy", subscribed).put("streamingCheckedAt", now))
        }
        // A previous-session persisted price is visible as last-known data,
        // but it is NOT current-session coverage or a new accepted live trade.
        val missing = if (sessionActive) symbols - currentSessionSymbols else symbols - live.keys
        val health = JSONArray()
        val allHealth = listOf(streamingController.health()) +
            (batch?.providerHealth ?: latestProviderHealth)
        allHealth.forEach { health.put(healthRow(it)) }

        return JSONObject()
            .put("version", version.get())
            .put("quotes", rows)
            .put("updatedCount", batch?.quotes?.size ?: 0)
            .put("coveredCount", if (sessionActive) currentSessionSymbols.size else live.size)
            .put("cachedCount", live.size)
            .put("requestedCount", if (symbols.isEmpty()) live.size else symbols.size)
            .put("missing", JSONArray(missing.toList().sorted()))
            .put("queriedAt", clockMillis())
            .put("providerHealth", health)
            .put("marketCore", "SAIETF_NATIVE")
            .put("closedDates", JSONArray(TradingCalendar.snapshot()))
            .put("holidayNames", JSONObject(TradingCalendar.namesSnapshot()))
            .put("phase", if (isLiveSession(clockMillis())) "live" else "afterHours")
            .also { if (includeIntraday) it.put("intraday", persistence.runtimeSnapshot().optJSONObject("intraday") ?: JSONObject()) }
    }

    private fun healthRow(health: ProviderHealth): JSONObject =
        JSONObject()
            .put("source", health.source.name)
            .put("availability", health.availability.name)
            .put("consecutiveFailures", health.consecutiveFailures)
            .put("lastAttemptEpochMillis", health.lastAttemptEpochMillis ?: JSONObject.NULL)
            .put("lastSuccessEpochMillis", health.lastSuccessEpochMillis ?: JSONObject.NULL)
            .put("nextAllowedEpochMillis", health.nextAllowedEpochMillis)
            .put("circuitState", health.circuitState.name)

    private fun taipeiDate(epochMillis: Long): String =
        Instant.ofEpochMilli(epochMillis).atZone(taipeiZone).toLocalDate().toString()

    private fun isLiveSession(epochMillis: Long): Boolean {
        val local = Instant.ofEpochMilli(epochMillis).atZone(taipeiZone)
        val time = local.toLocalTime()
        return !TradingCalendar.closed(epochMillis) &&
            !time.isBefore(LocalTime.of(9, 0)) &&
            time.isBefore(LocalTime.of(13, 30))
    }
}
