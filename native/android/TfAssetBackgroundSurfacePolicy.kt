package com.tfasset.app

/** An installed desktop Widget or an actually visible floating window needs the same writer. */
internal fun backgroundLiveRequired(hasWidgets:Boolean,monitorRunning:Boolean):Boolean = hasWidgets||monitorRunning

/** The App owns foreground configuration; background ticks only repaint an existing window. */
internal fun refreshBackgroundMonitorIfNeeded(uiActive:Boolean,monitorRunning:Boolean,refresh:()->Unit){
    if(!uiActive&&monitorRunning)refresh()
}

/** A delayed background repaint is never an open-window command. */
internal fun backgroundMonitorRefreshAllowed(hasView:Boolean,userClosed:Boolean):Boolean = hasView&&!userClosed

/** Live quote delivery is independent from the visibility of cosmetic monitor animation. */
internal fun monitorAnimationsAllowed(configEnabled:Boolean,uiActive:Boolean):Boolean =
    configEnabled&&uiActive

/** Session and unlocked interactive screen are both required for market network work. */
internal fun marketUpdatesAllowed(tradingSession:Boolean,deviceReady:Boolean):Boolean =
    tradingSession&&deviceReady
