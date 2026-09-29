# GO V3.2.7｜首頁總損益＋每日紀錄／統計

日期：2026-09-29

## Gate
- [x] 備份 V3.2.6 HEAD：backup-v3.2.6-20260929-before-daily-pnl
- [x] 資產總覽主卡新增「前一日損益＋今日損益＝總損益」
- [x] 今日損益以當前 Canonical 總損益減去「昨日 Ledger + previousClose」快照取得，不改公式
- [x] 資產總覽卡片損益色以「總損益」正／負／零為唯一 tone
- [x] 點擊「總損益」開啟每日紀錄與統計
- [x] 每日紀錄持久化；15:00 後或已進入後續日期即 final，final 紀錄不可被即時行情改寫
- [x] 統計含期間損益、平均每日、獲利／虧損／持平日、最佳／最差單日與最近趨勢
- [x] Immutable Finance Core / Ledger / actual_fee / actual_tax 不修改
- [x] 版本 V3.2.7 / Android 30207 / iOS 30207
- [ ] GitHub quality PASS
- [ ] GitHub backend-quality PASS
- [ ] QA APK PASS
- [ ] Artifact / versionCode / versionName / SHA256 驗證完成
