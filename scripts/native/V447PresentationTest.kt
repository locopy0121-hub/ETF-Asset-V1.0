package com.tfasset.app
import org.json.JSONArray
import org.json.JSONObject
import java.time.Instant
fun main(){
    val now=Instant.parse("2026-10-12T03:00:00Z").toEpochMilli()
    val row=JSONObject().put("symbol","009816").put("price",16.91)
        .put("updatedAt",Instant.ofEpochMilli(now-600_000).toString()).put("marketQuality","trade")
        .put("quoteStatus","LIVE").put("valuationStatus","current_session").put("valuationValidUntil",now+3_600_000)
        .put("streamingHealthy",true).put("streamingCheckedAt",now).put("marketValue",3382).put("pnl",57)
    val raw=JSONObject().put("valuationComplete",true).put("holdings",JSONArray().put(row))
        .put("asset",JSONObject().put("marketValue",3382))
    fun render(at:Long)=TfAssetMarketPresentation.decorateSnapshot(JSONObject(),raw,at).getJSONArray("holdings").getJSONObject(0)
    check(render(now).getString("marketStatus")=="成交"){"Quiet subscribed symbol must retain LIVE status on Widget/Monitor"}
    check(TfAssetMarketPresentation.nextExpiry(raw,now)==now+75_000)
    check(render(now+75_001).getString("marketStatus").contains("延遲")){"Saved healthy flag expires if App stops publishing health"}
    check(render(now+75_001).getDouble("price")==16.91)
    row.put("streamingHealthy",false)
    check(render(now).getString("marketStatus").contains("延遲"))
    println("V4.0.47 native Widget/Monitor quiet subscription, health expiry, price retention PASS")
}
