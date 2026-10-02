package com.tfasset.app

import android.content.ContentValues
import android.content.Context
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper
import org.json.JSONArray
import org.json.JSONObject
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter

/**
 * Market-only database. It NEVER opens, migrates, deletes or recalculates the Ledger.
 * V3 adds current-session intraday history for Mini charts. Only real trade/recent-trade
 * provenance is recorded; bid/ask and previous-close fallbacks are never drawn as trades.
 */
internal class TfAssetMarketDatabase(context:Context):SQLiteOpenHelper(
  context.applicationContext,"tf_asset_market_center_v1.db",null,8
){
  companion object{
    private val TAIPEI=ZoneId.of("Asia/Taipei")
    private val DAY=DateTimeFormatter.ofPattern("yyyy-MM-dd")
    private val MINUTE=DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm")
    private const val SESSION_START_MINUTE=9*60
  }
  internal data class IntradayCoverage(val count:Int,val firstAt:Long,val lastAt:Long)

  private val qualityRank=mapOf(
    "trade" to 50,"backup_realtime" to 40,"bid_ask" to 30,
    "official_close" to 20,"previous_close" to 10
  )
  private val allowedQuality=qualityRank.keys
  private val allowedSource=setOf("TWSE_MIS","FUGLE","SHIOAJI","YAHOO","TWSE_DAILY","TPEX_DAILY")
  private val allowedPriceType=setOf("REALTIME_TRADE","BACKUP_REALTIME","BID_ASK","PREV_CLOSE","OFFICIAL_CLOSE")
  private val intradayQuality=setOf("trade","backup_realtime")
  private val intradaySource=setOf("TWSE_MIS","FUGLE","SHIOAJI","YAHOO")

  private fun createQuoteTable(db:SQLiteDatabase,name:String="market_quotes"){
    db.execSQL("""CREATE TABLE IF NOT EXISTS $name(
      symbol TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      price REAL NOT NULL CHECK(price>0),
      previous_close REAL,
      official_trade_price REAL,
      source_at INTEGER NOT NULL CHECK(source_at>0),
      quality TEXT NOT NULL CHECK(quality IN ('trade','backup_realtime','bid_ask','previous_close','official_close')),
      source TEXT NOT NULL CHECK(source IN ('TWSE_MIS','FUGLE','SHIOAJI','YAHOO','TWSE_DAILY','TPEX_DAILY')),
      price_type TEXT NOT NULL CHECK(price_type IN ('REALTIME_TRADE','BACKUP_REALTIME','BID_ASK','PREV_CLOSE','OFFICIAL_CLOSE')),
      is_fallback INTEGER NOT NULL DEFAULT 0,
      market TEXT NOT NULL DEFAULT 'UNKNOWN',
      status_message TEXT NOT NULL DEFAULT '',
      checked_at INTEGER NOT NULL,
      volume INTEGER CHECK(volume>=0)
    )""")
  }

  private fun createIntradayTable(db:SQLiteDatabase){
    db.execSQL("""CREATE TABLE IF NOT EXISTS market_intraday(
      symbol TEXT NOT NULL,
      source_at INTEGER NOT NULL CHECK(source_at>0),
      price REAL NOT NULL CHECK(price>0),
      previous_close REAL,
      quality TEXT NOT NULL CHECK(quality IN ('trade','backup_realtime')),
      source TEXT NOT NULL CHECK(source IN ('TWSE_MIS','FUGLE','SHIOAJI','YAHOO')),
      received_at INTEGER NOT NULL,
      PRIMARY KEY(symbol,source_at,source)
    )""")
    db.execSQL("CREATE INDEX IF NOT EXISTS market_intraday_symbol_time ON market_intraday(symbol,source_at DESC)")
  }

  private fun createResearchTables(db:SQLiteDatabase){
    db.execSQL("""CREATE TABLE IF NOT EXISTS etf_components(
      etf_symbol TEXT NOT NULL,
      stock_symbol TEXT NOT NULL,
      stock_name TEXT NOT NULL DEFAULT '',
      weight REAL NOT NULL CHECK(weight>=0 AND weight<=100),
      industry TEXT NOT NULL DEFAULT '',
      source TEXT NOT NULL DEFAULT '',
      effective_date TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL DEFAULT '',
      PRIMARY KEY(etf_symbol,stock_symbol)
    )""")
    db.execSQL("CREATE INDEX IF NOT EXISTS etf_components_symbol_weight ON etf_components(etf_symbol,weight DESC)")
    db.execSQL("""CREATE TABLE IF NOT EXISTS etf_meta(
      etf_symbol TEXT PRIMARY KEY NOT NULL,
      frequency TEXT NOT NULL DEFAULT '',
      ter_ratio REAL,
      category TEXT NOT NULL DEFAULT '',
      issuer TEXT NOT NULL DEFAULT '',
      tracking_index TEXT NOT NULL DEFAULT '',
      active INTEGER NOT NULL DEFAULT 1,
      source TEXT NOT NULL DEFAULT '',
      effective_date TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL DEFAULT ''
    )""")
    db.execSQL("""CREATE TABLE IF NOT EXISTS etf_research_meta(
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL DEFAULT ''
    )""")
  }

  override fun onCreate(db:SQLiteDatabase){
    createQuoteTable(db)
    createIntradayTable(db)
    createResearchTables(db)
    db.execSQL("CREATE TABLE IF NOT EXISTS market_meta(key TEXT PRIMARY KEY,val INTEGER NOT NULL)")
    db.execSQL("INSERT OR IGNORE INTO market_meta(key,val) VALUES('version',0)")
  }

  override fun onUpgrade(db:SQLiteDatabase,oldVersion:Int,newVersion:Int){
    if(oldVersion<2){
      createQuoteTable(db,"market_quotes_v2")
      runCatching{
        db.execSQL("""INSERT OR REPLACE INTO market_quotes_v2(
          symbol,name,price,previous_close,official_trade_price,source_at,quality,source,
          price_type,is_fallback,market,status_message,checked_at
        )
        SELECT symbol,name,price,previous_close,
          CASE WHEN quality='trade' THEN price ELSE NULL END,
          source_at,quality,source,
          CASE WHEN quality='trade' THEN 'REALTIME_TRADE' ELSE 'OFFICIAL_CLOSE' END,
          CASE WHEN quality='trade' THEN 0 ELSE 1 END,
          'UNKNOWN',
          CASE WHEN quality='trade' THEN '既有 TWSE 實際成交行情' ELSE '既有官方收盤行情' END,
          checked_at
        FROM market_quotes""")
        db.execSQL("DROP TABLE market_quotes")
        db.execSQL("ALTER TABLE market_quotes_v2 RENAME TO market_quotes")
      }.onFailure{
        db.execSQL("DROP TABLE IF EXISTS market_quotes_v2")
        createQuoteTable(db)
      }
    }
    if(oldVersion<3)createIntradayTable(db)
    if(oldVersion==3)runCatching{db.execSQL("ALTER TABLE market_intraday ADD COLUMN previous_close REAL")}
    if(oldVersion<5)createResearchTables(db)
    if(oldVersion<6){
      // V6 widens quote provenance for server-side Fugle/Shioaji failover.
      // Rebuild constrained tables so existing verified rows are preserved.
      db.execSQL("ALTER TABLE market_quotes RENAME TO market_quotes_v5")
      createQuoteTable(db)
      db.execSQL("""INSERT OR REPLACE INTO market_quotes(
        symbol,name,price,previous_close,official_trade_price,source_at,quality,source,
        price_type,is_fallback,market,status_message,checked_at
      )
      SELECT symbol,name,price,previous_close,official_trade_price,source_at,quality,source,
        price_type,is_fallback,market,status_message,checked_at
      FROM market_quotes_v5""")
      db.execSQL("DROP TABLE market_quotes_v5")

      db.execSQL("DROP INDEX IF EXISTS market_intraday_symbol_time")
      db.execSQL("ALTER TABLE market_intraday RENAME TO market_intraday_v5")
      createIntradayTable(db)
      db.execSQL("""INSERT OR IGNORE INTO market_intraday(
        symbol,source_at,price,previous_close,quality,source,received_at
      )
      SELECT symbol,source_at,price,previous_close,quality,source,received_at
      FROM market_intraday_v5""")
      db.execSQL("DROP TABLE market_intraday_v5")
    }
    if(oldVersion<7){
      // V7 retires MIS pz/previous-close rows that could masquerade as the live price.
      db.delete("market_quotes","quality=? OR (source=? AND price_type=?)",
        arrayOf("previous_close","TWSE_MIS","BACKUP_REALTIME"))
      db.delete("market_intraday","source=? AND quality=?",
        arrayOf("TWSE_MIS","backup_realtime"))
    }
    if(oldVersion<8){
      // V8 makes the primary holdings price trade-only: bid/ask never survives as currentPrice.
      db.delete("market_quotes","quality=?",arrayOf("bid_ask"))
    }
    db.execSQL("CREATE TABLE IF NOT EXISTS market_meta(key TEXT PRIMARY KEY,val INTEGER NOT NULL)")
    db.execSQL("INSERT OR IGNORE INTO market_meta(key,val) VALUES('version',0)")
  }

  private fun inTaipeiSession(at:Long):Boolean{
    val local=Instant.ofEpochMilli(at).atZone(TAIPEI)
    val minute=local.hour*60+local.minute
    return minute in 540..810
  }

  private fun insertIntraday(db:SQLiteDatabase,row:JSONObject,receivedAt:Long){
    val symbol=row.optString("symbol","").trim().uppercase()
    val at=row.optLong("sourceQuoteAt",0L)
    val price=row.optDouble("currentPrice",Double.NaN)
    val quality=row.optString("quality","")
    val source=row.optString("source","")
    if(!symbol.matches(Regex("[0-9A-Z]{4,8}"))||at<=0L||!price.isFinite()||price<=0.0||
      quality !in intradayQuality||source !in intradaySource||!inTaipeiSession(at))return
    val values=ContentValues().apply{
      put("symbol",symbol);put("source_at",at);put("price",price)
      val previous=row.optDouble("previousClose",Double.NaN)
      if(previous.isFinite()&&previous>0)put("previous_close",previous) else putNull("previous_close")
      put("quality",quality);put("source",source);put("received_at",receivedAt)
    }
    db.insertWithOnConflict("market_intraday",null,values,SQLiteDatabase.CONFLICT_IGNORE)
  }

  @Synchronized fun mergeIntraday(points:JSONArray,receivedAt:Long):Int{
    val db=writableDatabase
    var inserted=0
    db.beginTransaction()
    try{
      for(i in 0 until points.length()){
        val row=points.optJSONObject(i)?:continue
        val before=db.compileStatement("SELECT COUNT(*) FROM market_intraday WHERE symbol=? AND source_at=? AND source=?").use{
          it.bindString(1,row.optString("symbol","").trim().uppercase())
          it.bindLong(2,row.optLong("sourceQuoteAt",0L))
          it.bindString(3,row.optString("source",""))
          it.simpleQueryForLong()
        }
        insertIntraday(db,row,receivedAt)
        if(before==0L)inserted++
      }
      db.setTransactionSuccessful()
    }finally{db.endTransaction()}
    return inserted
  }

  @Synchronized fun intradayCoverage(symbol:String,day:String):IntradayCoverage{
    val db=readableDatabase
    val sql="""SELECT COUNT(*),COALESCE(MIN(source_at),0),COALESCE(MAX(source_at),0)
      FROM market_intraday
      WHERE symbol=? AND strftime('%Y-%m-%d',source_at/1000,'unixepoch','+8 hours')=?"""
    return db.rawQuery(sql,arrayOf(symbol,day)).use{cursor->
      if(cursor.moveToFirst())IntradayCoverage(cursor.getInt(0),cursor.getLong(1),cursor.getLong(2))
      else IntradayCoverage(0,0L,0L)
    }
  }

  private fun activeTradingDay(now:Long):String?{
    val local=Instant.ofEpochMilli(now).atZone(TAIPEI)
    if(local.dayOfWeek.value>=6)return null
    val minute=local.hour*60+local.minute
    return if(minute>=SESSION_START_MINUTE)local.toLocalDate().format(DAY) else null
  }

  private fun intradaySnapshot(symbols:Collection<String>,now:Long=System.currentTimeMillis()):JSONObject{
    val db=readableDatabase
    val requested=if(symbols.isNotEmpty())symbols.map{it.trim().uppercase()}.distinct() else buildList{
      db.rawQuery("""SELECT symbol FROM market_quotes
        UNION SELECT symbol FROM market_intraday ORDER BY symbol""",null).use{c->
        while(c.moveToNext())add(c.getString(0))
      }
    }
    // Before 09:00 retain the last completed session. At 09:00 on a weekday,
    // publish today's session identity immediately even if the first trade has
    // not arrived yet. Historical rows stay in SQLite and are never deleted.
    val currentDay=activeTradingDay(now)
    val output=JSONObject()
    for(symbol in requested){
      val latestDay=db.rawQuery(
        "SELECT strftime('%Y-%m-%d',source_at/1000,'unixepoch','+8 hours') FROM market_intraday WHERE symbol=? ORDER BY source_at DESC LIMIT 1",
        arrayOf(symbol),
      ).use{c->if(c.moveToFirst())c.getString(0) else null}
      val viewDay=currentDay?:latestDay?:continue
      val perMinute=linkedMapOf<String,JSONObject>()
      val sql="""SELECT source_at,price,previous_close,quality,source FROM market_intraday
        WHERE symbol=? AND strftime('%Y-%m-%d',source_at/1000,'unixepoch','+8 hours')=?
        ORDER BY source_at ASC"""
      db.rawQuery(sql,arrayOf(symbol,viewDay)).use{c->
        while(c.moveToNext()){
          val at=c.getLong(0)
          if(!inTaipeiSession(at))continue
          val previous=if(c.isNull(2))Double.NaN else c.getDouble(2)
          val quality=c.getString(3)
          val key=Instant.ofEpochMilli(at).atZone(TAIPEI).format(MINUTE)
          val old=perMinute[key]
          if(old!=null&&(qualityRank[old.optString("quality","")]?:0)>=(qualityRank[quality]?:0))continue
          perMinute[key]=JSONObject().put("at",at).put("price",c.getDouble(1))
            .put("previousClose",if(previous.isFinite()&&previous>0)previous else JSONObject.NULL)
            .put("quality",quality).put("source",c.getString(4))
        }
      }
      if(perMinute.isEmpty()&&currentDay==null)continue
      val pointPreviousClose=perMinute.values.asSequence()
        .map{it.optDouble("previousClose",Double.NaN)}
        .firstOrNull{it.isFinite()&&it>0}
      val quotePreviousClose=db.rawQuery(
        "SELECT previous_close FROM market_quotes WHERE symbol=? LIMIT 1",arrayOf(symbol),
      ).use{c->
        if(c.moveToFirst()&&!c.isNull(0))c.getDouble(0).takeIf{it.isFinite()&&it>0.0} else null
      }
      output.put(symbol,JSONObject().put("date",viewDay)
        .put("previousClose",pointPreviousClose?:quotePreviousClose?:JSONObject.NULL)
        .put("points",JSONArray(perMinute.values.toList())))
    }
    return output
  }

  @Synchronized fun snapshot(symbols:Collection<String> = emptyList()):JSONObject{
    val db=readableDatabase
    val allow=symbols.toSet()
    val rows=JSONArray()
    db.rawQuery("""SELECT symbol,name,price,previous_close,official_trade_price,source_at,
      quality,source,price_type,is_fallback,market,status_message,checked_at,volume
      FROM market_quotes ORDER BY symbol""",null).use{cursor->
      while(cursor.moveToNext()){
        val symbol=cursor.getString(0)
        if(allow.isNotEmpty()&&!allow.contains(symbol))continue
        val row=JSONObject().put("symbol",symbol).put("name",cursor.getString(1))
          .put("currentPrice",cursor.getDouble(2))
          .put("previousClose",if(cursor.isNull(3))JSONObject.NULL else cursor.getDouble(3))
          .put("officialTradePrice",if(cursor.isNull(4))JSONObject.NULL else cursor.getDouble(4))
          .put("sourceQuoteAt",cursor.getLong(5)).put("quality",cursor.getString(6))
          .put("source",cursor.getString(7)).put("priceType",cursor.getString(8))
          .put("isFallback",cursor.getInt(9)!=0).put("market",cursor.getString(10))
          .put("statusMessage",cursor.getString(11)).put("checkedAt",cursor.getLong(12))
          .put("volume",if(cursor.isNull(13))JSONObject.NULL else cursor.getLong(13))
        rows.put(row)
      }
    }
    val version=db.rawQuery("SELECT val FROM market_meta WHERE key='version'",null).use{
      if(it.moveToFirst())it.getLong(0) else 0L
    }
    return JSONObject().put("version",version).put("quotes",rows)
      .put("intraday",intradaySnapshot(symbols))
  }


  @Synchronized fun queryEtfComponents(symbolInput:String,topNInput:Int=20):JSONObject{
    val symbol=symbolInput.trim().uppercase()
    require(symbol.matches(Regex("[0-9A-Z]{4,8}"))){"ETF 代號格式錯誤"}
    val topN=topNInput.coerceIn(1,100)
    val db=readableDatabase
    val rows=JSONArray()
    db.rawQuery("""SELECT stock_symbol,stock_name,weight,industry,source,effective_date,updated_at
      FROM etf_components WHERE etf_symbol=? ORDER BY weight DESC,stock_symbol ASC LIMIT ?""",
      arrayOf(symbol,topN.toString())).use{c->
      while(c.moveToNext()){
        rows.put(JSONObject().put("stockSymbol",c.getString(0)).put("stockName",c.getString(1))
          .put("weight",c.getDouble(2)).put("industry",c.getString(3))
          .put("source",c.getString(4)).put("effectiveDate",c.getString(5))
          .put("updatedAt",c.getString(6)))
      }
    }
    val total=db.rawQuery("SELECT COUNT(*) FROM etf_components WHERE etf_symbol=?",arrayOf(symbol)).use{
      if(it.moveToFirst())it.getInt(0) else 0
    }
    return JSONObject().put("symbol",symbol).put("topN",topN).put("total",total)
      .put("components",rows).put("available",total>0)
  }

  @Synchronized fun queryEtfMeta(symbolInput:String):JSONObject{
    val symbol=symbolInput.trim().uppercase()
    require(symbol.matches(Regex("[0-9A-Z]{4,8}"))){"ETF 代號格式錯誤"}
    val db=readableDatabase
    val meta=db.rawQuery("""SELECT frequency,ter_ratio,category,issuer,tracking_index,active,
      source,effective_date,updated_at FROM etf_meta WHERE etf_symbol=? LIMIT 1""",arrayOf(symbol)).use{c->
      if(!c.moveToFirst())null else JSONObject().put("symbol",symbol)
        .put("frequency",c.getString(0))
        .put("terRatio",if(c.isNull(1))JSONObject.NULL else c.getDouble(1))
        .put("category",c.getString(2)).put("issuer",c.getString(3))
        .put("trackingIndex",c.getString(4)).put("active",c.getInt(5)!=0)
        .put("source",c.getString(6)).put("effectiveDate",c.getString(7)).put("updatedAt",c.getString(8))
    }
    return JSONObject().put("symbol",symbol).put("available",meta!=null)
      .put("meta",meta?:JSONObject.NULL)
  }

  @Synchronized fun replaceEtfResearch(payload:JSONObject):JSONObject{
    val components=payload.optJSONArray("components")?:JSONArray()
    val metas=payload.optJSONArray("meta")?:JSONArray()
    val datasetVersion=payload.optString("datasetVersion","").trim().take(120)
    val importedAt=payload.optString("importedAt","").trim().take(40)
    require(components.length()<=100_000){"ETF 成分資料超過單次匯入限制"}
    require(metas.length()<=10_000){"ETF 屬性資料超過單次匯入限制"}
    val db=writableDatabase
    var componentCount=0
    var metaCount=0
    db.beginTransaction()
    try{
      db.delete("etf_components",null,null)
      db.delete("etf_meta",null,null)
      for(i in 0 until components.length()){
        val row=components.optJSONObject(i)?:continue
        val etf=row.optString("etfSymbol","").trim().uppercase()
        val stock=row.optString("stockSymbol","").trim().uppercase()
        val weight=row.optDouble("weight",Double.NaN)
        if(!etf.matches(Regex("[0-9A-Z]{4,8}"))||!stock.matches(Regex("[0-9A-Z]{4,10}"))||
          !weight.isFinite()||weight<0.0||weight>100.0)continue
        val values=ContentValues().apply{
          put("etf_symbol",etf);put("stock_symbol",stock)
          put("stock_name",row.optString("stockName","").trim().take(100))
          put("weight",weight);put("industry",row.optString("industry","").trim().take(100))
          put("source",row.optString("source","").trim().take(160))
          put("effective_date",row.optString("effectiveDate","").trim().take(40))
          put("updated_at",row.optString("updatedAt","").trim().take(40))
        }
        if(db.insertWithOnConflict("etf_components",null,values,SQLiteDatabase.CONFLICT_REPLACE)>=0)componentCount++
      }
      for(i in 0 until metas.length()){
        val row=metas.optJSONObject(i)?:continue
        val etf=row.optString("etfSymbol","").trim().uppercase()
        if(!etf.matches(Regex("[0-9A-Z]{4,8}")))continue
        val ter=row.optDouble("terRatio",Double.NaN)
        val values=ContentValues().apply{
          put("etf_symbol",etf);put("frequency",row.optString("frequency","").trim().take(80))
          if(ter.isFinite()&&ter>=0.0&&ter<=20.0)put("ter_ratio",ter) else putNull("ter_ratio")
          put("category",row.optString("category","").trim().take(100))
          put("issuer",row.optString("issuer","").trim().take(100))
          put("tracking_index",row.optString("trackingIndex","").trim().take(160))
          put("active",if(row.optBoolean("active",true))1 else 0)
          put("source",row.optString("source","").trim().take(160))
          put("effective_date",row.optString("effectiveDate","").trim().take(40))
          put("updated_at",row.optString("updatedAt","").trim().take(40))
        }
        if(db.insertWithOnConflict("etf_meta",null,values,SQLiteDatabase.CONFLICT_REPLACE)>=0)metaCount++
      }
      db.delete("etf_research_meta",null,null)
      val versionValues=ContentValues().apply{put("key","dataset_version");put("value",datasetVersion)}
      db.insertWithOnConflict("etf_research_meta",null,versionValues,SQLiteDatabase.CONFLICT_REPLACE)
      val importedValues=ContentValues().apply{put("key","imported_at");put("value",importedAt)}
      db.insertWithOnConflict("etf_research_meta",null,importedValues,SQLiteDatabase.CONFLICT_REPLACE)
      db.setTransactionSuccessful()
    }finally{db.endTransaction()}
    return JSONObject().put("componentCount",componentCount).put("metaCount",metaCount)
      .put("datasetVersion",datasetVersion).put("importedAt",importedAt)
  }


  @Synchronized fun upsertVerified(candidates:List<JSONObject>,checkedAt:Long):JSONObject{
    val db=writableDatabase
    var accepted=0
    var conflicts=0
    db.beginTransaction()
    try{
      for(row in candidates){
        val symbol=row.optString("symbol","").trim().uppercase()
        val price=row.optDouble("currentPrice",Double.NaN)
        val at=row.optLong("sourceQuoteAt",0L)
        val quality=row.optString("quality","")
        val source=row.optString("source","")
        val priceType=row.optString("priceType","")
        val market=row.optString("market","UNKNOWN").ifBlank{"UNKNOWN"}
        if(!symbol.matches(Regex("[0-9A-Z]{4,8}"))||!price.isFinite()||price<=0.0||
           at<=0L||at>checkedAt+120_000L||quality !in allowedQuality||
           source !in allowedSource||priceType !in allowedPriceType)continue
        val existing=db.rawQuery("SELECT source_at,quality,price FROM market_quotes WHERE symbol=?",arrayOf(symbol)).use{
          if(it.moveToFirst())Triple(it.getLong(0),it.getString(1),it.getDouble(2)) else null
        }
        if(existing!=null){
          if(at<existing.first)continue
          val newRank=qualityRank[quality]?:0
          val oldRank=qualityRank[existing.second]?:0
          val newTradeLike=quality=="trade"||quality=="backup_realtime"
          val oldTradeLike=existing.second=="trade"||existing.second=="backup_realtime"
          // Between trade-like providers, newest source timestamp wins. This prevents
          // an older TWSE trade from pinning the UI above a newer Yahoo last-trade fallback.
          if(at>existing.first&&newTradeLike&&oldTradeLike){
            // accept below
          }else if(newRank<oldRank){
            insertIntraday(db,row,checkedAt)
            continue
          }
          if(at==existing.first&&newRank<=oldRank){
            if(existing.second==quality&&kotlin.math.abs(existing.third-price)>0.0001)conflicts++
            insertIntraday(db,row,checkedAt)
            continue
          }
        }
        val values=ContentValues().apply{
          put("symbol",symbol)
          put("name",row.optString("name",symbol).takeIf{it.isNotBlank()}?:symbol)
          put("price",price)
          val previous=row.optDouble("previousClose",Double.NaN)
          if(previous.isFinite()&&previous>0)put("previous_close",previous) else putNull("previous_close")
          val official=row.optDouble("officialTradePrice",Double.NaN)
          if(official.isFinite()&&official>0)put("official_trade_price",official) else putNull("official_trade_price")
          put("source_at",at)
          put("quality",quality)
          put("source",source)
          put("price_type",priceType)
          put("is_fallback",if(row.optBoolean("isFallback",quality!="trade"))1 else 0)
          put("market",market)
          put("status_message",row.optString("statusMessage",""))
          put("checked_at",checkedAt)
          val volume=row.optDouble("volume",Double.NaN)
          if(volume.isFinite()&&volume>=0)put("volume",volume.toLong()) else putNull("volume")
        }
        db.insertWithOnConflict("market_quotes",null,values,SQLiteDatabase.CONFLICT_REPLACE)
        insertIntraday(db,row,checkedAt)
        accepted++
      }
      if(accepted>0)db.execSQL("UPDATE market_meta SET val=val+1 WHERE key='version'")
      db.setTransactionSuccessful()
    }finally{db.endTransaction()}
    return JSONObject().put("updatedCount",accepted).put("conflictCount",conflicts)
      .put("snapshot",snapshot())
  }
}
