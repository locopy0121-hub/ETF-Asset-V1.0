# UPDATE.md — TF Asset V2.1.1 全局優化工程

> 狀態：啟動／盤點中。**不是 Release 完成報告，亦非 APK 交付證明。**
>
> 啟動日期：2026-09-22。專案：`locopy0121-hub/ETF-Asset-V1.0`；來源：PR #19 head `67e45d6414f3e1ce42acb003bdf2253a5b6f0cf0`（V1.1.3 RC，當時尚未合併）；目標版本 V2.1.1。
>
> **安全備份已建立並核對**：`backup-v2.1.1-20260922`，指向來源 SHA `67e45d6414f3e1ce42acb003bdf2253a5b6f0cf0`。工作分支：`uigo-v2.1.1-20260922`。不得把這份原始碼備份誤稱為使用者手機內帳務資料備份；更新安裝前仍須保護本機資料。

## 0. 不能跳過的執行契約

- 已讀 `ERROR_LESSONS.md`，再讀 `Work_Project_Rules.md`；兩者適用的 Hard Gate 仍生效；本次使用者以 `uiGo` 授權全面檢整，但**未授權修改不可變金融核心**。
- **Immutable Core**：`src/utils/etfCalculators.ts`、`src/finance/canonicalLedger.ts`、`CORE_LOCK.md` 不得變更；歷史 `actual_fee`／`tax` 固化，Portfolio 只加總。
- 僅允許 GitHub Actions 產生 Android APK，不走 EAS Build；開發中驗收 APK 與正式 Release 必須區分。
- 每一項依 CODE／RUNTIME／UI／RESULT 驗證，單項重驗與完整性確認後才能 PASS；全項 PASS 才進正式 APK Action。真機專屬測試不得從 CI 推論通過。

## 1. 經原始碼證實的結構性缺口（先作為 FAIL／未證實，不以畫面推論代替測試）

1. `src/components/PageFrameSettingsModal.tsx` 目前對一般頁面框架僅呈現顯示／版面、標題、背景、邊框，以及**條件式**資料／內容入口；既有 `src/editor/componentCapabilities.ts` 的多種工具定義未能證明已完整接線到每類元件，缺統一的「能力模型→真實控制→持久化→實際 Consumer」覆蓋表。
2. `src/settings/systemColorPalette.ts` 現僅提供獲利／虧損／持平三色；`src/settings/SettingsRuntime.tsx` 的 display preferences 亦僅儲存三色；漲停／跌停獨立狀態和**任意顏色屬性各自啟閉全域損益色**未得到全域覆蓋證據。
3. `src/dividend/dividendCalendar.ts` 僅處理除息日、股權登記日與配發日三類事件；缺最後購買日欄位、事件來源可信度與單一日期多標的完整覆蓋的端到端驗證。最後購買日必須以實際交易日曆計算或可靠公告核實，不能用自然日減一天。
4. `src/screens/LedgerScreen.tsx` 的交易清單目前交易列右側直接提供刪除，但原始碼未見交易列整列開啟完整明細的操作；需把買進／賣出／股息／其他紀錄的詳情和編輯安全流程實作並驗證。任何刪除應有二次確認。
5. 首頁 `src/screens/HomeScreen.tsx` 與庫存 `src/screens/PortfolioScreen.tsx` 使用共享行情元件及各自頁面設定，但「每個資料欄位獨立開關／箭頭／所有顏色／特效／浮動預覽」跨頁覆蓋仍未證實。
6. `src/editor/componentCapabilities.ts` 雖記載部份文字特效，但未證實一般框架、背景、文字、數值、箭頭、圖表在頁面設定均可按元件能力配置，缺全域可操作特效與可拖曳／可縮放／可收合的浮動**設定**預覽證據。
7. 原始碼樹包含 Monitor／Mini／Widget 原生和 JS 設定，需分別驗證資料同步、可用顏色、文字行距、欄數、原生更新、覆層權限與 A-B 編輯，不能只看 React 元件。

## 2. V2.1.1 鎖定全局驗收矩陣

