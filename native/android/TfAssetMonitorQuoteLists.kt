package com.tfasset.app
import org.json.JSONObject
/** Select display rows without ever changing the canonical holdings or asset totals. */
internal object TfAssetMonitorQuoteLists {
 fun select(snapshot:JSONObject,source:String):List<JSONObject>{
  fun rows(key:String):List<JSONObject>{val a=snapshot.optJSONArray(key)?:return emptyList();return (0 until a.length()).mapNotNull{a.optJSONObject(it)}}
  val held=rows("holdings");val watched=rows("watchlist");val watchedSymbols=watched.map{it.optString("symbol")}.toSet()
  val heldSymbols=held.map{it.optString("symbol")}.toSet()
  val selected=when(source){"watchlist"->watched;"all"->held+watched.filter{it.optString("symbol") !in heldSymbols};else->held}
  return selected.map{original->val row=JSONObject(original.toString());val symbol=row.optString("symbol");val label=if(symbol in heldSymbols&&symbol in watchedSymbols)"持股＋自選" else if(row.optBoolean("watchOnly"))"自選" else "持股";row.put("name","[$label] "+row.optString("name",symbol));row}
 }
}
