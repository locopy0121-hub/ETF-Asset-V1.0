package com.tfasset.app.saietf
import android.content.Context
import com.tfasset.app.TfAssetMarketSchedule
import com.tfasset.app.MarketSchedule
import java.net.*
import java.io.ByteArrayInputStream
import java.time.Instant
import java.util.concurrent.CopyOnWriteArrayList
import org.json.JSONObject
import tw.saietf.core.market.*

fun main(){
    val now=Instant.parse("2026-10-14T08:34:00Z").toEpochMilli()
    val old=Instant.parse("2026-10-14T04:51:41Z").toEpochMilli()
    val closed=Instant.parse("2026-10-14T05:30:00Z").toEpochMilli()
    MarketPersistenceRepository.stored=mapOf("0050" to MarketQuote(symbol="0050",price=113.5,asOfEpochMillis=old,source=MarketSource.FUGLE,sessionDate="2026-10-14"))
    var requests=0
    URL.setURLStreamHandlerFactory { protocol->if(protocol!="https")null else object:URLStreamHandler(){override fun openConnection(url:URL):URLConnection=object:HttpURLConnection(url){
        override fun connect(){};override fun disconnect(){};override fun usingProxy()=false;override fun getResponseCode()=200
        override fun getInputStream():ByteArrayInputStream {
            if(url.path.contains("holiday"))return ByteArrayInputStream("[]".toByteArray())
            requests++
            return ByteArrayInputStream(JSONObject().put("symbol","0050").put("isClose",true).put("lastTrade",JSONObject().put("price",114.0).put("time",closed*1000)).toString().toByteArray())
        }
    }} }
    val events=CopyOnWriteArrayList<JSONObject>()
    val runtime=SaiEtfMarketRuntime(Context(),{now}){events.add(JSONObject(it))}
    runtime.updateSymbols(listOf("0050"))
    val result=runtime.refresh(listOf("0050"))
    val restored=result.getJSONArray("quotes").getJSONObject(0)
    check(restored.getDouble("currentPrice")==113.5){"Closed/locked session must show the last confirmed cached price"}
    check(restored.getLong("sourceQuoteAt")==old){"Closed quote source clock must not be rewritten"}
    check(!MarketPersistenceRepository.stored.getValue("0050").isClose){"No fabricated closing settlement after hours"}
    check(requests==0){"After hours must not fetch quotes or holiday calendar metadata"}
    check(events.none{it.optLong("version")==result.getLong("version")}){"Cache-only read must not masquerade as a new LIVE publish"}
    runtime.refresh(listOf("0050"));check(requests==0){"Repeated closed reads must remain offline"}
    TfAssetMarketSchedule.policy=MarketSchedule(enabled=false)
    runtime.refresh(listOf("00878"));check(requests==0){"Disabled schedule must not start HTTP requests"}
    println("V4.0.58 compiled production runtime + REST + sink + center: afterhours cache-only/no HTTP/no fabricated close PASS")
}
