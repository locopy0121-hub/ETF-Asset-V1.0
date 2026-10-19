# TF Asset V5.0.30｜全局修復執行書與進度追蹤（LOCKED）
> 文件代號：TF-V5030-REPAIR-EXECUTION-20261019  
> 建立日期：2026-10-19（Asia/Taipei）  
> 儲存庫：locopy0121-hub/ETF-Asset-V1.0  
> **來源分支**：`v5.0.30-motion-editor-selection`  
> **規劃基準 commit**：`b9b14c14abf2e2ef764b5e68e113a97ad54063c0`  
> 文件性質：持續性 Release Checklist / 交接執行書；**僅文件提交，不代表 App 修復或 APK 建置完成**。

## 0. GO 接手方式與規範
1. **嚴格讀取順序**：先讀 `AGENTS.md`（開發前置原則）；GO Gate 依 `Work_Project_Rules.md` 要求，**先完整讀 `ERROR_LESSONS.md`，再讀 `Work_Project_Rules.md`**。不得以本文覆蓋三份原始規範。
2. 開工前核對目標分支 HEAD、已關聯 PR、前次 PASS 的 commit、最後已驗收 APK；不得偷換 `main` V5.0.1 或其他專案作為新版基底。若 HEAD 前進，先 `git diff` 對照本文件、回歸測試後更新此文件的接續基準。
3. **先建立基底備份 ref**；保留使用者資料、原有 UI、持股/自選設定、報價來源規則。**受保護 `src/screens/SettingsScreen.tsx` 主頁不重構、不新增導航、分類或編輯 wrapper**；版本升級時只有規範授權的 VERSION/BUILD/更新資訊最小變更。
4. Canonical Finance Ledger 及 SaiETF native MarketDataCenter / MarketArbitrator 均以只讀、Golden Test 與單一價格權威保護為預設；若必須動核心，需先找到根因、附可重現失敗測試及最小 Diff，才可進行。
5. 每項工作先列 Acceptance Criteria、失敗重現、變更檔案，完成後逐一提交 CODE / RUNTIME / UI / RESULT / BUILD / DEVICE 證據。純 `includes` / regex 僅為 smoke，不能當 Feature PASS。
6. `QA APK` 可依工作規則第 26 節用於未完成真機驗收，但不得冒充正式 RELEASE PASS。每輪實際 App 更新採 Ver +1、當版 `src/settings/appReleaseNotes.ts` 真實 changelog，與 package/app/native/CI/備份版本同步。
7. 所有 FAIL 原地阻斷；不得跳過，且後續變更須重跑可能受影響的先前 PASS。**本文件是跨對話固定工作清單，不得因卡住、重新接手、PR 或版本升級縮減範圍。**

## 1. 全局進度摘要
- **原始工作包：12/12 已建檔**；開始修復：**0/12**；已驗證 RELEASE PASS：**0/12**。
- 文件建立時全部設為 **未開始**。先前 CI 於部分歷史版本曾成功，**不等於本次工作包完成**。
- 下一個待執行：**G0 基底/規範/資料備份/真機驗收條件建立 → M11（備份與升級）**。
- 下一輪實際修改 App 預期版本：`V5.0.31`（僅在確認最新開發 HEAD 及版本無衝突後啟用，勿僅為本文件行政異動升版）。
- 阻斷：尚未完成基底備份 ref、完整缺陷重現與真機 Device Validation；**正式 Release Gate 關閉**。

