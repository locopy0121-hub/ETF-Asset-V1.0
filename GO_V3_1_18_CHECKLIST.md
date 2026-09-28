# GO V3.1.18 CHECKLIST

## 來源與備份
- [x] 基底：V3.1.17 QA 成功 HEAD `5d3b50bd62a4a560a3f8478cb1c4248640ae1977`
- [x] 備份：`backup-v3.1.17-20260928-before-holding-detail-safearea`
- [x] 工作分支：`go-v3.1.18-20260928-holding-detail-editor-safearea`

## 本版範圍
- [x] 個股資訊頁新增設定齒輪。
- [x] 個股資訊表頭建立獨立 `holding-detail-header`。
- [x] 即時行情／持股資訊／損益／股息／紀錄／試算入口納入 PageEditorStack。
- [x] 詳情頁維護工程師 session 不再被 AppBody 自動取消。
- [x] 詳情頁啟用 bottom safe-area。
- [x] QA Android theme 保持系統 navigation bar 圖示可見。
- [x] 版本提升為 3.1.18 / 30118。
- [x] Immutable Finance Core、行情牆未修改。

## Gate
- [ ] TypeScript
- [ ] V3.1.18 regression
- [ ] quality
- [ ] backend-quality
- [ ] QA APK
- [ ] APK artifact / SHA / badging
- [ ] Android 實機確認：底部不再與系統導航區重疊，系統導航圖示可見。
