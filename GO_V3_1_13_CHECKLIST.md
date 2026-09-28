# TF Asset V3.1.13 GO Checklist

日期：2026-09-28  
基底：V3.1.12 `go-v3.1.12-20260928-legacy-cash-migration`

## 實機 FAIL

最新截圖確認「沒有沖回」仍出現現金異常。帳務中心顯示：
- 期初現金：NT$ 0
- 目前現金：NT$ -773,871

V3.1.12 已把 opening sentinel 750,000 歸零，但仍可能留下舊版系統產生的 -750,000 沖回。若真實帳務淨額為 -23,871，殘留一筆 -750,000 後會精確得到 -773,871。

## Gate

- [x] 建立 V3.1.12 變更前備份分支
- [x] 不修改 Canonical Finance Core／actualFee／actualTax／取整規則
- [x] Ledger schema 2 → 3，仍讀 schema 1/2
- [x] opening=0 + generated -750,000 orphan reversal：升級時移除一筆
- [x] opening=750,000 + generated reversal：只移除至多一筆
- [x] 只認 TF Asset 專用 `legacy-opening-cash-reversal*` ID，不以 label+amount 單獨判斷
- [x] 同 label/amount 的一般使用者現金調整不得刪除
- [x] schema 3 後 migration 冪等，不會每次啟動繼續刪資料
- [x] Backup parser 接受 Ledger schema 1/2/3
- [x] 帳務中心顯示「其中其他現金調整」供實機核對
- [x] 未建立明確現金來源時新增 `cashConfigured=false`，目前現金顯示「未設定」
- [x] 交易／股息／調整淨流量保留對帳，但明示「非現金餘額」
- [x] 首頁／Shared Snapshot／Widget／Monitor 同步遵守 cashConfigured
- [x] Canonical Finance Core 零修改
- [x] 新增 -773,871 → -23,871 regression case
- [ ] TypeScript / aggregate quality gate PASS
- [ ] backend-quality PASS
- [ ] QA APK PASS
- [ ] APK artifact / versionCode 30113 / versionName 3.1.13 驗證

## 預期實機結果

升級 V3.1.13 後，若從未建立明確現金來源，帳務中心的「目前現金」顯示「未設定」，不再把從 0 起算的交易淨流量當成負現金；淨流量仍保留供對帳。若裝置另有舊系統 generated -750,000 orphan reversal，schema 1/2 → 3 migration 只移除一筆具專用 ID 的系統紀錄。真實買賣、股息、其他現金調整不刪除。