## 2. 固定 Release Checklist（狀態不得因對話中斷而重置）
| ID | 優先 | 原始需求範圍 | 狀態 | CODE | RUNTIME | UI | RESULT | BUILD | DEVICE |
|---|---|---|---|---|---|---|---|---|---|
| M11 | P0 | 備份／升級 | 未開始 | 未證實 | 未證實 | 未證實 | 未證實 | 未證實 | 待真機 |
| M06 | P0 | 記帳／試算 | 未開始 | 未證實 | 未證實 | 未證實 | 未證實 | 未證實 | 待真機 |
| M08 | P0 | Widget／Mini | 未開始 | 未證實 | 未證實 | 未證實 | 未證實 | 未證實 | 待真機 |
| M09 | P0 | 浮動 Monitor | 未開始 | 未證實 | 未證實 | 未證實 | 未證實 | 未證實 | 待真機 |
| M01 | P1 | 首頁／行情牆 | 未開始 | 未證實 | 未證實 | 未證實 | 未證實 | 未證實 | 待真機 |
| M02 | P1 | 持股頁 | 未開始 | 未證實 | 未證實 | 未證實 | 未證實 | 未證實 | 待真機 |
| M03 | P1 | 市場頁 | 未開始 | 未證實 | 未證實 | 未證實 | 未證實 | 未證實 | 待真機 |
| M04 | P1 | 圖表頁 | 未開始 | 未證實 | 未證實 | 未證實 | 未證實 | 未證實 | 待真機 |
| M05 | P1 | 股息頁 | 未開始 | 未證實 | 未證實 | 未證實 | 未證實 | 未證實 | 待真機 |
| M07 | P1 | 設定／編輯 | 未開始 | 未證實 | 未證實 | 未證實 | 未證實 | 未證實 | 待真機 |
| M10 | P2 | AI／新聞 | 未開始 | 未證實 | 未證實 | 未證實 | 未證實 | 未證實 | 待真機 |
| M12 | P2 | 動畫／佈景 | 未開始 | 未證實 | 未證實 | 未證實 | 未證實 | 未證實 | 待真機 |

### 逐檔修復指令與驗收條件
#### M11 · 備份／升級（P0）
- **重點檔案**：`src/settings/BackupService.ts`、`src/settings/backupDocumentFormat.ts`、`src/settings/backupHistoryStorage.ts`、`.github/workflows/ci.yml`、`.github/workflows/release-v1.yml`、`app.json`、`package.json`、`src/settings/appReleaseNotes.ts`
- **執行順序／最小修護**：驗證本地還原的缺失 Key、外部匯入原子回滾、ledger 與 UI 設定、版本身份、同簽章升級。
- **Acceptance Criteria**：故障注入前後資料不混合；原地升級保留持股及設定；badging SHA256 與簽章證據完整。
- **證據欄位**：重現步驟及 FAIL 測試、真實變更清單與 commit、對應新增/既有 runtime 測試、CI run URL、需要時原生/真機記錄；尚無證據一律「未證實」。
- **當前狀態**：未開始（本文件僅規劃）。

#### M06 · 記帳／試算（P0）
- **重點檔案**：`src/screens/LedgerScreen.tsx`、`src/utils/etfCalculators.ts`、`src/finance/BrokerSettingsRuntime.tsx`、`src/finance/canonicalLedger.ts`、`src/finance/financeFormulaCatalog.ts`
- **執行順序／最小修護**：先鎖帳務 Golden Cases；測損益兩平、最小增購股數、費率稅額、零股、極值，核心如無確證缺陷只讀。
- **Acceptance Criteria**：n-1 股未達標 n 股達標；原帳務資料完全不變；無 NaN/錯誤倍計。
- **證據欄位**：重現步驟及 FAIL 測試、真實變更清單與 commit、對應新增/既有 runtime 測試、CI run URL、需要時原生/真機記錄；尚無證據一律「未證實」。
- **當前狀態**：未開始（本文件僅規劃）。

#### M08 · Widget／Mini（P0）
- **重點檔案**：`src/widget/widgetLiveTask.ts`、`src/native/TfAssetNativeBridge.ts`、`native/android/TfAssetWidgetProvider.kt`、`native/android/TfAssetNativeModule.kt`、`native/android/res/layout/tf_asset_widget.xml`、`scripts/inject-v1_1_2-android.cjs`
- **執行順序／最小修護**：查真實 APK Headless 入口、背景接收、訂閱聯集、桌面 Widget 與 Mini、大小與耗電。
- **Acceptance Criteria**：原地升級後 App 不閃退；盤中前/背景報價時戳連續；關閉最後使用者停止不必要工作；實機驗收。
- **證據欄位**：重現步驟及 FAIL 測試、真實變更清單與 commit、對應新增/既有 runtime 測試、CI run URL、需要時原生/真機記錄；尚無證據一律「未證實」。
- **當前狀態**：未開始（本文件僅規劃）。

