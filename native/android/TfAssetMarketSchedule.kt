package com.tfasset.app
import android.content.Context
internal object TfAssetMarketSchedule{
    @Volatile private var current:MarketSchedule?=null
    fun load(context:Context):MarketSchedule=current?:synchronized(this){ current?:read(context).also{current=it} }
    private fun read(context:Context):MarketSchedule=MarketSchedule.parse(context.getSharedPreferences("tf_asset_native",0).getString("market_update_schedule","")?:"")?:MarketSchedule()
    fun allows(context:Context,at:Long=System.currentTimeMillis())=load(context).allows(at)
    fun save(context:Context,raw:String):Boolean{
        val value=MarketSchedule.parse(raw)?:return false
        val saved=context.getSharedPreferences("tf_asset_native",0).edit().putString("market_update_schedule",value.json().toString()).commit()
        if(saved)current=value
        return saved
    }
}
