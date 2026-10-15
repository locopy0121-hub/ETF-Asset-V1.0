# TF Asset V3.0.7 GO｜專業框架工程師（開發 QA）

承接 V3.0.6 PR #52 HEAD 25b4af8d7293997b400aca9bf1bd43e96e7e35b1。
事前原始碼備份 backup-v3.0.6-20260925-pre-v3.0.7；工作分支 go-v3.0.7-20260925-frame-engineer。
注意：GitHub 原始碼備份不是手機內帳務外部備份；禁止解除安裝既有 App 來測試。原八大項暫停保留。

## 本版鎖定 Checklist
- [x] CODE 01：沿用唯一 16 大 B 技能中央樹，專業框架 C/D 工具分類 ① 至 ⑩，未實作技能標記待接入。
- [x] CODE 02：背景純色／雙色線性漸層，上下／左右方向、第二色 ColorPicker 及獨立損益色；背景透明度不再影響文字和金額。
- [x] CODE 03：實線／虛線／點線邊框，四側各自粗細、四角各自圓角；−1 沿用原設定。
- [x] CODE 04：原生陰影顏色／損益色／模糊／水平垂直偏移／透明度／總開關。
- [x] CODE 05：框架內邊緣光圈的顏色／損益色／透明度／寬度；可選呼吸動畫尊重系統降低動態。
- [x] CODE 06：四側內距、上下外距、最大寬度和內容間距，真實框架暫存預覽、取消還原、套用才儲存。
- [x] CODE 07：新增顏色工具整合既有 ColorPalettePicker；數值提供步進和手動輸入、儲存時範圍正規化。
- [x] CODE 08：FrameEditorConfig.effects 可選，舊資料回落原本樣式；局部設定不影響其他框架或頁面。
- [ ] CI 09：TypeScript、歷代帳務及工程師測試、V3.0.7 專項及 Expo Doctor 全 PASS。
- [ ] BACKEND 10：Node／Redis／PostgreSQL 整合測試 PASS。
- [ ] APK 11：Android 3.0.7／versionCode 30007，完整 ZIP、非空、badging、SHA256、Artifact 驗證。
- [ ] REAL DEVICE 12：取消、套用、重啟、透明背景、尺寸、呼吸效果在真機 PASS。
- [ ] DEVICE DATA 13：使用者確認手機帳務外部檔可選取，不將 GitHub 備份當作資料備份。

## 尚待原生介接，不宣稱完成
① 背景圖片與多色角度漸層；② 漸層／雙層邊框；③ 精確陰影 spread、多層陰影；④ 外側模糊光暈；
⑤ 真正毛玻璃／磨砂；⑦ 子元件拖移排序；⑧ 其他進出場動畫；⑨ 框架點擊與內部按鈕手勢互斥；
⑩ 響應式斷點與跨頁中央模板版本化共享。這些工具仍標示 adapter-required。

## 不可修改的財務基準
不得更動 src/finance/canonicalLedger.ts、src/utils/etfCalculators.ts、docs/finance/CORE_LOCK.md。
僅改 UI，不重算帳務數值、費稅、現金、股息、行情或 AI 資料。
