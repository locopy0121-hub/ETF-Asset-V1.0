package com.tfasset.app

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject
import java.time.Instant
import kotlin.math.abs

/**
 * The ONLY native presentation adapter. Widget and Monitor read one SQLite
 * snapshot/version and the App's immutable finance snapshot. Never calculate
 * financial results inside a Widget or overlay.
 */
internal object TfAssetMarketPresentation{
  fun decorate(context:Context,raw:JSONObject):JSONObject{
    val market=TfAssetMarketCenter(context).snapshot()
    val version=market.optLong("version",0L)
    val marketRows=market.optJSONArray("quotes")?:JSONArray()
    val quoteBySymbol=(0 until marketRows.length()).mapNotNull{marketRows.optJSONObject(it)}
      .associateBy{it.optString("symbol","")}
    val decorated=JSONObject(raw.toString())
    val holdings=raw.optJSONArray("holdings")?:JSONArray()
    val synchronized=raw.optLong("marketDataVersion",-1L)==version &&
      raw.optBoolean("valuationComplete",false) &&
      (0 until holdings.length()).all{i->
        val row=holdings.optJSONObject(i)?:return@all false
        val quote=quoteBySymbol[row.optString("symbol","")]?:return@all false
        val samePrice=abs(row.optDouble("price",Double.NaN)-
          quote.optDouble("currentPrice",Double.NaN))<0.0001
        val sameSource=runCatching{Instant.parse(row.optString("updatedAt",""))
          .toEpochMilli()==quote.optLong("sourceQuoteAt")}.getOrDefault(false)
        samePrice&&sameSource
      }
    decorated.put("marketDataVersion",version)
      .put("marketSynchronized",synchronized)
    val asset=JSONObject((raw.optJSONObject("asset")?:JSONObject()).toString())
    if(!synchronized){
      listOf("totalAssets","marketValue","unrealizedPnl","totalReturn")
        .forEach{asset.put(it,JSONObject.NULL)}
    }
    decorated.put("asset",asset)
    val now=System.currentTimeMillis()
    val output=JSONArray()
    for(i in 0 until holdings.length()){
      val original=holdings.optJSONObject(i)?:continue
      val row=JSONObject(original.toString())
      val quote=quoteBySymbol[original.optString("symbol","")]
      if(quote==null){
        listOf("price","previousClose","change","changePercent","updatedAt")
          .forEach{row.put(it,JSONObject.NULL)}
        row.put("marketStatus","行情待取得")
      }else{
        val price=quote.optDouble("currentPrice",Double.NaN)
        val close=quote.optDouble("previousClose",Double.NaN)
        val at=quote.optLong("sourceQuoteAt",0L)
        row.put("price",price)
        row.put("previousClose",if(close.isFinite()&&close>0)close else JSONObject.NULL)
        row.put("change",if(close.isFinite()&&close>0)price-close else JSONObject.NULL)
        row.put("changePercent",if(close.isFinite()&&close>0)(price-close)/close*100 else JSONObject.NULL)
        row.put("updatedAt",Instant.ofEpochMilli(at).toString())
        val label=if(quote.optString("quality","")=="trade")"成交" else "官方收盤參考"
        row.put("marketStatus",label+(if(now-at>86_400_000L)"（歷史）" else ""))
        row.put("marketQuality",quote.optString("quality",""))
      }
      if(!synchronized||quote==null){
        listOf("marketValue","pnl","roi","comprehensivePnl")
          .forEach{row.put(it,JSONObject.NULL)}
      }
      output.put(row)
    }
    decorated.put("holdings",output)
    return decorated
  }
}
