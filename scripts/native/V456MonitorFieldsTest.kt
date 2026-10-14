package com.tfasset.app
import org.json.JSONObject
fun main(){
 val row=JSONObject().put("volume",140553).put("previousClose",112.4).put("quoteStatus","LIVE")
 check(TfAssetMonitorFields.value(row,"volume")=="140,553")
 check(TfAssetMonitorFields.value(row,"previousClose")=="112.40")
 check(TfAssetMonitorFields.value(row,"quoteStatus")=="LIVE")
 check(TfAssetMonitorFields.value(JSONObject().put("volume",0),"volume")=="0")
 check(TfAssetMonitorFields.value(JSONObject().put("volume",-1),"volume")=="--")
 check(TfAssetMonitorFields.value(JSONObject(),"volume")=="--")
 check(TfAssetMonitorFields.value(JSONObject().put("previousClose",0),"previousClose")=="--")
 check(TfAssetMonitorFields.section("name")=="header")
 check(TfAssetMonitorFields.section("price")=="quote")
 for(key in listOf("volume","previousClose","avgCost","shares","marketValue","weight","pnl","roi","updatedAt"))check(TfAssetMonitorFields.section(key)=="detail")
 println("V4.0.56 native actual Monitor field formatting and detail-section coverage PASS")
}
