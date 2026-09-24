# TF Asset V2.1.21｜GO 八大項 #04 持續強化 — 真實成交報價與 Widget 逐檔同步

日期：2026-09-24。使用者 09:39 左右實機截圖：庫存行情參考值與桌面 Widget 對照，00406A 9.93/9.92、0050 112.10/112.05、0056 56.30/56.25、00713 63.30/63.30、00878 34.90/34.89、00919 31.92/31.91、009816 16.57/16.56；數字順序為另一 App／本 App Widget。**不是同步抓包，僅作為真機回歸觀察，不能直接斷定交易所 API 回覆錯誤。** 桌面顯示「來源無新報價 09:39:49｜資料未更新」卻有多檔價格差，故強化來源驗證與透明診斷。

## 身份／前置 Gate
- 精確續接 #37 V2.1.20 HEAD `a54ae06e9c4968f7780aba17cd6c6d0d5a5371d7`，此前 #37 QA Actions `35938767343` quality/Gradle 成功，APK Artifact `10783854393`。更新前備份 `backup-v2.1.20-20260924-pre-go-v2121` 已建立；獨立工作分支 `go-v2.1.21-20260924-widget-hardening`。
- App 2.1.21、Android/iOS 20121、包名 `com.tfasset.app`。只產開發期 GitHub QA APK，保持 Draft 不合併 main。
- 金融核心 `src/finance/canonicalLedger.ts`、`src/utils/etfCalculators.ts`、`docs/finance/CORE_LOCK.md` 及 ledger 寫入、actualFee/tax 完全不可修改；App 才能生成 canonical 資產、現金、盈虧，Native 只覆蓋顯示用報價。

## 本輪小項與真機條件
| ID | 變更 / 期望行為 | 證據狀態 |
|---|---|---|
| W21-01 | Native/App 只用最新成交 `z` 加上有效交易所 `d/t`（一致時可用毫秒 `tlong`）更新成交報價；`pz`/買賣盤 `b/a` 不當成真實成交，HTTP 200 不當成交易所新 tick | 新行為測試 + 舊回歸 + Android Gradle 待核實 |
| W21-02 | 兩市場同一代號回覆，依有效來源時間與同秒成交量選擇，不以 API 陣列順序讓較舊報價覆蓋新報價 | TS 行為測試 + Native 連線 Smoke + Gradle 待核實 |
| W21-03 | 真正送出原生網路請求且繞過 HTTP 快取；分開呈現「實際查詢時間」／「已核實交易時間」／「本次新增幾檔、待更新標的」；同秒價格衝突明示，資料沒有更新不假跳秒 | Native 原始碼 + Kotlin Gradle 待核實；真機待驗 |
| W21-04 | Native 更新只有顯示價與漲跌，不能碰持股市值、損益、帳務；App 回到前景，必須**逐檔時間且價格一致**才清除 Native overlay，防止同秒舊價倒退 | Native Bridge 行為 Smoke；真機待驗 |
| W21-05 | 7 檔參照真機測試：點擊 Widget ↻、App 前景與背景切換，交易時段每 N 秒只是查詢節奏；比較逐檔來源時間/成交價；斷網、無新成交、部分新成交、重覆 row、窄版 2x2 橫向內容 | Android 裝置待使用者測試，不以 CI 當真機 PASS |
| W21-06 | 版本 2.1.21 / 20121、前置備份、累計所有前版 Gate，GitHub quality／QA APK／Artifact／SHA／unzip／badging；鎖定財務核心零差異 | 以實際 Actions、Artifact、compare commits 補證據 |

### 來源與平台界線
MIS `z` 代表最近成交、`b/a` 為委託簿報價；不同 App 來源與抓取時點可能不同，因此無法只憑非同步截圖承諾絕對同秒一致。App 前景預設 5 秒是實際查詢間隔，交易所未有新成交時時間不變。Android `updatePeriodMillis` 仍受系統 30 分鐘自動排程限制，桌面手動 ↻ 可發出背景請求，但無法保證 OS 永遠即時執行。

### 八大項承接
01 帳務核心 LOCK；02 備份/版本/QA；03 先前已實機確認之 ETF 配息標籤不動、其餘全量來源/離線待驗；04 本輪硬化、真機仍需確認；05 AI 新聞及助理十二項能力待續；06 A/B 全功能及浮動卡片預覽待全驗；07 Android 返回/K 線互動待全驗；08 Monitor/Mini 同步仍待全驗。原 U/G/N/T/C/D/R 及全部歷史 GO 清單不得消失。
