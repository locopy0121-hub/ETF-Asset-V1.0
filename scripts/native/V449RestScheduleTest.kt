package com.tfasset.app.saietf
import java.net.HttpURLConnection
import java.net.URL
import java.io.ByteArrayInputStream
import org.json.JSONObject
fun main(){
    var allowed=true;var requests=0
    val provider=FugleRestQuoteProvider({"test-only"}){symbol->
        requests++;allowed=false
        object:HttpURLConnection(URL("https://example.invalid")){
            override fun connect(){};override fun disconnect(){};override fun usingProxy()=false
            override fun getResponseCode()=200
            override fun getInputStream()=ByteArrayInputStream(JSONObject().put("symbol",symbol).put("lastTrade",JSONObject().put("price",11).put("time",System.currentTimeMillis()*1000)).toString().toByteArray())
        }
    }
    provider.fetch(linkedSetOf("0050","00878","00919")){allowed}
    check(requests==1){"REST must not begin remaining requests after schedule closes"}
    provider.fetch(setOf("0050")){false};check(requests==1)
    println("Actual Fugle REST schedule cancellation between symbols PASS")
}
