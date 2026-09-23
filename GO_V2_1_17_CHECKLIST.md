# GO V2.1.17｜ETF 標籤／庫存資訊修護｜2026-09-24

> 開發 QA，不是正式 Release。接續 PR #33 的 d2cbe3683f85fff1184968e86f3006440e7209be，保留 V2.1.16 P01–P05 與八大項原始完整未驗項。真機截圖是問題證據，並非修復通過證據。

## 前置保護
- 工作分支：`go-v2.1.17-20260924-label-data-layout`。
- 先備份：`backup-v2.1.16-20260924-pre-go-v2117`，已由 GitHub API 核實精確指向 `d2cbe3683f85fff1184968e86f3006440e7209be`。
- App V2.1.17／Android 20117／iOS 20117／`com.tfasset.app`。
- 鎖定：`src/utils/etfCalculators.ts`、`src/finance/canonicalLedger.ts`、歷史 actualFee／tax、Ledger 寫入與金融公式均不可修改；與起點做 changed-files 比對。

## 本輪五項鎖定 Checklist（不刪舊項）
| ID | Acceptance Criteria | 已寫入的程式證據 | 必須另驗 |
| --- | --- | --- | --- |
| P01 | 首頁／庫存代號左、分類／配息／提醒右；固定顯示不重複，已釘選代號完整可讀，窄卡提醒可換行 | `etfMetadata` 讀取官方明確的追蹤指數描述作「類型」補充；`EtfBadgeRow` 區分「類別待確認／配息待確認」並在狹窄版面換行；行情卡與表格 PIN 改獨立小星號。數值保持既有 Finance Core 不變 | 官方 live feed 返回欄位及全持股覆蓋率；Android 兩／三欄、字級 70～150％、當日有提醒 |
| P02 | 庫存代號固定欄不擠壓右側數值欄，數值可獨立水平滑動；套用固定欄寬和高度有效 | 延續 V2.1.16 `PortfolioHoldingTable`；修正 PIN 佔據代號寬度問題 | 不同 Android 螢幕寬度、直向字級、所有可見欄位完整 |
| P03 | 庫存清單設定第一層就能切換「清單欄位／行情卡片／ETF 標籤」，清單每欄可編輯並有單列預覽，取消不污染正式資料，套用重開後保留 | `PageFrameSettingsModal` 三分頁，重用 `PortfolioListEditor`、`EtfBadgeEditor`、`usePageEditor` 持久化 | 使用者實機編輯、調色盤不閃退、套用／取消及再次啟動的資料保持 |
| P04 | 類別、配息、提醒分別可開關與特效；無官方政策顯示「配息待確認」，沒有已記錄事件不得亮提醒 | `EtfBadgeEditor` 官方類別手動重查入口；`etfBadges` 獨立設定；V2.1.17 行為測試新增未知分類與未公告事件斷言 | 官方配息政策完整抓取仍未完成；全 ETF／最後買進日／除息日實機驗證 |
| P05 | 版本每次 +1；舊測試全部保持，新增行為測試、TypeScript、GitHub quality、GitHub-only QA APK 及 SHA／badging／下載來源 | package/app/Settings/Backup/CI 同步 V2.1.17；`scripts/v2_1_17-label-data.test.ts` | 實際 CI 執行、Artifact 內檔、解壓、大小、SHA256、包名、versionName／versionCode、裝置測試 |

## 來源保守政策
- TWSE `t187ap47_L` 官方基金基本資料提供基金類型和追蹤指數；不把基金名稱與指數推導誤稱配息政策。
- 無欄位、無新來源或只提供「每月評價」時，保持「配息待確認」。不能用價格波動、歷史股息次數或 ETF 名稱假裝公告。
- 當日提醒只用已記錄且日期一致的事件；完整官方通知管線仍是待辦，不會由這次 UI 修護自動完成。

## 接續未完成（不得清空）
- V2.1.16 原本 P01～P05 全部 Android 實機結果待驗。
- 八大項 G01～G08／U01～U15 仍依 UPDATE.md 原始矩陣記錄，先暫停本輪；尤其 AI 新聞全文取得率、Widget／Monitor 真機、官方分類及配息資料覆蓋率。
- 本次先作安全與回歸 Gate，成功後提供 V2.1.17 QA APK；正式 Release 仍受上述未驗項阻斷。