| ID | 驗收範圍 | 必備結果 | 狀態 |
| --- | --- | --- | --- |
| U01 | 全域頁面／框架註冊 | 每個畫面元件有真實適用設定入口；設定不是空殼 | 待實作／驗證 |
| U02 | A-B/C-D 逐層收合 | 同層單組展開、能力依元件型別、跨頁相同工具 | 待實作／驗證 |
| U03 | 顏色與損益狀態 | **任何顏色屬性**均有獨立「套用系統損益色」開／關，關閉回自訂色；上漲、下跌、持平、漲停、跌停分流 | 待實作／驗證 |
| U04 | 字體／標題／數值／背景 | 字級、格式、方向箭頭、圖片、透明度、框架、邊框、位置、尺寸與持久化 | 待實作／驗證 |
| U05 | 全域動畫特效 | 依能力提供樣式、速度、強度、顏色、性能防護；動畫結果可見 | 待實作／驗證 |
| U06 | 浮動即時預覽 | 可拖曳／縮放／收合；A 整體／B 單項；變更同步；取消回滾、套用保存；不遮擋操作 | 待實作／驗證 |
| U07 | 首頁／庫存共用行情 | 同資料來源及元件能力、各頁獨立設定、漲跌與損益分開決定箭頭及顏色 | 待實作／驗證 |
| U08 | 庫存完整設定 | 持股分析、持股檢視、資產配置具各自資料／圖表／排序／樣式／A-B 設定 | 待實作／驗證 |
| U09 | 股息中心 | 最後購買日、除息日、登記日、發放日、月曆標記、可點詳情、預估及已入帳區分、設定可控 | 待實作／驗證 |
| U10 | 帳務中心 | 交易列可點詳情、完整帳務欄位、編輯及刪除保護、保留固化費稅 | 待實作／驗證 |
| U11 | AI 與新聞 | 持股數據、可點股息、浮動 AI、日期與來源、設定生效 | 待完整驗證 |
| U12 | Monitor／Mini／Widget | 行情、跨頁資料同步、全欄位顏色／特效、原生行為、尺寸與刷新 | 待完整驗證 |
| U13 | 儲存／恢復／異常 | 設定永久化、舊資料遷移、防碰撞、錯誤可恢復、效能與無閃退 | 待完整驗證 |
| U14 | 金融核心回歸 | Golden Case、實際費稅固化、持股加總與帳務一致 | 待完整驗證；核心不修改 |
| U15 | GitHub-only APK | V2.1.1／versionCode 正式遞增、CI、Artifact 實體、APK 大小、包名、badging、SHA256、下載與安裝驗收 | 尚未執行 |

## 3. 執行與證據紀錄

- [x] 確認目前目標 repo、來源分支、來源 SHA、來源版本。
- [x] 讀取錯誤教訓與專案強化規則。
- [x] 建立並由 GitHub API 核對可回退備份分支 `backup-v2.1.1-20260922`。
- [x] 建立獨立工作分支 `uigo-v2.1.1-20260922`；**未修改 main，未合併 PR #19**。
- [x] 盤點來源樹及多個核心畫面／設定原始碼；上列缺口為來源證據，不代表功能已經修好。
- [ ] 單項實作→對應行為測試→CI→完整性確認→回歸；依 U01～U15 填寫實際 changed files、commit、workflow run 和結果。
- [ ] 前置全項 Checklist reconciliation；如 U01～U14 任一項未有足夠證據，禁止正式 Release Action。
- [ ] V2.1.1 GitHub APK build、完整 Artifact 驗證及最終交付報告。

**禁止宣稱已交付：目前沒有 V2.1.1 APK，沒有通過 V2.1.1 的任何實機驗收，也尚未完成正式版本更新。**


## 4. uiGo 續接實際修護進度（2026-09-23 台灣時間）

以下是已提交至獨立工作分支的實際程式變更，**不等於功能或 Release PASS**：

