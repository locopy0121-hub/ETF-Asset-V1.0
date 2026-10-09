import com.tfasset.app.saietf.marketQuoteToRuntimeRow
import com.tfasset.app.saietf.persistedMarketQuote
import com.tfasset.app.saietf.parseMisSourceTimestamp
import org.json.JSONArray
import org.json.JSONObject
import tw.saietf.core.market.*

fun main() {
    val now = java.time.Instant.parse("2026-10-07T15:07:00Z").toEpochMilli()
    val close = java.time.Instant.parse("2026-10-07T05:30:00Z").toEpochMilli()
    val symbols = listOf("00406A", "0050", "00878", "0056", "00919", "00403A", "009816", "00713", "00646")
    val prices = listOf(12.5, 115.05, 22.0, 36.8, 24.5, 10.0, 9.7, 55.2, 70.0)
    val quotes = symbols.mapIndexed { i, symbol -> MarketQuote(symbol=symbol,price=prices[i],previousClose=prices[i]-0.1,
        asOfEpochMillis=close,source=MarketSource.TWSE_MIS,quality=QuoteQuality.DELAYED,
        receivedAtEpochMillis=now,sessionDate="2026-10-07",market="TSE",exchange="TWSE") }
    val rows = JSONArray()
    quotes.forEach { quote ->
        val warm = marketQuoteToRuntimeRow(quote)
        check(warm.getString("quality") == "trade") { "An old actual z was relabeled as backup" }
        check(warm.getString("priceType") == "REALTIME_TRADE")
        check(warm.getString("quoteStatus") == "DELAYED")
        check(warm.getLong("sourceQuoteAt") == close)
        check(warm.getDouble("officialTradePrice") == quote.price)
        val stored = JSONObject().put("symbol",quote.symbol).put("price",quote.price).put("previousClose",quote.previousClose)
            .put("name",quote.name).put("source",quote.source.name).put("quality",quote.quality.name)
            .put("sourceTimestampEpochMillis",close).put("receivedAtEpochMillis",now)
            .put("market","TSE").put("exchange","TWSE").put("sessionDate","2026-10-07").put("priceKind","lastTrade")
            .put("fallbackLevel",quote.fallbackLevel)
        val cold = marketQuoteToRuntimeRow(persistedMarketQuote(stored)!!)
        check(cold.similar(warm)) { "Cold and warm quote contracts differ" }
        rows.put(cold)
    }
    for (status in QuoteQuality.entries) {
        val row=marketQuoteToRuntimeRow(quotes[1].copy(quality=status))
        check(row.getString("quality")=="trade")
        check(row.getString("quoteStatus")==status.name)
    }
    val yahoo=marketQuoteToRuntimeRow(quotes[1].copy(source=MarketSource.YAHOO,quality=QuoteQuality.STALE))
    check(yahoo.getString("quality")=="backup_realtime")
    check(yahoo.isNull("officialTradePrice"))
    check(yahoo.getString("priceType")!="OFFICIAL_CLOSE") { "Stale does not prove official close" }
    val fugle=marketQuoteToRuntimeRow(quotes[1].copy(source=MarketSource.FUGLE))
    check(fugle.isNull("officialTradePrice")) { "Fugle must not impersonate direct TWSE z" }
    check(parseMisSourceTimestamp(JSONObject().put("d","20261007").put("t","13:30:00").put("tlong",now),now)==close)
    check(parseMisSourceTimestamp(JSONObject(),now)==null)
    check(parseMisSourceTimestamp(JSONObject().put("d","20260230").put("t","13:30:00"),now)==null)
    check(parseMisSourceTimestamp(JSONObject().put("tlong",now+120001),now)==null)
    val provider=object:MarketQuoteProvider {
        override val source=MarketSource.TWSE_MIS
        override fun fetch(symbols:Set<String>)=mapOf("0050" to quotes[1].copy(price=115.10,asOfEpochMillis=close+1000,sourceTimestampEpochMillis=close+1000))
    }
    val center=MarketDataCenter(listOf(provider))
    center.restorePersistedQuotes(quotes,now)
    check(center.memoryQuotes().size==9)
    val batch=center.refresh(symbols.toSet(),now,"2026-10-07",false)
    check(batch.unresolvedSymbols.isEmpty()) { "Partial fetch lost restored symbols" }
    check(center.memoryQuotes().size==9)
    check(center.memoryQuotes().getValue("0050").price==115.10)
    check(center.memoryQuotes().getValue("009816").price==9.7)
    val empty=MarketDataCenter(emptyList())
    empty.restorePersistedQuotes(listOf(quotes[1].copy(asOfEpochMillis=now-8*86400000L,sourceTimestampEpochMillis=now-8*86400000L)),now)
    check(empty.memoryQuotes().size==1) { "Last known price was lost by age" }
    empty.restorePersistedQuotes(listOf(quotes[1].copy(sourceTimestampEpochMillis=now+120001)),now)
    check(empty.memoryQuotes().values.first().sourceTimestampEpochMillis==now-8*86400000L)
    val nextSession=MarketDataCenter(emptyList())
    nextSession.restorePersistedQuotes(quotes,now)
    val next=nextSession.refresh(symbols.toSet(),now+86400000L,"2026-10-08",true)
    check(next.quotes.size==9 && next.unresolvedSymbols.isEmpty() && next.quotes.values.all { it.quality != QuoteQuality.LIVE }) { "Old cache must not pretend to be today's live quote" }
    val oldProvider=object:MarketQuoteProvider {
        override val source=MarketSource.TWSE_MIS
        override fun fetch(symbols:Set<String>)=mapOf("0050" to quotes[1])
    }
    val freshProvider=object:MarketQuoteProvider {
        override val source=MarketSource.YAHOO
        override fun fetch(symbols:Set<String>)=mapOf("0050" to quotes[1].copy(source=source,price=116.0,asOfEpochMillis=now+86400000L,sourceTimestampEpochMillis=now+86400000L,sessionDate="2026-10-08"))
    }
    val fallbackCenter=MarketDataCenter(listOf(oldProvider,freshProvider))
    fallbackCenter.refresh(setOf("0050"),now+86400000L,"2026-10-08",true)
    check(fallbackCenter.memoryQuotes().getValue("0050").price==116.0) { "Retained reference blocked newer fallback" }
    // A slow fallback symbol must not hold back other symbols' live memory updates.
    val fallbackStarted=java.util.concurrent.CountDownLatch(1)
    val releaseFallback=java.util.concurrent.CountDownLatch(1)
    val fast=object:MarketQuoteProvider {
        override val source=MarketSource.TWSE_MIS
        override fun fetch(symbols:Set<String>)=mapOf("0050" to quotes[1].copy(
            price=116.0,asOfEpochMillis=now,sourceTimestampEpochMillis=now,sessionDate="2026-10-07"))
    }
    val slow=object:MarketQuoteProvider {
        override val source=MarketSource.YAHOO
        override fun fetch(symbols:Set<String>):Map<String,MarketQuote> {
            fallbackStarted.countDown()
            check(releaseFallback.await(5,java.util.concurrent.TimeUnit.SECONDS))
            return emptyMap()
        }
    }
    val incremental=MarketDataCenter(listOf(fast,slow))
    val worker=Thread { incremental.refresh(setOf("0050","009816"),now,"2026-10-07",true) }
    worker.start()
    try {
        check(fallbackStarted.await(2,java.util.concurrent.TimeUnit.SECONDS))
        check(incremental.memoryQuotes()["0050"]?.price==116.0) { "Fast live quote blocked behind slow fallback" }
        // Simulate a Fugle tick arriving while the provider batch is still running.
        check(incremental.acceptStreamingQuote(quotes[1].copy(source=MarketSource.FUGLE,
            price=117.0,asOfEpochMillis=now+1000,sourceTimestampEpochMillis=now+1000,
            sessionDate="2026-10-07"),now+1000,"2026-10-07"))
    } finally { releaseFallback.countDown();worker.join(3000) }
    check(incremental.memoryQuotes()["0050"]?.price==117.0) { "End-of-batch publish rolled back newer stream tick" }
    println("Native incremental live publish / slow fallback isolation / streaming rollback guard: PASS")
    val fixture=JSONObject().put("version",1).put("queriedAt",now).put("quotes",rows)
    java.io.File(argsPath()).writeText(fixture.toString())
    println("Native quote provenance, cold/warm contract, source clock, nine-symbol restoration: PASS")
}
fun argsPath()=System.getenv("TF_NATIVE_FIXTURE") ?: "/tmp/tf-native-bridge-fixture.json"
