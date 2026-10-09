package com.tfasset.app
import org.json.JSONArray
import org.json.JSONObject
import java.time.Instant
fun main(){
  check(TfAssetMarketPresentation.sourceTimeLabel("2026-10-08T04:55:00Z")=="12:55")
  check(TfAssetMarketPresentation.sourceTimeLabel("invalid")=="--")
  val now=Instant.parse("2026-10-08T04:55:00Z").toEpochMilli()
  fun holding(symbol:String,price:Double)=JSONObject().put("symbol",symbol)
    .put("price",price).put("previousClose",price-1).put("change",1).put("changePercent",1)
    .put("updatedAt",Instant.ofEpochMilli(now-1000).toString())
    .put("valuationStatus","current_session").put("valuationValidUntil",now+60000)
    .put("marketQuality","trade").put("quoteStatus","LIVE")
    .put("marketValue",1000).put("pnl",50).put("roi",5).put("comprehensivePnl",60)
  val raw=JSONObject().put("valuationComplete",true).put("marketDataVersion",42)
    .put("holdings",JSONArray().put(holding("0050",115.2)).put(holding("00406A",10.18)))
    .put("asset",JSONObject().put("marketValue",2000))
  fun render(market:JSONObject)=TfAssetMarketPresentation.decorateSnapshot(market,raw,now)
  val empty=render(JSONObject())
  check(empty.getJSONArray("holdings").getJSONObject(0).getDouble("price")==115.2){"Pending SQLite must not blank verified live snapshot"}
  val ahead=JSONObject().put("quotes",JSONArray().put(JSONObject().put("symbol","0050").put("currentPrice",115.3).put("sourceQuoteAt",now)))
  check(render(ahead).getJSONArray("holdings").getJSONObject(0).getDouble("price")==115.2){"A newer market tick must not invalidate canonical projection in flight"}
  raw.put("valuationComplete",false)
  raw.getJSONArray("holdings").getJSONObject(1).put("price",JSONObject.NULL).put("valuationStatus","unavailable")
  val partial=render(ahead)
  check(partial.getJSONObject("asset").isNull("marketValue")){"Incomplete portfolio must not show a complete total"}
  check(partial.getJSONArray("holdings").getJSONObject(0).getDouble("pnl")==50.0){"One missing symbol must not hide verified holding P&L"}
  check(partial.getJSONArray("holdings").getJSONObject(1).isNull("pnl"))
  val delayed=TfAssetMarketPresentation.decorateSnapshot(JSONObject(),raw,now+31000)
  check(delayed.getJSONArray("holdings").getJSONObject(0).getDouble("price")==115.2)
  check(delayed.getJSONArray("holdings").getJSONObject(0).getString("marketStatus").contains("延遲"))
  val expired=TfAssetMarketPresentation.decorateSnapshot(JSONObject(),raw,now+60000)
  check(expired.getJSONArray("holdings").getJSONObject(0).getDouble("price")==115.2)
  println("V4.0.11 canonical snapshot: SQLite lag/newer tick/partial portfolio/delay/expiry PASS")
}
