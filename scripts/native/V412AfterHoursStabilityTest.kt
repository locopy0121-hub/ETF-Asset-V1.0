import java.time.Instant
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import tw.saietf.core.market.MarketDataCenter
import tw.saietf.core.market.MarketQuote
import tw.saietf.core.market.MarketQuoteProvider
import tw.saietf.core.market.MarketSource
import tw.saietf.core.market.QuoteQuality

private const val SESSION = "2026-10-08"
private val afterClose = Instant.parse("2026-10-08T06:20:00Z").toEpochMilli()
private val close = Instant.parse("2026-10-08T05:30:00Z").toEpochMilli()

private fun quote(
    symbol: String,
    source: MarketSource,
    price: Double,
    at: Long,
    isClose: Boolean = false,
) = MarketQuote(
    symbol = symbol,
    price = price,
    previousClose = price - 1.0,
    asOfEpochMillis = at,
    sourceTimestampEpochMillis = at,
    receivedAtEpochMillis = afterClose,
    source = source,
    quality = QuoteQuality.DELAYED,
    sessionDate = SESSION,
    isClose = isClose,
)

fun main() {
    var coveredFetches = 0
    val coveredProvider = object : MarketQuoteProvider {
        override val source = MarketSource.YAHOO
        override fun fetch(symbols: Set<String>): Map<String, MarketQuote> {
            coveredFetches += 1
            return symbols.associateWith { quote(it, source, 114.8, close + 60_000L) }
        }
    }
    val coveredCenter = MarketDataCenter(listOf(coveredProvider))
    coveredCenter.restorePersistedQuotes(
        listOf(quote("0050", MarketSource.FUGLE, 115.2, close, isClose = true)),
        afterClose,
    )
    val covered = coveredCenter.refresh(setOf("0050"), afterClose, SESSION, false)
    check(coveredFetches == 0) { "After close, a trusted same-session trade must not trigger fallback" }
    check(covered.quotes.getValue("0050").price == 115.2)
    check(coveredCenter.memoryQuotes().getValue("0050").source == MarketSource.FUGLE)

    var requested: Set<String> = emptySet()
    val missingProvider = object : MarketQuoteProvider {
        override val source = MarketSource.YAHOO
        override fun fetch(symbols: Set<String>): Map<String, MarketQuote> {
            requested = symbols
            return symbols.associateWith { quote(it, source, 10.18, close) }
        }
    }
    val partialCenter = MarketDataCenter(listOf(missingProvider))
    partialCenter.restorePersistedQuotes(
        listOf(quote("0050", MarketSource.FUGLE, 115.2, close, isClose = true)),
        afterClose,
    )
    val partial = partialCenter.refresh(setOf("0050", "00406A"), afterClose, SESSION, false)
    check(requested == setOf("00406A")) { "After close, fallback must fetch only uncovered symbols: $requested" }
    check(partial.quotes.getValue("0050").price == 115.2)
    check(partial.quotes.getValue("00406A").price == 10.18)

    val fetchStarted = CountDownLatch(1)
    val releaseFetch = CountDownLatch(1)
    val racingProvider = object : MarketQuoteProvider {
        override val source = MarketSource.YAHOO
        override fun fetch(symbols: Set<String>): Map<String, MarketQuote> {
            fetchStarted.countDown()
            check(releaseFetch.await(5, TimeUnit.SECONDS))
            return mapOf("0050" to quote("0050", source, 114.7, close + 120_000L))
        }
    }
    val racingCenter = MarketDataCenter(listOf(racingProvider))
    val worker = Thread {
        racingCenter.refresh(setOf("0050"), afterClose, SESSION, false)
    }
    worker.start()
    check(fetchStarted.await(2, TimeUnit.SECONDS))
    check(
        racingCenter.acceptStreamingQuote(
            quote("0050", MarketSource.FUGLE, 115.2, close),
            afterClose,
            SESSION,
        ),
    )
    releaseFetch.countDown()
    worker.join(3_000L)
    check(racingCenter.memoryQuotes().getValue("0050").source == MarketSource.FUGLE) {
        "A later fallback response replaced the trusted closing trade"
    }
    check(racingCenter.memoryQuotes().getValue("0050").price == 115.2)

    val boundaryFetchStarted = CountDownLatch(1)
    val releaseBoundaryFetch = CountDownLatch(1)
    val boundaryProvider = object : MarketQuoteProvider {
        override val source = MarketSource.YAHOO
        override fun fetch(symbols: Set<String>): Map<String, MarketQuote> {
            boundaryFetchStarted.countDown()
            check(releaseBoundaryFetch.await(5, TimeUnit.SECONDS))
            return mapOf("0050" to quote("0050", source, 114.7, close + 1_000L))
        }
    }
    val boundaryCenter = MarketDataCenter(listOf(boundaryProvider))
    val boundaryWorker = Thread {
        // The request starts in the final live second and returns after the close tick arrives.
        boundaryCenter.refresh(setOf("0050"), afterClose - 3_001_000L, SESSION, true)
    }
    boundaryWorker.start()
    check(boundaryFetchStarted.await(2, TimeUnit.SECONDS))
    check(
        boundaryCenter.acceptStreamingQuote(
            quote("0050", MarketSource.FUGLE, 115.2, close, isClose = true),
            close,
            SESSION,
        ),
    )
    releaseBoundaryFetch.countDown()
    boundaryWorker.join(3_000L)
    check(boundaryCenter.memoryQuotes().getValue("0050").source == MarketSource.FUGLE) {
        "A request started before 13:30 replaced the closing tick after the boundary"
    }
    check(boundaryCenter.memoryQuotes().getValue("0050").price == 115.2)

    println("V4.0.12 after-hours close retention / missing-only fallback / boundary race protection: PASS")
}
