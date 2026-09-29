# GO V3.2.6｜行情 A→B 正規化與即時備援

日期：2026-09-29

## Gate
- [x] 備份 V3.2.5 HEAD：backup-v3.2.5-20260929-before-market-a-layer
- [x] 證券中心／官方診斷維持 TWSE MIS z 唯一實際成交真值
- [x] A 層有效行情：z → pz → b/a → y，Fallback 一律有 provenance
- [x] TWSE MIS 無可用行情時，自動嘗試 Yahoo Finance .TW / .TWO
- [x] TSE / OTC 自動辨識，00406A 不因尾碼 A 被誤判
- [x] B 層 SQLite / PostgreSQL 保存 officialTradePrice / priceType / isFallback / market / statusMessage
- [x] App／首頁／Widget／Monitor 保持統一讀 B
- [x] 診斷頁顯示行情中心價格型態、Fallback 與說明
- [x] Immutable Finance Core / Ledger / actual_fee / actual_tax 不修改
- [x] 版本 V3.2.6 / Android 30206 / iOS 30206
- [ ] GitHub quality PASS
- [ ] GitHub backend-quality PASS
- [ ] QA APK PASS
- [ ] Artifact / versionCode / versionName / SHA256 驗證完成
