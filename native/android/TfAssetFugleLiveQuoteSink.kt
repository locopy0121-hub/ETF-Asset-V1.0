package com.tfasset.app.saietf

import java.time.Instant
import java.time.ZoneId
import tw.saietf.core.market.MarketDataCenter
import tw.saietf.core.market.MarketQuote

/** Short atomic admission boundary; network I/O must stay outside this lock. */
internal class FugleLiveQuoteSink(private val center: MarketDataCenter) {
    private val lock=Any()
    private val references=mutableMapOf<String,MarketQuote>()

    fun accept(quote:MarketQuote,now:Long=System.currentTimeMillis(),date:String=taipeiDate(now)):Boolean = synchronized(lock) {
        center.acceptStreamingQuote(enrich(quote),now,date)
    }

    fun acceptBaseline(quote:MarketQuote,now:Long=System.currentTimeMillis(),date:String=taipeiDate(now)):Boolean = synchronized(lock) {
        references[quote.symbol]=quote
        center.acceptStreamingQuote(enrich(quote),now,date)
    }

    /** Metadata enrichment preserves the selected price, trade clock and serial. */
    fun enrich(quote:MarketQuote):MarketQuote = synchronized(lock) {
        val reference=references[quote.symbol]?.takeIf { it.sessionDate==quote.sessionDate }
            ?:center.memoryQuotes(setOf(quote.symbol))[quote.symbol]?.takeIf { it.sessionDate==quote.sessionDate }
        quote.copy(
            previousClose=quote.previousClose?:reference?.previousClose,
            name=if(quote.name==quote.symbol)reference?.name?:quote.name else quote.name,
            open=quote.open?:reference?.open,
            high=quote.high?:reference?.high,
            low=quote.low?:reference?.low,
        )
    }

    private fun taipeiDate(now:Long)=Instant.ofEpochMilli(now).atZone(ZoneId.of("Asia/Taipei")).toLocalDate().toString()
}
