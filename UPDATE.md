## V3.0.21｜2026-09-26｜工程師新增元件獨立外觀歷史（GO）

基底 V3.0.20 已驗證 QA APK：Actions #1109，commit `72ccb1856bf33af3503653c8af6585a86b81afdb`；開工前不可變備份 `backup-v3.0.20-20260926-pre-instance-history`。本輪分支 `go-v3.0.21-20260926-instance-history`，版本 3.0.21／Android 30021；PR／CI／QA APK 完整驗證進度以實際 GitHub Actions 為準。

接續 B「版本與診斷」→ C「當前 A 外觀歷史」，補上 V3.0.20 未接線的工程師新增元件：確認實例擁有權後，成功儲存前把目前實例視覺快照及獨立原生視覺覆寫以同一既有 AsyncStorage 交易保存，單一 A 最多十筆，沿用現有 SAF 完整備份。文字元件只保存字級、文字顏色及原生視覺效果；新增父框架另保存長寬，絕不保存文字內容、顯示開關、父子關係、定位、金融資料或事件。歷史可比對、二次確認還原至**目前 A 草稿**，關閉同類樣式連動，仍須底部正式套用；取消不改已儲存資料。刪除的元件或非工程師擁有的元件不得建立或恢復歷史。

中央目錄維持 184 項、已宣告接線 147 項、待接線 37 項；本輪擴充既有歷史技能的第三種 A 適配，不把相同工具灌水計成新技能。V3.0.20 舊 A 框架及原生元件歷史仍須完整回歸；金融核心鎖定三檔不得改動。下一輪仍依中央 37 項逐項接線，原八大項未驗收狀態保留。建置期間每 15 秒檢查 GitHub Actions 狀態，APK 產出後附完整更新／未完成清單與完成統計。

## V3.0.20｜2026-09-26｜維護工程師局部外觀歷史與安全還原

接續已由 GitHub Actions #1105 證實品質、Node/Redis/PostgreSQL 與 APK 成功的 V3.0.19；事前備份 `backup-v3.0.19-20260926-pre-visual-history`（來源 SHA `27f29391ec166b31e77d9e341c730c6b77b88064`）。本輪獨立分支 `go-v3.0.20-20260926-visual-history`，版本 3.0.20／Android 30020。

維護工程師保持使用者已確認 AB 定律：**A 真實框架或原生元件 → B 版本與診斷 → C 當前 A 外觀歷史**。每次成功套用當前 A 的視覺變更，將「修改前」的白名單外觀快照寫入現有 `@tf-asset/` 維護儲存鍵，單一 A 最多十筆，與既有 SAF 完整備份共同保存。可逐筆查看局部差異，二次確認後僅還原至當前 A 的暫存草稿；底部正式套用才保存。僅支援原生框架與原生元件的可寫外觀；工程師新增實例保留中央技能入口但標示待適配。明確排除交易數據、原生文字內容、可見性、座標及其他頁面。恢復時關閉同類同步，避免跨元件連動。

唯一中央仍保留 30 類／184 項。本輪將原本 `history` 待接線的**既有技能**接到可保存的 Runtime，宣告接線由 146 → **147**，待原生適配由 38 → **37**；這只是源碼及 CI 完整性稽核，非 147 項實機逐項 PASS。回歸測試檢查歷史上限、惡意資料排除、復原僅視覺白名單、舊版資料安全讀取及帳務核心鎖定；須另等待本輪 CI APK 完整證據，請勿以編譯通過冒稱實機 PASS。

## V3.0.19｜2026-09-26｜未完成技能：真實資料狀態條件外觀

由 V3.0.18 QA 完成版本建立來源備份 `backup-v3.0.18-20260926-pre-conditional-styles`，工作分支 `go-v3.0.19-20260926-conditional-styles`。3.0.19／Android 30019。接入 B「特效與動態」→ C「多視覺狀態」：依已掛載原生元件的真實 gain／loss／neutral 狀態，獨立設定三組文字、背景、邊框、背景透明度及開關；C 操作直接暫存目前 A 的外觀，不捏造行情，也不覆寫實際費稅、股數、數據來源或其他頁；背景透明度與元件整體透明度分離。僅宣告已真正接線的 metric／text／value／prefix／generic 元件，其他 Runtime 待適配。唯一中央 184 項保持，已接線 146／待接線 38；此為程式／自動化稽核，不代表 146 項手機實機 PASS。

Run #1102 的 quality 失敗為 V3.0.3 等八項歷史測試仍禁止新版本 3.0.19，非帳務或條件外觀原生錯誤；已更新版本相容性清單，後續 run #1103 quality、Node/Redis/PostgreSQL PASS。#1103 是 push run，APK job 預期跳過，需用 PR 的 QA run 獨立取得及核實 3.0.19 APK。禁止把源碼修復或後端成功誤報成 APK 或實機成功。下一版 3.0.20 開始前沿用此已驗證來源，並建立新備份。

## V3.0.18｜2026-09-26｜維護工程師續補：跨頁設計變數、收藏／最近工具

**接續基底**：使用者確認 V3.0.17 技能樹分類及實機 OK。本輪以 V3.0.17 PR #64 HEAD `447a339c538ae093011971acb0f4f2ddc1e8472f` 為基底，先建立不可變原始碼備份 `backup-v3.0.17-20260926-pre-design-assets`，再開發 `go-v3.0.18-20260926-design-assets`。App、備份、APK 版本遞增 3.0.18／Android 30018。**未獲使用者授權時不可移除既有 App 或改寫帳務核心。**

**本輪實際接線（2 項）**：

1. B「主題」→ C「設計變數系統」：新增 5 槽全 App 共用的具名樣式庫，從當前真實 A 擷取白名單內的文字字號／字重、顏色、獨立損益色、背景漸層、內距、圓角、邊框及陰影／光效；框架另保存光效週期（800～4000 ms）。中央庫顯式儲存及覆蓋／刪除（有二次確認）；套用僅更新當前 A 的暫存預覽（frame 或可適配的 native target／工程師新增元件），不暗中全 App 連動。原始金額、費稅、代號、文字內容、事件、座標及可見性一律不在 token 白名單。對原生不支援的欄位明確略過；正式工作台「儲存／套用」才寫入 App 外觀。
2. B「元件與父框架」→ C「技能搜尋與收藏」：C 工具右側星號收藏、常用項置頂、B 屬性篩選收藏、跨 B 屬性的直接 C 捷徑，以及最近十項使用歷史；獨立序列化寫入中央庫。五組設計變數亦可保存常用視覺組合。移動或切換工具不改寫當前草稿。

