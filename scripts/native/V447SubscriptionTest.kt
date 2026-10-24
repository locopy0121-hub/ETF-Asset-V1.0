package com.tfasset.app.saietf

import org.json.JSONObject
import tw.saietf.core.market.MarketDataCenter
import tw.saietf.core.market.MarketSource
import java.time.Instant

fun main() {
    val now=Instant.parse("2026-10-12T04:41:00Z").toEpochMilli()
    val payload=JSONObject().put("symbol","009816").put("date","2026-10-12")
        .put("referencePrice",16.87).put("lastPrice",999.0).put("isTrial",true)
        .put("lastTrade",JSONObject().put("price",16.91).put("time",(now-1000)*1000).put("serial",20))
    val first=parseFugleRestQuote(payload,"009816",now)!!
    check(first.price==16.91){"Only lastTrade may bootstrap a LIVE price, never lastPrice/trial"}
    check(first.previousClose==16.87)
    check(first.sourceTimestampEpochMillis==now-1000)
    check(first.source==MarketSource.FUGLE)
    val center=MarketDataCenter(emptyList())
    check(center.acceptStreamingQuote(first,now,"2026-10-12"))
    val tick=first.copy(price=16.95,sourceTimestampEpochMillis=now,asOfEpochMillis=now,sequence=21)
    check(center.acceptStreamingQuote(tick,now,"2026-10-12"))
    check(!center.acceptStreamingQuote(first,now,"2026-10-12"))
    check(center.memoryQuotes()["009816"]!!.price==16.95){"Late bootstrap must not overwrite stream"}
    payload.getJSONObject("lastTrade").remove("time")
    check(parseFugleRestQuote(payload,"009816",now)==null){"Missing source clock must not become now"}
    payload.getJSONObject("lastTrade").put("time",(now+121000)*1000)
    check(parseFugleRestQuote(payload,"009816",now)==null)
    payload.getJSONObject("lastTrade").put("time",(now-86400000)*1000)
    check(parseFugleRestQuote(payload,"009816",now)==null){"Wrong-session HTTP data is not LIVE"}
    val streamFirstCenter=MarketDataCenter(emptyList())
    val sink=FugleLiveQuoteSink(streamFirstCenter)
    check(sink.accept(tick.copy(previousClose=null),now,"2026-10-12"))
    sink.acceptBaseline(first,now,"2026-10-12")
    val enriched=sink.enrich(streamFirstCenter.memoryQuotes().getValue("009816"))
    check(enriched.price==16.95 && enriched.sourceTimestampEpochMillis==now && enriched.sequence==21L)
    check(enriched.previousClose==16.87){"Late reference enriches current trade without price rollback"}
    val pool=java.util.concurrent.Executors.newFixedThreadPool(8)
    val start=java.util.concurrent.CountDownLatch(1)
    (22L..521L).reversed().forEach { serial -> pool.submit {
        start.await()
        sink.accept(tick.copy(price=16.95+serial/10000.0,sequence=serial,sourceTimestampEpochMillis=now+serial),now+1000,"2026-10-12")
    } }
    start.countDown();pool.shutdown();check(pool.awaitTermination(10,java.util.concurrent.TimeUnit.SECONDS))
    check(streamFirstCenter.memoryQuotes().getValue("009816").sequence==521L){"Concurrent native admissions must retain newest tick"}
    println("V4.0.47 native Fugle bootstrap: real trade/clock/reference/session/late-response PASS")
}