#### M09 · 浮動 Monitor（P0）
- **重點檔案**：`native/android/TfAssetOverlayService.kt`、`src/monitor/monitorDomain.ts`、`src/components/monitor/MonitorControlPanel.tsx`、`src/monitor/MonitorSettingsRuntime.tsx`、`src/native/TfAssetNativeBridge.ts`
- **執行順序／最小修護**：檢視權限、latest-frame 限流、開關、背景交接、拖曳縮放與鎖定模式；保護設定子面板。
- **Acceptance Criteria**：連續 bursts 無積壓，開窗不阻斷全 App，關閉取消重繪，手勢邊界與鎖屏按實機驗收。
- **證據欄位**：重現步驟及 FAIL 測試、真實變更清單與 commit、對應新增/既有 runtime 測試、CI run URL、需要時原生/真機記錄；尚無證據一律「未證實」。
- **當前狀態**：未開始（本文件僅規劃）。

#### M01 · 首頁／行情牆（P1）
- **重點檔案**：`src/screens/HomeScreen.tsx`、`src/components/HoldingQuoteCollection.tsx`、`src/components/WatchlistPanel.tsx`、`src/market/watchlistPresentation.ts`、`src/components/HoldingMarketWallEditor.tsx`
- **執行順序／最小修護**：持股優先、混合去重、自選外觀繼承、排列倍數、實際 viewport snap、手勢隔離。
- **Acceptance Criteria**：重複股票顯示一份持股身份；新增自選保留既有佈局；行情同時戳；滑動/點擊/長按正常。
- **證據欄位**：重現步驟及 FAIL 測試、真實變更清單與 commit、對應新增/既有 runtime 測試、CI run URL、需要時原生/真機記錄；尚無證據一律「未證實」。
- **當前狀態**：未開始（本文件僅規劃）。

#### M02 · 持股頁（P1）
- **重點檔案**：`src/screens/PortfolioScreen.tsx`、`src/components/PortfolioHoldingTable.tsx`、`src/components/PortfolioListEditor.tsx`、`src/finance/FinanceRuntime.tsx`、`src/finance/canonicalLedger.ts`
- **執行順序／最小修護**：比對數值與既有 Canonical Ledger，費率、排序 identity、持股詳情編輯和預覽。
- **Acceptance Criteria**：費稅買賣/股息 Golden Cases 通過；排序不換標的；資料保存重開一致。
- **證據欄位**：重現步驟及 FAIL 測試、真實變更清單與 commit、對應新增/既有 runtime 測試、CI run URL、需要時原生/真機記錄；尚無證據一律「未證實」。
- **當前狀態**：未開始（本文件僅規劃）。

#### M03 · 市場頁（P1）
- **重點檔案**：`src/screens/MarketResearchScreen.tsx`、`src/market/securityResolver.ts`、`src/market/TaiwanSecurityCatalog.ts`、`src/market/marketTechnicalSignals.ts`、`src/market/EtfConstituentsRuntime.tsx`、`src/market/etfConstituentChanges.ts`
- **執行順序／最小修護**：搜尋防競態、時間與來源分離、ETF 成分增刪通知與快取可靠性。
- **Acceptance Criteria**：快速搜尋不回跳；上市上櫃 ETF 搜尋正確；成分日期來源可追溯；缺資料不偽裝即時。
- **證據欄位**：重現步驟及 FAIL 測試、真實變更清單與 commit、對應新增/既有 runtime 測試、CI run URL、需要時原生/真機記錄；尚無證據一律「未證實」。
- **當前狀態**：未開始（本文件僅規劃）。

