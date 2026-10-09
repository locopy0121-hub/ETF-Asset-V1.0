package com.tfasset.app
import com.tfasset.app.saietf.TradingCalendar
import java.time.Instant
import org.json.JSONArray
import org.json.JSONObject
fun main(){
 val now=Instant.parse("2026-10-09T02:36:00Z").toEpochMilli()
 check(TradingCalendar.closed(now))
 check(!TradingCalendar.closed(Instant.parse("2026-10-08T02:36:00Z").toEpochMilli()))
 check(TradingCalendar.acceptOfficialRows(JSONArray("""[{"Date":"1160101","Name":"開國紀念日"},{"Date":"1160104","Name":"開始交易日"}]""")))
 check(TradingCalendar.closed(Instant.parse("2027-01-01T02:36:00Z").toEpochMilli()))
 check(!TradingCalendar.closed(Instant.parse("2027-01-04T02:36:00Z").toEpochMilli()))
 val holding=JSONObject().put("price",100).put("updatedAt","2026-10-08T05:30:00Z").put("marketQuality","trade").put("quoteStatus","STALE").put("valuationStatus","reference").put("valuationValidUntil",now-1).put("marketValue",10000)
 val raw=JSONObject().put("valuationComplete",true).put("holdings",JSONArray().put(holding)).put("asset",JSONObject().put("marketValue",10000))
 val view=TfAssetMarketPresentation.decorateSnapshot(JSONObject(),raw,now)
 check(view.getBoolean("marketSynchronized"))
 check(view.getJSONArray("holdings").getJSONObject(0).getDouble("price")==100.0)
 check(view.getJSONArray("holdings").getJSONObject(0).getString("marketStatus").contains("休市"))
 println("V4.0.18 native holiday calendar / last close / expired presentation retention PASS")
}