**備份與交易性**：設計資產獨立放在 `@tf-asset/maintenance-engineer-assets-v318`；既有 SAF 資料備份按 `@tf-asset/` 前綴全部收集，因此一併保存；還原沿用現有完整備份校驗。獨立資產寫入順序序列化以免連點覆蓋。單一 A 套用 token 會強制局部視覺覆寫，與先前同類共享設定分離；只有使用者主動操作既有同步功能才可跨框架或跨頁。全程保持 **A 真實對象 → B 屬性 → C 操作**，不增設六大分類／30 類中繼入口。

**稽核基準**：唯一中央 30 類 184 項（原有 169、進階 12、App 原生入口待接線 3）。V3.0.17 已接線 143／待接線 41；本輪新接線兩項後宣告已接線 **145／待接線 39**，但僅代表程式及對應自動化契約，不等於 145 項全數手機 PASS。效果堆疊、多狀態樣式、全局模板動態連動、完整 Widget／AI 原生入口等仍需後續版本。

**驗證**：新 `scripts/v3_0_18-design-assets.test.ts` 針對金融欄位注入、槽位取代、收藏持久化、原生適配、純局部預覽、AB 原位操作、備份涵蓋及正式版本號；持續執行歷版全部 regression + TypeScript／Expo／Node-Redis-PostgreSQL／QA APK ZIP-SHA-badging。CI／QA APK／實機各自獨立回報，未實際驗證不得聲稱 PASS。

## V3.0.17｜2026-09-26｜技能樹未完成功能：真實批次編輯、局部差異、畫面健康診斷

**接續基底**：V3.0.16 `4be4b976fc1206681e9776c8c775dd96bf72fae0`，其 CI quality、Node/Redis/PostgreSQL、QA APK 均有成功紀錄。工作前獨立備份：`backup-v3.0.16-20260926-pre-pending-skills`；開發分支 `go-v3.0.17-20260926-advanced-skills`，正式遞增 3.0.17／Android 30017。保留原版嚴格 **A＝真實框架／元件、B＝長度／寬度／顏色等屬性、C＝直接操作**；沒有新增導航層。

**本輪實際接線（3 項）**：

1. **多選批次視覺編輯**（B 批次編輯 → C）：只列出當前真實框架已掛載的原生元件與工程師新增實例；以當前 A 作樣式來源，勾選目標與明確的字號、顏色、透明度、邊框、陰影／光效、寬高。逐元件通過原生適配器，顯示套用前原值／新值與不支援的略過欄位。按「暫存」僅改動當前工作台 draft，正式「儲存／套用」才寫入既有維護儲存鍵；取消丟棄，其他頁不變。資料原值、交易費稅、文字內容、點擊行為與位置均不參與批次。為避免舊同類共享設定遮蔽局部新樣式，明確記錄每個批次目標的局部視覺覆寫。
2. **局部視覺差異比較**（B 版本與診斷 → C）：比較當前真實 A 的已儲存／繼承樣式及尚未套用的 draft。框架顯示尺寸、內距、邊框、背景、效果差異；原生元件只顯示可視樣式及寬高，不讀取或比對交易來源與財務數據。
3. **畫面健康診斷**（B 版本與診斷 → C）：由真實掛載元件與工作區測量值診斷超界、同類可能重疊、可點元件小於 44 dp；零筆量測時顯示待量測，疑似重疊不自動位移、不宣稱實機已驗證。

**技能稽核**：中央維持唯一 30 類／184 項（原有 169、進階 12、App 專用原生入口 3）。本版明確接線 3 項：宣告已接線從 140 → 143，待接線從 44 → 41；數字是源碼／自動化範圍，不代表 143 項均已實機 PASS。剩餘如效果堆疊、設計變數、原生磨砂、動畫、中央模板、Widget／AI 原生入口仍在待接線清單，不以假面板充數。

**Gate**：完整沿用歷版 finance／ledger／UI／AB／框架回歸；新增批次白名單及金流欄位污染防護、跨範圍目標拒絕、原生適配略過、明確局部預覽、未量測拒絕假 PASS。CI 包含 TypeScript、Expo、後端 Node/Redis/PostgreSQL、QA APK 原生建置及 APK／版本／SHA／ZIP／badging 檢查。APK 成功也不等同手機互動實測，請勿解除安裝舊版以免遺失本機資料。

## V3.0.16｜AB 屬性直達：A 框架 → B 長度／寬度／顏色 → C 直接控制（2026-09-26）

使用者最後明確範例：A 大項（真實框架）→ B 長度 → C 大小；A 框架 → B 寬度 → C 大小；A 框架 → B 顏色 → C 開啟損益色、開啟漸層及調色。先前將 30 類中央技能分類顯示為 B，甚至插入六大分類頁，均不符合 AB 定律，現將其保留為內部索引而非操作層。實際 A 選定後，B 提供以屬性為名的緊湊卡片；C 在同一屬性頁直接顯示可操作的尺寸輸入、±1、損益色和漸層開關，漸層設定有條件同頁展開；其他 B 的全部 C 工具依原有 Native Adapter 原位展開，不再多進入 D 分類頁。切換 A/B 收合舊控制，不丟失真實工作區中尚未套用的草稿。

唯一中央 169 原工具、12 進階追蹤、3 原生入口缺口合計 184 項全部經純屬性映射，不複製、未接線工具不假稱完成。資料及帳務核心鎖定、內建元件不可刪除、固定底部取消／套用與上方真實工作區即時預覽不變。來源備份 `backup-v3.0.15-20260926-pre-strict-ab`；開發版 3.0.16／Android 30016，QA 與實機驗收分別記錄。

## V3.0.16｜2026-09-26 嚴格 A→B→C→D 手機工作台

事前備份：`backup-v3.0.15-20260926-pre-strict-ab`，V3.0.15 PR #62 HEAD `2e7a02ad0d854e6224e04e014ab01bc572c81e5f`，版本 3.0.16／Android 30016。

修正 V3.0.15 在 B 之前額外插入六大分類頁的錯誤。A 是真實框架／元件（原位扳手已指定），B 直接顯示中央全部 30 類的三欄緊湊技能網格並可搜尋；C 只顯示選定 B 的工具；D 只顯示選定 C 工具的細節。同一時間僅呈現當前層，固定下方取消／套用及上方真實畫面即時草稿不變。舊六組分類僅保留靜態設計標記，永遠不渲染為額外層級。資料保護改 A 頂部圖示，屬性用簡短檢視，取消頂部同步開關及統計面板；同類同步歸回 B27→C→D 工具並支持內建元件。

