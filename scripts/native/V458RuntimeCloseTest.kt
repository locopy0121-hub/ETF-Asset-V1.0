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
    check(result.getJSONArray("quotes").getJSONObject(0).getDouble("currentPrice")==114.0){"Actual runtime must repair 12:51 cache on 16:34 refresh"}
    check(result.getJSONArray("quotes").getJSONObject(0).getLong("sourceQuoteAt")==closed)
    check(MarketPersistenceRepository.stored.getValue("0050").isClose){"Persist final quote before shutdown"}
    check(events.any{it.optLong("version")==result.getLong("version")}){ "Emit exact version awaited by canonical writer" }
    runtime.refresh(listOf("0050"));check(requests==1){"Final close cache suppresses repeat HTTP requests"}
    val journal=com.tfasset.app.TfAssetMarketFlowDiagnostics.read()
    check(journal.contains("SESSION_CLOSE") && journal.contains("confirmed"))
    check(!journal.contains("test-only") && !journal.contains("114.0"))
    TfAssetMarketSchedule.policy=MarketSchedule(enabled=false)
    runtime.refresh(listOf("00878"));check(requests==1)
    println("V4.0.58 compiled production runtime + REST + sink + center: reopen repair / publish / persist / no repeat PASS")
}
