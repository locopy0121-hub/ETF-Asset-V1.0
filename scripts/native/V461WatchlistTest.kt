package com.tfasset.app
import org.json.JSONObject
fun main(){
 val raw=JSONObject("""{"holdings":[{"symbol":"0050","name":"元大台灣50","shares":10}],"watchlist":[{"symbol":"2330","name":"台積電","watchOnly":true,"price":100},{"symbol":"0050","name":"元大台灣50","watchOnly":true}]}""")
 check(TfAssetMonitorQuoteLists.select(raw,"holdings").size==1)
 check(TfAssetMonitorQuoteLists.select(raw,"watchlist").size==2)
 val all=TfAssetMonitorQuoteLists.select(raw,"all")
 check(all.size==2);check(all.first{it.optString("symbol")=="0050"}.optInt("shares")==10)
 check(all.first{it.optString("symbol")=="2330"}.optString("name").contains("自選"))
 check(raw.getJSONArray("holdings").getJSONObject(0).getString("name")=="元大台灣50")
 check(TfAssetMonitorFields.value(raw.getJSONArray("watchlist").getJSONObject(0),"pnl")=="--")
 println("V4.0.61 native source filter, dedupe, explicit badges, canonical immutability and watch-only accounting suppression PASS")
}