#### M04 · 圖表頁（P1）
- **重點檔案**：`src/screens/StockChartScreen.tsx`、`src/components/OfficialCandleChart.tsx`、`src/components/TaiexIndexCard.tsx`、`src/components/TrendChartViewport.tsx`、`src/market/taiexIndex.ts`、`src/market/twseDailyHistory.ts`
- **執行順序／最小修護**：K 線與三關價獨立，座標、時間軸、pinch/pan、跨日對齊，禁止假分時資料。
- **Acceptance Criteria**：軸線及左右參考值正確、選點對應真實來源、縮放和平移穩定、兩類圖表不重疊。
- **證據欄位**：重現步驟及 FAIL 測試、真實變更清單與 commit、對應新增/既有 runtime 測試、CI run URL、需要時原生/真機記錄；尚無證據一律「未證實」。
- **當前狀態**：未開始（本文件僅規劃）。

#### M05 · 股息頁（P1）
- **重點檔案**：`src/screens/DividendScreen.tsx`、`src/components/CalendarDatePickerModal.tsx`、`src/market/stockDividendHistory.ts`、`src/market/issuerDividendPolicies.ts`、`src/ai/dividendAssistant.ts`
- **執行順序／最小修護**：公告、預估、實收分離，月曆休市日，獨立大事記卡與更新時戳。
- **Acceptance Criteria**：預估不計入實收；節日休市說明正確；部分失敗保留最後有效公告並標示來源。
- **證據欄位**：重現步驟及 FAIL 測試、真實變更清單與 commit、對應新增/既有 runtime 測試、CI run URL、需要時原生/真機記錄；尚無證據一律「未證實」。
- **當前狀態**：未開始（本文件僅規劃）。

#### M07 · 設定／編輯（P1）
- **重點檔案**：`src/components/PageLayoutToolWorkbench.tsx`、`src/components/PageFrameSettingsModal.tsx`、`src/components/EditableNative.tsx`、`src/components/FrameCard.tsx`、`src/editor/editorModel.ts`、`src/components/PageEditorStack.tsx`
- **執行順序／最小修護**：建立所有頁面/卡片/項目覆蓋矩陣，共用實際 UI 幾何，持久化與 readonly 組件保護，系統設定主頁零改動。
- **Acceptance Criteria**：預覽與真實版面尺寸座標一致；各項有編輯入口；重啟還原；保護設定 baseline hash 不變。
- **證據欄位**：重現步驟及 FAIL 測試、真實變更清單與 commit、對應新增/既有 runtime 測試、CI run URL、需要時原生/真機記錄；尚無證據一律「未證實」。
- **當前狀態**：未開始（本文件僅規劃）。

#### M10 · AI／新聞（P2）
- **重點檔案**：`src/screens/AiScreen.tsx`、`src/ai/aiAssistant.ts`、`src/components/GlobalFloatingAi.tsx`、`src/components/NewsReaderModal.tsx`、`src/news/newsReaderContent.ts`
- **執行順序／最小修護**：AI 真實資料範圍、新聞 URL 保護、廣告過濾可逆、深淺佈景對比。
- **Acceptance Criteria**：AI 不捏造持股；新聞主體未誤刪；載入錯誤可恢復；AD 阻擋後可閱讀。
- **證據欄位**：重現步驟及 FAIL 測試、真實變更清單與 commit、對應新增/既有 runtime 測試、CI run URL、需要時原生/真機記錄；尚無證據一律「未證實」。
- **當前狀態**：未開始（本文件僅規劃）。

#### M12 · 動畫／佈景（P2）
- **重點檔案**：`src/components/ItemMotion.tsx`、`src/components/MotionControls.tsx`、`src/domain/displayItemContract.ts`、`src/theme/ThemeRuntime.tsx`、`src/components/ColorPalettePicker.tsx`
- **執行順序／最小修護**：42 種效果與可用 surface、跨卡片分類、AppState、reduced motion、保存/回復。
- **Acceptance Criteria**：預覽與真行情隔離；背景停止播放；減少動態效果生效；設定切換與重開一致。
- **證據欄位**：重現步驟及 FAIL 測試、真實變更清單與 commit、對應新增/既有 runtime 測試、CI run URL、需要時原生/真機記錄；尚無證據一律「未證實」。
- **當前狀態**：未開始（本文件僅規劃）。

