# V3.0.6 GO｜駐點維護工程師技能樹深度補強

基底 V3.0.5 QA `f9df358e8c7afe248283570284a0e58ec9517d9b`，事前 GitHub 原始碼備份：
`backup-v3.0.5-20260925-pre-v3.0.6`。開發分支：
`go-v3.0.6-20260925-engineer-text-detail`。

> GitHub 原始碼備份 ≠ 手機內的帳務備份。不得解除安裝手機上的正式帳務 App 來測試 APK。

## 本輪可驗證 Checklist

- [x] CODE｜只沿用全 App 唯一中央技能樹，仍保留 16 個 B 大類、A 現場指定 → B 技能 → C 工具 → D 細節。
- [x] CODE｜新增裝置內建字型家族選擇（系統／無襯線／窄體／襯線／等寬）並真正連上原生 Text、KPI 數值及新增文字元件，缺字由系統字型替代。
- [x] CODE｜KPI 卡片標題與說明可分別設定字重、斜體、字距、行高；不與數值字重混用，不影響其他卡片。
- [x] CODE｜NT$ 前綴獨立上下微調 −24～24 dp，保留原本獨立內容、間距、字級、色盤與單獨顯示開關。金額原始值唯讀。
- [x] CODE｜新增屬性透過既有 v3 TargetOverride 正規化、範圍限制、單頁單框架單元件儲存；預覽不持久，套用才寫入。
- [x] CODE｜原生新增文字元件接通字重、斜體、字距、行高與字型家族；僅在當前已指定實例覆寫。
- [ ] CI｜TypeScript／舊版金融核心與維護工程師回歸／V3.0.6 專項／Expo Doctor／Node+Redis+PostgreSQL 全部 PASS。
- [ ] APK｜Action 產生 QA APK，驗證 3.0.6 / 30006、zip、aapt package／version／SHA256／非空 Artifact。
- [ ] REAL DEVICE｜實機確認 NT$ 跟數值仍同行、上下微調正常；卡片標題／數值／說明獨立且不換行／不遮擋；取消完全恢復、套用重開不遺失。

## 截圖補強後續

首頁圖表與金額的相對位置、卡片留白、扳手遮擋、專業元件完整原地適配，需要真機量測後逐項驗收。此輪只修護明確已連接的文字／前綴技能，不宣稱圖表編輯、動畫、跨頁共享等尚在待接入的技能已完成。

## 不可觸動的財務基準

不得修改 `src/finance/canonicalLedger.ts`、`src/utils/etfCalculators.ts`、`docs/finance/CORE_LOCK.md` 的原始碼。UI 的貨幣前綴、字型、KPI 說明均不得改寫帳務來源、費稅、現金與股息資料；目前未完成的舊八大項繼續保留。
