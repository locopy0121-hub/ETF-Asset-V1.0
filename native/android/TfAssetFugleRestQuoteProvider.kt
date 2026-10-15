package com.tfasset.app.saietf

import java.net.HttpURLConnection
import java.net.URL
import java.time.Instant
import java.time.ZoneId
import org.json.JSONObject
import tw.saietf.core.market.MarketQuote
import tw.saietf.core.market.MarketSource

/** One-shot lifecycle/reconnect bootstrap, never a price-polling scheduler. */
internal class FugleRestQuoteProvider(private val apiKeyProvider: () -> String?,
    private val clockMillis:()->Long=System::currentTimeMillis,
    private val openConnection:(String)->HttpURLConnection={symbol->URL("https://api.fugle.tw/marketdata/v1.0/stock/intraday/quote/$symbol").openConnection() as HttpURLConnection}) {
    fun fetch(symbols: Set<String>,shouldContinue:()->Boolean={true}): Map<String, MarketQuote> {
        val key=apiKeyProvider()?.trim().orEmpty()
        if(key.isEmpty()) return emptyMap()
        return symbols.mapNotNull { symbol ->
            if(!shouldContinue())return@mapNotNull null
            if(!symbol.matches(Regex("[0-9A-Z]{4,8}"))) return@mapNotNull null
            runCatching {
                val connection=openConnection(symbol)
                connection.connectTimeout=5000
                connection.readTimeout=5000
                connection.setRequestProperty("X-API-KEY",key)
                connection.setRequestProperty("Accept","application/json")
                try {
                    if(connection.responseCode!=200) return@runCatching null
                    parseFugleRestQuote(JSONObject(connection.inputStream.bufferedReader().use { it.readText() }),symbol,clockMillis())
                } finally { connection.disconnect() }
            }.getOrNull()?.let { symbol to it }
        }.toMap()
    }
}

internal fun parseFugleRestQuote(row: JSONObject, symbol: String, now: Long): MarketQuote? {
    if(row.optString("symbol")!=symbol) return null
    val trade=row.optJSONObject("lastTrade")?:return null
    val price=trade.optDouble("price",Double.NaN)
    val micros=trade.optLong("time",0L)
    if(!price.isFinite()||price<=0.0||micros<100_000_000_000_000L) return null
    val at=micros/1000L
    val zone=ZoneId.of("Asia/Taipei")
    val date=Instant.ofEpochMilli(at).atZone(zone).toLocalDate().toString()
    if(at>now+120_000L||date!=Instant.ofEpochMilli(now).atZone(zone).toLocalDate().toString()) return null
    fun positive(key:String)=row.optDouble(key,Double.NaN).takeIf { it.isFinite()&&it>0.0 }
    return MarketQuote(
        symbol=symbol,name=row.optString("name",symbol),exchange=row.optString("exchange"),market=row.optString("market"),
        price=price,previousClose=positive("referencePrice"),open=positive("openPrice"),high=positive("highPrice"),low=positive("lowPrice"),
        asOfEpochMillis=at,source=MarketSource.FUGLE,sourceTimestampEpochMillis=at,receivedAtEpochMillis=now,
        sessionDate=date,sequence=if(trade.has("serial")&&!trade.isNull("serial")) trade.optLong("serial") else null,
        isClose=row.optBoolean("isClose",false),
    )
}
