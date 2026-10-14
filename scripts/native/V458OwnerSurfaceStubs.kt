package com.tfasset.app
import android.content.Context
import java.util.concurrent.atomic.AtomicLong
object TfAssetMarketSchedule {
    var allowed=false
    fun allows(context:Context)=allowed
    fun load(context:Context)=Schedule()
    class Schedule {fun nextBoundary(now:Long):Long?=null}
}
class TfAssetWidgetLiveService {companion object {fun ensureStarted(context:Context){}}}
object TfAssetMarketFlowDiagnostics {val snapshots=AtomicLong()}
