package com.tfasset.app
import android.content.Context
import android.os.Handler
fun main(){
    val app=Context()
    val runtime=TfAssetMarketOwner.runtime(app)
    TfAssetMarketOwner.widgetActive=true
    // First native lifecycle edge precedes ledger/symbol hydration.
    TfAssetMarketOwner.applySchedule(app);Handler.flush()
    check(runtime.pauses==1)
    val initialStops=app.stops
    runtime.canSettle=true
    TfAssetMarketOwner.applySchedule(app);Handler.flush()
    check(runtime.settles==1){"Cold launch must retry once tracked symbols hydrate"}
    check(app.stops==initialStops){"Closing boundary must not kill headless writer before final source projection"}
    TfAssetMarketOwner.applySchedule(app);Handler.flush();check(runtime.settles==1)
    runtime.callback!!(57);Handler.flush()
    TfAssetMarketOwner.acknowledgeSurface(app,56);Handler.flush();check(app.stops==initialStops)
    TfAssetMarketOwner.acknowledgeSurface(app,57);Handler.flush();check(app.stops==initialStops+1)
    // Simulate actual service destruction and a later UI resume.
    TfAssetMarketOwner.stopWidget(app);Handler.flush()
    TfAssetMarketOwner.resumeUi(app);Handler.flush()
    check(runtime.settles==2){"A later foreground lifecycle retries an unconfirmed close through coordinator cooldown"}
    val late=runtime.callback!!
    TfAssetMarketSchedule.allowed=true
    TfAssetMarketOwner.applySchedule(app);Handler.flush()
    val stops=app.stops
    late(58);Handler.flush();TfAssetMarketOwner.acknowledgeSurface(app,58);Handler.flush()
    check(app.stops==stops){"Obsolete close callback cannot stop resumed session"}
    TfAssetMarketSchedule.allowed=false
    TfAssetMarketOwner.applySchedule(app);Handler.flush()
    Handler.delayed.toList().forEach{it.run()};Handler.flush()
    check(app.stops==stops+1){"Missing JS ACK must stop within bounded deadline"}
    println("V4.0.58 actual process owner: close drain / version ACK / duplicate / resume race PASS")
}
