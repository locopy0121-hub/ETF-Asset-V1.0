package com.tfasset.app
import android.content.Context
import java.util.concurrent.atomic.AtomicLong
object TfAssetMarketSchedule {
    var allowed=false
    var unlocked=true
    fun deviceReady(context:Context)=unlocked
    fun allows(context:Context)=allowed&&unlocked
    fun load(context:Context)=Schedule()
    class Schedule {fun allows(now:Long)=allowed;fun nextBoundary(now:Long):Long?=null}
}
class TfAssetWidgetLiveService {companion object {fun ensureStarted(context:Context){}}}
object TfAssetMarketFlowDiagnostics {val snapshots=AtomicLong()}
