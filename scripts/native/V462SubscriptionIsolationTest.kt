package com.tfasset.app.saietf
import kotlinx.coroutines.runBlocking
import org.json.JSONObject
import tw.saietf.core.market.MarketQuote
private class LimitSocket:FugleSocket {
 val sent=mutableListOf<String>();var closes=0
 override fun send(text:String):Boolean {sent+=text;return true}
 override fun close(code:Int,reason:String):Boolean {closes++;return true}
 override fun cancel(){closes++}
}
private class LimitTransport:FugleSocketTransport {
 val socket=LimitSocket();lateinit var listener:FugleSocketListener
 override fun connect(url:String,listener:FugleSocketListener):FugleSocket{this.listener=listener;return socket}
 fun receive(raw:String)=listener.onText(socket,raw)
 fun auth(){listener.onOpen(socket);receive("""{"event":"authenticated"}""")}
 fun ack(symbol:String)=receive("""{"event":"subscribed","data":{"id":"id-$symbol","symbol":"$symbol","channel":"trades"}}""")
 fun limit()=receive("""{"event":"error","data":{"code":1002,"message":"Maximum number of subscriptions reached"}}""")
}
private val symbols=linkedSetOf("2330","0050","0056","00878","00919","00929")
private suspend fun activeSurvives(){
 val t=LimitTransport();val trades=mutableListOf<MarketQuote>();val p=FugleWebSocketProvider({"key"},t,onTrade={trades+=it})
 try{
  p.replaceSubscriptions(symbols);t.auth();symbols.take(5).forEach(t::ack)
  check(p.isSubscribed("2330",System.currentTimeMillis()))
  t.limit()
  check(t.socket.closes==0){"Rejecting sixth subscription must not close five acknowledged live subscriptions"}
  check(p.isSubscribed("2330",System.currentTimeMillis())){"Held symbol must retain live connection after watchlist quota rejection"}
  t.receive("""{"event":"data","channel":"trades","data":{"symbol":"2330","price":1000,"volume":12,"time":${System.currentTimeMillis()*1000}}}""")
  check(trades.single().price==1000.0){"Real held trades must continue after quota error"}
  val count=t.socket.sent.size;p.replaceSubscriptions(symbols)
  check(t.socket.sent.size==count){"Unchanged over-cap list must not repeat rejected requests"}
 }finally{p.disconnect();p.shutdownForTest()}
}
private suspend fun coldBulkRecovery(){
 val t=LimitTransport();val p=FugleWebSocketProvider({"key"},t)
 try{
  p.replaceSubscriptions(symbols);t.auth();t.limit()
  check(t.socket.closes==0){"Cold bulk quota rejection must discover capacity on the same socket"}
  val probe=JSONObject(t.socket.sent.last()).getJSONObject("data").getJSONArray("symbols")
  check(probe.length()==1&&probe.getString(0)=="2330"){"Retry one requested symbol in held-first order, without a fixed plan cap"}
  symbols.take(5).forEach(t::ack);t.limit()
  check(symbols.take(5).all{p.isSubscribed(it,System.currentTimeMillis())})
  check(!p.isSubscribed("00929",System.currentTimeMillis()))
  // Remove a watched row and prioritize a newly held symbol before another add.
  p.replaceSubscriptions(linkedSetOf("2317","2330","0050","0056","00878","00929"))
  check(t.socket.sent.last().contains("unsubscribe"))
  t.receive("""{"event":"unsubscribed","data":{"id":"id-00919"}}""")
  check(t.socket.sent.last().contains("2317"));t.ack("2317")
  check(p.isSubscribed("2317",System.currentTimeMillis()))
 }finally{p.disconnect();p.shutdownForTest()}
}
private suspend fun coldBulkAfterEarlierRetry(){
 val t=LimitTransport();val p=FugleWebSocketProvider({"key"},t)
 try{
  p.replaceSubscriptions(symbols)
  // A transient handshake retry must not suppress later capacity discovery.
  p.javaClass.getDeclaredField("reconnectAttempt").apply{isAccessible=true}.setInt(p,2)
  t.auth();t.limit()
  check(t.socket.closes==0){"Earlier network retries must not trap a cold over-cap list in reconnect loops"}
  check(JSONObject(t.socket.sent.last()).getJSONObject("data").getJSONArray("symbols").length()==1)
  symbols.take(5).forEach(t::ack);t.limit()
  check(p.isSubscribed("2330",System.currentTimeMillis()))
 }finally{p.disconnect();p.shutdownForTest()}
}
private suspend fun largerPlan(){
 val t=LimitTransport();val p=FugleWebSocketProvider({"key"},t)
 try{p.replaceSubscriptions(symbols);t.auth();symbols.forEach(t::ack);check(symbols.all{p.isSubscribed(it,System.currentTimeMillis())});check(t.socket.closes==0)}finally{p.disconnect();p.shutdownForTest()}
}
fun main()=runBlocking{activeSurvives();coldBulkRecovery();coldBulkAfterEarlierRetry();largerPlan();println("V4.0.62 real Fugle transport: partial quota isolation, continuing trades, bulk admission recovery, slot replacement, held priority, larger plan PASS")}
