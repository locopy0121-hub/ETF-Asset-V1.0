package com.tfasset.app.saietf

import com.tfasset.app.MarketSchedule
import java.time.Instant
import tw.saietf.core.market.MarketQuote

/** One lifecycle-triggered final-trade reconciliation, never an after-hours timer. */
internal class FugleSessionCloseReconciler(
    private val fetch: (Set<String>, () -> Boolean) -> Map<String,MarketQuote>,
    private val current: (Set<String>) -> Map<String,MarketQuote>,
    private val admit: (MarketQuote) -> Boolean,
    private val clockMillis: () -> Long = System::currentTimeMillis,
) {
    private val attempted=mutableMapOf<String,Long>()

    @Synchronized fun reconcile(symbols:Set<String>,schedule:MarketSchedule):Boolean {
        val now=clockMillis()
        if(!eligible(schedule,now,SETTLEMENT_GRACE_MILLIS))return false
        val date=Instant.ofEpochMilli(now).atZone(MarketSchedule.ZONE).toLocalDate().toString()
        val existing=current(symbols)
        val pending=symbols.filter { symbol ->
            val quote=existing[symbol]
            !(quote?.isClose==true && quote.sessionDate==date) &&
                now-(attempted["$date|$symbol"] ?: 0L)>=RETRY_COOLDOWN_MILLIS
        }.toSet()
        if(pending.isEmpty())return false
        attempted.keys.removeAll{!it.startsWith("$date|")}
        var changed=false
        // Charge only dispatched requests. A slow early holding must not give
        // the unrequested tail a cooldown or starve it on the next lifecycle.
        for(symbol in pending.sortedBy{attempted["$date|$it"] ?: 0L}) {
            if(clockMillis()-now>=REQUEST_BUDGET_MILLIS)break
            attempted["$date|$symbol"]=clockMillis()
            fetch(setOf(symbol)){clockMillis()-now<REQUEST_BUDGET_MILLIS}.values.forEach { quote ->
                // A heartbeat, trial, prior-day response or ordinary intraday last trade
                // cannot prove that the closing snapshot was obtained.
                if(quote.symbol==symbol && quote.isClose && !quote.isTrial && quote.sessionDate==date &&
                    quote.sourceTimestampEpochMillis<=clockMillis()+120_000L) {
                    changed=admit(quote)||changed
                }
            }
        }
        return changed
    }

    companion object {
        const val SETTLEMENT_GRACE_MILLIS=5_000L
        private const val RETRY_COOLDOWN_MILLIS=60_000L
        private const val REQUEST_BUDGET_MILLIS=15_000L
        fun eligible(schedule:MarketSchedule,now:Long,grace:Long=0L):Boolean {
            val local=Instant.ofEpochMilli(now).atZone(MarketSchedule.ZONE)
            val end=local.toLocalDate().atTime(13,30).atZone(MarketSchedule.ZONE).toInstant().toEpochMilli()
            return schedule.enabled && schedule.end==810 && local.dayOfWeek.value in schedule.weekdays &&
                !TradingCalendar.closed(now) && now>=end+grace
        }
    }
}
