package com.tfasset.app

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject
import java.time.Instant
import java.time.ZoneId
import java.time.DayOfWeek
import kotlin.math.abs

/**
 * The ONLY native presentation adapter. Widget and Monitor read one SQLite
 * snapshot/version and the App's immutable finance snapshot. Never calculate
 * financial results inside a Widget or overlay.
 */
internal object TfAssetMarketPresentation{
  internal fun nextExpiry(raw:JSONObject,now:Long):Long?{
    val holdings=raw.optJSONArray("holdings")?:return null
    return (0 until holdings.length()).flatMap{i->
      val row=holdings.optJSONObject(i)?:return@flatMap emptyList<Long>()
      val freshness=runCatching{Instant.parse(row.optString("updatedAt","")).toEpochMilli()+30_000L}.getOrNull()
      listOfNotNull(freshness,row.optLong("valuationValidUntil",0L))
    }.filter{it>now}.minOrNull()
  }

  fun decorate(context:Context,raw:JSONObject):JSONObject{
    val market=TfAssetMarketDatabase(context).marketCoreRuntimeSnapshot()
    return decorateSnapshot(market,raw,System.currentTimeMillis())
  }

  /** Pure JSON projection, exercised by the native regression gate. */
  internal fun decorateSnapshot(market:JSONObject,raw:JSONObject,now:Long):JSONObject{
    val version=market.optLong("version",0L)
    val marketRows=market.optJSONArray("quotes")?:JSONArray()
    val quoteBySymbol=(0 until marketRows.length()).mapNotNull{marketRows.optJSONObject(it)}
      .associateBy{it.optString("symbol","")}
    val decorated=JSONObject(raw.toString())
    val holdings=raw.optJSONArray("holdings")?:JSONArray()
    val localNow=Instant.ofEpochMilli(now).atZone(ZoneId.of("Asia/Taipei"))
    val minute=localNow.hour*60+localNow.minute
    val active=localNow.dayOfWeek!=DayOfWeek.SATURDAY&&localNow.dayOfWeek!=DayOfWeek.SUNDAY&&minute>=540&&minute<810
    fun usable(row:JSONObject,quote:JSONObject?):Boolean{
      if(quote==null||row.optString("valuationStatus","")=="unavailable")return false
      val until=row.optLong("valuationValidUntil",0L)
      if(until<=now)return false
      val price=row.optDouble("price",Double.NaN)
      val cached=quote.optDouble("currentPrice",Double.NaN)
      val at=quote.optLong("sourceQuoteAt",0L)
      if(!price.isFinite()||price<=0||!cached.isFinite()||abs(price-cached)>=0.0001)return false
      if(at<=0L||at>now+120_000L||now-at>7*86_400_000L)return false
      val quality=quote.optString("quality","")
      if(quality !in listOf("trade","backup_realtime","previous_close","official_close"))return false
      val sourceDate=Instant.ofEpochMilli(at).atZone(ZoneId.of("Asia/Taipei")).toLocalDate().toString()
      val sessionDate=quote.optString("sessionDate","")
      if(sessionDate.isNotEmpty()&&sessionDate!=sourceDate)return false
      if(active&&(sourceDate!=localNow.toLocalDate().toString()||quality !in listOf("trade","backup_realtime")||quote.optString("quoteStatus") in listOf("STALE","OFFLINE")))return false
      return runCatching{Instant.parse(row.optString("updatedAt","")).toEpochMilli()==at}.getOrDefault(false)
    }
    val synchronized=raw.optBoolean("valuationComplete",false) &&
      (0 until holdings.length()).all{i->
        val row=holdings.optJSONObject(i)?:return@all false
        usable(row,quoteBySymbol[row.optString("symbol","")])
      }
    decorated.put("marketDataVersion",raw.optLong("marketDataVersion",0L))
      .put("marketCachePersistedAt",version)
      .put("marketSynchronized",synchronized)
    val asset=JSONObject((raw.optJSONObject("asset")?:JSONObject()).toString())
    if(!synchronized){
      listOf("totalAssets","marketValue","unrealizedPnl","totalReturn")
        .forEach{asset.put(it,JSONObject.NULL)}
    }
    decorated.put("asset",asset)
    val output=JSONArray()
    for(i in 0 until holdings.length()){
      val original=holdings.optJSONObject(i)?:continue
      val row=JSONObject(original.toString())
      val quote=quoteBySymbol[original.optString("symbol","")]
      val rowUsable=usable(original,quote)
      if(!rowUsable){
        listOf("price","previousClose","change","changePercent","updatedAt")
          .forEach{row.put(it,JSONObject.NULL)}
        row.put("marketStatus","行情待取得")
      }else{
        val price=quote!!.optDouble("currentPrice",Double.NaN)
        val close=quote.optDouble("previousClose",Double.NaN)
        val at=quote.optLong("sourceQuoteAt",0L)
        row.put("price",price)
        row.put("previousClose",if(close.isFinite()&&close>0)close else JSONObject.NULL)
        row.put("change",if(close.isFinite()&&close>0)price-close else JSONObject.NULL)
        row.put("changePercent",if(close.isFinite()&&close>0)(price-close)/close*100 else JSONObject.NULL)
        row.put("updatedAt",Instant.ofEpochMilli(at).toString())
        val label=when(quote.optString("quality","")){
          "trade"->"成交"
          "backup_realtime"->"備援行情"
          else->"快取／收盤參考"
        }
        val delayed=quote.optString("quoteStatus")=="DELAYED" ||
          (active && at>0L && now-at>30_000L)
        row.put("marketStatus",if(!active)"盤外參考價" else label+(if(delayed)"（延遲）" else ""))
        row.put("marketQuality",quote.optString("quality",""))
      }
      if(!synchronized||!rowUsable){
        listOf("marketValue","pnl","roi","comprehensivePnl")
          .forEach{row.put(it,JSONObject.NULL)}
      }
      output.put(row)
    }
    decorated.put("holdings",output)
    return decorated
  }
}
