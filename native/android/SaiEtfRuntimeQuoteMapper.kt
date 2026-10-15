package com.tfasset.app.saietf

import java.time.Instant
import java.time.ZoneId
import org.json.JSONObject
import tw.saietf.core.market.MarketQuote
import tw.saietf.core.market.MarketSource
import tw.saietf.core.market.QuoteQuality

/** Provenance and freshness are separate: an old z is still an actual trade. */
fun marketQuoteToRuntimeRow(quote: MarketQuote): JSONObject {
    val trade = quote.source == MarketSource.FUGLE || quote.source == MarketSource.TWSE_MIS
    val quality = if (trade) "trade" else "backup_realtime"
    val market = when {
        quote.market.orEmpty().contains("OTC", true) || quote.exchange.orEmpty().contains("TPEX", true) -> "OTC"
        quote.market.orEmpty().contains("TSE", true) || quote.exchange.orEmpty().contains("TWSE", true) -> "TSE"
        else -> "UNKNOWN"
    }
    val session = quote.sessionDate ?: Instant.ofEpochMilli(quote.sourceTimestampEpochMillis)
        .atZone(ZoneId.of("Asia/Taipei")).toLocalDate().toString()
    return JSONObject()
        .put("symbol", quote.symbol).put("name", quote.name)
        .put("currentPrice", quote.price).put("previousClose", quote.previousClose ?: JSONObject.NULL)
        .put("officialTradePrice", if (quote.source == MarketSource.TWSE_MIS) quote.price else JSONObject.NULL)
        .put("sourceQuoteAt", quote.sourceTimestampEpochMillis)
        .put("quality", quality).put("source", quote.source.name)
        .put("priceType", if (trade) "REALTIME_TRADE" else "BACKUP_REALTIME")
        .put("isFallback", !trade).put("market", market)
        .put("statusMessage", "SaiETF MarketDataCenter · ${quote.source.name} · ${quote.quality.name}")
        .put("checkedAt", quote.receivedAtEpochMillis).put("volume", quote.volume ?: JSONObject.NULL)
        .put("sessionDate", session).put("fallbackLevel", quote.fallbackLevel)
        .put("sequence", quote.sequence ?: JSONObject.NULL).put("quoteStatus", quote.quality.name)
}

/** Market-only stored snapshots retain their original provider and source clock. */
fun persistedMarketQuote(row: JSONObject): MarketQuote? {
    val symbol = row.optString("symbol").trim().uppercase()
    val price = row.optDouble("price", Double.NaN)
    val sourceAt = row.optLong("sourceTimestampEpochMillis", 0L)
    val source = runCatching { MarketSource.valueOf(row.optString("source")) }.getOrNull() ?: return null
    if (!symbol.matches(Regex("[0-9A-Z]{4,8}")) || !price.isFinite() || price <= 0.0 || sourceAt <= 0L) return null
    if (source == MarketSource.CACHE || row.optString("priceKind") in setOf("bid", "ask")) return null
    fun positive(key: String) = row.optDouble(key, Double.NaN).takeIf { it.isFinite() && it > 0.0 }
    return MarketQuote(
        symbol = symbol, name = row.optString("name", symbol),
        exchange = row.optString("exchange").takeIf { it.isNotBlank() && it != "null" },
        market = row.optString("market").takeIf { it.isNotBlank() && it != "null" },
        price = price, previousClose = positive("previousClose"),
        open = positive("open"), high = positive("high"), low = positive("low"),
        asOfEpochMillis = sourceAt, source = source,
        quality = runCatching { QuoteQuality.valueOf(row.optString("quality")) }.getOrDefault(QuoteQuality.OFFLINE),
        volume = if (row.isNull("volume")) null else row.optLong("volume"),
        bid = positive("bid"), ask = positive("ask"),
        sourceTimestampEpochMillis = sourceAt,
        receivedAtEpochMillis = row.optLong("receivedAtEpochMillis", sourceAt),
        sessionDate = row.optString("sessionDate").takeIf { it.isNotBlank() },
        fallbackLevel = row.optInt("fallbackLevel", 3),
        sequence = if (row.isNull("sequence")) null else row.optLong("sequence"),
        isClose = row.optBoolean("isClose", false),
    )
}

fun parseMisSourceTimestamp(row: JSONObject, now: Long = System.currentTimeMillis()): Long? {
    val date = row.optString("d")
    val time = row.optString("t")
    val at = if (date.isNotBlank() && time.isNotBlank() && time != "-") {
        if (!date.matches(Regex("[0-9]{8}")) || !time.matches(Regex("[0-9]{2}:[0-9]{2}:[0-9]{2}"))) return null
        runCatching {
            java.time.LocalDate.parse(date, java.time.format.DateTimeFormatter.BASIC_ISO_DATE)
                .atTime(java.time.LocalTime.parse(time)).atZone(ZoneId.of("Asia/Taipei"))
                .toInstant().toEpochMilli()
        }.getOrNull() ?: return null
    } else {
        row.optString("tlong").toLongOrNull() ?: return null
    }
    return at.takeIf { it > 0L && it <= now + 120_000L && it >= now - 31L * 86_400_000L }
}
