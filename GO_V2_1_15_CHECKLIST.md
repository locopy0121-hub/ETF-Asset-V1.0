# TF Asset V2.1.15｜GO 第 05 項 AI System：第一輪新聞正文與來源連動

日期：2026-09-23。延續使用者八大項規劃與每項回報、接續流程，僅記錄可證實的進度，不能以 QA APK 成功冒稱十二項 AI 功能完成。

## 版本起點及保護
- 上一輪 V2.1.14 QA `PR #31`，最新來源 `f968b958b6987056bed926851b4a66ed68ae0810`。
- 先建立並確認備份 `backup-v2.1.14-20260923-pre-ai` 指向上述 commit。
- 獨立工作分支 `go-v2.1.15-20260923-ai-news`；正式遞增版本 `2.1.15`／Android `20115`／iOS `20115`。
- 不得變更 `src/finance/canonicalLedger.ts`、`src/utils/etfCalculators.ts`、`docs/finance/CORE_LOCK.md` 或正確交易／配息入帳計算。
- 第 03 項 ETF 官方分類及配息來源實網／手機驗收未完成；第 04 項 Widget CODE／CI／QA APK PASS，但手機背景刷新與完整財務同步 DEVICE PENDING，不將其改列功能 PASS。

## 八大項狀態
| 編號 | 項目 | 本輪狀態 |
|---|---|---|
| 01 | 帳務核心 | 使用者確認正確；禁止變動 |
| 02 | APK 基準和完整備份 | 完成前置核對和 V2.1.14 備份；V2.1.15 APK 尚待完成 |
| 03 | ETF 自動分類與配息 | 既有修復 CODE PASS；官方與 Android 未完成 |
| 04 | Widget 更新與同步 | V2.1.14 CODE／CI／QA APK PASS；DEVICE PENDING |
| 05 | AI System 十二項能力 | 本輪進行 **新聞原文與來源連動**；其餘能力保留 |
| 06 | A/B 配息類別、完整單卡預覽與保存 | 未開始 |
| 07 | 返回、左右滑動及 K 線 | 未開始 |
| 08 | Monitor／Mini | 現有功能 OK；僅待行情反應度優化 |

## AI 第一輪內容與資料邊界
1. `newsArticleResolver.ts`：優先使用 Google News 重定向或新聞頁 metadata 的原始發布網站 URL。沒有可確認的發布網站網址時保留 unavailable，不能把 Google RSS 標題當全文。
2. `articleSummary.ts`：既有 <article>/<main> 實質段落之外，補上出版社 JSON-LD `NewsArticle.articleBody` 的有效正文擷取。無實質文章仍不能亂編。
3. `AiNewsRuntime.tsx`：取得可核實的 HTTPS 原始來源後才擷取正文；遇到限制、超時與來源失敗仍只顯示無摘要。
4. `aiAssistant.ts`／`AiQuestionBox.tsx`：浮動及 AI 頁對話新增「開啟來源」操作，明確標記目前為「原文重點節錄，非生成式 AI 摘要」，不得宣稱已接通真正的 LLM。其餘自然語言記帳、跨頁操作仍需後續獨立連接與逐項驗證。
5. `scripts/v2_1_15-ai-news.test.ts`：URL 安全判斷、不得從廣告連結猜測原文、JSON-LD 實質正文、來源按鈕與摘要性質測試。網路出版社真實正文、反爬限制和 Android 點擊仍需實測。

## 接續要求
- 先通過 TypeScript、既有全套回歸及新增測試，再以 GitHub Action 建置 **V2.1.15 QA APK**，驗證 artifact、解壓、SHA、package 和版本。
- 完成後報告 CODE／QA 證據；第 05 項尚餘完整十二項 AI 能力中的未建置與實機驗收，不能宣告第 05 項全 PASS。
- 後續仍依使用者逐項完成→回報→接續下一項流程，未能自動完成的實機驗收明確結轉。
- 如聊天或 Actions 中斷，先查本檔、UPDATE.md、目前分支 SHA、PR、最新 Action／artifact，從已證實的最後進度接續；沒有外部自動化時無法自行在聊天中重啟。
