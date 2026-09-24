# TF Asset V2.1.20｜GO 八大項第 04 項：Widget 跳秒必須對應真實資料更新

日期：2026-09-24，開發期 QA。依使用者最新指示：刷新倒數／每 N 秒僅是**發起行情查詢的間隔**，只有交易所提供比上次新的來源時間才可宣稱行情已更新；不允許改用 HTTP 接收時間或每秒畫面動畫冒充報價更新。

## 身份與前置備份
- 專案 `locopy0121-hub/ETF-Asset-V1.0`，準確續接 V2.1.19 PR #36 `88783e091451d2071b8785dc637c9892ba65e4aa`（quality/APK SUCCESS、配息四檔使用者 DEVICE PASS）；更新前保留完整備份 `backup-v2.1.19-20260924-pre-widget-v2120`，並從該 SHA 建立獨立分支 `go-v2.1.20-20260924-widget-source-freshness`。
- App 2.1.20，Android/iOS build 20120，com.tfasset.app。只透過 GitHub Actions 產生 QA APK，不作正式 Release。
- `src/finance/canonicalLedger.ts`、`src/utils/etfCalculators.ts`、`docs/finance/CORE_LOCK.md`、actualFee／tax 及帳務寫入不可變。FinanceRuntime 只傳遞**來源報價時間**到顯示用 SharedSnapshot，絕不更改既有 canonical financial amounts。
- 保留 #03 配息使用者已確認顯示的 PASS，其他 ETF 官方覆蓋／Android 離線仍待驗；#05 新聞正文未取得持續留在原八大項。

## 本輪鎖定第 04 項驗收矩陣
| ID | 驗收條件 | 預計自動化證據 | Android 實測 |
|---|---|---|---|
| W01 | 前景每 N 秒按現有 MarketRuntime 設定實際發送行情查詢，**來源報價時間未變**不更新「最新行情」時間／持股來源時間／財務結果 | TWSE d/t 時區日期解析、相同 tick、壞日期與缺時間測試；Runtime 接線 | 待實機 |
| W02 | App canonical sharedSnapshot 持股逐檔來源時間，不能用另一檔的最新時間覆蓋過時持股 | 逐檔元資料與現有 canonical amounts read-only 行為測試 | 待實機 |
| W03 | Widget 桌面點擊／設定頁手動更新必須啟動真實 MIS 網路請求，不能只是 RemoteViews 重繪；取得有效來源新 tick 才覆蓋價格及來源時間 | Native 接線契約 + Kotlin Gradle 原生編譯 | 待實機 |
| W04 | Native 只疊加行情，不重算市值／損益；來源未變顯示未更新，API 失敗保留舊資料；部分來源較新時顯示財務待同步 | Native 逐檔相容性檢查與 legacy 時間戳遷移；Kotlin 編譯 | 待實機 |
| W05 | Widget「↻ 更新」按鈕與來源時間／財務狀態分開兩行，秒數是實際交易所回報的來源秒數；離線不冒充同步 | Layout id 和 Native 渲染 smoke + Gradle aapt | 待實機 |
| W06 | 每輪遞增版本，保留 V2.1.19 全套歷史 Gate／immutable Core；本輪 GitHub QA APK、artifact、SHA256、unzip、aapt 全部有證據 | Quality／Gradle／Artifact／SHA／badging | 使用者安裝待驗 |

## 服務邊界
- **不能保證背景每 5 秒執行**：Android 原生 Widget 自動排程由 OS 管理，`updatePeriodMillis=1800000`（30 分鐘）。App 前景時設定的 5 秒代表每 5 秒查詢，只有來源時間真的更新才標示新行情；背景桌面按鍵可立即提出原生刷新請求，成功時間顯示交易所來源時間。
- 沒有可靠的 TWSE `d`/`t`、只有 HTTP 200 或只有「每秒跑動」，都不能推定行情更新成功；非交易時段可正常保持相同來源時間。
- Widget 背景**財務待同步**時仍使用上一次 App canonical 財務快照；不讓 native 用價格重算金融數字。等待 App 在前景取得同等或更新的逐檔有效來源時間才清除 native overlay。
- Native 編譯及 TS 行為測試不等於 Android 背景管理、Launcher Widget 佈局與財務跨 App 真機 PASS。

## 八大項結轉
01 帳務核心已鎖定；02 每輪備份／QA APK；03 使用者對 0050／009816／00406A／00713 配息標籤顯示 PASS，其餘全量待驗；04 **本輪**；05 AI System 十二能力及新聞正文缺失待續；06 A/B 標籤完整卡片預覽與設定待全驗；07 Android 返回／K 線等待續；08 Monitor/Mini 行情反應度待續。全部先前 U/G/N/T/C/D/R 和 GO Checklist 保留，不因新 APK 覆蓋未完成紀錄。
