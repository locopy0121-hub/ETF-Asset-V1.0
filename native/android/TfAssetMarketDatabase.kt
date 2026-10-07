package com.tfasset.app

import android.content.ContentValues
import android.content.Context
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper
import org.json.JSONArray
import org.json.JSONObject

/**
 * TF Asset V4 market persistence.
 *
 * MemoryMarketStore remains the intraday SSOT. This database is only the
 * throttled durable cache / one-minute candle store, matching SaiETF's
 * Room persistence boundary without placing tick-by-tick reads on SQLite.
 */
class TfAssetMarketDatabase(context: Context) :
  SQLiteOpenHelper(context, "tf_asset_market_v4.db", null, DATABASE_VERSION) {

  override fun onCreate(db: SQLiteDatabase) {
    db.execSQL(
      """
      CREATE TABLE IF NOT EXISTS market_quote_snapshots (
        symbol TEXT PRIMARY KEY NOT NULL,
        session_date TEXT NOT NULL,
        source TEXT NOT NULL,
        quality TEXT NOT NULL,
        source_timestamp_ms INTEGER NOT NULL,
        received_at_ms INTEGER NOT NULL,
        persisted_at_ms INTEGER NOT NULL,
        payload_json TEXT NOT NULL
      )
      """.trimIndent(),
    )
    db.execSQL(
      """
      CREATE TABLE IF NOT EXISTS market_minute_candles (
        symbol TEXT NOT NULL,
        session_date TEXT NOT NULL,
        bucket_epoch_ms INTEGER NOT NULL,
        open REAL NOT NULL,
        high REAL NOT NULL,
        low REAL NOT NULL,
        close REAL NOT NULL,
        volume INTEGER NOT NULL,
        source TEXT NOT NULL,
        updated_at_ms INTEGER NOT NULL,
        PRIMARY KEY(symbol, bucket_epoch_ms)
      )
      """.trimIndent(),
    )
    db.execSQL("CREATE INDEX IF NOT EXISTS idx_market_candle_session ON market_minute_candles(symbol, session_date, bucket_epoch_ms)")
  }

  override fun onUpgrade(db: SQLiteDatabase, oldVersion: Int, newVersion: Int) {
    if (oldVersion < 1) onCreate(db)
  }

  fun persist(payload: JSONObject) {
    val snapshots = payload.optJSONArray("snapshots") ?: JSONArray()
    val candles = payload.optJSONArray("candles") ?: JSONArray()
    val persistedAt = payload.optLong("persistedAtEpochMillis", System.currentTimeMillis())
    val db = writableDatabase
    db.beginTransaction()
    try {
      for (index in 0 until snapshots.length()) {
        val row = snapshots.optJSONObject(index) ?: continue
        val symbol = row.optString("symbol").trim().uppercase()
        if (symbol.isBlank()) continue
        val values = ContentValues().apply {
          put("symbol", symbol)
          put("session_date", row.optString("sessionDate"))
          put("source", row.optString("source", "CACHE"))
          put("quality", row.optString("quality", "OFFLINE"))
          put("source_timestamp_ms", row.optLong("sourceTimestampEpochMillis", 0L))
          put("received_at_ms", row.optLong("receivedAtEpochMillis", 0L))
          put("persisted_at_ms", persistedAt)
          put("payload_json", row.toString())
        }
        db.insertWithOnConflict("market_quote_snapshots", null, values, SQLiteDatabase.CONFLICT_REPLACE)
      }

      for (index in 0 until candles.length()) {
        val row = candles.optJSONObject(index) ?: continue
        val symbol = row.optString("symbol").trim().uppercase()
        val bucket = row.optLong("bucketEpochMillis", 0L)
        if (symbol.isBlank() || bucket <= 0L) continue
        val values = ContentValues().apply {
          put("symbol", symbol)
          put("session_date", row.optString("sessionDate"))
          put("bucket_epoch_ms", bucket)
          put("open", row.optDouble("open", 0.0))
          put("high", row.optDouble("high", 0.0))
          put("low", row.optDouble("low", 0.0))
          put("close", row.optDouble("close", 0.0))
          put("volume", row.optLong("volume", 0L))
          put("source", row.optString("source", "CACHE"))
          put("updated_at_ms", row.optLong("updatedAtEpochMillis", persistedAt))
        }
        db.insertWithOnConflict("market_minute_candles", null, values, SQLiteDatabase.CONFLICT_REPLACE)
      }

      db.execSQL(
        """
        DELETE FROM market_minute_candles
        WHERE rowid NOT IN (
          SELECT rowid FROM market_minute_candles
          ORDER BY bucket_epoch_ms DESC
          LIMIT $MAX_CANDLE_ROWS
        )
        """.trimIndent(),
      )
      db.setTransactionSuccessful()
    } finally {
      db.endTransaction()
    }
  }

  fun load(): JSONObject {
    val snapshots = JSONArray()
    readableDatabase.query(
      "market_quote_snapshots",
      arrayOf("payload_json"),
      null, null, null, null,
      "symbol ASC",
    ).use { cursor ->
      val payloadIndex = cursor.getColumnIndexOrThrow("payload_json")
      while (cursor.moveToNext()) {
        runCatching { JSONObject(cursor.getString(payloadIndex)) }
          .getOrNull()
          ?.let { snapshots.put(it) }
      }
    }

    val candles = JSONArray()
    readableDatabase.query(
      "market_minute_candles",
      arrayOf(
        "symbol", "session_date", "bucket_epoch_ms", "open", "high", "low",
        "close", "volume", "source", "updated_at_ms",
      ),
      null, null, null, null,
      "bucket_epoch_ms ASC",
    ).use { cursor ->
      while (cursor.moveToNext()) {
        candles.put(
          JSONObject().apply {
            put("symbol", cursor.getString(0))
            put("sessionDate", cursor.getString(1))
            put("bucketEpochMillis", cursor.getLong(2))
            put("open", cursor.getDouble(3))
            put("high", cursor.getDouble(4))
            put("low", cursor.getDouble(5))
            put("close", cursor.getDouble(6))
            put("volume", cursor.getLong(7))
            put("source", cursor.getString(8))
            put("updatedAtEpochMillis", cursor.getLong(9))
          },
        )
      }
    }

    return JSONObject().apply {
      put("schema", 4)
      put("snapshots", snapshots)
      put("candles", candles)
      put("persistedAtEpochMillis", System.currentTimeMillis())
    }
  }

  fun clearAll() {
    writableDatabase.beginTransaction()
    try {
      writableDatabase.delete("market_quote_snapshots", null, null)
      writableDatabase.delete("market_minute_candles", null, null)
      writableDatabase.setTransactionSuccessful()
    } finally {
      writableDatabase.endTransaction()
    }
  }

  companion object {
    private const val DATABASE_VERSION = 1
    private const val MAX_CANDLE_ROWS = 12_000
  }
}
