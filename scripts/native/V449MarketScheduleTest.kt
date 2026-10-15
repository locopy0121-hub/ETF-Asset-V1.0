package com.tfasset.app
import java.time.Instant
fun main(){
    fun at(local:String)=Instant.parse(local+"+08:00").toEpochMilli()
    val default=MarketSchedule()
    check(default.allows(at("2026-10-12T09:00:00")))
    check(default.allows(at("2026-10-12T13:29:59")))
    check(!default.allows(at("2026-10-12T13:30:00")))
    check(!default.allows(at("2026-10-12T18:00:00")))
    check(!default.allows(at("2026-10-11T10:00:00")))
    check(!default.allows(at("2026-10-09T10:00:00")))
    val custom=MarketSchedule(true,600,720,setOf(1,3))
    check(!custom.allows(at("2026-10-12T09:59:59")))
    check(custom.allows(at("2026-10-12T10:00:00")))
    check(!custom.allows(at("2026-10-12T12:00:00")))
    check(!custom.allows(at("2026-10-13T11:00:00")))
    check(custom.nextBoundary(at("2026-10-12T10:30:00"))==at("2026-10-12T12:00:00"))
    check(custom.nextBoundary(at("2026-10-12T12:00:00"))==at("2026-10-14T10:00:00"))
    check(!MarketSchedule(false).allows(at("2026-10-12T10:00:00")))
    check(MarketSchedule(false).nextBoundary(at("2026-10-12T10:00:00"))==null)
    check(MarketSchedule.parse(custom.json().toString())==custom)
    check(MarketSchedule.parse(custom.json().put("end","14:00").toString())==null)
    println("Native schedule: exclusive close/weekends/official holiday/custom weekdays/times/disabled/next boundary PASS")
}
