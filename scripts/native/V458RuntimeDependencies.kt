package com.tfasset.app.saietf
import android.content.Context
import org.json.JSONObject
import tw.saietf.core.market.*
class FugleApiKeyStore(context:Context) {fun load():String?="test-only";fun save(key:String){};fun clear(){}}
class MarketPersistenceRepository(context:Context) {
    companion object {var stored=emptyMap<String,MarketQuote>();var beforePersist:(suspend (Collection<MarketQuote>)->Unit)?=null}
    fun persistedQuotes()=stored
    suspend fun persist(quotes:Collection<MarketQuote>){beforePersist?.invoke(quotes);stored=quotes.associateBy{it.symbol}}
    fun runtimeSnapshot()=JSONObject()
}
class TwseMisQuoteProvider:MarketQuoteProvider {override val source=MarketSource.TWSE_MIS;override fun fetch(symbols:Set<String>)=emptyMap<String,MarketQuote>()}
class YahooQuoteProvider:MarketQuoteProvider {override val source=MarketSource.YAHOO;override fun fetch(symbols:Set<String>)=emptyMap<String,MarketQuote>()}