保留中央 169 既有技能＋12 進階能力＋3 缺口＝184 項。無元件權限縮減；未接入原生介面的工具依然誠實標記待適配。帳務核心、資料來源及內建元件刪除保護維持。版本和 QA／APK／實機分別驗證。

## V3.0.15｜2026-09-26 維護工程師手機介面精簡（優先 UX 修護）

起點：V3.0.14 PR #61 HEAD `9fd14aa5afa57b003132a08473840f8df0a840cd`；備份 `backup-v3.0.14-20260926-pre-compact-workbench`。工作分支 `go-v3.0.15-20260926-compact-engineer-workbench`。版本 3.0.15／Android 30015，不改 main。

針對手機截圖「30 類重複展開、頂部屬性與狀態資訊過長」，把中央工作台改為漸進式導覽：預設只顯示 6 張分類卡 → 選中一組才顯示該組 5 類 → 點選 1 類才顯示其工具 → 點工具才顯示細項。搜尋跨 30 類直接跳到匹配技能；切換層級時重置捲動。唯讀保護摘要固定置頂，詳細鎖定內容、原生元件檢視及統計預設收合；同類同步縮為一列開關及按需顯示的明確範圍。實際頁面仍在上方原位預覽；固定底部取消／儲存按鈕。

本輪僅改工作台呈現，不刪掉 30 類／184 項追蹤內容，不新增假適配，不變更唯一中央技能庫、各畫面資料寫入或已定版帳務公式。新增 V3.0.15 精簡介面防回歸測試，保留 V3.0.14 技能完整性、舊版 QA Gate，Android APK／實機視覺驗收另行判定。

## V3.0.14｜2026-09-26 全技能根因修護（PR #61，QA 進行中）

事前備份：`backup-v3.0.14-20260926-pre-rootfix`。以現有 169 項原工具（140 項宣告 ready、29 項明確待適配）為不可遺失的遷移基準，建立 30 個完整 B 層分類與 6 個純導覽分組，另將 12 項原定進階工程能力及 3 個尚缺原生入口的專用領域納入可稽核清單。30 類命名採最新完整規劃工作分類，不冒稱已核實全部歷史正式名稱。

根本修復：全 App 唯一中央技能庫 → 唯一純適配解析器 → 各元件原生渲染；不依元件類型隱藏工具。畫面清楚區分「宣告接線」「當前實際有適配介面」「待接入」，不把 ready 當實機 PASS。修正 `behavior='locked'` 阻斷框架非數據編輯的舊錯誤；保留原始金融數據唯讀、工程師新增元件專屬安全刪除及全局同步的明確選擇。

CI：保持 V3.0.12 及其他歷版回歸，另測試 30 類工具零遺失、12 項進階追蹤、11 類元件 × 169 項的適配矩陣，並輸出 `reports/V3.0.14-full-skill-matrix.json` 隨 quality 和 APK Artifact 提供。以上只屬程式及 QA 設備驗證；實機逐項編輯、預覽、套用及重啟後驗證未完成者必須繼續列入 backlog，不可宣稱整套工程技能全部可用。原帳務核心原封未動。

## V3.0.9｜2026-09-25 鎖定資訊置頂／僅刪除工程師新增元件（QA 候選）

先建立 V3.0.8 HEAD `5d0f615b4c7dc8f27003056b0597d547cfb838af` 備份分支 `backup-v3.0.8-20260925-pre-v3.0.9`。此次只擴充既有單一中央技能樹，工作台頂端先列來源唯讀資訊，新增元件保留出處。刪除入口只顯示本工程師建立且屬於目前框架的實例，先確認再暫存刪除，取消恢復、套用才永久移除；原 App 框架／數據／控制項及其他頁面不可刪。舊 V3.0.1 工程師建立的 `i-` 實例可安全遷移，未知來源不開放刪除。版本遞增 3.0.9／30009，金融核心三檔未碰。完整 CODE／CI／APK／真機統計見 `docs/v3.0.9/GO_CHECKLIST.md`。所有元件視覺特效全面通用仍須逐項實際接線，不虛報完成。

## V3.0.8｜2026-09-25 框架背景精修：獨立圖片／三色漸層／遮罩（開發 QA）

本次先備份 V3.0.7 PR #53 HEAD efaf8513fa005a42614cd258b2b6a59cf293226d 至 `backup-v3.0.7-20260925-pre-v3.0.8`，由此建立工作分支 `go-v3.0.8-20260925-frame-background-image`。沿用原本全 App 唯一中央 16 大技能樹，本次在專業框架工程新增十項已接入工具：雙／三色漸層及中間色位置、十張獨立背景圖、Android SAF 系統檔案選圖、自訂圖片比例及透明度、遮罩顏色及強度。所有新顏色依 Color Picker 與系統獨立損益色；只修改目前框架草稿、取消即還原、套用才持久化。圖片只接受 Android content:// URI，不接受遠端網址；無原生 picker 時內建圖仍可使用。舊 V3.0.7 卡片不會自動開啟新背景。

版本遞增 3.0.8／30008。任意角度漸層、玻璃模糊、多層陰影、精確裁切及跨手機圖片自動移轉仍標記待原生接入。保留原八大項未完清單，鎖定帳務核心完全不碰；GitHub QA APK 和實機／外部帳務備份分開驗證。見 `docs/v3.0.8/GO_CHECKLIST.md`。

## V3.0.7｜2026-09-25 專業框架工程師（QA 候選）

事前備份 backup-v3.0.6-20260925-pre-v3.0.7，從 V3.0.6 PR #52 HEAD 25b4af8d7293997b400aca9bf1bd43e96e7e35b1 延伸；未變更 main。
本輪在全 App 唯一中央 16 大技能樹的「框架工程」接入雙色漸層、方向與第二色獨立損益色、框線／獨立四邊與四角、可調原生陰影、獨立內光圈及減少動態感知呼吸燈、四邊內距／外距／內容間距與最大寬度。新增色彩全部複用既有 ColorPalettePicker；新增數值可 ± 步進或手動輸入。真正外光暈、毛玻璃、多層陰影和跨頁模板等仍明示待接入。
App/Android/備份版本正式遞增 3.0.7／30007。效果僅寫入當前原生框架暫存，取消恢復，套用持久化，舊設定沿用原本外觀；核心三檔保持鎖定。以 docs/v3.0.7/GO_CHECKLIST.md 的 CODE／CI／APK／實機項目分別驗證，不以選單存在或 CI PASS 冒充實機驗收。手機資料備份由使用者確認，不得解除安裝舊版。原八大項暫停保留。

