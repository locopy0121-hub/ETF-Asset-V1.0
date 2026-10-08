package com.tfasset.app.saietf

import android.content.Context
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
import tw.saietf.core.market.MarketQuote
import tw.saietf.core.market.MarketSource
import tw.saietf.core.market.ProviderHealth
import tw.saietf.core.market.QuoteQuality

class SaiEtfMarketRuntime(context: Context, private val onLiveSnapshot: (String) -> Unit = {}) {
    private val appContext = context.applicationContext
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private val taipeiZone = ZoneId.of("Asia/Taipei")
    private val version = AtomicLong(System.currentTimeMillis())
    @Volatile private var trackedSymbols: Set<String> = emptySet()
    @Volatile private var paused = false
    private val fallbackInFlight = AtomicBoolean(false)
    private val keyStore = FugleApiKeyStore(appContext)
    private val persistence = MarketPersistenceRepository(appContext)
    private val fugle = FugleWebSocketProvider(apiKeyProvider = keyStore::load)
    private val center = MarketDataCenter(
        providers = listOf(
            TwseMisQuoteProvider(),
            YahooQuoteProvider(),
        ),
    )
    init {
        center.restorePersistedQuotes(persistence.persistedQuotes().values)
    }
    @Volatile private var latestProviderHealth: List<ProviderHealth> =
        center.providerHealthSnapshot(System.currentTimeMillis())

    private val persistenceController = MarketPersistenceController(
        scope = scope,
        marketDataCenter = center,
        repository = persistence,
    )
    private val streamingController = FugleStreamingController(
        scope = scope,
        provider = fugle,
        marketDataCenter = center,
        onProviderDegraded = { _ ->
            if (!paused && trackedSymbols.isNotEmpty() && isLiveSession(System.currentTimeMillis())
                && fallbackInFlight.compareAndSet(false, true)) {
                scope.launch {
                    try { refresh(trackedSymbols) }
                    finally { fallbackInFlight.set(false) }
                }
            }
        },
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
        fugle.onCredentialChanged()
        return true
    }

    fun loadFugleKey(): String? = keyStore.load()

    fun clearFugleKey(): Boolean {
        keyStore.clear()
        fugle.onCredentialChanged()
        return true
    }

    fun updateSymbols(requested: Collection<String>) {
        val symbols = requested.map { it.trim().uppercase(Locale.US) }
            .filter { it.matches(Regex("[0-9A-Z]{4,10}")) }.toSet()
        trackedSymbols = symbols
        paused = false
        streamingController.updateSymbols(symbols)
    }

    fun pause() {
        paused = true
        streamingController.pause()
        scope.launch { persistenceController.flushNow() }
    }

    @Synchronized fun refresh(requested: Collection<String>): JSONObject {
        val symbols = requested
            .map { it.trim().uppercase(Locale.US) }
            .filter { it.matches(Regex("[0-9A-Z]{4,10}")) }
            .toSet()
        if (symbols.isEmpty()) return snapshot(symbols)

        val now = System.currentTimeMillis()
        val batch = center.refresh(
            symbols = symbols,
            nowEpochMillis = now,
            currentTaipeiDate = taipeiDate(now),
            tradingSessionActive = isLiveSession(now),
        )
        latestProviderHealth = batch.providerHealth
        version.incrementAndGet()
        scope.launch { persistenceController.flushNow() }
        return snapshot(symbols, batch)
    }

    fun snapshot(requested: Collection<String> = emptyList()): JSONObject =
        snapshot(requested.map { it.trim().uppercase(Locale.US) }.filter { it.isNotBlank() }.toSet(), null)

    private fun snapshot(symbols: Set<String>, batch: MarketBatch? = null, includeIntraday: Boolean = true): JSONObject {
        val live = center.memoryQuotes(symbols)

        val rows = JSONArray()
        live.values.sortedBy { it.symbol }.forEach { rows.put(marketQuoteToRuntimeRow(it)) }
        val missing = symbols - live.keys
        val health = JSONArray()
        val allHealth = listOf(streamingController.health()) +
            (batch?.providerHealth ?: latestProviderHealth)
        allHealth.forEach { health.put(healthRow(it)) }

        return JSONObject()
            .put("version", version.get())
            .put("quotes", rows)
            .put("updatedCount", batch?.quotes?.size ?: 0)
            .put("coveredCount", live.size)
            .put("requestedCount", if (symbols.isEmpty()) live.size else symbols.size)
            .put("missing", JSONArray(missing.toList().sorted()))
            .put("queriedAt", System.currentTimeMillis())
            .put("providerHealth", health)
            .put("marketCore", "SAIETF_NATIVE")
            .put("phase", if (isLiveSession(System.currentTimeMillis())) "live" else "afterHours")
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
        return local.dayOfWeek.value < 6 &&
            !time.isBefore(LocalTime.of(9, 0)) &&
            !time.isAfter(LocalTime.of(13, 30))
    }
}
