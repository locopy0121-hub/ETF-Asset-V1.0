package com.tfasset.app

import android.content.ContentValues
import android.content.Context
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper
import org.json.JSONArray
import org.json.JSONObject

/**
 * V2.3.1 market-only database. It NEVER opens, migrates, deletes or recalculates the Ledger.
 * Official sources write here, and all Android consumers read this one transactional store.
 */
internal class TfAssetMarketDatabase(context:Context):SQLiteOpenHelper(
  context.applicationContext,"tf_asset_market_center_v1.db",null,1
){
  override fun onCreate(db:SQLiteDatabase){
    db.execSQL("""CREATE TABLE IF NOT EXISTS market_quotes(
      symbol TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      price REAL NOT NULL CHECK(price>0),
      previous_close REAL,
      source_at INTEGER NOT NULL CHECK(source_at>0),
      quality TEXT NOT NULL CHECK(quality IN ('trade','official_close')),
      source TEXT NOT NULL,
      checked_at INTEGER NOT NULL
    )""")
    db.execSQL("CREATE TABLE IF NOT EXISTS market_meta(key TEXT PRIMARY KEY,val INTEGER NOT NULL)")
    db.execSQL("INSERT OR IGNORE INTO market_meta(key,val) VALUES('version',0)")
  }
  override fun onUpgrade(db:SQLiteDatabase,oldVersion:Int,newVersion:Int){
    // Additive-only future migrations. Do not DROP any market table; never touch Ledger.
    onCreate(db)
  }

  @Synchronized fun snapshot(symbols:Collection<String> = emptyList()):JSONObject{
    val db=readableDatabase
    val allow=symbols.toSet()
    val rows=JSONArray()
    db.rawQuery("SELECT symbol,name,price,previous_close,source_at,quality,source,checked_at FROM market_quotes ORDER BY symbol",null).use{cursor->
      while(cursor.moveToNext()){
        val symbol=cursor.getString(0)
        if(allow.isNotEmpty()&&!allow.contains(symbol))continue
        val row=JSONObject().put("symbol",symbol).put("name",cursor.getString(1))
          .put("currentPrice",cursor.getDouble(2))
          .put("previousClose",if(cursor.isNull(3))JSONObject.NULL else cursor.getDouble(3))
          .put("sourceQuoteAt",cursor.getLong(4)).put("quality",cursor.getString(5))
          .put("source",cursor.getString(6)).put("checkedAt",cursor.getLong(7))
        rows.put(row)
      }
    }
    val version=db.rawQuery("SELECT val FROM market_meta WHERE key='version'",null).use{
      if(it.moveToFirst())it.getLong(0) else 0L
    }
    return JSONObject().put("version",version).put("quotes",rows)
  }

  /**
   * Strict monotonic exchange time. Do not overwrite an accepted trade with a
   * same-timestamp closing reference; duplicate polls do not advance version.
   * A newer dated official close may replace an older trade, with the quality
   * visibly labeled and without claiming it is a new intraday trade tick.
   */
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
        if(!symbol.matches(Regex("[0-9A-Z]{4,8}"))||!price.isFinite()||price<=0.0||
           at<=0L||at>checkedAt+120_000L||quality !in setOf("trade","official_close")||
           source !in setOf("TWSE_MIS","TWSE_DAILY","TPEX_DAILY"))continue
        val existing=db.rawQuery("SELECT source_at,quality,price FROM market_quotes WHERE symbol=?",arrayOf(symbol)).use{
          if(it.moveToFirst())Triple(it.getLong(0),it.getString(1),it.getDouble(2)) else null
        }
        if(existing!=null){
          if(at<existing.first)continue
          if(at==existing.first){
            if(existing.second=="trade"||quality==existing.second){
              if(kotlin.math.abs(existing.third-price)>0.0001)conflicts++
              continue
            }
            if(quality!="trade")continue
          }
        }
        val values=ContentValues().apply{
          put("symbol",symbol)
          put("name",row.optString("name",symbol).takeIf{it.isNotBlank()}?:symbol)
          put("price",price)
          val previous=row.optDouble("previousClose",Double.NaN)
          if(previous.isFinite()&&previous>0)put("previous_close",previous) else putNull("previous_close")
          put("source_at",at)
          put("quality",quality)
          put("source",source)
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
