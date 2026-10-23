package com.tfasset.app
import android.content.Context
import android.app.KeyguardManager
import android.os.PowerManager
internal object TfAssetMarketSchedule{
    @Volatile private var current:MarketSchedule?=null
    fun load(context:Context):MarketSchedule=current?:synchronized(this){ current?:read(context).also{current=it} }
    private fun read(context:Context):MarketSchedule=MarketSchedule.parse(context.getSharedPreferences("tf_asset_native",0).getString("market_update_schedule","")?:"")?:MarketSchedule()
    fun deviceReady(context:Context):Boolean {
        val power=context.getSystemService(Context.POWER_SERVICE) as PowerManager
        val keyguard=context.getSystemService(Context.KEYGUARD_SERVICE) as KeyguardManager
        return power.isInteractive&&!keyguard.isKeyguardLocked
    }
    fun allows(context:Context,at:Long=System.currentTimeMillis())=marketUpdatesAllowed(load(context).allows(at),deviceReady(context))
    fun save(context:Context,raw:String):Boolean{
        val value=MarketSchedule.parse(raw)?:return false
        val saved=context.getSharedPreferences("tf_asset_native",0).edit().putString("market_update_schedule",value.json().toString()).commit()
        if(saved)current=value
        return saved
    }
}
