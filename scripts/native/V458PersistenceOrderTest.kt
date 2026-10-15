package com.tfasset.app.saietf
import android.content.Context
import java.time.Instant
import kotlinx.coroutines.*
import tw.saietf.core.market.*
fun main()=runBlocking {
    val now=Instant.parse("2026-10-14T05:30:00Z").toEpochMilli()
    val center=MarketDataCenter(emptyList())
    val first=MarketQuote(symbol="0050",price=113.5,asOfEpochMillis=now-1000,source=MarketSource.FUGLE)
    check(center.acceptStreamingQuote(first,now,"2026-10-14"))
    val scope=CoroutineScope(SupervisorJob()+Dispatchers.Default)
    val controller=MarketPersistenceController(scope,center,MarketPersistenceRepository(Context()))
    val entered=CompletableDeferred<Unit>();val release=CompletableDeferred<Unit>()
    val secondEntered=CompletableDeferred<Unit>()
    MarketPersistenceRepository.beforePersist={quotes->
        if(quotes.single().price==113.5){entered.complete(Unit);release.await()}else secondEntered.complete(Unit)
    }
    // Let the legacy collector catch up too, so the regression is write ordering.
    delay(20)
    val older=scope.async{controller.flushNow()};withTimeout(2000){entered.await()}
    check(center.acceptStreamingQuote(first.copy(price=114.0,sourceTimestampEpochMillis=now,isClose=true),now,"2026-10-14"))
    delay(20)
    val final=scope.async{controller.flushNow()}
    withTimeoutOrNull(100){secondEntered.await()}
    release.complete(Unit);withTimeout(2000){older.await();final.await()}
    check(MarketPersistenceRepository.stored.getValue("0050").price==114.0){"Late old flush must not overwrite the final close"}
    MarketPersistenceRepository.beforePersist=null;scope.cancel()
    println("V4.0.58 production persistence controller: overlapped old/final flush remains newest PASS")
}
