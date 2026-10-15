# TF Asset V3.1.17 GO Checklist

## Scope
- [x] 從 V3.1.16 方案 C HEAD 建立獨立 V3.1.17 工作分支
- [x] 交易紀錄每頁 10／20／50 筆
- [x] 交易紀錄上一頁／下一頁及總筆數／頁數
- [x] 移除 UI 固定 slice(0,20) 截斷，最早 Ledger 記錄可達
- [x] 方案 C 四模組內容工具置入頁面設定
- [x] 內容排序、字體大小、顏色、內距／間距、對齊
- [x] 方案 C 四模組內部真實 A 接入駐點維護工程師
- [x] 金融數值維持顯示唯讀，不更動 Canonical Finance Core
- [x] 行情牆 Frozen scope 未修改
- [x] App 版本 3.1.17 / Android+iOS 30117
- [x] 新增 Ledger pagination regression
- [x] 新增 Dashboard content editing regression
- [ ] V3.1.17 aggregate regression PASS
- [ ] Node/Redis/PostgreSQL integration PASS
- [ ] QA APK native integration PASS
- [ ] APK ZIP / SHA / AAPT badging / Artifact 實體驗證 PASS
- [ ] Android 實機 UI／觸控驗收（與 CI 分開）
