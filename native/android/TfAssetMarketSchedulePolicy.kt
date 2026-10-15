package com.tfasset.app
import com.tfasset.app.saietf.TradingCalendar
import java.time.Instant
import java.time.LocalTime
import java.time.ZoneId
import org.json.JSONObject
import org.json.JSONArray

internal data class MarketSchedule(val enabled:Boolean=true,val start:Int=540,val end:Int=810,val weekdays:Set<Int> = setOf(1,2,3,4,5)){
    fun json()=JSONObject().put("enabled",enabled).put("start",time(start)).put("end",time(end)).put("weekdays",JSONArray(weekdays.sorted()))
    fun allows(at:Long):Boolean{
        val local=Instant.ofEpochMilli(at).atZone(ZONE)
        val minute=local.hour*60+local.minute
        return enabled&&local.dayOfWeek.value in weekdays&&!TradingCalendar.closed(at)&&minute>=start&&minute<end
    }
    fun nextBoundary(at:Long):Long?{
        if(!enabled)return null
        val today=Instant.ofEpochMilli(at).atZone(ZONE).toLocalDate()
        for(offset in 0..370){
            val day=today.plusDays(offset.toLong())
            if(day.dayOfWeek.value !in weekdays||TradingCalendar.closed(day.atTime(12,0).atZone(ZONE).toInstant().toEpochMilli()))continue
            for(minute in listOf(start,end)){
                val edge=day.atTime(minute/60,minute%60).atZone(ZONE).toInstant().toEpochMilli()
                if(edge>at)return edge
            }
        }
        return null
    }
    companion object{
        val ZONE:ZoneId=ZoneId.of("Asia/Taipei")
        private fun time(minute:Int)="%02d:%02d".format(java.util.Locale.US,minute/60,minute%60)
        fun parse(raw:String):MarketSchedule?=runCatching{
            val v=JSONObject(raw)
            require(v.get("enabled") is Boolean)
            fun minute(key:String):Int{val s=v.getString(key);require(s.matches(Regex("[0-9]{2}:[0-9]{2}")));val t=LocalTime.parse(s);return t.hour*60+t.minute}
            val start=minute("start");val end=minute("end");require(start>=540&&end<=810&&start<end)
            val a=v.getJSONArray("weekdays");require(a.length()>0)
            val days=(0 until a.length()).map{val n=a.get(it);require(n is Number&&n.toDouble()==n.toInt().toDouble());n.toInt().also{require(it in 1..5)}}.toSet()
            MarketSchedule(v.getBoolean("enabled"),start,end,days)
        }.getOrNull()
    }
}
