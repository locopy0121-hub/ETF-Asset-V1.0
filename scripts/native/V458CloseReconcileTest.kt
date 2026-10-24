package com.tfasset.app.saietf

import com.tfasset.app.MarketSchedule
import java.time.Instant
import org.json.JSONObject
import tw.saietf.core.market.MarketDataCenter

fun main() {
    var now=Instant.parse("2026-10-14T08:34:00Z").toEpochMilli()
    val source=Instant.parse("2026-10-14T05:30:00Z").toEpochMilli()
    val center=MarketDataCenter(emptyList())
    val sink=FugleLiveQuoteSink(center)
    fun quote(symbol:String,at:Long,price:Double,closed:Boolean)=parseFugleRestQuote(
        JSONObject().put("symbol",symbol).put("isClose",closed)
            .put("lastTrade",JSONObject().put("price",price).put("time",at*1000)),symbol,now)!!
    sink.accept(quote("0050",source-2_299_000,113.50,false),now,"2026-10-14")
    var calls=0;var fail=false
    val reconciler=FugleSessionCloseReconciler(
        fetch={symbols,allowed->calls++;check(allowed());if(fail)emptyMap() else symbols.associateWith{quote(it,source,114.0,true)}},
        current={center.memoryQuotes(it)},admit={sink.acceptBaseline(it,now,"2026-10-14")},clockMillis={now},
    )
    check(reconciler.reconcile(setOf("0050"),MarketSchedule()))
    check(center.memoryQuotes().getValue("0050").price==114.0){"16:34 reopen must replace retained 12:51 trade with final source data"}
    check(center.memoryQuotes().getValue("0050").sourceTimestampEpochMillis==source){"Never replace source time with fetch time"}
    check(!reconciler.reconcile(setOf("0050"),MarketSchedule()) && calls==1){"Confirmed close must not poll"}
    check(!reconciler.reconcile(setOf("00878"),MarketSchedule(enabled=false)))
    check(!reconciler.reconcile(setOf("00878"),MarketSchedule(end=780)))
    now=Instant.parse("2026-10-14T05:30:00Z").toEpochMilli()
    check(!reconciler.reconcile(setOf("00878"),MarketSchedule())){ "Closing response needs settlement grace" }
    now=Instant.parse("2026-10-17T08:34:00Z").toEpochMilli()
    check(!reconciler.reconcile(setOf("00878"),MarketSchedule()))
    now=Instant.parse("2026-10-14T08:34:00Z").toEpochMilli();fail=true
    check(!reconciler.reconcile(setOf("00878"),MarketSchedule()))
    check(!reconciler.reconcile(setOf("00878"),MarketSchedule()) && calls==2){"Repeated lifecycle calls must respect failure cooldown"}
    now+=60_000;fail=false
    check(reconciler.reconcile(setOf("00878"),MarketSchedule()))
    var unconfirmedCalls=0
    val missing=FugleSessionCloseReconciler(fetch={symbols,_->unconfirmedCalls++;symbols.associateWith{quote(it,source-2000,113.5,false)}},current={emptyMap()},admit={error("Do not admit unconfirmed close")},clockMillis={now})
    check(!missing.reconcile(setOf("00919"),MarketSchedule()))
    now+=60_000;check(!missing.reconcile(setOf("00919"),MarketSchedule()) && unconfirmedCalls==2)
    val dispatched=mutableListOf<String>()
    val slow=FugleSessionCloseReconciler(fetch={symbols,allowed->
        symbols.forEach{if(allowed()){dispatched+=it;now+=10_000}};emptyMap()
    },current={emptyMap()},admit={false},clockMillis={now})
    check(!slow.reconcile(linkedSetOf("0050","00878","00919"),MarketSchedule()))
    check(dispatched==listOf("0050","00878")){"Request budget must bound dispatched work"}
    check(!slow.reconcile(linkedSetOf("0050","00878","00919"),MarketSchedule()))
    check(dispatched.last()=="00919" && dispatched.size==3){"Unrequested later holdings must not be cooled down or starved"}
    println("V4.0.58 actual close reconciler: stale repair / source clock / no polling / schedule / cooldown PASS")
}
