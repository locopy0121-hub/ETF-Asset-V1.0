package com.tfasset.app

fun main(){
    for(widgets in listOf(false,true))for(monitor in listOf(false,true)){
        check(backgroundLiveRequired(widgets,monitor)==(widgets||monitor))
    }
    var monitorRenders=0
    // Foreground is owned by App; hidden/closed windows must never be reopened.
    refreshBackgroundMonitorIfNeeded(true,true){monitorRenders++}
    refreshBackgroundMonitorIfNeeded(false,false){monitorRenders++}
    check(monitorRenders==0)
    // Two accepted background snapshots each cause a repaint of the visible monitor.
    refreshBackgroundMonitorIfNeeded(false,true){monitorRenders++}
    refreshBackgroundMonitorIfNeeded(false,true){monitorRenders++}
    check(monitorRenders==2)
    // Removing the desktop Widget retains a visible monitor's writer, then closing it stops eligibility.
    check(backgroundLiveRequired(false,true))
    check(!backgroundLiveRequired(false,false))
    var hasView=true
    var userClosed=false
    val delayedRefresh={if(backgroundMonitorRefreshAllowed(hasView,userClosed))monitorRenders++}
    // A refresh accepted by the producer before close is delivered after the view has gone.
    hasView=false;userClosed=true;delayedRefresh()
    check(monitorRenders==2)
    check(!backgroundMonitorRefreshAllowed(true,true))
    check(!backgroundMonitorRefreshAllowed(false,false))
    check(backgroundMonitorRefreshAllowed(true,false))
    check(monitorAnimationsAllowed(true,true))
    check(!monitorAnimationsAllowed(true,false))
    check(!monitorAnimationsAllowed(false,true))
    println("V4.0.54 native background policy: floating-only ownership, live repaint, foreground handoff and last-surface cleanup PASS")
}