## 3. 階段依賴與阻斷 Gate
| Gate | 工作內容 | 通過標準 | 狀態 |
|---|---|---|---|
| G0 | 版本/規範/備份/保護區域 baseline | SHA、備份 ref、三份規範、Golden baseline、原 UI/Settings Hash 全部留證 | 未開始 |
| G1 | M11 → M06 | 故障注入還原與財務 Golden Test、資料保留 | 未開始 |
| G2 | M08 → M09 | Headless/原生 bridge/Widget/Monitor 行為與負載測試；真機列明 | 未開始 |
| G3 | M01 → M02 → M03 | 持股、自選、搜尋、行情資料流及佈局穩定 | 未開始 |
| G4 | M04 → M05 → M07 | 真實圖表、股息/公告與全局編輯 Coverage Matrix | 未開始 |
| G5 | M10 → M12 | AI/新聞安全、動畫前景與無障礙 | 未開始 |
| G6 | 全量 regression + Final Checklist Reconciliation | 12 項全有 CODE/RUNTIME/UI/RESULT 證據，保護 Gate 全通過 | 未開始 |
| G7 | QA APK → Android 真機 → 正式 Release | APK badging、SHA-256、相同簽章原地升級、功能驗收、下載 artifact 實證 | 未開始 |

## 4. 必測跨界情境
1. **報價同源測試**：新的逐筆成交進入 SaiETF 單一仲裁，從 Native → Bridge → Home/Portfolio/Market/Widget/Mini/Monitor 均比較價格、`sourceQuoteAt`、品質、序號與退化狀態；不因 HTTP 收到回應或價格不變就假稱新 Tick。休市保留最後有效收盤價。
2. **資料保留及回滾**：本地還原、外部匯入、升級、App 強制關閉中斷、故障注入；事前/事後資料 hash 對照；不得發生舊備份與殘留 Key 混合。
3. **財務 Golden Case**：完整買賣與部分賣出、手續費折扣、交易稅、股息、零股、試算 n-1/n 邊界、不同券商費率及數字極值；不得更改 Core 答案而以 UI 補丁掩飾。
4. **原 UI/Settings 保護**：使用原 V5.0.30 自訂樣式備份對照，預覽與真實頁同樣式同幾何，重新開啟同結果；Settings 主頁固定 baseline hash；需修改版本資訊時僅核對授權例外。
5. **裝置行為**：不同 Android 版本、App 前背景切換、殺程序重啟、Widget 啟用/移除、Overlay 顯示/關閉、拖曳/Pinch、低記憶體及 reduced motion；未上真機一律 Device Validation Pending。
6. **發布身份**：同一 commit 的 versionCode/versionName、Package ID、發佈註記、APK hash、簽章憑證指紋、Artifact ID 與 URL；正式 Release 不得由成功 QA Build 代替。

## 5. 每次建置／交接必填紀錄（追加新段，不覆蓋歷史）
```text
記錄日期時間（Asia/Taipei）：
執行者／對話或工作單：
使用分支／起點 HEAD：
備份 ref：
項目 ID / 根因：
原始失敗重現 / 測試：
修改檔案 / Git diff / commit：
保護 Settings Hash：原始= / 更新後= / 狀態=
Finance Golden Case：結果/測試證據
SaiETF Market Native：結果/測試證據
CODE / RUNTIME / UI / RESULT：
CI workflow run URL / 結論：
Android QA APK：artifact ID / SHA-256 / badging / 同簽章升級結果：
真機裝置 / OS / 情境 / 驗收結果：
阻斷及下一步：
原 Checklist 未完成項目數：
下一個待執行工作包：
```

