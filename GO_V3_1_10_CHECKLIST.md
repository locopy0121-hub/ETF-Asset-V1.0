# GO V3.1.10｜歷史持股圖表＋首頁共用圖示快捷列

日期：2026-09-28

## 前置 Gate
- 基底：V3.1.9 QA 成功 HEAD `94a52da44847192d08c00523202da5d6eb579351`
- 備份：`backup-v3.1.9-20260928-before-v3.1.10`
- 新版：V3.1.10 / Android 30110 / iOS 30110
- Immutable Canonical Core、actual_fee/tax、Math.floor、交易寫入、SAF 備份規則不修改。

## 本輪
- [x] 009816 六位 ETF 代號可進入歷史行情查詢，不再被 4–5 碼驗證器擋下。
- [x] 歷史行情逐月取得；主／備兩個 TWSE 歷史路由；單月失敗不清空其他月份已取得交易日。
- [x] 持股圖表資料清單加入行情走勢、漲跌額、漲跌幅、持股成本、持股損益、含息損益、報酬率、市值及累積股息。
- [x] 歷史持股損益以目前股數＋含費成本套入歷史收盤價估值，畫面明示；當前正式損益仍取 Canonical Core。
- [x] 圖表工程正式進入維護工程師編輯清單，可設定圖型、歷史區間、資料複選、十字線、成本線。
- [x] 首頁持股模塊只替換上方模式選單為與庫存相同的 PortfolioQuickBar 圖示按鈕；原排序列、排列列、HoldingQuoteCollection 內容保持。
- [ ] TypeScript
- [ ] V3.1.10 aggregate gates
- [ ] backend-quality
- [ ] QA APK / ZIP / SHA256 / AAPT
- [ ] Android 實機驗收