- **U10 帳務詳情（CODE 已提交）**：帳務列表改為可點擊整列，新增買入／賣出／股息／其他完整歷史數據檢視；刪除移入詳情並增加二次確認。檔案：`src/screens/LedgerScreen.tsx`。尚需驗證實機開啟／關閉、各筆欄位、刪除與編輯流程（編輯尚未完成）。
- **U09 股息日曆（CODE 已提交）**：僅當來源明確記錄最後購買日時才建立事件；提供日曆標示與設定開關，拒絕用自然日減一猜測台股交易日。檔案：`src/dividend/dividendCalendar.ts`、`src/screens/DividendScreen.tsx`、`src/settings/SettingsRuntime.tsx`、`src/screens/SettingsScreen.tsx`。尚需核對實機與實際公告來源。
- **U07／U08 庫存（CODE 已提交）**：庫存的持股行情牆接入與首頁同一套 `HoldingMarketWallEditor` 能力工具，**保存庫存獨立的設定**；庫存實際 `HoldingQuoteCollection` 讀取自身 wall config，且舊設定恢復時執行 normalize。檔案：`src/components/PageFrameSettingsModal.tsx`、`src/screens/PortfolioScreen.tsx`、`src/editor/editorModel.ts`。這僅覆蓋行情牆；持股分析與資產配置的完整工具仍待補齊。
- **正式版本識別（CODE 已提交）**：`package.json`、`app.json`、設定頁及備份元資料均改為 V2.1.1，Android `versionCode=20101`，package 仍是 `com.tfasset.app`。
- **GitHub-only QA APK 前置管線（已提交）**：PR #20 的專屬 QA workflow 於 quality gate 通過後，使用純 React Native Android Gradle，在 GitHub runner 建置及檢查 V2.1.1 QA APK；**QA APK 是供實機測試的候選物，不代表正式 Release**。
- **PR 狀態**：已建立 draft PR [#20](https://github.com/locopy0121-hub/ETF-Asset-V1.0/pull/20)，保留 PR #19 未擅自合併。
- **CI 失敗與原地修復**：首次 V2.1.1 run [35754476325](https://github.com/locopy0121-hub/ETF-Asset-V1.0/actions/runs/35754476325) FAIL，實際原因是 V1.1.3 股息測試仍假設事件只有三種，與本次來源明確記載的最後購買日新增事件矛盾。已更新該測試的固定期待值，以及只顯示除息日時關閉最後購買日的篩選條件。後續 GitHub CI 將提供實際 PASS／FAIL 證據；不得自行標 PASS。

**即使 QA APK 產出，U01～U15 全局矩陣仍必須以實際結果逐項驗證；本次暫無 Release PASS。**


## 5. GO 2026-09-23：使用者新增八項不可縮減驗收清單

本次 GO 繼續處理 PR #20 的 V2.1.1 未完成 U01～U15，以下八項為使用者在本次對話確認的**追加要求**，不可覆蓋原清單、不可只改 UI 字串當 PASS。工作前保險備份：`backup-v2.1.1-20260923-pre-go8`，指向工作起始 SHA `9e0bdfa1670203761a3cfb6bd5c4b7220918c155`。原先 `backup-v2.1.1-20260922` 仍保留。正式下一版版本號須在所有 Gate 完成後按既定遞增規則核對；不得以重用 2.1.1 冒充又一次正式升版。

| ID | 使用者明確要求 | 必要驗收／證據 | 起始狀態 |
| --- | --- | --- | --- |
| G01 | 新聞全文 AI 摘要 | 取得授權可讀文章正文後產生 3～5 項真正摘要；來源、日期、全文不足提示；首頁與 ETF 相關新聞共用服務，不能單純複製標題；實際文章與來源驗證 | 未開始 |
| G02 | ETF 代號文字背景 | 背景只包覆代號文字而非整列；不同長度 ETF 代號、所有適用行情牆／Monitor／Mini／Widget 的畫面覆蓋與儲存驗證 | 未開始 |
| G03 | 損益動態背景 | 每一個支援背景的顏色屬性可獨立選擇「固定調色盤」或「隨系統損益色動態更新」；獲利／虧損／持平／未知資料區分；即時資料及持久化驗證；不可僅在色盤追加顏色 | 未開始 |
| G04 | TF 頂部模塊編輯 | 編輯的是各主要頁面頂部「TF」品牌模塊，不是普通標題列；標誌、主副文字、圖示、背景、排列、高度等 A-B 入口與跨頁獨立／共用套用，Settings 仍不開放 360 版面編輯 | 未開始 |
| G05 | 股息月曆全面優化 | 至少六種可切換樣式；整體寬高、日期格、文字與間距；已知除息／最後買進／登記／發放／入帳、公告／預估／待確認標記、同日多筆、點擊詳情；跨月、持久化、資料可信度與設定即時預覽 | 未開始 |
| G06 | 全域圖表與 K 線工具 | 資產配置真實分類／值／百分比、不明軸標籤排除；OHLC K 棒、日期價軸、成交量、技術指標、十字準線、時間週期、成本線、股息標記；全螢幕正常版面及浮動圖層、專屬 A-B 操作；真實數據和實機驗證 | 未開始 |
| G07 | Android 逐層返回 | 手機原生返回／返回手勢每次只關閉當前最上層畫面；圖表全螢幕／浮窗／詳情／Tab 瀏覽歷史及未儲存編輯；保留位置和表單內容；僅根層且無歷史可退出 | 未開始 |
| G08 | 各主頁左右滑動 | 依現有底部 Tab 真實順序切換，支援開關、靈敏度與動畫、頁面狀態保留；不與 K 線拖移、月曆、橫向卡片及 360 手勢衝突；手勢及原生返回共同驗證 | 未開始 |

**追蹤方式：** G01～G08 必須與 U01～U15 同時 Final Checklist Reconciliation，對應重疊項可共用實作但各自獨立驗收，不得合併刪項。逐項標註 changed files、測試、CODE／RUNTIME／UI／RESULT 證據。若一項失敗須原地修復，禁止直接進正式 Action。涉及手機手勢的真機驗收未完成時只能稱 QA 候選版本。

**目前真實狀態：** 本節是已落地的 GO 需求鎖定、既有程式碼尚未因此完成八項；正式 Action／正式 APK 仍受未完成 Gate 阻斷。


## 6. 2026-09-23 版本遞增與 U06 單卡預覽續接

- **版本規則重申：每次更新正式版必須遞增，不沿用上一版本。** 此次 PR #20 工作樹已從 V2.1.1 遞增至 **V2.1.2／Android versionCode 20102**；iOS buildNumber 亦同步。下一次更新不得再沿用 2.1.2。
- 更新前備份：`backup-v2.1.1-20260923-pre-v2.1.2`；起點 commit `1e826c1be3c7e825f51e6a1772814c2f4752cd1a`。既有備份不刪。
- **U06 開始實作，不是 PASS：** 新增 `FloatingHoldingCardPreview.tsx`，重用正式 `HoldingQuoteModule`，在首頁／庫存的行情牆 AB 設定顯示一張**完整**持股小卡，依目前編輯中的 `displayDraft.holdingWall` 即時重繪；不是六宮格、不是完整行情牆，也不是只有損益欄位。支援拖移、縮放比例、小窗收合及關閉；調整不直接寫正式設定。
- 更新 `PageFrameSettingsModal.tsx`、`HomeScreen.tsx`、`PortfolioScreen.tsx`，連接正式持股樣本而非捏造預覽數據；目前僅涵蓋首頁／庫存行情卡 U06 局部，其他框架需後續驗證。
- 工作分支上的最新 `package.json`、`app.json`、設定頁、備份元資料、CI QA APK 指令及版本契約均使用 2.1.2／20102。CI 與真機結果必須逐一確認，未通過不可宣稱 Build 或 Release PASS。
- **G01 新聞全文摘要等本次八項其餘要求與既有 U01～U15 不得縮減。** 特別是 G01 仍待修復，舊 QA APK 仍會複製新聞標題。


## 7. V2.1.2 此次續修的程式證據及未完成項目（2026-09-23）

**不以 Commit、版本號或 QA Build 取代功能驗收。最新已核對程式品質工作流程 #683 / 35797615086：quality 成功；正式 Release 未啟動，QA APK job 依 `qa-ready` 閘門跳過。**

| 原清單 | 此次已寫入程式 | 尚未取得證據／缺口 | 狀態 |
| --- | --- | --- | --- |
| U06 | 新 `FloatingHoldingCardPreview.tsx` 直接重用 `HoldingQuoteModule`；首頁、庫存頁設定以真實持股 + draft 顯示一張完整小卡；拖移、縮放、收合、關閉 | 裝置實際拖曳／尺寸／位置驗收，以及其他框架的浮動預覽 | CODE 已寫入；未經完整驗收 |
| G01 | `articleSummary.ts` 和 `AiNewsRuntime.tsx` 嘗試取得真實可讀新聞正文，從正文擷取重點；`NewsReaderModal.tsx`、AI 助理對不可取得正文的來源不再冒充 AI 摘要；新增純內容行為測試 | 媒體原文成功率、合法全文來源、真正 AI 摘要後端、真實新聞端到端驗證 | 部分實作，**不等於全文 AI 摘要已完成** |
| G02 | `HoldingQuoteModule.tsx` 將自訂文字背景移至巢狀 Text，以文字範圍著色而非整行；主要行情卡現有共享 Renderer | Monitor／Mini／Widget Native 覆蓋及實機確認 | 部分實作，未經完整驗收 |
| G03 | `uiModels.ts`、`editorModel.ts`、`HoldingMarketWallEditor.tsx` 新增獨立背景隨損益狀態切換並儲存；`HoldingQuoteModule.tsx` 依系統獲利／虧損／持平色即時取值 | 背景在所有表面／圖表／Widget／Monitor 動態連動與真機驗證 | 部分實作，未經完整驗收 |
| G07 | `App.tsx` 使用 `BackHandler`＋頁籤瀏覽歷史，ETF 詳情與主 Tab 每次返回一層；根層才交還 Android 退出 | AI 浮動窗優先返回、全部巢狀編輯路徑及真機返回手勢 | 部分實作，未經完整驗收 |
| G04／G05／G06／G08 | TF 頂部模塊深度編輯、月曆六樣式與尺寸、資產配置／OHLC K 線完整工具、主頁左右滑動 | 尚無此次完整實作或完整驗證證據 | 未完成 |

**版本身份：** V2.1.2、Android `20102`、iOS `20102`，package `com.tfasset.app`。下一次正式更新最低遞增至 V2.1.3／20103，不可沿用 V2.1.2 當另一個已更新版本。只在全部原始 U01～U15＋G01～G08 通過核對後執行正式 GitHub-only APK Action。


## 8. 2026-09-23 GO 續接：V2.1.3（U06 單張完整行情卡驗收準備）

- **開工保險備份已完成**：`backup-v2.1.2-20260923-pre-go` 指向本輪修改前 SHA `dd41b8d787c41491860b53c08825d51a9ad7618d`，維持所有舊備份；不變更不可變金融核心。
- **版本每次 +1**：此次工作樹由 V2.1.2／Android 20102 遞增為 **V2.1.3／Android 20103**；同步 `package.json`、`app.json`、設定顯示版本、備份識別、原生 QA 建置與測試契約。下次正式更新仍須遞增，不得重用 2.1.3。
- **U06 局部修護**：`FloatingHoldingCardPreview` 直接重用現有 `HoldingQuoteModule`，保持單張完整行情卡；依首頁／庫存實際列表模式在窄版和完整版間切換、沿用目前圖表樣式和目前 AB 草稿。拖曳時夾限螢幕範圍，預覽尺寸不改正式卡片，支援收合／關閉；新增 `holdingPreviewModel.ts` 作為可測試的版面與邊界純函式。
- **測試**：新增 `scripts/v2_1_3-preview.test.ts`，檢查尺寸邊界、雙欄／單欄顯示及共享原卡片 renderer 與草稿綁定；GitHub Actions [#693](https://github.com/locopy0121-hub/ETF-Asset-V1.0/actions/runs/35799476397) quality PASS，QA APK 當時依閘門跳過。
- **驗收界線**：此次 quality PASS 只是 CODE／邏輯與原始碼 Smoke 證據；尚未完成 Android 真機預覽視窗（拖曳、縮放、收合、背景顏色、損益欄位編輯、取消還原／套用保存與其他頁面範圍）驗收，U06 **仍非完整 PASS**，不可跳過先進 G01 或發布正式 Release。
- 開發期僅可建立明確標示的 **V2.1.3 QA APK**，供 U06 裝置驗收；PR #20 保持 Draft、原 U01～U15 + G01～G08 全數不刪。
