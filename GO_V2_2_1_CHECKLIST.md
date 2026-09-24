# TF Asset V2.2.1｜GO 固定驗收清單｜重大資料備份事故與行情回歸

日期：2026-09-24。使用者最新明確指定 **V2.2.1／Android 20201／iOS 20201**，取代原預計 V2.1.22。前次安裝 V2.1.21 實機顯示 0056／00406A 零報價、0050／00919／00713 內建示範價混入持股市值，**DEVICE FAIL**。使用者解除安裝降回 V2.1.20，舊 App 私有帳務與本機備份均可能被系統刪除；此事件屬重大資料安全事故，新增外部實體備份是本次必要交付。

## 版本、原始碼快照及不可恢復事項
- 原始來源：V2.1.21 PR #38 HEAD `a29140a74ac73b985338891b09937923188cdff1`，工作前完整程式碼備份 `backup-v2.1.21-20260924-pre-go-v221` 已由 GitHub 建立。工作分支 `go-v2.2.1-20260924-quotes-backup-saf`，Draft PR #39，main 不覆蓋。
- GitHub 備份**只包含原始碼**，絕不包含使用者已解除安裝裝置的交易資料；新版外部備份無法逆向復原已被刪除的舊 Android 私有資料。不得宣稱復原成功。
- 固定保護：`src/finance/canonicalLedger.ts`、`src/utils/etfCalculators.ts`、`docs/finance/CORE_LOCK.md`、實際 Ledger / actualFee / tax 計算規則零修改。
- 不可指示使用者清除 App 資料、解除安裝、無核實地強制覆寫。新 APK 必須維持 `com.tfasset.app`，並核實 Android 安裝簽章相容性；GitHub APK build 本身不足以證明可保留舊資料升級。

## 本輪依序驗收
| ID | 固定需求 | CODE / CI | Android DEVICE |
|---|---|---|---|
| M01 | TWSE 逐檔 `z` + `d/t` 真實成交與同秒去重；不採盤口、種子、零價、沒有可核實來源時間的舊快取 | 程式與行為測試已加入，2026-09-24 中途 quality #35951092040 全過；最終 V2.2.1 CI 待驗 | 待驗 |
| M02 | 0056／00406A 沒行情仍保留持股、名稱來自官方 Catalog 或 Ledger；不顯示假 0 元、錯誤市值與損益 | M01 行為測試涵蓋案例；最終重驗待核實 | 待驗 |
| M03 | 首頁／庫存／詳情／Widget／Monitor 同步傳達行情可信度；缺來源時顯示「待取得／估值待核對」，Canon Core 不可被假資料污染 | 各 Surface 已接線，最終 TS/Native build 待驗 | 待驗 |
| B01 | 外部備份必須有 Android 系統存檔選擇器，可選手機目錄、下載、適用的雲端 DocumentProvider（例如已安裝的 Drive）並指定 JSON 檔名；檔案在 App 私有資料之外 | 原生 SAF `ACTION_CREATE_DOCUMENT` 已接入；Native build 待驗 | 選目錄／存檔待驗 |
| B02 | JSON 必須包含完整 TF Asset 存儲鍵與舊本機備份歷史；缺失帳務、格式錯誤、空檔一律拒絕宣告完整備份，Android 寫檔後讀回 byte-for-byte 才顯示成功 | 版本 2 格式與原生讀回檢查已接線，最終 CI 待驗 | 檔案管理器打開檔待驗 |
| B03 | 外部檔案選擇器 `ACTION_OPEN_DOCUMENT` 選檔，先驗證 v1/v2 備份，預覽版本／日期／交易筆數，再二次確認；匯入前保護目前本機資料並讀回校驗，錯誤停止 | 程式與行為測試待最終 CI | 完整匯入／重啟驗證待驗 |
| B04 | App 內本機備份明確告知卸載會失去、最近外部核實回條顯示、無外部保存不得清除帳務；絕不誤稱本機等同雲端 | CODE 接線，需完整性檢查 | 待驗 |
| R01 | 所有顯示/包版本 2.2.1／20201；舊回歸與新行為測試、TS、Expo doctor、GitHub-only Gradle QA APK；驗 Artifact、SHA、unzip、aapt badging、簽章 | 待最終 Actions | Android 覆蓋安裝保留資料待驗 |

只有 M01～M03 完成 CODE→測試→完整性確認後才進 B01～B04；B 項必須分清 CI 與實機證據。若功能尚待實機，可交付新版本 **QA APK** 供驗收，禁止宣稱正式 Release PASS。

## 八大項與既存所有待驗完整結轉
1. 帳務核心 LOCK；畫面回歸必須服從 Core。
2. 原備份／版本／QA 流程因真實資料事故升級為 B01～B04，不得以 GitHub 快照替代手機資料。
3. 使用者既有配息類別部分實機 PASS；其餘官方 ETF 全域分類及離線狀態仍待驗，已確認的配息標籤不可退化。
4. 本輪 M01～M03 僅修已明確回報的行情、Widget、Monitor 回歸，含實機七檔行情驗證與細部版型未完成部分。
5. AI 助理／新聞與十二項預期能力保留未驗，不刪清單。
6. Settings A/B、浮動小卡預覽及全頁能力保留未驗。
7. 返回／左右滑動／K 線交互保留未驗。
8. Monitor／Mini 同步和多 Widget 排列持續待驗。

所有歷史 U/G/N/T/C/D/R 與前版 Checklist 均保留，以前版本的 GitHub CI PASS 不可推論 2.2.1 裝置 PASS。每次更新需計算原 Checklist 的已驗證與未完成項，真機及舊項未經證實則正式 GO ALL PASS 禁止宣稱。
