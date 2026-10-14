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
    private var writerJob: Job? = null

    init {
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
            val snapshot = marketDataCenter.memoryQuotes().values
            if (snapshot.isNotEmpty())repository.persist(snapshot)
        }
    }

    companion object {
        const val PERSIST_INTERVAL_MILLIS = 5_000L
    }
}
