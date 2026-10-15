# TF Asset V3.1.16 GO Checklist

## 方案 C
- [x] 從 V3.1.15 成功 QA HEAD 建立前置備份
- [x] 建立 V3.1.16 工作分支
- [x] 資產總覽模組
- [x] 損益分析 2×2 模組
- [x] 損益明細摘要模組
- [x] 快捷功能模組
- [x] 頁面設定新增方案 C 佈局編輯器
- [x] 頁面設定新增即時佈局預覽
- [x] DashboardLayoutConfig 與行情牆設定隔離
- [x] 行情牆 Frozen Blob Gate
- [x] Finance Core Frozen Blob Gate
- [x] App 版本 3.1.16 / Android+iOS 30116
- [ ] TypeScript PASS
- [ ] V3.1.16 aggregate regression PASS
- [ ] Backend Node/Redis/PostgreSQL PASS
- [ ] QA APK PASS
- [ ] ZIP / SHA256 / AAPT / Artifact PASS
- [ ] Android 真機：方案 C 排版與 NT$ 無錯位
- [ ] Android 真機：行情牆設定與 V3.1.15 一致

## Frozen Scope
HoldingMarketWallEditor、HoldingQuoteCollection、FloatingHoldingCardPreview、uiModels、Canonical Finance Core、actual_fee／actual_tax、行情資料來源、SAF 備份格式不得因本工程單改動。
