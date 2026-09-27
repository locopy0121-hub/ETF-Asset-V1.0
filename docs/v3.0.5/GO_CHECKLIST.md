# V3.0.5 GO Checklist｜維護工程師文字排版／貨幣前綴

基底：V3.0.4 `a2e9e15d28fb4a7379ce8ccd1f5e78734410ea29`。
更新前原始碼備份：`backup-v3.0.4-20260925-pre-v305-skills`。
開發分支：`go-v3.0.5-20260925-typography-prefix`。
**備份為 GitHub 原始碼，不是手機內帳務資料備份。不得解除安裝 App 來驗證更新。**

## 本次鎖定項目（以實際結果判 PASS）
- [x] CODE：單一中央技能樹新增字重、斜體、底線／刪除線、字距、行高，直接連到目前原生文字與 KPI 數值呈現。
- [x] CODE：首頁「NT$」由金額純文字拆成獨立前綴與唯讀金額，維護工程師提供內容、顯示、字體與間距的局部覆寫；不更動 Finance Core。
- [x] CODE：沿用各頁獨立 TargetOverride 與 v3 schema，真實原地草稿預覽、套用保存、取消回滾；新增顯示樣式經 normalize 與範圍限制。
- [ ] QA：新回歸測試 + v3.0.4 全量前置測試 + TypeScript + Expo Doctor + backend。
- [ ] QA APK：GitHub Action 產出 3.0.5 / versionCode 30005，Artifact 非空、ZIP 測試、SHA256、Android badging 全通過。
- [ ] REAL DEVICE：確認 NT$ 可以獨立選取、可見扳手且不遮住數字；所有新增工具實際生效、取消恢復、儲存重新開啟保留；正常模式數值與版面未退化。

## 仍未接入 Runtime 的技能
目前中央元件庫仍含標示 `adapter-required` 的複合型元件。字型家族、跨元件拖放排序、完整圖表原位編輯、動畫與共享模板等技能仍須按真實 App 元件及數據 Runtime 逐一接線，不得因工具名稱存在宣稱功能可用。

## 核心保護
`src/finance/canonicalLedger.ts`、`src/utils/etfCalculators.ts`、`docs/finance/CORE_LOCK.md` 未列入本次變更。前綴僅為顯示字串，不能改寫來源金額、費稅或交易紀錄。
