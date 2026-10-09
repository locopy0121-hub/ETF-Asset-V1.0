package com.tfasset.app

import android.content.Context
import com.tfasset.app.saietf.TradingCalendar
import org.json.JSONArray
import org.json.JSONObject
import java.time.Instant
import java.time.ZoneId
import java.time.DayOfWeek
import java.time.format.DateTimeFormatter

/**
 * The ONLY native presentation adapter. Widget and Monitor display the App's
 * immutable canonical finance snapshot. Persistence is not a display gate. Never calculate
 * financial results inside a Widget or overlay.
 */
internal object TfAssetMarketPresentation{
  internal fun sourceTimeLabel(value:String):String = runCatching{
    DateTimeFormatter.ofPattern("HH:mm").withZone(ZoneId.of("Asia/Taipei")).format(Instant.parse(value))
  }.getOrDefault("--")

  internal fun nextExpiry(raw:JSONObject,now:Long):Long?{
    val holdings=raw.optJSONArray("holdings")?:return null
    return (0 until holdings.length()).flatMap{i->
      val row=holdings.optJSONObject(i)?:return@flatMap emptyList<Long>()
      val freshness=runCatching{Instant.parse(row.optString("updatedAt","")).toEpochMilli()+30_000L}.getOrNull()
      listOfNotNull(freshness,row.optLong("valuationValidUntil",0L))
    }.filter{it>now}.minOrNull()
  }

  fun decorate(context:Context,raw:JSONObject):JSONObject{
    return decorateSnapshot(JSONObject(),raw,System.currentTimeMillis())
  }

  /** Pure JSON projection, exercised by the native regression gate. */
  internal fun decorateSnapshot(market:JSONObject,raw:JSONObject,now:Long):JSONObject{
    val version=market.optLong("version",0L)
    val decorated=JSONObject(raw.toString())
    val holdings=raw.optJSONArray("holdings")?:JSONArray()
    val localNow=Instant.ofEpochMilli(now).atZone(ZoneId.of("Asia/Taipei"))
    val minute=localNow.hour*60+localNow.minute
    val active=!TradingCalendar.closed(now)&&minute>=540&&minute<810
    fun usable(row:JSONObject):Boolean{
      if(row.optString("valuationStatus","") !in listOf("current_session","reference"))return false
      val until=row.optLong("valuationValidUntil",0L)
      val price=row.optDouble("price",Double.NaN)
      val at=runCatching{Instant.parse(row.optString("updatedAt","")).toEpochMilli()}.getOrDefault(0L)
      if(!price.isFinite()||price<=0)return false
      if(at<=0L||at>now+120_000L)return false
      val quality=row.optString("marketQuality","")
      if(quality !in listOf("trade","backup_realtime","previous_close","official_close"))return false
      val sourceDate=Instant.ofEpochMilli(at).atZone(ZoneId.of("Asia/Taipei")).toLocalDate().toString()
      return true
    }
    val synchronized=raw.optBoolean("valuationComplete",false) &&
      (0 until holdings.length()).all{i->
        val row=holdings.optJSONObject(i)?:return@all false
        usable(row)
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
      val rowUsable=usable(original)
      if(!rowUsable){
        listOf("price","previousClose","change","changePercent","updatedAt")
          .forEach{row.put(it,JSONObject.NULL)}
        row.put("marketStatus","行情待取得")
      }else{
        val at=Instant.parse(original.getString("updatedAt")).toEpochMilli()
        val label=when(row.optString("marketQuality","")){
          "trade"->"成交"
          "backup_realtime"->"備援行情"
          else->"快取／收盤參考"
        }
        val delayed=row.optString("quoteStatus")=="DELAYED" ||
          (active && at>0L && now-at>30_000L)
        row.put("marketStatus",if(TradingCalendar.closed(now))"休市｜最後有效行情" else if(!active)"盤外參考價" else if(row.optString("valuationStatus")=="reference"||row.optString("quoteStatus") in listOf("STALE","OFFLINE"))"最後有效行情（未更新）" else label+(if(delayed)"（延遲）" else ""))
      }
      if(!rowUsable){
        listOf("marketValue","pnl","roi","comprehensivePnl")
          .forEach{row.put(it,JSONObject.NULL)}
      }
      output.put(row)
    }
    decorated.put("holdings",output)
    return decorated
  }
}
