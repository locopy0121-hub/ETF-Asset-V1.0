package tw.saietf.core.market

import java.time.Instant
import java.time.ZoneId
import java.util.Locale

/**
 * TF Asset startup adapter to SaiETF's frozen core.
 *
 * SaiETF's MarketDataCenter does not expose restorePersistedQuotes.
 * Warm only bounded, original-provider reference quotes into the constructor's
 * MemoryMarketStore; never edit the core or relabel an old trade as LIVE.
 */
fun cachedSaiEtfMarketReferences(
    quotes: Collection<MarketQuote>,
    nowEpochMillis: Long = System.currentTimeMillis(),
): Map<String, MarketQuote> {
    val taipeiZone = ZoneId.of("Asia/Taipei")
    val currentSession = Instant.ofEpochMilli(nowEpochMillis).atZone(taipeiZone).toLocalDate()
    val sevenDays = 7L * 24L * 60L * 60L * 1_000L
    return quotes.mapNotNull { quote ->
        val symbol = quote.symbol.trim().uppercase(Locale.US)
        val sourceAt = quote.sourceTimestampEpochMillis
        if (symbol.isEmpty() || !quote.price.isFinite() || quote.price <= 0.0 ||
            quote.source == MarketSource.CACHE || quote.isTrial ||
            sourceAt <= 0L || sourceAt > nowEpochMillis + 120_000L ||
            nowEpochMillis - sourceAt > sevenDays
        ) return@mapNotNull null
        val sourceSession = Instant.ofEpochMilli(sourceAt).atZone(taipeiZone).toLocalDate()
        val age = (nowEpochMillis - sourceAt).coerceAtLeast(0L)
        val quality = when {
            sourceSession != currentSession -> QuoteQuality.STALE
            age <= 30_000L -> QuoteQuality.LIVE
            else -> QuoteQuality.DELAYED
        }
        quote.copy(
            symbol = symbol,
            asOfEpochMillis = sourceAt,
            sessionDate = sourceSession.toString(),
            quality = quality,
        )
    }.associateBy { it.symbol }
}
