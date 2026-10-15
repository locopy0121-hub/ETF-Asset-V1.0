# TF Asset V2.1.14｜GO 接續第 04 項 Widget 行情與財務更新狀態
更新日期：2026-09-23｜開發用 QA APK，非正式 Release

## 本次起點與保護
- 使用者確認實際安裝的是 V2.1.13，沒有確認第 03 項的 ETF 類別／配息問題已解決，故第 03 項仍待官方實網及 Android 驗收，不擅自列 PASS。
- 本輪從 V2.1.13 PR #30 最新 SHA `414c85e4bd137f1400a9027672a512e128c6a5dc` 接續；更新前備份 `backup-v2.1.13-20260923-pre-widget` 已核對指向相同 SHA。
- 新工作分支 `go-v2.1.14-20260923-widget-sync`；新版本 `2.1.14`／Android `20114`／iOS `20114`。
- 已由使用者確認正確的金融核心只讀不改：`src/finance/canonicalLedger.ts`、`src/utils/etfCalculators.ts`、`docs/finance/CORE_LOCK.md` 和交易/股息資料寫入。
- 所有 V2.1.13 歷史 U/G/N/T/C/D/R 與八大項清單完整保留，見 `GO_V2_1_13_CHECKLIST.md`。

## 八大項狀態
| ID | 範圍 | 狀態 |
|---|---|---|
| 01 | 帳務核心鎖定 | 使用者確認正確，本輪禁止變動 |
| 02 | 版本基準、備份與 APK | V2.1.13 QA 已建置與驗證；本輪 V2.1.14 前置備份已核對 |
| 03 | ETF 分類／配息頻率 | V2.1.13 CODE/CI 成功；官方政策與實機仍待驗收 |
| 04 | Widget 同步、桌面刷新與排列 | CODE／CI／QA APK 已 PASS，Android Widget 真機待驗 |
| 05 | AI System 十二項能力 | 尚未進入本輪修改 |
| 06 | A/B 編輯器與完整單卡預覽 | 尚未進入本輪修改 |
| 07 | Android 返回、左右滑動及 K 線 | 尚未進入本輪修改 |
| 08 | Monitor/Mini 現有功能正常；僅強化行情反應 | 尚未進入本輪修改 |

## 第 04 項根因及本輪 CODE
- 原 Native Widget 背景點擊更新只有報價價位、漲跌和時間，持股市值／損益仍使用上次 App 發送的 Canonical snapshot；舊 UI 沒有明確區分行情與財務更新時間，容易造成不同步觀感。
- `TfAssetWidgetProvider.kt`：背景點擊立即顯示「行情更新中」，留存 force-refresh request 給 App 回到前景時消費；Native 取得部分報價時顯示覆蓋筆數，成功後明確標記「行情 XX:XX｜財務待同步」；失敗保留上一份有效資料並顯示失敗。
- `TfAssetNativeModule.kt`：App 發送 Canonical snapshot 時，比較持股實際已驗行情時間與 Native 最後報價刷新時間；若 App 快照較舊，保留較新的 Native 行情，不讓變更 Widget 設定時把行情退回舊價。只有真正更新後的 App shared snapshot 才清除 Native 覆寫並顯示財務同步。
- Native 禁止計算財務市值、費稅或損益；待 App 已有 Canonical sharedSnapshot 更新後，Native 才同步金額。
- 保留原有 Native Widget 多欄與排序邏輯，不為本輪同步問題重做 Monitor/Mini 或金融核心。
- 新增 `scripts/v2_1_14-widget-sync.test.cjs` 作為 Native/JS 接線 Smoke，重跑全部歷史行為測試及 Native Gradle APK 建置；Smoke 不等於真機 PASS。

## 第 04 項驗收條件
1. 2×2 與多欄 Widget 點擊顯示刷新中，接著行情數字更新，畫面明示財務是否仍為上次 App 快照；部分成功不得偽裝全部更新。
2. 打開 App 後完成有效行情刷新，持股市值／損益讀自既有 canonical 共享快照，Widget 顯示同步結果；刷新失敗或僅載入舊快照時不覆蓋較新 Native 報價。
3. 1～4 欄、多筆持股與最後一列維持固定等寬；排序設定、手動點擊與原生 Receiver 實機驗收。
4. TypeScript、歷史金融 Golden 回歸、Widget 接線 Smoke、CI、GitHub-only QA APK 完整性、實機驗收分別記錄；未得到最後項不得稱完整 Feature PASS。
5. V2.1.14 每個修改與構建均在分支，`main` 不動；PR 保持 Draft，不因 QA APK 成功而聲稱正式 Release。

## 60 秒與聊天中斷續接
先查此檔、`UPDATE.md`、本分支 SHA、PR/Action 最新 run。工具仍在執行時可依錯誤 log 原地恢復；若對話已中斷，無法自己啟動新對話，須依此檔續接，不能推定後續自動完成。

## GitHub QA 完成證據（續接於聊天中斷後）
- PR #31 保持 Draft：https://github.com/locopy0121-hub/ETF-Asset-V1.0/pull/31
- 基準分支 Head commit：`1ef4795c633af6f1605589aad43fad8506941940`。
- CI／APK run：https://github.com/locopy0121-hub/ETF-Asset-V1.0/actions/runs/35864099683；quality 成功；`V2.1.14 QA APK / native integration` 成功，原生 Gradle `BUILD SUCCESSFUL in 5m 35s`。
- Artifact ID：`10752471195`，ZIP 封存檔 23,299,791 bytes，Artifact SHA-256：`409c71fefdaaad5416b341369745c0159dc3a679e8ee0cfc67522c82dcba62f5`。
- QA APK 檔案 53,795,285 bytes；APK SHA-256：`89ab8d9d38dcc8d91db9797ee75993ee23668c9bb832c99e5f3a2df496f30b49`；ZIP 及 APK `unzip -t` PASS；badging：`com.tfasset.app`, `versionName 2.1.14`, `versionCode 20114`。
- APK Artifact：https://github.com/locopy0121-hub/ETF-Asset-V1.0/actions/runs/35864099683/artifacts/10752471195
- Android 實機尚待核實：桌面點擊更新行情成功／部分失敗提示、背景後回前景 canonical sharedSnapshot 刷新、4 欄及最後一列、各項設定。故第 04 項為 **CODE/CI/APK PASS，DEVICE PENDING**，非全功能 PASS。
- 第 03 項真實官方收益分配資料仍是 NO PASS；保留，不在下一項默認成功。
