package com.tfasset.app

import android.content.ContentValues
import android.content.Context
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper
import org.json.JSONArray
import org.json.JSONObject

/**
 * Market-only database. It NEVER opens, migrates, deletes or recalculates the Ledger.
 * V2 adds quote provenance so fallback prices cannot masquerade as TWSE z trades.
 */
internal class TfAssetMarketDatabase(context:Context):SQLiteOpenHelper(
  context.applicationContext,"tf_asset_market_center_v1.db",null,2
){
  private val qualityRank=mapOf(
    "trade" to 50,"backup_realtime" to 40,"bid_ask" to 30,
    "official_close" to 20,"previous_close" to 10
  )
  private val allowedQuality=qualityRank.keys
  private val allowedSource=setOf("TWSE_MIS","YAHOO","TWSE_DAILY","TPEX_DAILY")
  private val allowedPriceType=setOf("REALTIME_TRADE","BACKUP_REALTIME","BID_ASK","PREV_CLOSE","OFFICIAL_CLOSE")

  private fun createQuoteTable(db:SQLiteDatabase,name:String="market_quotes"){
    db.execSQL("""CREATE TABLE IF NOT EXISTS $name(
      symbol TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      price REAL NOT NULL CHECK(price>0),
      previous_close REAL,
      official_trade_price REAL,
      source_at INTEGER NOT NULL CHECK(source_at>0),
      quality TEXT NOT NULL CHECK(quality IN ('trade','backup_realtime','bid_ask','previous_close','official_close')),
      source TEXT NOT NULL CHECK(source IN ('TWSE_MIS','YAHOO','TWSE_DAILY','TPEX_DAILY')),
      price_type TEXT NOT NULL CHECK(price_type IN ('REALTIME_TRADE','BACKUP_REALTIME','BID_ASK','PREV_CLOSE','OFFICIAL_CLOSE')),
      is_fallback INTEGER NOT NULL DEFAULT 0,
      market TEXT NOT NULL DEFAULT 'UNKNOWN',
      status_message TEXT NOT NULL DEFAULT '',
      checked_at INTEGER NOT NULL
    )""")
  }
  override fun onCreate(db:SQLiteDatabase){
    createQuoteTable(db)
    db.execSQL("CREATE TABLE IF NOT EXISTS market_meta(key TEXT PRIMARY KEY,val INTEGER NOT NULL)")
    db.execSQL("INSERT OR IGNORE INTO market_meta(key,val) VALUES('version',0)")
  }
  override fun onUpgrade(db:SQLiteDatabase,oldVersion:Int,newVersion:Int){
    if(oldVersion<2){
      // Transactional market-cache migration only. The immutable Ledger database is never opened here.
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
    db.execSQL("CREATE TABLE IF NOT EXISTS market_meta(key TEXT PRIMARY KEY,val INTEGER NOT NULL)")
    db.execSQL("INSERT OR IGNORE INTO market_meta(key,val) VALUES('version',0)")
  }

  @Synchronized fun snapshot(symbols:Collection<String> = emptyList()):JSONObject{
    val db=readableDatabase
    val allow=symbols.toSet()
    val rows=JSONArray()
    db.rawQuery("""SELECT symbol,name,price,previous_close,official_trade_price,source_at,
      quality,source,price_type,is_fallback,market,status_message,checked_at
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
        rows.put(row)
      }
    }
    val version=db.rawQuery("SELECT val FROM market_meta WHERE key='version'",null).use{
      if(it.moveToFirst())it.getLong(0) else 0L
    }
    return JSONObject().put("version",version).put("quotes",rows)
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
          if(at==existing.first){
            val newRank=qualityRank[quality]?:0
            val oldRank=qualityRank[existing.second]?:0
            if(newRank<=oldRank){
              if(existing.second==quality&&kotlin.math.abs(existing.third-price)>0.0001)conflicts++
              continue
            }
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
        }
        db.insertWithOnConflict("market_quotes",null,values,SQLiteDatabase.CONFLICT_REPLACE)
        accepted++
      }
      if(accepted>0)db.execSQL("UPDATE market_meta SET val=val+1 WHERE key='version'")
      db.setTransactionSuccessful()
    }finally{db.endTransaction()}
    return JSONObject().put("updatedCount",accepted).put("conflictCount",conflicts)
      .put("snapshot",snapshot())
  }
}
