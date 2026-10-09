package com.tfasset.app
import org.json.JSONArray
import org.json.JSONObject
import java.time.Instant
fun main(){
  val now=Instant.parse("2026-10-08T02:00:00Z").toEpochMilli()
  val at=now-600_000L
  val quote=JSONObject().put("symbol","0050").put("currentPrice",100.0).put("previousClose",99.0).put("sourceQuoteAt",at).put("quality","trade").put("quoteStatus","DELAYED")
  val market=JSONObject().put("quotes",JSONArray().put(quote))
  val holding=JSONObject().put("symbol","0050").put("price",100.0).put("updatedAt",Instant.ofEpochMilli(at).toString()).put("marketQuality","trade").put("quoteStatus","DELAYED").put("valuationStatus","current_session").put("valuationValidUntil",now+1000).put("marketValue",10000).put("pnl",50)
  val raw=JSONObject().put("valuationComplete",true).put("holdings",JSONArray().put(holding)).put("asset",JSONObject().put("marketValue",10000))
  check(TfAssetMarketPresentation.nextExpiry(raw,now)==now+1000)
  check(TfAssetMarketPresentation.nextExpiry(raw,now+1000)==null)
  fun render(t:Long)=TfAssetMarketPresentation.decorateSnapshot(market,raw,t)
  check(render(now).getBoolean("marketSynchronized"))
  check(render(now).getJSONArray("holdings").getJSONObject(0).getDouble("price")==100.0)
  val expired=render(now+1000)
  check(expired.getBoolean("marketSynchronized"))
  check(expired.getJSONObject("asset").getDouble("marketValue")==10000.0)
  check(expired.getJSONArray("holdings").getJSONObject(0).getDouble("price")==100.0)
  holding.put("price",JSONObject.NULL).put("valuationStatus","unavailable")
  check(render(now).getJSONArray("holdings").getJSONObject(0).isNull("price")){"Cache must never resurrect App-rejected quote"}
  holding.put("price",100.0).put("valuationStatus","reference").put("valuationValidUntil",now+86_400_000L)
  check(render(now+4*3_600_000L).getJSONArray("holdings").getJSONObject(0).getString("marketStatus")=="盤外參考價")
  holding.put("quoteStatus","STALE")
  check(render(now).getJSONArray("holdings").getJSONObject(0).getDouble("price")==100.0)
  holding.put("quoteStatus","DELAYED")
  quote.put("currentPrice",101.0)
  check(render(now).getJSONArray("holdings").getJSONObject(0).getDouble("price")==100.0){"Different persisted version cannot invalidate canonical projection"}
  println("Actual Widget/Monitor presentation: expiry, rejected App quote, reference labels, mismatch PASS")
}
