package com.tfasset.app

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.LocalTime
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.time.format.ResolverStyle

/** Single official-data fetch/validation path shared by App, Widget and Monitor. */
internal class TfAssetMarketCenter(private val context:Context){
  companion object{
    private val FETCH_LOCK=Any()
    private val TAIPEI=ZoneId.of("Asia/Taipei")
    private val DATETIME=DateTimeFormatter.ofPattern("uuuuMMdd HH:mm:ss").withResolverStyle(ResolverStyle.STRICT)
    private val CODE=Regex("[0-9A-Z]{4,8}")
    private const val MIS_URL="https://mis.twse.com.tw/stock/api/getStockInfo.jsp?ex_ch="
    private const val TWSE_DAILY="https://openapi.twse.com.tw/v1/exchangeReport/STOCK_DAY_ALL"
    private const val TPEX_DAILY="https://www.tpex.org.tw/openapi/v1/tpex_mainboard_daily_close_quotes"
  }
  private val db=TfAssetMarketDatabase(context)
  fun snapshot(symbols:Collection<String> = emptyList())=db.snapshot(symbols)

  private fun fetchJson(url:String):String{
    val connection=(URL(url).openConnection() as HttpURLConnection).apply{
      connectTimeout=6000
      readTimeout=7000
      useCaches=false
      setRequestProperty("Accept","application/json")
      setRequestProperty("Cache-Control","no-cache, no-store")
      setRequestProperty("Referer","https://mis.twse.com.tw/stock/index.jsp")
    }
    return try{
      if(connection.responseCode!=200)throw IllegalStateException("HTTP "+connection.responseCode)
      connection.inputStream.bufferedReader(Charsets.UTF_8).use{it.readText()}
    }finally{connection.disconnect()}
  }

  private fun exchangeAt(row:JSONObject,now:Long):Long?{
    val date=row.optString("d","")
    val time=row.optString("t","")
    if(!date.matches(Regex("[0-9]{8}"))||!time.matches(Regex("[0-9]{2}:[0-9]{2}:[0-9]{2}")))return null
    val at=runCatching{LocalDateTime.parse(date+" "+time,DATETIME)
      .atZone(TAIPEI).toInstant().toEpochMilli()}.getOrNull()?:return null
    if(at<=0L||at>now+120_000L||at<now-31L*86_400_000L)return null
    val tlong=row.optString("tlong","")
    val precise=tlong.takeIf{it.matches(Regex("[0-9]{13}"))}?.toLongOrNull()
    return if(precise!=null&&kotlin.math.abs(precise-at)<1_000L)precise else at
  }

  private fun finitePositive(input:String):Double?{
    val value=input.trim().replace(",","").toDoubleOrNull()
    return value?.takeIf{it.isFinite()&&it>0.0}
  }

  private fun traded(row:JSONObject,now:Long):JSONObject?{
    val symbol=row.optString("c","").trim().uppercase()
    val price=finitePositive(row.optString("z",""))?:return null
    val at=exchangeAt(row,now)?:return null
    return JSONObject().put("symbol",symbol)
      .put("name",row.optString("n",symbol).trim().ifBlank{symbol})
      .put("currentPrice",price)
      .put("previousClose",finitePositive(row.optString("y",""))?:JSONObject.NULL)
      .put("sourceQuoteAt",at).put("quality","trade").put("source","TWSE_MIS")
  }

  private fun dailyDate(value:String):LocalDate?{
    val raw=value.trim().replace("/","").replace("-","")
    val date=runCatching{
      val yyyy=when(raw.length){
        7->raw.substring(0,3).toInt()+1911
        8->raw.substring(0,4).toInt()
        else->return null
      }
      LocalDate.of(yyyy,raw.substring(raw.length-4,raw.length-2).toInt(),raw.takeLast(2).toInt())
    }.getOrNull()?:return null
    return date
  }

