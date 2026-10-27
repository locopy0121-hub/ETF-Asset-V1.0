package com.tfasset.app.saietf

import java.time.Instant
import java.time.ZoneId
import tw.saietf.core.market.MarketQuote
import tw.saietf.core.market.MarketSource

/**
 * A foreground-triggered, once-per-session official MIS closing check.
 * Never wakes a locked device, starts a periodic poll, or changes SaiETF arbitration.
 * Network access happens on the caller's IO dispatcher.
 */
internal class OfficialCloseReconciler(
    private val fetch: (Set<String>) -> Map<String, MarketQuote>,
    private val current: (Set<String>) -> Map<String, MarketQuote>,
    private val admit: (MarketQuote) -> Boolean,
    private val clockMillis: () -> Long = System::currentTimeMillis,
) {
    private val confirmed = mutableSetOf<String>()
    private val attempted = mutableMapOf<String, Long>()

    @Synchronized fun reconcile(symbols: Set<String>): Boolean {
        val now = clockMillis()
        val date = taipeiDate(now)
        confirmed.removeAll { !it.startsWith("$date|") }
        attempted.keys.removeAll { !it.startsWith("$date|") }
        val pending = symbols.filter { symbol ->
            val key = "$date|$symbol"
            key !in confirmed && now - (attempted[key] ?: 0L) >= RETRY_COOLDOWN_MILLIS
        }.toSet()
        if (pending.isEmpty()) return false
        pending.forEach { attempted["$date|$it"] = now }

        val candidates = runCatching { fetch(pending) }.getOrElse { return false }
        var changed = false
        for (symbol in pending) {
            val candidate = candidates[symbol] ?: continue
            if (candidate.symbol != symbol || candidate.source != MarketSource.TWSE_MIS ||
                candidate.isTrial || !candidate.price.isFinite() || candidate.price <= 0.0 ||
                candidate.sourceTimestampEpochMillis <= 0L ||
                candidate.sourceTimestampEpochMillis > clockMillis() + 120_000L ||
                taipeiDate(candidate.sourceTimestampEpochMillis) != date) continue

            // Admission and source-clock ordering remain in the frozen SaiETF core.
            val accepted = admit(candidate)
            val selected = current(setOf(symbol))[symbol]
            if (selected?.source == MarketSource.TWSE_MIS &&
                selected.sourceTimestampEpochMillis == candidate.sourceTimestampEpochMillis &&
                selected.price == candidate.price) confirmed.add("$date|$symbol")
            changed = accepted || changed
        }
        return changed
    }

    private fun taipeiDate(at: Long): String =
        Instant.ofEpochMilli(at).atZone(ZoneId.of("Asia/Taipei")).toLocalDate().toString()

    companion object {
        const val RETRY_COOLDOWN_MILLIS = 120_000L
    }
}
