# GO V2.1.16｜ETF 標籤與庫存清單優先修護｜2026-09-24

> 本文件是串流中斷後的續接錨點。八大項先暫停一回合；本輪 CODE／CI／APK／真機各自記錄，不能互相替代。

## 已核實的版本、備份與不可更動基準
- 工作分支：`go-v2.1.16-20260923-priority-labels-list`。
- 本輪修護前備份：`backup-v2.1.15-20260923-pre-priority-hotfix`；中斷續接備份：`backup-v2.1.16-wip-20260923-before-resume`。
- 本次 QA 前再次備份：`backup-v2.1.16-20260924-pre-qa`。
- 候選版本：App **2.1.16**；Android **20116**、iOS **20116**，不是正式 Release。
- Canonical Finance Core、歷史 actualFee／tax、Ledger 寫入與計算公式均鎖定，禁止修改。

## 本輪鎖定 Checklist
| ID | 驗收內容 | 目前有的程式證據 | 尚待證據 |
|---|---|---|---|
| P01 | ETF 代號靠左，［ETF 類別］［配息頻率］［當日提醒］靠右，跨首頁與庫存共用 | `EtfBadgeRow`、`HoldingQuoteModule`、`PortfolioHoldingTable`；狹窄視窗裁切/縮放標籤 | Android 不同字級、窄卡片/多欄版面實機 |
| P02 | 價格、損益及庫存數值不被標籤擠壓 | 庫存代號固定欄＋數值獨立水平捲動；數值欄可自訂寬度；行情卡標題獨立排版 | 實機各裝置及完整字級縮放 |
| P03 | 庫存清單完整 A/B 編輯（顯示、排序、字級、欄寬、對齊、背景、調色盤、特效及即時預覽） | `PortfolioListEditor` 經 `PageFrameSettingsModal` 接入庫存持股檢視；清單入口可點擊 | 設定套用／取消／重開保存之 Android 實測 |
| P04 | 分類、配息及提醒各自獨立開關／樣式／特效；提醒只在確實記錄的對應日期顯示，含最後買進日、除息與配發 | `EtfBadgeEditor`、`etfBadges` 和 `todayEtfReminderMap`；自訂文字僅影響畫面 | 官網資料覆蓋率、真實事件日期及閃爍特效實機 |
| P05 | 版本識別、歷史回歸、CI、QA APK 的 Artifact／SHA／badging 完整核實 | `scripts/v2_1_16-priority.test.ts`、`test:v2_1_16`、`.github/workflows/ci.yml` | PR CI quality、qa-apk、實體 Artifact 檢查 |

## 舊問題完整保留
- ETF 官方類別與配息頻率未經十檔真實官網／交易所資料全量驗證：不可宣告全表分類 PASS；未知顯示待確認。
- 事件提醒只顯示「已記錄日期」：不得由除息日推算未公告的最後買進日，也不得把預覽示例當成實際事件。
- Widget、Monitor／Mini、其他頁面編輯與完整金融快照同步依原八大項及歷史 U/G/N/T/C/D/R 清單結轉；此輪不得消失。
- CI／APK PASS 只是 QA build，不能替代使用者實機驗收，亦非正式 Release。

## 中斷後續接順序
1. 先跑 V2.1.16 所有測試與 GitHub CI；失敗在原分支就地修復。
2. 在 PR 的 QA APK job 確認 artifact、APK package/version/versionCode 和 SHA-256；僅把真正取得的證據記為 PASS。
3. 本輪修護具備可安裝 QA APK 後，按原次序接續八大項；不加新審查門檻，不調整金融核心。
4. 每更新下一個版本都須遞增版本號、先備份、逐項回報；未完成原項繼續保留。
