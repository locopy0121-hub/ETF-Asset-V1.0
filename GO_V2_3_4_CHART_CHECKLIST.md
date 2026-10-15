# GO V2.3.4 — 第七大項圖表與 K 線（2026-09-25）

- 起點：V2.3.3 PR #42，原始碼備份 `backup-v2.3.3-20260925-pre-v234-chart`。
- 第七大項限定範圍：原本假 K 線替換為 TWSE 官方日 OHLCV、可點選 K 棒、價格／日期／成交量。現有首頁浮動圖表編輯、手勢及返回保留。
- 來源：TWSE 官方每月 STOCK_DAY JSON；僅有有效的日期／開高低收／成交股數才呈現。資料缺失、HTTP 失敗、非 TWSE ETF 清楚顯示待取得；**不從最新價格、成本或 sparkline 推造 K 棒**。
- 1／3／12 月擷取真實官方日 K；不將日 K 說成分時線，週 K、分鐘 K 與上櫃來源尚未接入。
- Immutable Core：`src/finance/canonicalLedger.ts`、`src/utils/etfCalculators.ts`、`docs/finance/CORE_LOCK.md` 不修改。
- 已實作：日 OHLCV service、parser、歷史行情視覺元件、詳情頁整合、資料測試。
- 待驗：React Native 真機資料存取及手勢、首頁浮動圖表多類別的真實繪製（目前舊版仍有字元模擬線）、K 線日內／週線／上櫃來源、所有頁面交互回歸。
- QA APK 屬於驗收版，CI PASS 不等於真機 PASS；正式 Release 暫不視為完成。
