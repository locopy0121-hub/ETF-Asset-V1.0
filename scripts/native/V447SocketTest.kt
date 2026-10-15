package com.tfasset.app.saietf
import kotlinx.coroutines.runBlocking

private class Socket : FugleSocket {
    val sent=mutableListOf<String>()
    var failSend=false
    var cancelled=false
    override fun send(text:String):Boolean { sent+=text;return !failSend }
    override fun close(code:Int,reason:String)=true
    override fun cancel(){cancelled=true}
}
private class Transport : FugleSocketTransport {
    val socket=Socket()
    lateinit var listener:FugleSocketListener
    override fun connect(url:String,listener:FugleSocketListener):FugleSocket {this.listener=listener;return socket}
}
fun main()=runBlocking {
    var now=1_791_779_000_000L
    val transport=Transport()
    val provider=FugleWebSocketProvider({"test-key"},transport,{now})
    provider.replaceSubscriptions(setOf("0050"))
    transport.listener.onOpen(transport.socket)
    check(transport.socket.sent.single().contains("auth"))
    now+=16_000L
    val watchdog=provider.javaClass.getDeclaredMethod("watchdogTick").apply {isAccessible=true}
    watchdog.invoke(provider)
    check(transport.socket.cancelled){"An unanswered authentication must tear down and reconnect"}
    provider.disconnect()
    val failed=Transport()
    val provider2=FugleWebSocketProvider({"test-key"},failed,{now})
    provider2.replaceSubscriptions(setOf("0050"))
    failed.listener.onOpen(failed.socket)
    failed.socket.failSend=true
    failed.listener.onText(failed.socket,"""{"event":"authenticated"}""")
    check(failed.socket.cancelled){"Failed subscription send must clear socket before reconnect"}
    provider2.disconnect()
    val missingAck=Transport()
    val provider3=FugleWebSocketProvider({"test-key"},missingAck,{now})
    provider3.replaceSubscriptions(setOf("0050"))
    missingAck.listener.onOpen(missingAck.socket)
    missingAck.listener.onText(missingAck.socket,"""{"event":"authenticated"}""")
    now+=16_000L
    watchdog.invoke(provider3)
    check(missingAck.socket.cancelled){"Missing subscription ack must recover even with healthy heartbeat"}
    provider3.disconnect()
    println("V4.0.47 native socket auth/send/subscription timeout recovery PASS")
}
