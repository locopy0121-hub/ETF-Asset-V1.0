# TF Asset V3.2.16｜開盤行情走勢交易日重置

## Release Checklist

1. **09:00 新交易日切換**
   - 盤前保留上一個完成交易日的分時走勢。
   - 交易日 09:00 起，行情中心立即發布當日 session identity。
   - 即使今日第一筆有效成交尚未到達，也以空的今日序列取代昨日折線，顯示「分時走勢待取得」。

2. **盤中持續紀錄**
   - 今日有效 TWSE MIS／Yahoo intraday 點繼續寫入 `market_intraday`。
   - 走勢以 `symbol + source_at + source` 持久化，畫面按交易日讀取。
   - 昨日與更早資料不刪除。

3. **App 重開恢復**
   - 啟動時直接從 SQLite 載入今日已累積序列。
   - 不以 App 啟動時間作為走勢起點。

4. **Runtime session rollover**
   - 空的今日 session 是有效狀態，不再被 JS adapter 當成「缺資料」。
   - session date 改變時，即使 quote version 尚未增加，Runtime 仍套用新的今日序列。

5. **保護範圍**
   - Canonical Finance Core、actual_fee、actual_tax、Math.floor、Portfolio 累加規則不修改。
   - Quote Snapshot、Intraday Series、Valuation Snapshot 保持獨立資料視圖。

## 驗證層級

- CODE / behavior regression：`scripts/v3_2_16-session-reset.test.ts`
- 既有 intraday regression：`scripts/v3_2_11-intraday-mini-chart.test.ts`
- Android Kotlin 編譯：GitHub QA APK workflow
- 實際 09:00 交易日切換畫面：仍需 V3.2.16 APK 真機驗收