## V3.0.6｜2026-09-25 維護工程師技能樹：字型、KPI 標題／說明及 NT$ 對齊（QA 待驗證）

已先建立 GitHub 原始碼備份 `backup-v3.0.5-20260925-pre-v3.0.6`，從已產生 V3.0.5 QA APK 的 commit `f9df358e8c7afe248283570284a0e58ec9517d9b` 延伸，不碰正式 main 或不可變帳務核心。本輪在唯一共用的 16 大技能樹接入系統內建字型家族、KPI 卡片標題／說明各自的字重／斜體／字距／行高、NT$ 前綴 −24 至 24 dp 垂直微調，並讓新增的文字實例正確反映既有排版屬性。所有效果僅改目前指定元件與畫面、正常顯示時不增加編輯器包裹；金額來源及費稅仍是唯讀。App 與備份版本遞增 V3.0.6／30006，GitHub Action 以 QA APK 為目標，完整驗證與未完成清單見 `docs/v3.0.6/GO_CHECKLIST.md`。原生真機 PASS 之前不稱正式 Release；舊八大項仍保留。

## V3.0.5｜2026-09-25 駐點維護工程師文字技能與 NT$ 獨立前綴（開發 QA 候選）

沿用 V3.0.4 原始碼基底，備份 `backup-v3.0.4-20260925-pre-v305-skills`；本版在全 App 唯一中央工程師技能樹接入字重、斜體、底線／刪除線、字距、行高。首頁持股市值的 NT$ 與真實金額獨立呈現，前綴支援專屬扳手、文字與間距、Color Picker、局部儲存；金融數字完全唯讀。16 大技能分類保留，尚未有真實適配的項目仍明示「待接入」。升級 App 版本至 3.0.5／versionCode 30005；CI、APK Artifact 與實機結果以 `docs/v3.0.5/GO_CHECKLIST.md` 實證為準，未完成前不得稱正式 Release。

---

## V2.3.3｜2026-09-24 初始現金來源修護（開發 QA 候選）

精確基底：V2.3.2 PR #41 `da5dfaeff74061e1642e3d8690271ca0dec66865`；原始碼備份 `backup-v2.3.2-20260924-pre-cash-audit` 指向相同 SHA，不含手機私有帳務資料。

- 原因：原本系統預設 750,000 元期初現金，且沒有對應入帳紀錄；新帳戶不再自動建立該筆現金或示範交易。舊裝置已儲存的期初金額及交易完全保留，不自動歸零、不刪除。
- 帳務中心交易紀錄明示期初現金（非交易）、淨現金流及當前餘額；設定「帳務系統」新增現金來源核對，拆開買進、賣出、股息和其他調整。
- 若舊期初金額恰為 750,000 且尚未沖回，只提示使用者核對；需自行二次確認，先建立並比對 App 內備份，才會利用原有 `addOther` 寫入一筆 -750,000 的可追溯沖回紀錄。提醒優先執行既有外部檔案備份，不得將 App 內快照當作外部備份。
- `canonicalLedger.ts`、`etfCalculators.ts`、`CORE_LOCK.md` 和 `FinanceRuntime.tsx` 全部保持原狀。新的 `cashAudit.ts` 只讀呼叫既有現金流公式，不修改核心、持久化規則、實際費稅。
- 版本提升為 App 2.3.3／Android+iOS 20303；新增行為回歸 `test:cash-audit-v233`。八大項沿用 V2.3.2 既有未完成狀態，CI、APK Artifact 及真機均需另行驗證，禁止視為正式 Release。

---

## V2.3.2｜2026-09-24 GO 八大項續接（QA 候選）

更新前備份：`backup-v2.3.1-20260924-pre-v232-eight-items-ui`。追加第三設定大項的統一行情與既有 A/B 編輯入口；ETF 類型標籤去「型」、卡片行情來源時間與版本預設隱藏（異常警示保留）；首頁／庫存新增 A 跑馬燈方向、速度、間距、色盤設定，B 個別行距與特效沿用。使用原 Shared Snapshot，滾動不能冒充新報價，帳務核心零修改。版本遞增為 2.3.2／20302。歷史八大項、後端部署、外部 SAF 備份和 Android 實機待驗事項均不刪除，詳 `GO_V2_3_2_CHECKLIST.md`。CI／QA APK 狀態待驗，非正式 Release。

---

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


## 9. 2026-09-23 GO 六項追加：V2.1.4 工作階段（正式版本尚未升級）