## 6. 初始執行紀錄（2026-10-19）
- **執行動作**：依使用者要求把前次 12 項審查轉成可交接追蹤的規劃執行書。
- **基底**：`v5.0.30-motion-editor-selection`，commit `b9b14c14abf2e2ef764b5e68e113a97ad54063c0`（規劃起點）。
- **修改類型**：僅新增 Markdown 規劃文件；未更改 App 程式碼、帳務、行情、系統設定主頁或 Android package；不遞增 APK 版本。
- **完成**：固定項目、主要檔案、驗收門檻、依賴關係、跨界測試與後續追蹤格式已建立。
- **未完成**：所有實作、修復驗證、正式 CI 及真機 Release Acceptance。
- **建置接續指令**：先確認最新 HEAD，再執行 G0，從 M11 開始；所有失敗原地修護與記錄，不得將未證實標為 PASS。

## 7. GO G0 / M11 進度紀錄（2026-10-19）
- **GO 起點**：`v5.0.30-motion-editor-selection` HEAD `a08ca8a1052c77198e32abe5dfc61759f2386046`；來源包含執行書行政文件，App 原始基底仍為 V5.0.30。
- **保護備份分支**：`backup-v5.0.30-before-m11-20261019`，指向原始 GO HEAD；**修復分支**：`repair-v5.0.31-m11-backup-integrity`。
- **G0 CODE/範圍**：已讀 `AGENTS.md`、`ERROR_LESSONS.md`、`Work_Project_Rules.md`；建立備份 ref；未改動 SettingsScreen、Finance Core、Native Market Data Center 及原 UI。
- **M11 進行中**：新增 `src/settings/backupStorageTransaction.ts`，將還原 Key 完整替換並校驗，失敗嘗試回滾並校驗；`BackupService.ts` 的本地還原與外部匯入接入，歷史儲存失敗時回復 active data；建立行為測試 `scripts/v5_0_31-backup-transaction.test.ts` 並接入 `test:v5_0_30` 繼承測試鏈。
- **未證實**：測試尚待 CI 執行；原生真機資料恢復、歷史備份回滾及 Crash Injection 仍待核對；尚未升版、建立 APK 或驗證簽章。**M11 不得標為 PASS**。
- **下一步**：啟動 PR 觸發品質 Gate，確認問題與測試結果；若失敗即在修復分支原地修正；符合規範後升版 V5.0.31 並進行 QA APK。
- **剩餘工作包**：12/12 尚未完成；M11=進行中，其餘 11 項=未開始。正式 Release Gate 關閉。

## 8. GO 接續紀錄：M11 自動測試啟動（2026-10-19）
- PR：#227（Draft）— https://github.com/locopy0121-hub/ETF-Asset-V1.0/pull/227
- 先確認 PR/Branch 仍為 `repair-v5.0.31-m11-backup-integrity`、未合併；原版 `main` 與受保護設定主頁未改。
- 發現原 `.github/workflows/ci.yml` 的 pull_request 目標分支不含 `v5.0.*`，原 repair 分支 push 也不符合 push 模式；因此 PR 建立後沒有自動 QA run，不能把缺失的 CI 當成 PASS。
- 在修復分支新增 **`.github/workflows/m11-backup-qa.yml`**，獨立執行 TypeScript、`test:m11-backup-transaction` 與 `test:finance`。觸發 run：**https://github.com/locopy0121-hub/ETF-Asset-V1.0/actions/runs/39250047338**，首次查詢為 **in_progress**。
- **當前狀態**：M11 仍在進行中，CODE 已提交；RUNTIME/RESULT/BUILD 未得到測試成功證據；DEVICE/簽章未驗；12/12 工作包均未 RELEASE PASS。
- **下一步**：獲取這次 Actions 最終結論，FAIL 即原地修改；其後處理匯入 history 局部失敗一致性與 Android 同簽章升級；通過安全前置 Gate 才允許 V5.0.31 QA APK。

### CI 補充證據（2026-10-19）
- `M11 QA run #39250047338` **completed/success**：https://github.com/locopy0121-hub/ETF-Asset-V1.0/actions/runs/39250047338 （TypeScript、備份交易行為、財務 Golden）。
- 此結果僅是 **指定自動測試通過**，非整包 M11 通過，未完成 history 故障注入、正式全量 CI、APK、Android 原地升級與 Device Validation。
- 文件更新觸發的 `#39250139396` 首次查詢為 in_progress；不得預設其結果。
