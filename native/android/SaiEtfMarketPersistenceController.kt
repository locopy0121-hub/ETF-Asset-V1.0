package com.tfasset.app.saietf

import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import tw.saietf.core.market.MarketDataCenter

class MarketPersistenceController(
    private val scope: CoroutineScope,
    private val marketDataCenter: MarketDataCenter,
    private val repository: MarketPersistenceRepository,
) {
    private val writes = Mutex()
    private val persistedVersions = linkedMapOf<String, String>()
    private var writerJob: Job? = null

    /** No five-second CPU wakeups while locked, closed or unsubscribed. */
    @Synchronized fun setActive(active: Boolean) {
        if (!active) {
            writerJob?.cancel()
            writerJob = null
            return
        }
        if (writerJob?.isActive == true) return
        writerJob = scope.launch {
            while (isActive) {
                delay(PERSIST_INTERVAL_MILLIS)
                flushNow()
            }
        }
    }

    suspend fun flushNow() {
        // Capture inside the same serialized writer as periodic and shutdown
        // flushes. A delayed previous snapshot may not finish after the close.
        writes.withLock {
            val changed = marketDataCenter.memoryQuotes().values.filter { quote ->
                val version = listOf(
                    quote.source.name,
                    quote.sourceTimestampEpochMillis,
                    quote.receivedAtEpochMillis,
                    quote.price,
                    quote.previousClose,
                    quote.volume,
                    quote.sequence,
                ).joinToString("|")
                if (persistedVersions[quote.symbol] == version) false
                else {
                    persistedVersions[quote.symbol] = version
                    true
                }
            }
            if (changed.isNotEmpty()) repository.persist(changed)
        }
    }

    companion object {
        const val PERSIST_INTERVAL_MILLIS = 5_000L
    }
}