- 已先建立不可變起點備份分支 `backup-v2.1.3-20260923-pre-go6`，SHA `d715437e03127c3e2beecffe4de3bf8ee8396c0a`，再建立 `go-v2.1.4-20260923`；仍以 PR #20 V2.1.3 作為接續基底，不覆寫舊版資料。
- 完整新規格與驗收條件見 [GO_V2_1_4_CHECKLIST.md](GO_V2_1_4_CHECKLIST.md) N01～N06：行情全局同步、桌面 Widget 點擊強制更新、全設定完整小卡預覽、ETF 分類及配息頻率官方資料自動判讀、新聞真正正文閱讀與 AI 摘要、主頁左右滑動與 Android 返回。**先前 U01～U15、G01～G08 全部保留**，重疊項可共享代碼、不可刪除驗收。
- N02 初步程式修護：`App.tsx` 原本只在 component mount 後一次消費 Widget 原生點擊要求，桌面點擊開啟已在前景的 App 可能沒有新一輪消費；改為 App 前景每秒輪詢及返回前景即時查詢，防重入，透過 `market.refresh({force:true})` 呼叫既有行情 Runtime。Android Receiver 原有 `ACTION_FORCE_REFRESH`、時間戳與 PendingIntent 仍保留。**尚未驗證實體 Android 點擊、更新失敗提示及持股完整同步，N02 不得 PASS**。
- [Draft PR #21](https://github.com/locopy0121-hub/ETF-Asset-V1.0/pull/21) 供開發期 CI，未合併、不是正式版。工作樹內目前 package/app version 仍為 2.1.3／20103；只有後續實作完成、同步更新設定及 QA Action 版本合約並重驗後才可稱 V2.1.4。未取得完整驗證前禁止正式 APK Action。


## 10. 2026-09-23 GO V2.1.5 — ETF 種類／配息型態欄位

- 起點 PR #21 V2.1.4 QA，開工前備份 `backup-v2.1.4-20260923-pre-tags`，新工作分支 `go-v2.1.5-20260923-etf-tags`；保留 U01–U15、G01–G08、N01–N06。
- 本次新增 T01–T06，詳見 `GO_V2_1_5_CHECKLIST.md`；ETF 類型與配息型態已加入共用行情卡 AB 工具、設定正規化、首頁和庫存；未知顯示「待確認」，不從 ETF 名稱猜測配息政策。
- TWSE 官方基金基本資料彙總表的可用欄位讀取已接入，但**尚未驗證官方實際欄位、資料完整性、發行商來源或全表分類**。Monitor／Mini／Widget 也尚未實裝兩個新欄位，因此 T03/T04 不是 PASS。
- 工作版號 2.1.5／Android 20105，QA CI 採 GitHub-only Gradle APK；CODE 提交和 QA APK 不代表正式 Release。


## 11. 2026-09-23 GO V2.1.6 — 持續開發 QA APK 交付紀錄

- 起點 V2.1.5 HEAD `23db8fa1e3a74963858d61504f947fcf4c95aef4`; 更新前獨立備份 `backup-v2.1.5-20260923-pre-go-v216` 已建立；本輪工作分支 `go-v2.1.6-20260923-continuous`，PR #23 為 draft、開發期不等 Codex 審查。
- CODE：主頁已加水平觸控位移切換、設定中的滑動啟閉及 50–150px 距離設定；Android Widget 新增可視的「↻ 更新」點擊目標、原生點擊立即顯示「更新中…」，Widget 編輯器預覽也加入強制行情刷新入口及顯示筆數提示；四欄原生字級依單欄寬度縮放。**尚待 Android 真機驗證；不標記完整 Feature PASS。**
- 版本同步 2.1.6 / 20106；package `com.tfasset.app`。金融不可變核心未修改。
- 首次 Actions #706 quality PASS 但原生 APK job 被錯誤 head_ref 條件跳過；已修復，正式本輪 QA Actions #709 / `35818971799` quality 與 Gradle QA job 均 success，APK build source commit `37c9bcb17745bb098ed497c5c8bc0d45bb5b5175`。
- [V2.1.6 QA APK 下載](https://github.com/locopy0121-hub/ETF-Asset-V1.0/actions/runs/35818971799/artifacts/10732706763)；artifact ID `10732706763`、ZIP 23,297,066 bytes、ZIP SHA256 `0789621c706a1fd4b6ce5dd045500b248c9987411bb6aaa2ccfcc062cf3c1492`；APK 53,788,345 bytes、APK SHA256 `3bfcdeea1240b95cebaab305a3253e621d2f2c7f0cc51f040da07e734d64fe9e`。Workflow `unzip -t` PASS，`aapt` 驗證 `com.tfasset.app / 20106 / 2.1.6` PASS；原生 APK 尚待使用者安裝驗收。
- 本輪 C01–C09 計 9 項：C01 與 C09 的備份／建置證據 PASS（2）；C02–C08 七項為功能尚未完整實機驗證、或歷史需求 NO PASS／結轉（7），不可將本輪 QA APK 稱為正式 Release。舊 U01–U15、G01–G08、N01–N06、T01–T06 原清單 35 條均保留，不以本輪計數覆蓋其獨立驗收狀態。
- 下一輪優先實機查：桌面 Widget 點擊是否刷新且時間戳正確、App 前景／背景同步、七或八筆持股與四欄內容、主頁滑動及巢狀圖表衝突；官方 ETF 類型欄位完整驗證、新聞正文、股息 AB 設定及全部其他 NO PASS 持續結轉。


## 12. 2026-09-23 GO V2.1.7 — Widget 桌面背景行情初步修復

- Before edits backed up V2.1.6 head 6e2764ce5acf31c277d407e42ef237f565eba2cc as backup-v2.1.6-20260923-pre-go-v217; work branch go-v2.1.7-20260923-widget-dividend-tags.
- Scope and unresolved status in GO_V2_1_7_CHECKLIST.md. Original U/G/N/T/C list retained without declaring ALL PASS.
- Widget native tap no longer starts MainActivity. It requests live TWSE quote data on a background worker and redraws Widget; network failure shows failure without replacing cached figures. Cached canonical financial aggregates cannot be refreshed outside its finance core yet; device verification and full synchronization remain NO PASS.
- Widget 1–4 column display fills incomplete rows with invisible placeholders to preserve widths; Android device layout validation pending.
- ETF labels, editable color/effects and last-buy-day / dividend flash remain explicit NO PASS if not implemented and validated. GitHub QA build is not formal release.

## 13. V2.1.7 QA build verification (2026-09-23)
- Actual GitHub-only Quality and Gradle APK jobs both SUCCESS: https://github.com/locopy0121-hub/ETF-Asset-V1.0/actions/runs/35820954643 from app-source commit `06da86c3ed608a01ab1c24a40240d154c489d91f`.
- Artifact `TF-Asset-V2.1.7-QA-APK` ID `10733321946`, ZIP size 23,296,018 bytes, ZIP SHA-256 `58e031807c5c82ee868f58fca820696db2a295ce67c198c21d89bfb7cd97bba5`.
- APK `TF-Asset-V2.1.7-QA.apk`: 53,788,345 bytes, SHA-256 `5480b1829aaee9d52d888dcd3e77fee176f8afefdeb834fac56a99d96c48d0c4`; `unzip -t` PASS; `aapt` package `com.tfasset.app` version `2.1.7` / `20107` PASS.
- **New D01–D08 completion counts:** D08 build evidence PASS (1/8); D01 and D02 CODE / BUILD success, device behavior still NO PASS; D03–D07 incomplete / NO PASS (7/8 items not fully Feature PASS). Original U/G/N/T/C entries retained independently. NO GO ALL PASS; PR remains Draft and no formal release.
- Critical limitation: Widget can refresh native quote price/percentage in place without opening App, but financial holdings totals remain last canonical App snapshot until App is synchronized. Do not present the cached financial totals as fresh. Native device testing, real last-buy-day calendar/official source, AI auto-badges, independently editable label effects/color and dividend blink alerts remain pending.

## 14. 五輪接力第 1 輪 V2.1.8 — Widget 多欄版面

- Pre-edit backup verified: `backup-v2.1.7-20260923-five-rounds` from V2.1.7 source `df78171dfd514511eb55c73697709e2d70a267bb`.
- New first-round grid helper ensures 1–4 columns with equal-width placeholders in the final row, up to 16 items matching four native rows. Widget preview uses explicit fixed rows instead of `justifyContent:space-between`, which distorted the incomplete last row. Native overflow title now displays visible/total holdings on small widgets.
- V2.1.8 / 20108 in package, app, Settings, Backup, identity gate and QA workflow. Tests: `scripts/v2_1_8-widget-grid.test.ts`. User's prior D01 Widget desktop refresh accepted for observed operation, not canonical financial synchronization. Source-only changes are not device validation; keep earlier unresolved checklist entries.

## 15. 2026-09-23 GO V2.1.9 — 第二輪：AI 與持股卡版面

- 本輪來源為已成功產出 APK 的 GitHub Actions run #35826645182（真正身份 V2.1.8 / 20108），從精確 HEAD `6d51c272c47b48cc10600b00151a263783a102fd` 接續，更新前先建立 `backup-v2.1.8-20260923-pre-go-v219`。
- 本輪版本 V2.1.9 / 20109，開發期 QA APK，**不是正式 Release**，不等待 Codex review 才產出 QA APK。
- 依使用者真機截圖調整 AI 快捷指令膠囊高度與文字置中，限制橫向建議列高度；解除對話框固定 310px，建立可獨立捲動且較高的回答區，輸入列不被長回答擠出；共用持股卡標題、標籤與價格區間增加間距。
- ETF 未確認類型／配息官方欄位、日期異常提示、全局 AI 結構化回答、Native Widget／Monitor 財務同步及舊 U/G/N/T/C/D/R1 尚未完整驗收項目均保留 NO PASS，下一輪繼續。
- 本輪增加 `scripts/v2_1_9-ai-layout.test.cjs` 原始碼版面契約測試，整合 V2.1.8 全部既有 Gate，GitHub CI 成功與裝置驗收分開紀錄。

## 16. 2026-09-23 GO V2.1.10 — 第三輪：AI 交易日期及持股清單

- 上一輪 V2.1.9 quality / QA APK 均 PASS：GitHub Actions #35838026505，APK artifact 10740002433；下一輪開工前備份 `backup-v2.1.9-20260923-pre-go-v2110` 指向完整已建置來源 `fd6b79bfead272b57b3914f1daae48becdf6df5f`。
- AI 持股清單改為單檔多行並隔開每一檔；最近紀錄日期超過裝置本地今天時標示「未來日期，請確認是否為預約交易」。只提示，**不擅自改寫真實 Ledger**。
- 新版 V2.1.10 / 20110，GitHub-only QA APK，完整舊 Gate + 新純來源 Smoke。真實日期資料來源、時區、使用者的交易紀錄仍待實機驗收，金融核心未更動。
- ETF 類型及配息頻率官方來源、Widget/Monitor 財務同步、新聞真實正文等歷史 NO PASS 原項持續結轉。

## 17. GO V2.1.11 第四輪 — AI 新聞跨持股涵蓋

- 更新前備份 backup-v2.1.10-20260923-pre-go-v2111；起點 8eec3eaa49c218361527d037409c99076579e4f2。
- 新增 src/ai/newsCoverage.ts 純函式，依持股輪流選入最多 8 篇全文擷取，保留原有全域新聞日期排序，不再由單一熱門 ETF 佔滿擷取配額。
- scripts/v2_1_11-news-coverage.test.ts：測試 3 檔持股混合文章分配、空資料及零預算。
- 版本 2.1.11 / Android 20111 / iOS buildNumber 20111；舊功能不刪、不動不可變金融核心。
- ETF 分類、新聞實際正文取得／授權限制、Widget 及歷史 U/G/N/T/C/D/R1-R3 持續 NO PASS，待 CI、QA APK、真機證據。詳 GO_V2_1_11_CHECKLIST.md。

## 18. GO V2.1.12 第五輪 — 持股相關新聞清單公平涵蓋

- 更新前備份 backup-v2.1.11-20260923-pre-go-v2112；來源 V2.1.11 QA APK #35843057904 / SHA a02623be1e33e94331d5b40f3f350131efd4843a。
- 修正 AiNewsRuntime：40 篇列表亦使用依 ETF 輪流選取，避免某一檔大量新聞擠掉其他持股；選取後依新聞發布日期重新排序，來源不可閱讀則仍明示。
- 新增 scripts/v2_1_12-news-feed.test.ts，測試熱門 ETF 有 45 篇、另外兩檔各 5 篇時的分配與空資料。
- 版本 V2.1.12 / Android 20112 / iOS buildNumber 20112，更新 Quality 與 QA APK workflow。不可變金融核心未修改。
- 真機與新聞實際來源驗證未完成，不代表正式 Release。完整未完成項見 GO_V2_1_12_CHECKLIST.md 及歷史清單。


## 2026-09-23 GO 八大項｜V2.1.13 QA 進度（持續更新）
- Source: PR #29 V2.1.12 QA head `700fc3de3d4548721eb7f5028e466eb6fbca3031`，不是從落後的 main 修改。
- 修改前備份 `backup-v2.1.12-20260923-pre-go8` 已由 GitHub branch API 查得相同 commit；工作分支 `go-v2.1.13-20260923-eight-items`。
- 第 01 項：既有帳務核心已由使用者確認正確，本輪完全禁止更動。原本正確的 Monitor/Mini/股息/外觀均保留。
- 第 02 項：已核對來源 branch、APK 候選版版本 2.1.12／20112，並建立更新前備份；本輪新版本已同步遞增至 **2.1.13／Android 20113／iOS 20113**，尚待實際 QA APK 和實機證據。
- 第 03 項（CODE 已提交，非完整 PASS）：`src/market/etfMetadata.ts` 建立官方分類與收益分配頻率字串正規化；`MarketRuntime.tsx` 把 official metadata 按 symbol 與行情獨立合併、保留前次已驗證 metadata、按上次目錄更新嘗試時間及回到前景刷新。新增 `scripts/v2_1_13-etf-metadata.test.ts` 行為測試並納入 `test:v2_1_13`。
- 不從 ETF 名稱、尚無配息紀錄或「每月評價」猜測配息政策；若來源不明則保持待確認。沒有授權來源結果之前，不能宣稱十檔官方 ETF 的實網分類已 PASS。
- 仍待：CI 品質測試／APK Action、Artifact 實體與 badging／SHA、官方實網十檔來源與 Android 顯示驗證；其他第 04～08 項均未啟動，不宣稱完成。
- 本輪完整範圍與可在串流中斷後續接的狀態：`GO_V2_1_13_CHECKLIST.md`。既有 U/G/N/T/C/D/R 問題不因 QA 版本升級而消失。

## 2026-09-23 GO 接續｜V2.1.14 Widget 同步來源與可見狀態（第 04 項）

- **使用者實測修正：** 安裝版本是 V2.1.13（原誤打 V2.1.14）。V2.1.13 安裝後「沒什麼變動」不代表 ETF 分類與配息已通過；第 03 項官方來源及實機驗收仍未 PASS。
- **版本與備份：** 精確從 V2.1.13 PR #30 最新 SHA `414c85e4bd137f1400a9027672a512e128c6a5dc` 延續，備份 `backup-v2.1.13-20260923-pre-widget` 已核對同 SHA。新分支 `go-v2.1.14-20260923-widget-sync`，App/package/Android/iOS/Settings/Backup/QA CI 全部升至 **2.1.14／20114**。
- **第 04 項原始碼確認：** Native Widget 在桌面上可獨立更新行情，但舊市值和損益取自上次 App Canonical snapshot，原 UI 未說明不同步。
- **第 04 項 CODE：** Native Receiver 以行情與財務分離的刷新狀態明確告知使用者；點擊留下 timestamp，App 回到前景重新取得行情時使用現有 Canonical finance snapshot 同步；Native Bridge 僅在 App 有較新的已驗報價時間時才移除較新 native quote overrides；無新行情或 API 失敗不冒充財務更新。
- **明確保護：** 既有金融公式、帳務寫入、Monitor/Mini 版面及舊 Widget 多欄排列不動。Native 不重新計算市值、費稅、損益。
- **品質分級：** 此記錄僅記已提交程式；對應新 Native/JS 接線 Smoke 已加入 `test:v2_1_14`，仍待實際 CI、Gradle APK、Artifact/SHA/badging及 Android Widget 真機驗收。原始歷史清單完整保留，不能宣稱 GO ALL PASS。
- **本次續接檔案：** `GO_V2_1_14_CHECKLIST.md`。

## 2026-09-23 GO 第 05 項第一輪｜V2.1.15 AI 新聞來源與全文透明化
- 基準 V2.1.14 PR #31 `f968b958b6987056bed926851b4a66ed68ae0810`；更新前備份 `backup-v2.1.14-20260923-pre-ai` 已核對一致。版本 2.1.15／Android 20115／iOS 20115，仍是開發用 QA。
- 新增 `newsArticleResolver.ts`：僅遵循可核實的原始出版社 HTTPS URL；當 Google News RSS 連結未轉向出版社、HTML 亦無可核實來源時，保留 unavailable，不從標題猜測。
- `articleSummary.ts` 增加 JSON-LD `NewsArticle.articleBody` 實質正文候選，仍需要足夠文字；`AiNewsRuntime.tsx` 區分 Google 聚合頁和出版社正文，不能把 RSS 當全文。
- AI 對話及浮動視窗可以點擊開啟新聞來源；標示已取得正文時只是 **原文重點節錄，並非生成式 AI 摘要**。本輪未假造或聲稱串接 LLM／API 金鑰，其他十二項能力仍待獨立建置與驗收。
- 新增行為測試 `scripts/v2_1_15-ai-news.test.ts` 並沿用 V2.1.14 全部測試。具體 CODE／CI／QA APK／真實來源、實機狀態請以 `GO_V2_1_15_CHECKLIST.md` 後續證據為準。
- 第 03 項官方分類與配息來源、第四項 Widget 手機同步測試未完成，保持待驗而非硬改 PASS；金融核心只讀不變。


## 2026-09-24｜V2.1.16 ETF 標籤與庫存清單優先修護
- 中斷後沿用 `go-v2.1.16-20260923-priority-labels-list`，未重開舊版；本次續接前另備份 `backup-v2.1.16-20260924-pre-qa`，保留 V2.1.15 原備份及 V2.1.16 WIP 備份。
- App 版本 2.1.16／Android 20116／iOS 20116；候選 CODE 包含 ETF 代號左／三項標籤右、獨立提醒顯示開關及日期事件、庫存欄位 A/B 編輯、數值獨立橫向捲動及預覽。
- 新增 `GO_V2_1_16_CHECKLIST.md` 明列 P01–P05 和歷史待驗；`test:v2_1_16` 已接線。此條記錄建立時 CI、QA APK、SHA、badging 和真機仍**待核實**，不得提前宣稱完成。
- 不動 Canonical Finance Core／Ledger 寫入／費稅公式；官方 ETF metadata 十檔完整性及真實日期仍待驗。八大項暫停至本輪 QA APK 修護後接續。


## 2026-09-24 GO V2.1.17 優先修護續接（QA，非正式 Release）

本輪來源是 PR #33 V2.1.16 成功 CI／QA APK 的 head `d2cbe3683f85fff1184968e86f3006440e7209be`；已先建立及核實備份 `backup-v2.1.16-20260924-pre-go-v2117`。工作分支 `go-v2.1.17-20260924-label-data-layout`。新增本輪鎖定矩陣 `GO_V2_1_17_CHECKLIST.md`，V2.1.16 與原八大項驗收清單保留。

CODE：基金官方明確追蹤指數文字可補充 ETF 類別（不推導配息頻率）；缺失欄位分別顯示「類別待確認／配息待確認」；已釘選星號與代號分開避免被擠壓；窄卡標籤可換行；庫存 A/B 頁直接切換清單／行情卡／標籤及提醒設定；提供官方類別手動刷新入口。新增 `scripts/v2_1_17-label-data.test.ts` 行為測試，版本／native QA pipeline 全數遞增至 2.1.17／20117。

CI、APK、Artifact、SHA、badging 與 Android 實測結果必須待各項實際查證後才能填 PASS；舊功能未驗項仍是未完成。官方配息資料來源未提供完整政策時保留待確認，不虛構月配／季配／半年配。鎖定 Canonical Finance Core、Ledger 寫入、actualFee／tax 不變。


## 2026-09-24 GO V2.1.18 八大項續接（第 07 項／返回與左右滑動）

01:51 的最新 Android 截圖顯示 V2.1.17 的配息資訊仍為「配息待確認」。依使用者新指令，本輪不再卡在標籤，繼續八大項；第 03／06 項官方配息資料及實機驗收仍未完成，不能把靜態選項當真實頻率。

- 基底 PR #34 head `b70e78238d28623bd9ce6e4a6e2f5ad7f2e40df8`，先建立並查驗 `backup-v2.1.17-20260924-pre-go-v2118`，獨立分支 `go-v2.1.18-20260924-navigation-layer`；版本 V2.1.18／Android/iOS 20118。
- 第 07 項局部 CODE：以純函式返回路由讓浮動 AI 展開時先收起，其次詳情，然後主頁歷史，最後才退出；新增可選左右邊緣滑動並沿用既有全畫面手勢。詳見 `GO_V2_1_18_CHECKLIST.md`。
- K 線、所有巢狀 Modal、頁面捲動位置及真實 Android 手勢仍待驗；G01–G08、U01–U15、原八大項全部結轉，Finance Core、Ledger 與 actualFee/tax 均不修改。
- CI、QA APK、Artifact、SHA256 與 badging 必須按實際 Action 結果另行登記；不得把 CODE 當正式 Release。


## 2026-09-24 GO V2.1.19｜原八大項第 03 項：發行人配息政策補源

最新 Android 07:07 截圖中的 0050／00406A／009816／00713／00919／00878 顯示類別，但全部仍是「配息待確認」。根因是此前 t187ap47_L 分類 API 多數沒有收益分配週期欄位；僅擴大官方指數類別解析並不能填入配息。

- 先以 PR #35 V2.1.18 HEAD `257a5f31ea2bad567eabd17aa72b50a3ec7c88e3` 建立並核實完整原始碼備份 `backup-v2.1.18-20260924-pre-go-v2119`；開設 `go-v2.1.19-20260924-official-dividend`，遞增 App 2.1.19／Android+iOS 20119。
- 只在展示用市場 metadata 層增加 2026/09/24 核實的 11 檔發行人政策及官方來源 URL。初始化、斷網及舊快取都會自動套用；缺乏官方證據的 ETF 保留待確認；官方若提供更新且明確的收益分配欄位，可取代既有政策快照。
- 首頁及庫存原本共享 MarketRuntime catalog，因此共用政策；設定頁 ETF 標籤編輯器另增 11 筆官方來源可點連結。僅展示分類／週期，不產生帳務交易、股息事件或提醒。
- 核心計算、Ledger 固化費稅、Widget／Monitor 不改。新增行為測試，保留既有所有回歸。本輪 CI／QA APK／Artifact／SHA/badging 的真實結果後續補記；Android 實機與全市場來源覆蓋仍待驗。

詳細 D01–D06、資料範圍與歷史結轉見 `GO_V2_1_19_CHECKLIST.md`。


## 2026-09-24 GO V2.1.20｜八大項第 04 項：Widget 真實資料刷新與來源秒數

- 起點 PR #36 V2.1.19 QA `88783e091451d2071b8785dc637c9892ba65e4aa`，使用者已在 Android 截圖確認四檔 ETF 的配息方式顯示；先建立 `backup-v2.1.19-20260924-pre-widget-v2120` 並核實來源，工作分支 `go-v2.1.20-20260924-widget-source-freshness`。
- 使用者新增硬性要求：**秒數跳動必須代表真實行情資料更新，而不是時鐘動畫**。本輪 MarketRuntime 只使用證交所 MIS `d`/`t` 來源時間判斷新 tick，資料沒變不重設最後更新時間；SharedSnapshot 每一檔持股採自己的已核實來源時間，財務金額仍由 Canonical Core 提供。
- Android Widget 桌面點擊／設定手動刷新啟動真實背景網路；只有比該檔上次 native／App 有效來源時間新的報價才更新價格。來源重複顯示「無新報價」、失敗保留先前資料，行情新於 App 財務時顯示「財務待同步」，不使用 HTTP 收取時間冒充交易所回報時間。Widget 將刷新按鈕與獨立狀態列分開。
- Android 限制：`updatePeriodMillis` 仍是 30 分鐘；App 前景每 N 秒**嘗試查詢**，不保證每 N 秒必有新成交，更不聲稱背景可強制每 5 秒。完整 W01–W06／歷史八大項保護見 `GO_V2_1_20_CHECKLIST.md`。
- Finance Core／Ledger 公式、actualFee/tax、已經實機 PASS 的 ETF 配息分類均不動。CI、APK、SHA、版本 badging 與 Android 實機需獨立取證，不能以本行宣告完成。

## 2026-09-25 GO V3.0.3｜原地工程師真機截圖回饋修復

- 上一輪 V3.0.2 QA 來源提交 `27b81b0675c47a79ef17e51b3e0c3cb880999262`：品質、Redis/PostgreSQL、原生 QA APK 全數成功，真機截圖發現數值兩行、維護扳手遮字、工具樹塞滿「不適用」、AI 複合框架欠缺內部工作區。
- 修改前建立並核實 `backup-v3.0.2-20260925-pre-v3.0.3`，工作分支 `go-v3.0.3-20260925-workspace-polish`，版本正式遞增 3.0.3／Android 30003。
- 修正：將數值元件列為來源唯讀並僅開放顯示工具；資產總額保持單行並適寬縮放；迷你扳手移出主要文字區；根據 A 層自動過濾適用 B/C 技能並提供全部技能切換；AI 財務管家補齊標題、快捷問題、對話與輸入器原生元件適配。
- 財務核心、來源交易數值及 V2.3.6 十字線不改；八大項仍暫停，原順序保留。CI、APK 與實機驗收須分開核證。


## 2026-09-25 GO V3.0.4｜全方位維護工程師／真實 XY 工作區

- 使用者以 15:23 的實機截圖正式驗收 V3.0.3 排版修護；備份 `backup-v3.0.3-20260925-pre-v3.0.4` 已核實 SHA `e0992c721e6a8fb642e833a85e3c19ffd95c49e5`。本版本從該分支延伸；不回退至 V3.0.2 或 main。
- 真實 XY 工作區、中心線與網格、工作區尺寸與窄屏水平捲動，原元件實測座標、±1 dp 精密微調、手動 X/Y、尺寸與錨點；Mobile 吸附預設關閉，只有拖曳放手採用，手動和微調不使用吸附。
- 舊版原生元件與新安裝文字元件使用相同檢視架構；16 大 B 技能全部保留，重用既有行情／標籤／清單頁面設定；未接入的技能仍明確顯示待接入。
- 所有本版可用顏色編輯項目復用現有 ColorPalettePicker 和各自獨立損益色開關，不提供手動色碼輸入；帳務數值唯讀。
- 正式遞增 3.0.4／Android 30004／iOS 30004；GitHub QA APK、原生功能、財務核心與 V2.3.6 十字線要獨立驗證，APK 成功不等於實機正式驗收。舊八大項仍暫停保留。
