package com.tfasset.app.saietf

import android.content.Context
import com.tfasset.app.TfAssetMarketDatabase
import org.json.JSONArray
import org.json.JSONObject
import tw.saietf.core.market.MarketQuote
import tw.saietf.core.market.MarketSource
import tw.saietf.core.market.QuoteQuality

class MarketPersistenceRepository(context: Context) {
    private val database = TfAssetMarketDatabase(context.applicationContext)

    suspend fun persist(
        quotes: Collection<MarketQuote>,
        persistedAtEpochMillis: Long = System.currentTimeMillis(),
    ) {
        if (quotes.isEmpty()) return
        val snapshots = JSONArray()
        val candles = JSONArray()
        quotes.forEach { quote ->
            val sessionDate = quote.sessionDate?.takeIf { it.isNotBlank() }
                ?: taipeiDate(quote.sourceTimestampEpochMillis)
            snapshots.put(
                JSONObject()
                    .put("symbol", quote.symbol)
                    .put("name", quote.name)
                    .put("exchange", quote.exchange ?: JSONObject.NULL)
                    .put("market", quote.market ?: JSONObject.NULL)
                    .put("price", quote.price)
                    .put("previousClose", quote.previousClose ?: JSONObject.NULL)
                    .put("open", quote.open ?: JSONObject.NULL)
                    .put("high", quote.high ?: JSONObject.NULL)
                    .put("low", quote.low ?: JSONObject.NULL)
                    .put("volume", quote.volume ?: JSONObject.NULL)
                    .put("bid", quote.bid ?: JSONObject.NULL)
                    .put("ask", quote.ask ?: JSONObject.NULL)
                    .put("source", quote.source.name)
                    .put("quality", quote.quality.name)
                    .put("sourceTimestampEpochMillis", quote.sourceTimestampEpochMillis)
                    .put("receivedAtEpochMillis", quote.receivedAtEpochMillis)
                    .put("sessionDate", sessionDate)
                    .put("fallbackLevel", quote.fallbackLevel)
                    .put("sequence", quote.sequence ?: JSONObject.NULL)
                    .put("isClose", quote.isClose)
                    .put("priceKind", "lastTrade")
            )
            if (quote.sourceTimestampEpochMillis > 0L && quote.price.isFinite() && quote.price > 0.0) {
                val bucket = quote.sourceTimestampEpochMillis - quote.sourceTimestampEpochMillis % 60_000L
                candles.put(
                    JSONObject()
                        .put("symbol", quote.symbol)
                        .put("sessionDate", sessionDate)
                        .put("bucketEpochMillis", bucket)
                        .put("open", quote.price)
                        .put("high", quote.price)
                        .put("low", quote.price)
                        .put("close", quote.price)
                        .put("volume", quote.volume ?: 0L)
                        .put("source", quote.source.name)
                        .put("updatedAtEpochMillis", persistedAtEpochMillis)
                )
            }
        }
        database.persistMarketCoreCache(
            JSONObject()
                .put("schema", 4)
                .put("snapshots", snapshots)
                .put("candles", candles)
                .put("persistedAtEpochMillis", persistedAtEpochMillis)
                .toString(),
        )
    }

    fun runtimeSnapshot(): JSONObject = database.marketCoreRuntimeSnapshot()

    fun persistedQuotes(): Map<String, MarketQuote> {
        val root = JSONObject(database.loadMarketCoreCache())
        val rows = root.optJSONArray("snapshots") ?: JSONArray()
        val result = linkedMapOf<String, MarketQuote>()
        for (index in 0 until rows.length()) {
            val row = rows.optJSONObject(index) ?: continue
            val symbol = row.optString("symbol").trim().uppercase()
            val price = row.optDouble("price", Double.NaN)
            val sourceAt = row.optLong("sourceTimestampEpochMillis", 0L)
            if (symbol.isBlank() || !price.isFinite() || price <= 0.0 || sourceAt <= 0L) continue
            result[symbol] = MarketQuote(
                symbol = symbol,
                name = row.optString("name", symbol),
                exchange = row.optString("exchange").takeIf { it.isNotBlank() },
                market = row.optString("market").takeIf { it.isNotBlank() },
                price = price,
                previousClose = row.optDouble("previousClose", Double.NaN).takeIf { it.isFinite() && it > 0.0 },
                open = row.optDouble("open", Double.NaN).takeIf { it.isFinite() && it > 0.0 },
                high = row.optDouble("high", Double.NaN).takeIf { it.isFinite() && it > 0.0 },
                low = row.optDouble("low", Double.NaN).takeIf { it.isFinite() && it > 0.0 },
                asOfEpochMillis = sourceAt,
                source = runCatching { MarketSource.valueOf(row.optString("source")) }.getOrDefault(MarketSource.CACHE),
                quality = runCatching { QuoteQuality.valueOf(row.optString("quality")) }.getOrDefault(QuoteQuality.OFFLINE),
                volume = if (row.isNull("volume")) null else row.optLong("volume"),
                bid = row.optDouble("bid", Double.NaN).takeIf { it.isFinite() && it > 0.0 },
                ask = row.optDouble("ask", Double.NaN).takeIf { it.isFinite() && it > 0.0 },
                sourceTimestampEpochMillis = sourceAt,
                receivedAtEpochMillis = row.optLong("receivedAtEpochMillis", sourceAt),
                sessionDate = row.optString("sessionDate").takeIf { it.isNotBlank() },
                fallbackLevel = row.optInt("fallbackLevel", 3),
                sequence = if (row.isNull("sequence")) null else row.optLong("sequence"),
                isClose = row.optBoolean("isClose", false),
            )
        }
        return result
    }

    private fun taipeiDate(epochMillis: Long): String =
        java.time.Instant.ofEpochMilli(epochMillis)
            .atZone(java.time.ZoneId.of("Asia/Taipei"))
            .toLocalDate()
            .toString()
}
