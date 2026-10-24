package com.tfasset.app.saietf

import kotlinx.coroutines.runBlocking
import tw.saietf.core.market.ProviderCircuitState
import java.util.concurrent.ScheduledFuture

private class RecoverySocket : FugleSocket {
    val sent=mutableListOf<String>()
    override fun send(text:String):Boolean {sent+=text;return true}
    override fun close(code:Int,reason:String)=true
    override fun cancel(){}
}
private class RecoveryTransport : FugleSocketTransport {
    val sockets=mutableListOf<RecoverySocket>()
    val listeners=mutableListOf<FugleSocketListener>()
    override fun connect(url:String,listener:FugleSocketListener):FugleSocket = RecoverySocket().also {sockets+=it;listeners+=listener}
    fun openAndAuthenticate(){val s=sockets.last();val l=listeners.last();l.onOpen(s);l.onText(s,"""{"event":"authenticated"}""")}
    fun receive(text:String){listeners.last().onText(sockets.last(),text)}
}
private fun clearScheduledRetry(p:FugleWebSocketProvider){
    val field=p.javaClass.getDeclaredField("reconnectFuture").apply{isAccessible=true}
    (field.get(p) as? ScheduledFuture<*>)?.cancel(false)
    field.set(p,null)
}
private suspend fun pendingHealth(){
    var now=1_791_945_000_000L;val t=RecoveryTransport();val p=FugleWebSocketProvider({"key"},t,{now})
    try {
        p.replaceSubscriptions(setOf("0050","00406A"));t.openAndAuthenticate()
        check(p.health(now).circuitState!=ProviderCircuitState.HEALTHY){"Authentication without trade subscription ACK must not report HEALTHY"}
        t.receive("""{"event":"heartbeat"}""")
        check(p.health(now).circuitState!=ProviderCircuitState.HEALTHY){"Heartbeat must not promote unacknowledged trades to HEALTHY"}
        t.receive("""{"event":"subscribed","data":{"id":"one","symbol":"0050","channel":"trades"}}""")
        check(p.health(now).circuitState!=ProviderCircuitState.HEALTHY){"Partial ACK is not complete coverage"}
        t.receive("""{"event":"subscribed","data":{"id":"two","symbol":"00406A","channel":"trades"}}""")
        check(p.health(now).circuitState==ProviderCircuitState.HEALTHY)
    } finally {p.disconnect();p.shutdownForTest()}
}
private suspend fun retryGate(){
    var now=1_791_945_000_000L;val t=RecoveryTransport();val p=FugleWebSocketProvider({"key"},t,{now})
    try {
        p.replaceSubscriptions(setOf("0050"));t.openAndAuthenticate()
        t.receive("""{"event":"error","data":{"code":1002,"message":"Subscription limit exceeded"}}""")
        val allowed=p.health(now).nextAllowedEpochMillis!!
        p.replaceSubscriptions(setOf("0050","00406A"))
        check(t.sockets.size==1){"Symbol updates must not bypass scheduled reconnect cooldown"}
        clearScheduledRetry(p);now=allowed;p.connect();t.openAndAuthenticate()
        t.receive("""{"event":"heartbeat"}""")
        t.receive("""{"event":"error","data":{"code":1002,"message":"Subscription limit exceeded"}}""")
        check(p.health(now).nextAllowedEpochMillis!!-now>allowed-1_791_945_000_000L){"Successful auth/heartbeat followed by failed subscriptions must increase retry backoff"}
    } finally {p.disconnect();p.shutdownForTest()}
}
private suspend fun repeatedAuthBackoff(){
    var now=1_791_945_000_000L;val t=RecoveryTransport();val p=FugleWebSocketProvider({"key"},t,{now})
    try {
        p.replaceSubscriptions(setOf("0050"));t.openAndAuthenticate()
        t.receive("""{"event":"error","data":{"code":1002,"message":"Subscription limit exceeded"}}""")
        val delay=p.health(now).nextAllowedEpochMillis!!-now
        clearScheduledRetry(p);now+=delay;p.connect();t.openAndAuthenticate()
        t.receive("""{"event":"heartbeat"}""")
        t.receive("""{"event":"error","data":{"code":1002,"message":"Subscription limit exceeded"}}""")
        check(p.health(now).nextAllowedEpochMillis!!-now>delay){"Auth/heartbeat must not reset repeated subscription-failure backoff"}
    }finally{p.disconnect();p.shutdownForTest()}
}
private suspend fun sourceEvidence(){
    val now=1_791_945_000_000L;val t=RecoveryTransport();val p=FugleWebSocketProvider({"secret-key"},t,{now})
    try{
        p.replaceSubscriptions(setOf("0050"));t.openAndAuthenticate()
        t.receive("""{"event":"error","data":{"code":1002,"message":"Subscription limit exceeded secret-key"}}""")
        val rows=org.json.JSONArray(com.tfasset.app.TfAssetMarketFlowDiagnostics.read())
        val row=(0 until rows.length()).map{rows.getJSONObject(it)}.lastOrNull{it.optString("kind")=="source" && it.optString("reason")=="SERVER_ERROR"}
        check(row!=null){"Server failure must leave a source diagnostic independent of Monitor"}
        check(row.getInt("code")==1002 && row.getInt("desired")==1)
        check(!row.toString().contains("secret-key") && !row.toString().contains("0050"))
        check(row.toString().length<400)
    }finally{p.disconnect();p.shutdownForTest()}
}
private suspend fun missingUnsubscribeAck(){
    var now=1_791_945_000_000L;val t=RecoveryTransport();val p=FugleWebSocketProvider({"key"},t,{now})
    try{
        p.replaceSubscriptions(setOf("0050"));t.openAndAuthenticate()
        t.receive("""{"event":"subscribed","data":{"id":"old","symbol":"0050","channel":"trades"}}""")
        p.replaceSubscriptions(setOf("00406A"));now+=16_000L;t.receive("""{"event":"heartbeat"}""")
        p.javaClass.getDeclaredMethod("watchdogTick").apply{isAccessible=true}.invoke(p)
        check(p.health(now).nextAllowedEpochMillis!!>now){"Missing unsubscribe ACK must recover rather than wait forever on healthy heartbeat"}
    }finally{p.disconnect();p.shutdownForTest()}
}
private suspend fun acknowledgedRecoveryAndTrade(){
    var now=1_791_945_000_000L;val t=RecoveryTransport();val accepted=mutableListOf<tw.saietf.core.market.MarketQuote>()
    val p=FugleWebSocketProvider({"key"},t,{now},onTrade={accepted+=it})
    try{
        p.replaceSubscriptions(setOf("0050"));t.openAndAuthenticate()
        t.receive("""{"event":"error","data":{"message":"Subscription limit exceeded"}}""")
        val delay=p.health(now).nextAllowedEpochMillis!!-now;clearScheduledRetry(p);now+=delay;p.connect();t.openAndAuthenticate()
        t.receive("""{"event":"subscribed","data":[{"id":"ok","symbol":"0050","channel":"trades"}]}""")
        check(p.health(now).circuitState==ProviderCircuitState.HEALTHY)
        t.receive("""{"event":"data","channel":"trades","data":{"symbol":"0050","price":113.5,"volume":1234,"time":1791945000000000}}""")
        check(accepted.size==1 && accepted.single().price==113.5 && accepted.single().volume==1234L)
        check(p.fetchSnapshot(setOf("0050"))["0050"]?.price==113.5)
        t.receive("""{"event":"error","data":{"message":"Server temporarily unavailable"}}""")
        check(p.health(now).nextAllowedEpochMillis!!-now==delay){"Confirmed recovered subscriptions restore initial backoff"}
    }finally{p.disconnect();p.shutdownForTest()}
}
private suspend fun rejectedCredentialAndBoundedJournal(){
    val now=1_791_945_000_000L;val t=RecoveryTransport();val p=FugleWebSocketProvider({"key"},t,{now})
    try{
        p.replaceSubscriptions(setOf("0050"));t.listeners.last().onOpen(t.sockets.last())
        t.receive("""{"event":"error","data":{"message":"Invalid authentication credentials"}}""")
        p.connect();check(t.sockets.size==1){"Rejected credential must not trigger an infinite retry loop"}
        check(p.health(now).circuitState==ProviderCircuitState.COOLDOWN)
        p.onCredentialChanged();check(t.sockets.size==2)
        val diagnostics=com.tfasset.app.TfAssetMarketFlowDiagnostics
        var emitted=0;val listener:(String)->Unit={emitted++}
        diagnostics.addSourceListener(listener)
        repeat(20){diagnostics.sourceCheckpoint(org.json.JSONObject().put("kind","source").put("reason","TEST"))}
        diagnostics.removeSourceListener(listener)
        diagnostics.sourceCheckpoint(org.json.JSONObject().put("kind","source").put("reason","TEST"))
        check(emitted==20)
        val rows=org.json.JSONArray(diagnostics.read());check((0 until rows.length()).count{rows.getJSONObject(it).optString("kind")=="source"}==8)
    }finally{p.disconnect();p.shutdownForTest()}
}
private suspend fun replacementBeforeSubscribeAck(){
    val now=1_791_945_000_000L;val t=RecoveryTransport();val p=FugleWebSocketProvider({"key"},t,{now})
    try{
        p.replaceSubscriptions(setOf("0050"));t.openAndAuthenticate()
        val s=t.sockets.last();s.sent.clear();p.replaceSubscriptions(setOf("00406A"));p.replaceSubscriptions(setOf("009816"))
        check(s.sent.isEmpty()){ "Replacement must wait for obsolete in-flight subscribe ACK before adding new symbols" }
        t.receive("""{"event":"subscribed","data":{"id":"old","symbol":"0050","channel":"trades"}}""")
        check(s.sent.size==1 && s.sent.single().contains("unsubscribe"))
        t.receive("""{"event":"unsubscribed","data":{"id":"old"}}""")
        check(s.sent.last().contains("009816") && !s.sent.last().contains("00406A"))
    }finally{p.disconnect();p.shutdownForTest()}
}
private suspend fun replacementOrder(){
    val now=1_791_945_000_000L;val t=RecoveryTransport();val p=FugleWebSocketProvider({"key"},t,{now})
    try {
        p.replaceSubscriptions(setOf("0050"));t.openAndAuthenticate()
        t.receive("""{"event":"subscribed","data":{"id":"old","symbol":"0050","channel":"trades"}}""")
        val s=t.sockets.last();s.sent.clear();p.replaceSubscriptions(setOf("00406A"))
        check(s.sent.size==1 && s.sent.single().contains("unsubscribe")){"Replacement must release old subscription before adding new symbol"}
        t.receive("""{"event":"unsubscribed","data":{"id":"old"}}""")
        check(s.sent.last().contains("subscribe") && s.sent.last().contains("00406A"))
    } finally {p.disconnect();p.shutdownForTest()}
}
fun main()=runBlocking {
    val failures=mutableListOf<String>()
    for((name,test) in listOf<Pair<String,suspend()->Unit>>("pending-health" to ::pendingHealth,"retry-gate/backoff" to ::retryGate,"replacement-order" to ::replacementOrder,"auth-backoff" to ::repeatedAuthBackoff,"source-evidence" to ::sourceEvidence,"unsubscribe-timeout" to ::missingUnsubscribeAck,"recovered-valid-trade" to ::acknowledgedRecoveryAndTrade,"credential/journal" to ::rejectedCredentialAndBoundedJournal,"pending-replacement" to ::replacementBeforeSubscribeAck)) {
        try {test();println("PASS $name")}catch(e:Throwable){failures+="$name: ${e.message}";println("FAIL ${failures.last()}")}
    }
    check(failures.isEmpty()){failures.joinToString("; ")}
    println("V4.0.57 production Fugle subscription/recovery PASS")
}
