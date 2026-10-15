# TF Asset V3.1.12 GO Checklist

日期：2026-09-28  
基底：V3.1.11 `go-v3.1.11-20260928-mini-stock-chart`

## 問題

帳務中心仍出現非使用者輸入的「期初現金 NT$ 750,000」。V2.3.3 已把新帳戶 default 改為 0，但舊版 AsyncStorage 的 persisted opening cash 仍會被 hydrate 還原。

## Gate

- [x] 建立 V3.1.11 變更前備份分支
- [x] 不修改 V3.7.8 Canonical Finance Core 計算公式
- [x] 不重算歷史 actualFee / actualTax
- [x] 新帳戶維持 `INITIAL_CASH=0`
- [x] 既有 Ledger 真實 entries 原樣保留
- [x] migration 僅處理精確 legacy sentinel 750,000
- [x] 既有專用 -750,000 系統沖回同步正規化，避免 double subtract
- [x] migration idempotent
- [x] 儲存 schema 升為 2，schema 1 可向前遷移
- [x] 新增 V3.1.12 regression test
- [ ] TypeScript / aggregate quality gate PASS
- [ ] backend-quality PASS
- [ ] QA APK PASS
- [ ] APK artifact / versionCode 30112 / versionName 3.1.12 驗證

## 預期裝置結果

升級到 V3.1.12 後，原本由舊版程式內建而寫入的 NT$ 750,000 期初現金會在 Ledger hydrate 時自動轉為 0。買賣、股息、其他現金紀錄不刪除；如果之前已做過專用沖回，現金最終值保持不變，不會再多扣一次 750,000。