  private fun officialClose(row:JSONObject,market:String,now:Long):JSONObject?{
    val twse=market=="TWSE_DAILY"
    val symbol=(if(twse)row.optString("Code","") else row.optString("SecuritiesCompanyCode","")).trim().uppercase()
    val price=finitePositive(if(twse)row.optString("ClosingPrice","") else row.optString("Close",""))?:return null
    val day=dailyDate(row.optString("Date",""))?:return null
    val nowTaipei=java.time.Instant.ofEpochMilli(now).atZone(TAIPEI)
    if(day.isAfter(nowTaipei.toLocalDate())||day.isBefore(nowTaipei.toLocalDate().minusDays(31)))return null
    // Daily endpoints can expose an in-progress row; do not label today's data
    // an official closing price before the session has finished.
    if(day==nowTaipei.toLocalDate()&&nowTaipei.toLocalTime().isBefore(LocalTime.of(13,35)))return null
    val at=day.atTime(13,30).atZone(TAIPEI).toInstant().toEpochMilli()
    if(at>now+120_000L)return null
    val name=(if(twse)row.optString("Name",symbol) else row.optString("CompanyName",symbol)).trim().ifBlank{symbol}
    return JSONObject().put("symbol",symbol).put("name",name).put("currentPrice",price)
      .put("previousClose",JSONObject.NULL).put("sourceQuoteAt",at)
      .put("quality","official_close").put("source",market)
  }

  fun refresh(requested:Collection<String>):JSONObject=synchronized(FETCH_LOCK){
    val symbols=requested.map{it.trim().uppercase()}.filter{CODE.matches(it)}.distinct()
    val now=System.currentTimeMillis()
    if(symbols.isEmpty())return@synchronized db.snapshot().put("updatedCount",0)
      .put("coveredCount",0).put("missing",JSONArray()).put("queriedAt",now)
    val wanted=symbols.toSet()
    val candidates=mutableListOf<JSONObject>()
    val errors=mutableListOf<String>()
    for(batch in symbols.chunked(30)){
      val channels=batch.flatMap{listOf("tse_"+it+".tw","otc_"+it+".tw")}.joinToString("|")
      try{
        val url=MIS_URL+URLEncoder.encode(channels,"UTF-8")+"&json=1&delay=0&_="+now
        val rows=JSONObject(fetchJson(url)).optJSONArray("msgArray")?:JSONArray()
        val best=linkedMapOf<String,JSONObject>()
        for(i in 0 until rows.length()){
          val row=rows.optJSONObject(i)?:continue
          val symbol=row.optString("c","").trim().uppercase()
          if(!wanted.contains(symbol))continue
          val parsed=traded(row,now)?:continue
          val old=best[symbol]
          if(old==null||parsed.optLong("sourceQuoteAt")>old.optLong("sourceQuoteAt")){
            best[symbol]=parsed
          }
        }
        candidates.addAll(best.values)
      }catch(error:Exception){errors.add("MIS: "+(error.message?:"unknown"))}
    }
    val tradedSymbols=candidates.map{it.optString("symbol","")}.toSet()
    val missing=symbols.filterNot{tradedSymbols.contains(it)}
    if(missing.isNotEmpty()){
      for((source,url) in listOf("TWSE_DAILY" to TWSE_DAILY,"TPEX_DAILY" to TPEX_DAILY)){
        try{
          val rows=JSONArray(fetchJson(url))
          for(i in 0 until rows.length()){
            val row=rows.optJSONObject(i)?:continue
            val official=officialClose(row,source,now)?:continue
            if(missing.contains(official.optString("symbol","")))candidates.add(official)
          }
        }catch(error:Exception){errors.add(source+": "+(error.message?:"unknown"))}
      }
    }
    // Prefer the actual traded price if both sources describe the same security.
    val chosen=linkedMapOf<String,JSONObject>()
    for(candidate in candidates){
      val symbol=candidate.optString("symbol","")
      val prior=chosen[symbol]
      if(prior==null||candidate.optLong("sourceQuoteAt")>prior.optLong("sourceQuoteAt")||
         (candidate.optLong("sourceQuoteAt")==prior.optLong("sourceQuoteAt")&&
          candidate.optString("quality","")=="trade"))chosen[symbol]=candidate
    }
    val committed=db.upsertVerified(chosen.values.toList(),now)
    val state=db.snapshot(symbols)
    val available=(0 until state.getJSONArray("quotes").length()).mapNotNull{
      state.getJSONArray("quotes").optJSONObject(it)?.optString("symbol","")
    }.toSet()
    state.put("updatedCount",committed.optInt("updatedCount",0))
      .put("conflictCount",committed.optInt("conflictCount",0))
      .put("coveredCount",symbols.count{available.contains(it)})
      .put("requestedCount",symbols.size).put("queriedAt",now)
      .put("missing",JSONArray(symbols.filterNot{available.contains(it)}))
      .put("errors",JSONArray(errors.distinct()))
    state
  }
}
