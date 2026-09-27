# TF Asset V3.0.8 GO｜專業框架背景圖片、三色漸層、遮罩與細節（開發 QA）

基底：V3.0.7 PR #53 HEAD efaf8513fa005a42614cd258b2b6a59cf293226d。
修改前備份：backup-v3.0.7-20260925-pre-v3.0.8。
工作分支：go-v3.0.8-20260925-frame-background-image。
重要：GitHub 原始碼分支備份不是 Android 手機的外部帳務備份，不能因此解除安裝既有 App。

## 本輪 12 項鎖定 Checklist
- [x] CODE 1｜沿用全 App 唯一 16 大技能書，專業框架工程新增 10 個已接線 C 工具與 D 參數，其餘原生依賴功能保留待接入標記。
- [x] CODE 2｜純色／雙色／三色線性漸層，支援中間色與可調停靠位置，沿用上下／左右方向。保留 V3.0.7 雙色預設。
- [x] CODE 3｜每框架獨立選用 10 張內建背景；Android 原生 SAF 選取自訂圖片，既有原生選檔器會保留 URI 讀取授權。
- [x] CODE 4｜背景圖片填滿／完整顯示／拉伸與獨立圖片透明度；圖片、漸層可套獨立遮罩色與遮罩強度，不使標題和帳務數字褪色。
- [x] CODE 5｜中間漸層色、遮罩色全部接入既有 ColorPalettePicker 與各自系統損益色開關，無手動色碼或固定色塊工具。
- [x] CODE 6｜限制自訂 URI 為既有 Android content:// SAF 檔案位置，不接受網路、腳本或本機檔案系統路徑；版本遷移保留舊框架和原有 V3.0.7 效果。
- [x] CODE 7｜只有目前選取的 A 層框架工作區套用暫存效果，取消不寫入；不碰其他卡片／其他頁面／既有帳務核心。
- [x] CODE 8｜更新正式遞增 App 3.0.8／Android versionCode 30008／iOS buildNumber 30008 與備份命名，新增完整 V3.0.8 回歸閘門。
- [ ] CI 9｜TypeScript、Finance Golden、V3.0.7 全部回歸、V3.0.8 專項、Expo Doctor PASS。
- [ ] BACKEND 10｜Node、Redis、PostgreSQL 整合測試 PASS。
- [ ] APK 11｜GitHub QA APK Artifact 已上傳、zip 無錯、sha256、aapt package/version PASS。
- [ ] DEVICE 12｜Android 實機：檔案選擇及重啟權限、圖片裁切、遮罩、原地取消／套用、小螢幕排版；安裝前確認真實外部帳務檔可選取。

## 明示尚未完成的原生適配
使用者自訂圖片的裁切焦點／跨裝置自動嵌入、任意角度漸層、真正玻璃背景模糊、精準多層陰影／spread、獨立漸層邊框、外光暈、框架手勢／跨頁模板仍為待接入。
原八大項暫停保留；不能將新增技能選單視為真正可用性及實機 PASS。

## 永久鎖定範圍
src/finance/canonicalLedger.ts、src/utils/etfCalculators.ts、docs/finance/CORE_LOCK.md 不得修改。
所有 UI 圖像只影響本地顯示層，不改寫交易、實際費稅、現金、股息、行情及 AI 來源。
