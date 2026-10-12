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
    private val listeners=CopyOnWriteArraySet<(String)->Unit>()
    fun runtime(context:Context):SaiEtfMarketRuntime = instance?:synchronized(this){
        instance?:SaiEtfMarketRuntime(context.applicationContext){raw->listeners.forEach{runCatching{it(raw)}}}.also{instance=it}
    }
    fun applySchedule(context:Context,allowStart:Boolean=true){
        val app=context.applicationContext
        handler.post{
            boundary?.let{handler.removeCallbacks(it)};boundary=null
            if(!TfAssetMarketSchedule.allows(app)){
                instance?.pause()
                app.stopService(Intent(app,TfAssetWidgetLiveService::class.java))
            }else if(uiActive||widgetActive){
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
    fun pauseUi(context:Context){uiActive=false;if(!widgetActive)runtime(context).pause();applySchedule(context)}
    fun stopWidget(context:Context){widgetActive=false;if(!uiActive)runtime(context).pause();applySchedule(context,false)}
}
