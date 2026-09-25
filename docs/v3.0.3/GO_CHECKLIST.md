# TF Asset V3.0.3｜原地工作區截圖回饋

備份：`backup-v3.0.2-20260925-pre-v3.0.3` → `27b81b0675c47a79ef17e51b3e0c3cb880999262`（已驗證）。

| ID | 本輪原始照片觀察與修正 | 驗收 |
|---|---|---|
| 303-1 | 損益明細進入內部元件後，框架標題工具列不適用仍佔滿 UI | A 層適用工具優先，完整技能可單獨展開 |
| 303-2 | 總資產 NT$ 大字在 48% 區塊分行、扳手蓋住數字 | 原內容不分行，適寬縮放；扳手縮小移開，選取標籤不覆蓋內容 |
| 303-3 | 把真實金融數字誤當文字可修改 | 分辨 value 與 text；數字與來源只讀，僅局部視覺可編 |
| 303-4 | AI 財務管家只選得到外層 | 既有 AiQuestionBox 標題、快捷按鈕、對話區、輸入器原生 A 層適配 |
| 303-5 | 編輯內容應是原地暫存、取消恢復、套用保存 | 沿用 V3.0.2 runtime 同一份草稿及全 App 元件庫，完整現有測試回歸 |
| 303-6 | 正式遞增版本、APK | V3.0.3／30003；品質、Redis/PostgreSQL、APK ZIP/SHA/badging；真機另驗 |

八大項暫停保留；`src/finance/canonicalLedger.ts`、`src/utils/etfCalculators.ts` 及 `CORE_LOCK.md` 不允許修改。AI 問答及財務來源仍沿用既有正式邏輯。

## V3.0.3 原版本內排版修復（先修，未進入 V3.0.4）

修復前備份：`backup-v3.0.3-20260925-pre-layout-repair` → `129610bcf1b7ec01daed52fb25d8031665d15c62`，已核實。以 V3.0.2 同版本系統的既有頁面排版為基準，**不回退 V3.0.3 的 AI 內層適配、16 技能樹及金融值只讀保護**。

修復對象：V3.0.3 截圖證實首頁、庫存持股分析及紀錄月度摘要原生數值卡片在 ON/OFF 模式下會擠壓／錯位；小扳手錨點偏移、選取邊框佔用 Layout 空間；首頁主金額原 48% 固定寬度導致長金額顯示受限。

修復方式：共用 InspectableTarget 的 MetricTile placement 同時作用於 ON/OFF，使用雙欄 46% 基準、最小卡寬 136 dp，空間不夠時由既有 flexWrap 換行；虛線框改 absolute overlay 不佔 Layout；扳手固定於當前元件角落；金額優先完整單行適寬，首頁主金額容器取消 48% 固定寬。

驗證要求：TypeScript、3.0.1～3.0.3 全部歷史 Gates、額外 Layout Regression、GitHub QA APK ZIP/SHA/badging 均須重驗。**無實機截圖不能將本修復判定為 UI/RESULT PASS，V3.0.4 功能開發不得與本修護混在同次提交。**

附加安全修復：外層 FrameCard 的虛線選取框也改為 absoluteFill 裝飾，不再以 borderWidth 變更容器自身寬度，避免選取外框觸發臨界寬度換行。
