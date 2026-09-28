# GO V3.1.11｜Mini 圖表與獨立股市圖表頁

日期：2026-09-28

## 前置 Gate
- [x] Repo：locopy0121-hub/ETF-Asset-V1.0
- [x] V3.1.10 PR #99 HEAD / quality / backend / QA APK 全部 PASS
- [x] V3.1.10 QA Artifact 實存
- [x] 建立 backup-v3.1.10-20260928-before-v3.1.11
- [x] 不修改 canonicalLedger / etfCalculators / actual_fee / tax

## 本輪功能
- [x] 首頁與庫存的圖表顯示只保留 Mini 形式
- [x] Mini 圖表單點開啟完整圖表頁
- [x] Mini 圖表連點循環切換折線／面積／柱狀／成本樣式
- [x] 卡片非 Mini 區域單點仍進原持股資訊
- [x] 新增獨立股市式「專業圖表」頁
- [x] 可查詢 ETF／股票代號，亦可快速切換目前持股
- [x] 資料來源固定分為「市場數據」與「持股相關數據」兩區
- [x] 新增柱狀、價量、成本/市價、持股損益、報酬率原生樣式
- [x] 完整圖表保留 K 線、OHLC、十字線、時間區間
- [x] Mini 與完整圖表共用 HoldingQuote／TWSE 歷史資料來源，不另造帳務資料
- [x] 新增 V3.1.11 regression gate

## 待驗證
- [ ] TypeScript
- [ ] V3.1.11 aggregate tests
- [ ] Expo dependency / doctor
- [ ] backend-quality
- [ ] QA APK
- [ ] APK Artifact / 版本 / SHA / badging
- [ ] Android 真機：Mini 單點、連點、卡片點擊、完整圖表查詢與返回
