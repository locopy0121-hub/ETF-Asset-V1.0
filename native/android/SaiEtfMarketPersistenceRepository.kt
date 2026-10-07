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

    fun runtimeSnapshot(): JSONObject {
        val result = database.marketCoreRuntimeSnapshot()
        val cache = JSONObject(database.loadMarketCoreCache())
        val snapshots = cache.optJSONArray("snapshots") ?: JSONArray()
        val previousCloseBySymbol = linkedMapOf<String, Double>()
        val snapshotBySymbol = linkedMapOf<String, JSONObject>()
        for (index in 0 until snapshots.length()) {
            val row = snapshots.optJSONObject(index) ?: continue
            val symbol = row.optString("symbol").trim().uppercase()
            if (symbol.isBlank()) continue
            snapshotBySymbol[symbol] = row
            val previousClose = row.optDouble("previousClose", Double.NaN)
            if (previousClose.isFinite() && previousClose > 0.0) {
                previousCloseBySymbol[symbol] = previousClose
            }
        }

        val runtimeQuotes = result.optJSONArray("quotes") ?: JSONArray()
        for (index in 0 until runtimeQuotes.length()) {
            val row = runtimeQuotes.optJSONObject(index) ?: continue
            val persisted = snapshotBySymbol[row.optString("symbol").trim().uppercase()] ?: continue
            row.put("sessionDate", persisted.optString("sessionDate"))
                .put("fallbackLevel", persisted.optInt("fallbackLevel", 3))
                .put("sequence", if (persisted.isNull("sequence")) JSONObject.NULL else persisted.optLong("sequence"))
                .put("quoteStatus", persisted.optString("quality", "STALE"))
        }

        val candles = cache.optJSONArray("candles") ?: JSONArray()
        val latestSessionBySymbol = linkedMapOf<String, String>()
        for (index in 0 until candles.length()) {
            val row = candles.optJSONObject(index) ?: continue
            val symbol = row.optString("symbol").trim().uppercase()
            val sessionDate = row.optString("sessionDate").trim()
            if (symbol.isBlank() || sessionDate.isBlank()) continue
            val current = latestSessionBySymbol[symbol]
            if (current == null || sessionDate > current) latestSessionBySymbol[symbol] = sessionDate
        }

        val pointsBySymbol = linkedMapOf<String, JSONArray>()
        for (index in 0 until candles.length()) {
            val row = candles.optJSONObject(index) ?: continue
            val symbol = row.optString("symbol").trim().uppercase()
            val sessionDate = row.optString("sessionDate").trim()
            if (symbol.isBlank() || sessionDate != latestSessionBySymbol[symbol]) continue
            val at = row.optLong("bucketEpochMillis", 0L)
            val close = row.optDouble("close", Double.NaN)
            val source = row.optString("source").trim().uppercase()
            if (at <= 0L || !close.isFinite() || close <= 0.0) continue
            if (source !in setOf("FUGLE", "TWSE_MIS", "YAHOO")) continue
            val quality = if (source == "YAHOO") "backup_realtime" else "trade"
            pointsBySymbol.getOrPut(symbol) { JSONArray() }.put(
                JSONObject()
                    .put("at", at)
                    .put("price", close)
                    .put("quality", quality)
                    .put("source", source),
            )
        }

        val intraday = JSONObject()
        pointsBySymbol.forEach { (symbol, points) ->
            intraday.put(
                symbol,
                JSONObject()
                    .put("date", latestSessionBySymbol[symbol])
                    .put("previousClose", previousCloseBySymbol[symbol] ?: JSONObject.NULL)
                    .put("points", points),
            )
        }
        result.put("intraday", intraday)
        return result
    }

    fun persistedQuotes(): Map<String, MarketQuote> {
        val root = JSONObject(database.loadMarketCoreCache())
        val rows = root.optJSONArray("snapshots") ?: JSONArray()
        val result = linkedMapOf<String, MarketQuote>()
        for (index in 0 until rows.length()) {
            val row = rows.optJSONObject(index) ?: continue
            val quote = persistedMarketQuote(row) ?: continue
            result[quote.symbol] = quote
        }
        return result
    }

    private fun taipeiDate(epochMillis: Long): String =
        java.time.Instant.ofEpochMilli(epochMillis)
            .atZone(java.time.ZoneId.of("Asia/Taipei"))
            .toLocalDate()
            .toString()
}
