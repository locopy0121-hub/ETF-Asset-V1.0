package com.tfasset.app.saietf
import android.content.Context
class SaiEtfMarketRuntime(context:Context,listener:(String)->Unit) {
    var pauses=0;var settles=0;var resumes=0
    var callback:((Long)->Unit)?=null
    var canSettle=false
    fun pause(){pauses++}
    fun resumeTrackedSymbols(){resumes++}
    fun settleScheduledClose(done:(Long)->Unit):Boolean {if(!canSettle)return false;settles++;callback=done;return true}
}
