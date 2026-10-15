package com.tfasset.app.saietf

import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import org.json.JSONArray

/** Official TWSE 2026 calendar is the offline bootstrap, never inferred from missing ticks. */
object TradingCalendar {
    private val zone = ZoneId.of("Asia/Taipei")
    private val dates = java.util.concurrent.ConcurrentHashMap.newKeySet<String>().apply {
        addAll("2026-01-01 2026-02-12 2026-02-13 2026-02-15 2026-02-16 2026-02-17 2026-02-18 2026-02-19 2026-02-20 2026-02-27 2026-02-28 2026-04-03 2026-04-04 2026-04-05 2026-04-06 2026-05-01 2026-06-19 2026-09-25 2026-09-28 2026-10-09 2026-10-10 2026-10-25 2026-10-26 2026-12-25".split(" "))
    }
    private val names = java.util.concurrent.ConcurrentHashMap<String, String>()
    fun namesSnapshot(): Map<String, String> = names.toMap()
    fun closed(at: Long): Boolean {
        val local = Instant.ofEpochMilli(at).atZone(zone)
        return local.dayOfWeek.value >= 6 || dates.contains(local.toLocalDate().toString())
    }
    fun snapshot(): List<String> = dates.toList().sorted()
    fun restore(values: Collection<String>) { values.forEach { value ->
        if (runCatching { LocalDate.parse(value) }.isSuccess) dates.add(value)
    } }
    fun acceptOfficialRows(rows: JSONArray): Boolean {
        val parsed = mutableSetOf<String>()
        for (i in 0 until rows.length()) {
            val row = rows.optJSONObject(i) ?: continue
            val label = row.optString("Name") + row.optString("Description")
            if (label.contains("開始交易") || label.contains("最後交易")) continue
            if (label.isBlank()) continue
            val raw = row.optString("Date").replace(Regex("[^0-9]"), "")
            val date = runCatching {
                val offset = if (raw.length == 7) 3 else if (raw.length == 8) 4 else error("date")
                val year = raw.substring(0, offset).toInt() + if (offset == 3) 1911 else 0
                LocalDate.of(year, raw.substring(offset, offset+2).toInt(), raw.substring(offset+2).toInt()).toString()
            }.getOrNull() ?: continue
            parsed.add(date)
            names[date] = row.optString("Name")
        }
        if (parsed.isEmpty()) return false
        restore(parsed)
        return true
    }
}
