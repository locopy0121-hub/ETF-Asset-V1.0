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
import java.time.Instant
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
    private const val YAHOO_URL="https://query1.finance.yahoo.com/v8/finance/chart/"
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
      setRequestProperty("User-Agent","TF-Asset-MarketCenter/3.2.6")
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

  private fun firstBookPrice(raw:String):Double?{
    for(part in raw.trim().split("_")){
      val value=finitePositive(part)
      if(value!=null)return value
    }
    return null
  }

  private fun previousCloseAt(row:JSONObject,now:Long):Long?{
    val day=row.optString("d","")
    if(!day.matches(Regex("[0-9]{8}")))return null
    val parsed=runCatching{LocalDate.parse(day,DateTimeFormatter.ofPattern("uuuuMMdd"))}.getOrNull()?:return null
    var date=parsed.minusDays(1)
    while(date.dayOfWeek.value>=6)date=date.minusDays(1)
    val at=date.atTime(13,30).atZone(TAIPEI).toInstant().toEpochMilli()
    return at.takeIf{it>0L&&it<=now+120_000L&&it>=now-31L*86_400_000L}
  }

  private fun marketFromMis(row:JSONObject):String{
    val ex=row.optString("ex","").trim().lowercase()
    val ch=row.optString("ch","").trim().lowercase()
    return when{
      ex=="tse"||ch.startsWith("tse_")->"TSE"
      ex=="otc"||ch.startsWith("otc_")->"OTC"
      else->"UNKNOWN"
    }
  }

  /** A-layer normalizer: effective fallback is explicit and never relabeled as TWSE z. */
  private fun misQuote(row:JSONObject,now:Long):JSONObject?{
    val symbol=row.optString("c","").trim().uppercase()
    if(!CODE.matches(symbol))return null
    val z=finitePositive(row.optString("z",""))
    val pz=finitePositive(row.optString("pz",""))
    val bid=firstBookPrice(row.optString("b",""))
    val ask=firstBookPrice(row.optString("a",""))
    val prev=finitePositive(row.optString("y",""))
    val exchange=exchangeAt(row,now)
    var price:Double?=null
    var quality=""
    var priceType=""
    var fallback=true
    var sourceAt:Long?=exchange
    var message=""
    when{
      z!=null&&exchange!=null->{price=z;quality="trade";priceType="REALTIME_TRADE";fallback=false;message="TWSE MIS z 實際成交價"}
      pz!=null&&exchange!=null->{price=pz;quality="backup_realtime";priceType="BACKUP_REALTIME";message="TWSE z 缺值；採用 pz 最近成交參考"}
      bid!=null&&exchange!=null->{price=bid;quality="bid_ask";priceType="BID_ASK";message="TWSE z 缺值；採用最佳買價"}
      ask!=null&&exchange!=null->{price=ask;quality="bid_ask";priceType="BID_ASK";message="TWSE z 缺值；採用最佳賣價"}
      prev!=null->{sourceAt=previousCloseAt(row,now);if(sourceAt!=null){price=prev;quality="previous_close";priceType="PREV_CLOSE";message="TWSE z／即時欄位缺值；採用昨日收盤價"}}
    }
    val effective=price?:return null
    val at=sourceAt?:return null
    return JSONObject().put("symbol",symbol)
      .put("name",row.optString("n",symbol).trim().ifBlank{symbol})
      .put("currentPrice",effective)
      .put("previousClose",prev?:JSONObject.NULL)
      .put("officialTradePrice",z?:JSONObject.NULL)
      .put("sourceQuoteAt",at).put("quality",quality).put("source","TWSE_MIS")
      .put("priceType",priceType).put("isFallback",fallback)
      .put("market",marketFromMis(row)).put("statusMessage",message)
  }

  private fun yahooQuote(symbol:String,now:Long):JSONObject?{
    for((suffix,market) in listOf(".TW" to "TSE",".TWO" to "OTC")){
      try{
        val raw=fetchJson(YAHOO_URL+URLEncoder.encode(symbol+suffix,"UTF-8")+"?interval=1m&range=1d")
        val meta=JSONObject(raw).optJSONObject("chart")?.optJSONArray("result")
          ?.optJSONObject(0)?.optJSONObject("meta")?:continue
        val price=finitePositive(meta.optString("regularMarketPrice",""))?:continue
        val seconds=meta.optLong("regularMarketTime",0L)
        val at=seconds*1000L
        if(seconds<=0L||at>now+120_000L||at<now-31L*86_400_000L)continue
        return JSONObject().put("symbol",symbol)
          .put("name",meta.optString("shortName",symbol).trim().ifBlank{symbol})
          .put("currentPrice",price)
          .put("previousClose",finitePositive(meta.optString("previousClose",""))?:JSONObject.NULL)
          .put("officialTradePrice",JSONObject.NULL)
          .put("sourceQuoteAt",at).put("quality","backup_realtime").put("source","YAHOO")
          .put("priceType","BACKUP_REALTIME").put("isFallback",true).put("market",market)
          .put("statusMessage","TWSE 無可用行情；採用 Yahoo Finance 備援行情")
      }catch(_:Exception){ /* Try the other Taiwan market suffix. */ }
    }
    return null
  }

  private fun yahooIntraday(symbol:String,now:Long):JSONArray{
    for((suffix,_) in listOf(".TW" to "TSE",".TWO" to "OTC")){
      try{
        val raw=fetchJson(YAHOO_URL+URLEncoder.encode(symbol+suffix,"UTF-8")+"?interval=1m&range=1d")
        val result=JSONObject(raw).optJSONObject("chart")?.optJSONArray("result")?.optJSONObject(0)?:continue
        val meta=result.optJSONObject("meta")
        val previousClose=finitePositive(meta?.optString("chartPreviousClose","")?:"")
          ?:finitePositive(meta?.optString("previousClose","")?:"")
        val timestamps=result.optJSONArray("timestamp")?:continue
        val quote=result.optJSONObject("indicators")?.optJSONArray("quote")?.optJSONObject(0)?:continue
        val closes=quote.optJSONArray("close")?:continue
        val points=JSONArray()
        for(index in 0 until minOf(timestamps.length(),closes.length())){
          if(closes.isNull(index))continue
          val price=closes.optDouble(index,Double.NaN)
          val at=timestamps.optLong(index,0L)*1000L
          if(!price.isFinite()||price<=0.0||at<=0L||at>now+120_000L)continue
          val local=Instant.ofEpochMilli(at).atZone(TAIPEI)
          val minute=local.hour*60+local.minute
          if(minute !in 540..810)continue
          points.put(JSONObject().put("symbol",symbol).put("currentPrice",price)
            .put("previousClose",previousClose?:JSONObject.NULL)
            .put("sourceQuoteAt",at).put("quality","backup_realtime").put("source","YAHOO"))
        }
        if(points.length()>0)return points
      }catch(_:Exception){ /* Try the other Taiwan market suffix. */ }
    }
    return JSONArray()
  }

  private fun backfillIntraday(symbols:List<String>,now:Long,errors:MutableList<String>){
    val local=Instant.ofEpochMilli(now).atZone(TAIPEI)
    if(local.dayOfWeek.value>=6)return
    val minute=local.hour*60+local.minute
    if(minute<540)return
    val day=local.toLocalDate().toString()
    val closeCoverageAt=local.toLocalDate().atTime(13,25).atZone(TAIPEI).toInstant().toEpochMilli()
    for(symbol in symbols){
      val coverage=db.intradayCoverage(symbol,day)
      val staleDuringSession=minute<=810&&(coverage.count<2||coverage.lastAt<now-10*60_000L)
      val incompleteAfterClose=minute>810&&(coverage.count<2||coverage.lastAt<closeCoverageAt)
      if(!staleDuringSession&&!incompleteAfterClose)continue
      try{
        val points=yahooIntraday(symbol,now)
        if(points.length()>0)db.mergeIntraday(points,now)
      }catch(error:Exception){
        errors.add("YAHOO_INTRADAY "+symbol+": "+(error.message?:"unknown"))
      }
    }
  }

  private fun qualityRank(value:String)=when(value){
    "trade"->50
    "backup_realtime"->40
    "bid_ask"->30
    "official_close"->20
    "previous_close"->10
    else->0
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
      .put("previousClose",JSONObject.NULL).put("officialTradePrice",JSONObject.NULL)
      .put("sourceQuoteAt",at).put("quality","official_close").put("source",market)
      .put("priceType","OFFICIAL_CLOSE").put("isFallback",true)
      .put("market",if(twse)"TSE" else "OTC").put("statusMessage","官方日收盤備援")
  }

  /**
   * When a verified HTTPS backend is configured, ALL native surfaces consume
   * its single versioned market API. No independent official HTTP request runs
   * on the phone. Without deployment the local official source remains an
   * explicitly labeled QA fallback, never an imaginary cloud deployment.
   */
  private fun remoteSnapshot(base:String,symbols:List<String>,now:Long):JSONObject{
    val prefs=context.getSharedPreferences("tf_asset_native",0)
    val clientId=prefs.getString("market_client_id",null)
      ?.takeIf{it.matches(Regex("[a-zA-Z0-9_-]{8,64}"))}
      ?:("android_"+java.util.UUID.randomUUID().toString().replace("-","")).also{
        prefs.edit().putString("market_client_id",it).apply()
      }
    try{
      val subscribe=(URL(base+"/v1/market/subscriptions").openConnection() as HttpURLConnection).apply{
        requestMethod="POST"
        doOutput=true
        connectTimeout=3500
        readTimeout=3500
        setRequestProperty("Content-Type","application/json")
      }
      try{
        val body=JSONObject().put("clientId",clientId).put("symbols",JSONArray(symbols)).toString()
        subscribe.outputStream.use{it.write(body.toByteArray(Charsets.UTF_8))}
        subscribe.inputStream.close()
      }finally{subscribe.disconnect()}
    }catch(_:Exception){ /* Static backend watches still allow cache reads. */ }
    val url=base+"/v1/market/quotes?symbols="+URLEncoder.encode(symbols.joinToString(","),"UTF-8")+"&intraday=1"
    val raw=fetchJson(url)
    val result=JSONObject(raw)
    val rows=result.optJSONArray("quotes")?:JSONArray()
    val candidates=mutableListOf<JSONObject>()
    for(index in 0 until rows.length()){
      val row=rows.optJSONObject(index)?:continue
      val source=row.optString("source","")
      val quality=row.optString("quality","")
      val code=row.optString("symbol","").trim().uppercase()
      if(!symbols.contains(code)||source !in setOf("TWSE_MIS","YAHOO","TWSE_DAILY","TPEX_DAILY")||
        quality !in setOf("trade","backup_realtime","bid_ask","previous_close","official_close"))continue
      if(!row.has("priceType"))row.put("priceType",if(quality=="trade")"REALTIME_TRADE" else "OFFICIAL_CLOSE")
      if(!row.has("isFallback"))row.put("isFallback",quality!="trade")
      if(!row.has("market"))row.put("market","UNKNOWN")
      if(!row.has("statusMessage"))row.put("statusMessage","遠端行情中心")
      if(!row.has("officialTradePrice"))row.put("officialTradePrice",if(quality=="trade")row.optDouble("currentPrice") else JSONObject.NULL)
      candidates.add(row)
    }
    val committed=db.upsertVerified(candidates,now)
    val local=db.snapshot(symbols)
    val covered=(0 until local.getJSONArray("quotes").length()).mapNotNull{
      local.getJSONArray("quotes").optJSONObject(it)?.optString("symbol","")
    }.toSet()
    val missing=symbols.filterNot{covered.contains(it)}
    local.put("updatedCount",committed.optInt("updatedCount",0))
      .put("conflictCount",committed.optInt("conflictCount",0))
      .put("coveredCount",covered.size).put("requestedCount",symbols.size)
      .put("queriedAt",now).put("missing",JSONArray(missing))
      .put("backendVersion",result.optLong("version",0L))
      .put("mode","remote_backend")
      .put("degraded",result.optBoolean("degraded",false))
      .put("errors",result.optJSONArray("errors")?:JSONArray())
    result.optJSONObject("intraday")?.let{local.put("intraday",it)}
    return local
  }

  fun refresh(requested:Collection<String>):JSONObject=synchronized(FETCH_LOCK){
    val symbols=requested.map{it.trim().uppercase()}.filter{CODE.matches(it)}.distinct()
    val now=System.currentTimeMillis()
    if(symbols.isEmpty())return@synchronized db.snapshot().put("updatedCount",0)
      .put("coveredCount",0).put("missing",JSONArray()).put("queriedAt",now)
    val backend=context.getSharedPreferences("tf_asset_native",0)
      .getString("market_backend_url","")?.trim()?.trimEnd('/')?:""
    if(backend.startsWith("https://")&&!backend.contains("@")){
      try{return@synchronized remoteSnapshot(backend,symbols,now)}
      catch(error:Exception){
        // A missing backend does not authorize a second phone-side crawler.
        // Preserve last verified SQLite rows and show explicit degraded status.
        val old=db.snapshot(symbols)
        val available=(0 until old.getJSONArray("quotes").length()).mapNotNull{
          old.getJSONArray("quotes").optJSONObject(it)?.optString("symbol","")
        }.toSet()
        return@synchronized old.put("updatedCount",0).put("mode","remote_degraded")
          .put("degraded",true).put("queriedAt",now)
          .put("requestedCount",symbols.size).put("coveredCount",available.size)
          .put("missing",JSONArray(symbols.filterNot{available.contains(it)}))
          .put("errors",JSONArray(listOf("行情後端暫時無法連線："+(error.message?:"網路錯誤"))))
      }
    }
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
          val parsed=misQuote(row,now)?:continue
          val old=best[symbol]
          if(old==null||parsed.optLong("sourceQuoteAt")>old.optLong("sourceQuoteAt")){
            best[symbol]=parsed
          }
        }
        candidates.addAll(best.values)
      }catch(error:Exception){errors.add("MIS: "+(error.message?:"unknown"))}
    }
    var covered=candidates.map{it.optString("symbol","")}.toSet()
    var missing=symbols.filterNot{covered.contains(it)}
    if(missing.isNotEmpty()){
      for(symbol in missing.toList()){
        val yahoo=yahooQuote(symbol,now)
        if(yahoo!=null)candidates.add(yahoo)
      }
      covered=candidates.map{it.optString("symbol","")}.toSet()
      missing=symbols.filterNot{covered.contains(it)}
    }
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
    // Newer source time wins; equal timestamps use explicit provenance quality.
    val chosen=linkedMapOf<String,JSONObject>()
    for(candidate in candidates){
      val symbol=candidate.optString("symbol","")
      val prior=chosen[symbol]
      if(prior==null||candidate.optLong("sourceQuoteAt")>prior.optLong("sourceQuoteAt")||
         (candidate.optLong("sourceQuoteAt")==prior.optLong("sourceQuoteAt")&&
          qualityRank(candidate.optString("quality",""))>qualityRank(prior.optString("quality",""))))chosen[symbol]=candidate
    }
    val committed=db.upsertVerified(chosen.values.toList(),now)
    // Backfill a missing morning/gap from 1-minute market history. This is only
    // used in local-fallback mode; a configured backend remains the sole source.
    backfillIntraday(symbols,now,errors)
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
