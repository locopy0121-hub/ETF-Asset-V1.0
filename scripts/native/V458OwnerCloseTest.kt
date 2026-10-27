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
    check(app.stops>0){"Lock must end Headless JS foreground service and release its WakeLock"}
    val paused=runtime.pauses
    TfAssetMarketOwner.applySchedule(app);Handler.flush()
    check(runtime.pauses>paused && app.stops>0){"Locked state may not reconnect"}
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
    TfAssetMarketOwner.uiActive=true
    TfAssetMarketSchedule.unlocked=true
    TfAssetMarketOwner.applySchedule(app);Handler.flush()
    check(runtime.officialCloseChecks==1){"Foreground after-hours UI must request one close reconciliation"}
    TfAssetMarketSchedule.unlocked=false
    TfAssetMarketOwner.applySchedule(app);Handler.flush()
    check(runtime.officialCloseChecks==1){"Locked device must not request any close reconciliation"}
    println("Native power policy: open/unlocked live; lock pause; foreground close probe; locked no probe PASS")
}
