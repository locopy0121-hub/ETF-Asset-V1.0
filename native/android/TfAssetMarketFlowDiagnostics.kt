package com.tfasset.app
import java.util.concurrent.atomic.AtomicLong
import org.json.JSONObject
import org.json.JSONArray

/** Counts and durations only: no symbols, prices, balances, credentials or quote payloads. */
internal object TfAssetMarketFlowDiagnostics{
 const val ACTION="com.tfasset.app.MARKET_FLOW_DIAGNOSTICS"
 val trades=AtomicLong();val snapshots=AtomicLong();val emitFailures=AtomicLong()
 val renderRequests=AtomicLong();val renders=AtomicLong();val maxRenderMs=AtomicLong()
 private val serial=AtomicLong();private val history=ArrayDeque<JSONObject>()
 private val sourceHistory=ArrayDeque<JSONObject>()
 private val sourceListeners=java.util.concurrent.CopyOnWriteArraySet<(String)->Unit>()
 fun addSourceListener(listener:(String)->Unit){sourceListeners.add(listener)}
 fun removeSourceListener(listener:(String)->Unit){sourceListeners.remove(listener)}
 fun sourceCheckpoint(state:JSONObject){
  val raw=synchronized(this){
   val row=JSONObject(state.toString()).put("id",System.currentTimeMillis().toString()+"-"+serial.incrementAndGet())
   sourceHistory.addLast(row);while(sourceHistory.size>8)sourceHistory.removeFirst();row.toString()
  }
  sourceListeners.forEach{listener->runCatching{listener(raw)}}
 }
 fun rendered(elapsedNanos:Long){renders.incrementAndGet();val ms=elapsedNanos/1_000_000L;maxRenderMs.updateAndGet{old->maxOf(old,ms)}}
 @Synchronized fun checkpoint(reason:String,ui:Boolean,writer:Boolean,probeLagMs:Long=0L):String{
  val row=JSONObject().put("id",System.currentTimeMillis().toString()+"-"+serial.incrementAndGet()).put("reason",reason)
   .put("trades",trades.get()).put("snapshots",snapshots.get()).put("emitFailures",emitFailures.get())
   .put("requests",renderRequests.get()).put("renders",renders.get()).put("maxRenderMs",maxRenderMs.get()).put("ui",ui).put("writer",writer).put("probeLagMs",probeLagMs)
  history.addLast(row);while(history.size>8)history.removeFirst();return row.toString()
 }
 @Synchronized fun read():String=JSONArray((history+sourceHistory).map{JSONObject(it.toString())}).toString()
}
