package com.tfasset.app
import org.json.JSONObject
fun main(){
    fun snapshot(version:Long)=JSONObject().put("marketDataVersion",version)
    check(acceptsSurfaceSnapshot(snapshot(3),snapshot(4)))
    check(acceptsSurfaceSnapshot(snapshot(3),snapshot(3)))
    check(!acceptsSurfaceSnapshot(snapshot(3),snapshot(2)))
    check(acceptsSurfaceSnapshot(JSONObject(),snapshot(1)))
    check(!acceptsSurfaceSnapshot(snapshot(3),JSONObject()))
    println("Native Widget surface monotonic version/equal ledger update PASS")
}
