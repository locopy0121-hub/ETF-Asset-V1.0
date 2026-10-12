package com.tfasset.app

import android.content.Context
import com.tfasset.app.saietf.SaiEtfMarketRuntime
import java.util.concurrent.CopyOnWriteArraySet

/** One process-wide price owner for the UI and Widget headless task. */
internal object TfAssetMarketOwner {
    @Volatile private var instance:SaiEtfMarketRuntime?=null
    @Volatile var uiActive=false
    @Volatile var widgetActive=false
    private val listeners=CopyOnWriteArraySet<(String)->Unit>()
    fun runtime(context:Context):SaiEtfMarketRuntime = instance?:synchronized(this){
        instance?:SaiEtfMarketRuntime(context.applicationContext){raw->listeners.forEach{runCatching{it(raw)}}}.also{instance=it}
    }
    fun addListener(listener:(String)->Unit){listeners.add(listener)}
    fun removeListener(listener:(String)->Unit){listeners.remove(listener)}
    fun pauseUi(context:Context){uiActive=false;if(!widgetActive)runtime(context).pause()}
    fun stopWidget(context:Context){widgetActive=false;if(!uiActive)runtime(context).pause()}
}
