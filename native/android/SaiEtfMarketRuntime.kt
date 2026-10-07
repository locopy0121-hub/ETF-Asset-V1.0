package com.tfasset.app.saietf

import android.content.Context
import java.time.Instant
import java.time.LocalTime
import java.time.ZoneId
import java.util.Locale
import java.util.concurrent.atomic.AtomicLong
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import org.json.JSONArray
import org.json.JSONObject
import tw.saietf.core.market.MarketBatch
import tw.saietf.core.market.MarketDataCenter
import tw.saietf.core.market.MarketQuote
import tw.saietf.core.market.MarketSource
import tw.saietf.core.market.ProviderHealth
import tw.saietf.core.market.QuoteQuality

class SaiEtfMarketRuntime(context: Context) {
    private val appContext = context.applicationContext
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private val taipeiZone = ZoneId.of("Asia/Taipei")
    private val version = AtomicLong(System.currentTimeMillis())
    private val keyStore = FugleApiKeyStore(appContext)
    private val persistence = MarketPersistenceRepository(appContext)
    private val fugle = FugleWebSocketProvider(apiKeyProvider = keyStore::load)
    private val center = MarketDataCenter(
        providers = listOf(
            TwseMisQuoteProvider(),
            YahooQuoteProvider(),
        ),
    )
    private val persistenceController = MarketPersistenceController(
        scope = scope,
        marketDataCenter = center,
        repository = persistence,
    )
    private val streamingController = FugleStreamingController(
        scope = scope,
        provider = fugle,
        marketDataCenter = center,
    )

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

    fun refresh(requested: Collection<String>): JSONObject {
        val symbols = requested
            .map { it.trim().uppercase(Locale.US) }
            .filter { it.matches(Regex("[0-9A-Z]{4,10}")) }
            .toSet()
        streamingController.updateSymbols(symbols)
        if (symbols.isEmpty()) return snapshot(symbols)

        val now = System.currentTimeMillis()
        val batch = center.refresh(
            symbols = symbols,
            nowEpochMillis = now,
            currentTaipeiDate = taipeiDate(now),
            tradingSessionActive = isLiveSession(now),
        )
        version.incrementAndGet()
        scope.launch { persistenceController.flushNow() }
        return snapshot(symbols, batch)
    }

    fun snapshot(requested: Collection<String> = emptyList()): JSONObject =
        snapshot(requested.map { it.trim().uppercase(Locale.US) }.filter { it.isNotBlank() }.toSet(), null)

    private fun snapshot(symbols: Set<String>, batch: MarketBatch? = null): JSONObject {
        val live = center.memoryQuotes(symbols)
        if (live.isEmpty()) {
            val persisted = persistence.runtimeSnapshot()
            if (symbols.isEmpty()) return persisted.put("marketCore", "SAIETF_NATIVE")
            val source = persisted.optJSONArray("quotes") ?: JSONArray()
            val rows = JSONArray()
            for (i in 0 until source.length()) {
                val row = source.optJSONObject(i) ?: continue
                if (row.optString("symbol") in symbols) rows.put(row)
            }
            return JSONObject(persisted.toString())
                .put("quotes", rows)
                .put("requestedCount", symbols.size)
                .put("coveredCount", rows.length())
                .put("marketCore", "SAIETF_NATIVE")
        }

        val rows = JSONArray()
        live.values.sortedBy { it.symbol }.forEach { rows.put(runtimeRow(it)) }
        val missing = batch?.unresolvedSymbols ?: (symbols - live.keys)
        val health = JSONArray()
        val allHealth = listOf(streamingController.health()) +
            (batch?.providerHealth ?: center.providerHealthSnapshot(System.currentTimeMillis()))
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
    }

    private fun runtimeRow(quote: MarketQuote): JSONObject {
        val trade = quote.quality == QuoteQuality.LIVE &&
            (quote.source == MarketSource.FUGLE || quote.source == MarketSource.TWSE_MIS)
        val backup = quote.quality == QuoteQuality.LIVE || quote.quality == QuoteQuality.DELAYED
        val quality = when {
            trade -> "trade"
            backup -> "backup_realtime"
            else -> "official_close"
        }
        val market = when {
            quote.market.orEmpty().contains("OTC", true) || quote.exchange.orEmpty().contains("TPEX", true) -> "OTC"
            quote.market.orEmpty().contains("TSE", true) || quote.exchange.orEmpty().contains("TWSE", true) -> "TSE"
            else -> "UNKNOWN"
        }
        return JSONObject()
            .put("symbol", quote.symbol)
            .put("name", quote.name)
            .put("currentPrice", quote.price)
            .put("previousClose", quote.previousClose ?: JSONObject.NULL)
            .put("officialTradePrice", if (trade) quote.price else JSONObject.NULL)
            .put("sourceQuoteAt", quote.sourceTimestampEpochMillis)
            .put("quality", quality)
            .put("source", quote.source.name)
            .put("priceType", if (trade) "REALTIME_TRADE" else if (backup) "BACKUP_REALTIME" else "OFFICIAL_CLOSE")
            .put("isFallback", !trade)
            .put("market", market)
            .put("statusMessage", "SaiETF MarketDataCenter · ${quote.source.name} · ${quote.quality.name}")
            .put("checkedAt", quote.receivedAtEpochMillis)
            .put("volume", quote.volume ?: JSONObject.NULL)
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
