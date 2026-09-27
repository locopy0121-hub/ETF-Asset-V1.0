# TF Asset V2.1.13｜八大項連續 GO 執行清單
日期：2026-09-23。此文件為本輪執行狀態，不代表實機或正式 Release PASS。

## 身分及保護
- 專案：locopy0121-hub/ETF-Asset-V1.0；來源：PR #29（V2.1.12 QA）head `700fc3de3d4548721eb7f5028e466eb6fbca3031`。
- 更新前程式備份：`backup-v2.1.12-20260923-pre-go8`，已由 GitHub API 核對為相同 SHA。
- 工作分支：`go-v2.1.13-20260923-eight-items`。正式版不得與 QA 混淆。
- 帳務核心（`src/utils/etfCalculators.ts`、`src/finance/canonicalLedger.ts`、`CORE_LOCK.md` 及現有正確帳務資料寫入）嚴禁變更；只讀既有結果。
- 保留 V2.1.1～V2.1.12 的全部歷史 U/G/N/T/C/D/R Checklist；任何未有真機證據的項目不得僅憑此清單改為 PASS。
- 本輪更新依使用者最新規劃：逐項修復→重驗→完整性確認→報告→下一項。可偵測逾時才可原地重試；聊天串流斷線不能自行喚醒，必須依本檔續接。

| 項 | 本輪範圍 | 狀態／完成依據 |
| --- | --- | --- |
| 01 | 已確認正確帳務核心，禁止更動 | 鎖定（不列修復） |
| 02 | 基準、版本、修改前備份 | 備份已核對；V2.1.13 QA 的 CI／APK／Artifact 已驗證，尚待使用者實機 |
| 03 | ETF 官方分類、配息頻率、自動正規化、跨頁資料 | CODE／CI 通過；官方配息政策來源缺口及 Android 真機仍待驗 |
| 04 | Widget 財務同步、點擊更新與排列 | 尚未處理 |
| 05 | AI System 十二項能力、合法新聞正文與真正 AI 摘要 | 尚未處理 |
| 06 | A/B 類別／配息欄位與完整單卡預覽、保存 | 尚未處理 |
| 07 | Android 返回、左右滑動、OHLC／K 線 | 尚未處理 |
| 08 | Monitor／Mini 現有功能 OK，僅強化行情更新反應度 | 尚未處理 |

## 第 03 項驗收
1. 使用官方 ETF 基礎資料時，識別官方實際分類／收益分配文字；不從 ETF 名稱或無配息紀錄猜測頻率。
2. 無行情 row 的 ETF metadata 也能存入 catalog；一旦行情出現正確合併。
3. 資料快取按取得時間刷新，來源失敗保留最後一筆有效資料；不使已確認類別退回待確認。
4. 首頁／庫存共用 catalog；原有持股價格、損益 renderer 完全不變。
5. 行為測試、TypeScript、CI 與十檔真實官方來源及 Android 實機各自留存證據；未有後兩者，不標完整 PASS。

## 進度與事故恢復
中斷後查本分支最新 commit、此檔狀態、當前 Action log、QA artifact，再從最後真正 PASS 的項目續接。不得將未完成或僅 CODE 完成寫成全項通過。

## 中斷恢復記錄：V2.1.13 QA APK 已驗證
- PR：#30，仍為 Draft；來源 commit `62037040b61340141291701dfdd8c6bcde8a346a`。
- GitHub Actions：`35856649364` 的 `quality` 與 `V2.1.13 QA APK / native integration` 均 SUCCESS。
- Artifact ID：`10747524924`；下載頁：https://github.com/locopy0121-hub/ETF-Asset-V1.0/actions/runs/35856649364/artifacts/10747524924
- ZIP 大小：23,300,507 bytes；已解壓並核對 APK SHA-256：`470f13ab4760335ce0ad98d2277f17c8c49dbff3b7867124c65bf86befd0fb87`。APK 解壓完整性 PASS，APK 大小：53,795,285 bytes。badging：`com.tfasset.app`、`2.1.13`、`20113`。
- 本輪已完成的是程式／自動測試／QA APK；尚未取得官方十檔實網與 Android 真機顯示結果；不得把第 03 項寫成 Feature PASS。
- 已確認資料來源邊界：TWSE `t187ap47_L` 官方基本資料公開欄位列有「基金類型」，未列「收益分配頻率」。目前即使分類正規化成功，也不能依此單一來源保證配息頻率。下一步需逐檔取得可靠的投信公告／公開說明書收益分配政策並記錄時間；來源不足顯示「待確認」。
- 第 04～08 項仍為未開始；第 08 項只加強 Monitor／Mini 的行情更新反應度，不重做已正常功能。帳務核心禁止修改。
