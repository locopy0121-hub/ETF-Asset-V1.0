package com.tfasset.app
import android.content.Context
import android.os.Handler
fun main(){
    val app=Context()
    val runtime=TfAssetMarketOwner.runtime(app)
    TfAssetMarketOwner.widgetActive=true
    TfAssetMarketSchedule.allowed=true
    TfAssetMarketSchedule.unlocked=true
    TfAssetMarketOwner.applySchedule(app);Handler.flush()
    check(runtime.resumes==1)
    TfAssetMarketSchedule.unlocked=false
    TfAssetMarketOwner.applySchedule(app);Handler.flush()
    check(runtime.pauses>=1){"Lock must immediately pause socket with Widget still installed"}
    check(app.stops==0){"Retain passive service listener until unlock"}
    val paused=runtime.pauses
    TfAssetMarketOwner.applySchedule(app);Handler.flush()
    check(runtime.pauses>paused && app.stops==0){"Locked state may not reconnect"}
    TfAssetMarketSchedule.unlocked=true
    TfAssetMarketOwner.applySchedule(app);Handler.flush()
    check(runtime.resumes==2){"Unlock must reconnect exactly once per schedule event"}
    TfAssetMarketSchedule.allowed=false
    TfAssetMarketOwner.applySchedule(app);Handler.flush()
    check(runtime.pauses>paused)
    check(app.stops>=1){"After close the background service must stop"}
    check(runtime.settles==0){"No post-close asynchronous quote settlement"}
    val afterClose=runtime.resumes
    TfAssetMarketOwner.applySchedule(app);Handler.flush()
    check(runtime.resumes==afterClose){"After close must not resume quotes"}
    println("Native power policy: open/unlocked live; lock pause; unlock resume; after-hours stop PASS")
}
