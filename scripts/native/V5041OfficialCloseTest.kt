package com.tfasset.app.saietf

import java.time.Instant
import tw.saietf.core.market.MarketDataCenter
import tw.saietf.core.market.MarketQuote
import tw.saietf.core.market.MarketSource
import tw.saietf.core.market.MemoryMarketStore

fun main() {
    val now = Instant.parse("2026-10-27T12:16:00Z").toEpochMilli() // Taipei 20:16
    val staleAt = Instant.parse("2026-10-27T04:56:23Z").toEpochMilli()
    val closeAt = Instant.parse("2026-10-27T05:30:00Z").toEpochMilli()
    val center = MarketDataCenter(providers = emptyList(), hotStore = MemoryMarketStore())
    val fugle = MarketQuote(symbol="2330",price=2385.0,previousClose=2385.0,
        asOfEpochMillis=staleAt,sourceTimestampEpochMillis=staleAt,source=MarketSource.FUGLE,sessionDate="2026-10-27")
    check(center.acceptStreamingQuote(fugle,now,"2026-10-27"))
    val official = MarketQuote(symbol="2330",price=2400.0,previousClose=2385.0,
        asOfEpochMillis=closeAt,sourceTimestampEpochMillis=closeAt,source=MarketSource.TWSE_MIS,sessionDate="2026-10-27")
    var fetched = 0
    val reconciler = OfficialCloseReconciler(
        fetch={ symbols -> fetched++; check(symbols==setOf("2330")); mapOf("2330" to official) },
        current=center::memoryQuotes,
        admit={ quote -> center.acceptStreamingQuote(quote,now,"2026-10-27") },
        clockMillis={now},
    )
    check(reconciler.reconcile(setOf("2330")))
    val selected=center.memoryQuotes(setOf("2330")).getValue("2330")
    check(selected.price==2400.0 && selected.previousClose==2385.0 && selected.source==MarketSource.TWSE_MIS)
    check(!reconciler.reconcile(setOf("2330")) && fetched==1){"No post-close poll loop"}

    val center2=MarketDataCenter(providers=emptyList(),hotStore=MemoryMarketStore())
    check(center2.acceptStreamingQuote(fugle,now,"2026-10-27"))
    val yesterday=official.copy(sourceTimestampEpochMillis=Instant.parse("2026-10-26T05:30:00Z").toEpochMilli(),sessionDate="2026-10-26")
    var calls=0
    val bad=OfficialCloseReconciler(
        fetch={calls++;mapOf("2330" to yesterday)},current=center2::memoryQuotes,
        admit={ q -> center2.acceptStreamingQuote(q,now,"2026-10-27") },clockMillis={now},
    )
    check(!bad.reconcile(setOf("2330")))
    check(center2.memoryQuotes(setOf("2330")).getValue("2330").price==2385.0)
    check(!bad.reconcile(setOf("2330")) && calls==1){"Failed check uses a wake-only cooldown"}
    println("V5.0.41 official close MIS 2400 > stale Fugle 2385; same-day gate; one-shot PASS")
}
