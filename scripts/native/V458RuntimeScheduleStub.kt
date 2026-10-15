package com.tfasset.app
import android.content.Context
internal object TfAssetMarketSchedule {
    var policy=MarketSchedule()
    fun load(context:Context)=policy
    fun allows(context:Context,at:Long=System.currentTimeMillis())=false
}
