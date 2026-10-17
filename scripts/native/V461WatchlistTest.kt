package com.tfasset.app
import org.json.JSONArray
import org.json.JSONObject
fun main(){
 val raw=JSONObject("""{"holdings":[{"symbol":"0050","name":"元大台灣50","shares":10,"avgCost":100.0,"marketValue":1000}],"watchlist":[{"symbol":"2330","name":"台積電","watchOnly":true,"price":100},{"symbol":"0050","name":"元大台灣50","watchOnly":true}]}""")
 val held=TfAssetMonitorQuoteLists.select(raw,"holdings")
 check(held.size==1)
 check(held.single().optString("name")=="◆ 元大台灣50")
 val watched=TfAssetMonitorQuoteLists.select(raw,"watchlist")
 check(watched.size==2)
 val both=watched.single{it.optString("symbol")=="0050"}
 check(both.optString("name")=="◆ 元大台灣50")
 check(!both.optBoolean("watchOnly"))
 check(both.optInt("shares")==10)
 check(both.optDouble("avgCost")==100.0)
 check(both.optDouble("marketValue")==1000.0)
 check(TfAssetMonitorFields.value(both,"pnl")==null)
 val onlyWatched=watched.single{it.optString("symbol")=="2330"}
 check(onlyWatched.optString("name")=="☆ 台積電")
 check(onlyWatched.optBoolean("watchOnly"))
 check(TfAssetMonitorFields.value(onlyWatched,"pnl")=="--")
 val all=TfAssetMonitorQuoteLists.select(raw,"all")
 check(all.size==2)
 check(all.single{it.optString("symbol")=="0050"}.optInt("shares")==10)
 check(all.single{it.optString("symbol")=="0050"}.optString("name")=="◆ 元大台灣50")
 check(raw.getJSONArray("holdings").getJSONObject(0).getString("name")=="元大台灣50")
 check(raw.getJSONArray("watchlist").getJSONObject(1).getString("name")=="元大台灣50")
 val limited=TfAssetMonitorQuoteLists.withSubscriptionCoverage(raw,setOf("2330"))
 check(limited.getJSONArray("watchlist").getJSONObject(0).getBoolean("subscriptionLimited"))
 check(limited.getJSONArray("watchlist").getJSONObject(0).getString("quoteStatus")=="DELAYED")
 check(!raw.getJSONArray("watchlist").getJSONObject(0).has("subscriptionLimited"))
 check(limited.getJSONArray("holdings").getJSONObject(0).getInt("shares")==10)
 val afterSell=JSONObject(raw.toString()).put("holdings",JSONArray())
 val formerHolding=TfAssetMonitorQuoteLists.select(afterSell,"all").single{it.optString("symbol")=="0050"}
 check(formerHolding.optString("name")=="☆ 元大台灣50")
 check(formerHolding.optBoolean("watchOnly"))
 check(TfAssetMonitorFields.value(formerHolding,"shares")=="--")
 check(TfAssetMonitorQuoteLists.select(raw,"all").size==2)
 println("V5.0.17 monitor holding priority, one card per symbol, symbol badges, no canonical mutation PASS")
}
