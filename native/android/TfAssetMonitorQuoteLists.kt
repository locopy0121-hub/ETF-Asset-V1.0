package com.tfasset.app
import org.json.JSONObject
/** Select display rows without ever changing the canonical holdings or asset totals. */
internal object TfAssetMonitorQuoteLists {
 fun withSubscriptionCoverage(snapshot:JSONObject,limited:Set<String>):JSONObject {
  if(limited.isEmpty())return snapshot
  val copy=JSONObject(snapshot.toString())
  for(key in listOf("holdings","watchlist")){
   val rows=copy.optJSONArray(key)?:continue
   for(i in 0 until rows.length()){
    val row=rows.optJSONObject(i)?:continue
    if(row.optString("symbol") in limited)row.put("subscriptionLimited",true).put("quoteStatus","DELAYED").put("streamingHealthy",false)
   }
  }
  return copy
 }
 fun select(snapshot:JSONObject,source:String):List<JSONObject>{
  fun rows(key:String):List<JSONObject>{val a=snapshot.optJSONArray(key)?:return emptyList();return (0 until a.length()).mapNotNull{a.optJSONObject(it)}}
  val held=rows("holdings");val watched=rows("watchlist")
  val heldBySymbol=held.associateBy{it.optString("symbol")}
  val selected=when(source){
   "watchlist"->watched.map{heldBySymbol[it.optString("symbol")]?:it}
   "all"->held+watched.filter{it.optString("symbol") !in heldBySymbol}
   else->held
  }.distinctBy{it.optString("symbol")}
  return selected.map{original->
   val row=JSONObject(original.toString())
   val symbol=row.optString("symbol")
   val marker=if(symbol in heldBySymbol)"◆" else "☆"
   row.put("name","$marker "+row.optString("name",symbol))
   row
  }
 }
}
