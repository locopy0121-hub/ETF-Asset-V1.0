package com.tfasset.app

import android.content.Context
import android.content.Intent
import android.os.Handler
import android.os.Looper
import com.tfasset.app.saietf.SaiEtfMarketRuntime
import java.util.concurrent.CopyOnWriteArraySet

/** One process-wide price owner for the UI and Widget headless task. */
internal object TfAssetMarketOwner {
    @Volatile private var instance:SaiEtfMarketRuntime?=null
    @Volatile var uiActive=false
    @Volatile var widgetActive=false
    private val handler=Handler(Looper.getMainLooper())
    private var boundary:Runnable?=null
    private var closeTimeout:Runnable?=null
    private var closeGeneration=0L
    private var closePending=false
    private var closeSettled=false
    private var closingVersion:Long?=null
    private var lastSurfaceVersion=0L
    private val listeners=CopyOnWriteArraySet<(String)->Unit>()
    fun runtime(context:Context):SaiEtfMarketRuntime = instance?:synchronized(this){
        instance?:SaiEtfMarketRuntime(context.applicationContext){raw->TfAssetMarketFlowDiagnostics.snapshots.incrementAndGet();listeners.forEach{runCatching{it(raw)}}}.also{instance=it}
    }
    fun applySchedule(context:Context,allowStart:Boolean=true){
        val app=context.applicationContext
        handler.post{
            boundary?.let{handler.removeCallbacks(it)};boundary=null
            if(!TfAssetMarketSchedule.allows(app)){
                instance?.pause()
                if(!closePending && !closeSettled && (uiActive||widgetActive)) {
                    closePending=true
                    val generation=++closeGeneration
                    val started=instance?.settleScheduledClose{version->handler.post{
                        if(generation==closeGeneration && closePending) {
                            closingVersion=version
                            if(lastSurfaceVersion>=version)finishClose(app)
                        }
                    }} ?: false
                    if(started) {
                        // A failed HTTP request or absent JS writer must never keep
                        // an after-hours foreground service running indefinitely.
                        val timeout=Runnable{if(generation==closeGeneration)finishClose(app)}
                        closeTimeout=timeout;handler.postDelayed(timeout,30_000L)
                    } else finishClose(app,settled=false)
                } else if(!closePending)app.stopService(Intent(app,TfAssetWidgetLiveService::class.java))
            }else if(uiActive||widgetActive){
                closeGeneration++;closePending=false;closeSettled=false;closingVersion=null
                closeTimeout?.let{handler.removeCallbacks(it)};closeTimeout=null
                instance?.resumeTrackedSymbols()
                if(allowStart)TfAssetWidgetLiveService.ensureStarted(app)
            }
            if(uiActive||widgetActive){
                val now=System.currentTimeMillis()
                TfAssetMarketSchedule.load(app).nextBoundary(now)?.let{at->
                    val task=Runnable{applySchedule(app)};boundary=task
                    handler.postDelayed(task,(at-now).coerceAtLeast(1L))
                }
            }
        }
    }
    fun addListener(listener:(String)->Unit){listeners.add(listener)}
    fun removeListener(listener:(String)->Unit){listeners.remove(listener)}
    fun resumeUi(context:Context){
        uiActive=true
        handler.post{closeSettled=false;applySchedule(context)}
    }
    fun acknowledgeSurface(context:Context,version:Long){handler.post{
        lastSurfaceVersion=maxOf(lastSurfaceVersion,version)
        if(closePending && closingVersion?.let{lastSurfaceVersion>=it}==true)finishClose(context.applicationContext)
    }}
    private fun finishClose(context:Context,settled:Boolean=true){
        closeGeneration++;closePending=false;closeSettled=settled;closingVersion=null
        closeTimeout?.let{handler.removeCallbacks(it)};closeTimeout=null
        context.stopService(Intent(context,TfAssetWidgetLiveService::class.java))
    }
    fun pauseUi(context:Context){uiActive=false;if(!widgetActive)runtime(context).pause();applySchedule(context)}
    fun stopWidget(context:Context){widgetActive=false;if(!uiActive)runtime(context).pause();applySchedule(context,false)}
}
