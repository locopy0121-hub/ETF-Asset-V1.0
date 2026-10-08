# TF Asset V4.0.10｜SaiETF 全局事件更新設計

## 目標與範圍

TF Asset V4.0.9 尚有舊式固定秒數更新：行情 Runtime 的 1 秒讀取與 1／30 秒網路排程、App 對 Widget／Monitor 手動請求的 1 秒輪詢，以及 Finance 的 30 秒重算。V4.0.10 取消所有畫面自訂或全局固定秒數的行情與損益更新規則。首頁、庫存、Widget、浮動 Monitor 和 Mini 共用 SaiETF 行情中心產生的最新、可核實資料。

「隨時隨地最新」意指在 App 可執行且 Fugle 提供有效成交事件時立即呈現，並在背景或系統限制下清楚顯示最後來源時間與有效性。Android 桌面 Widget 受系統背景執行限制，不能承諾關閉 App 後每筆 Tick 都即刻更新。

## 行情與損益資料流

1. SaiETF 原生 Fugle WebSocket 持股訂閱是盤中主要來源。新成交經 SaiETF `MarketDataCenter` 仲裁、來源時間及品質核實，進入 Memory Hot Store；缺值、過期或斷線時，由同一中心依來源節流、斷路器及退避處理 TWSE MIS／Yahoo 備援。
2. 原生 Hot Store 版本事件直接通知 React Native 的單一 `MarketRuntime`；後者不啟動自身盤中／盤後行情輪詢、不定時讀取 Native Snapshot，也不維持第二套交易時段判斷。啟動、持股代號異動、回前景及使用者手動刷新可以執行一次按需查詢。
3. `FinanceRuntime` 用最新行情投影同一份 canonical ledger，產生帶市場版本、報價來源時間和有效期限的 Shared Snapshot。價格、總市值與持有損益在有效事件抵達後一起更新；舊批次結果不得覆蓋較新成交。
4. App 直接顯示 Shared Snapshot；Widget、Monitor 及其 Mini 模式只接收此快照及原生 SaiETF 市場版本，不自行抓價或重算帳務。設定變更與快照版本變化觸發同步。Native 呈現層只作來源一致性及到期保護。

## 觸發條件與生命週期

| 事件 | 動作 |
| --- | --- |
| Fugle 新成交或備援取得較新有效行情 | Hot Store 發布版本，立即投影財務並同步所有可用畫面 |
| 啟動、回前景、持股異動 | 恢復訂閱、讀取現有快照並按需補齊一次 |
| Widget／Monitor／Mini 手動刷新 | 原生請求直接送行情中心；當 App 未執行時依 Android 可用能力取得與呈現同一中心的資料或標記等待同步，不透過 JS 每秒輪詢請求旗標 |
| 背景／關閉／網路斷線 | 依 SaiETF 生命周期處理；保留已核實來源時間，顯示延遲／過期，不用舊資料冒充 LIVE |
| 報價有效期限屆滿 | 只安排一次依到期時間的畫面失效重繪；不得藉重繪取得第二條價格或以固定 30 秒反覆刷新 |

來源限流、Fugle 心跳與重連、SQLite 批次持久化及到期檢查屬於 SaiETF 提供者與資料正確性機制，不能變成各畫面的固定刷新頻率。交易時段與 `LIVE`／`DELAYED`／`STALE` 由原生市場狀態決定，所有消費者遵循同一判定。

## 失敗與驗收

- Fugle Key 有效且收到新 Tick：首頁、庫存、Widget、Monitor、Mini 的同代號價格、來源時間、總市值與損益使用同一市場版本；畫面不等待 JS 秒數定時器。若 Android 背景限制阻止 Widget 即時重繪，明確顯示最後同步時間與狀態。
- Fugle 無 Tick、斷線、試用、前一交易日舊價、較晚返回的 HTTP 批次：依 SaiETF 仲裁和有效性閘門處理；不得以過期價宣稱 LIVE 或完整損益。
- 賣光持股與 AI 單檔查價不留下多餘 Fugle 持股訂閱；啟動與回前景仍能立即補齊。
- 程式及介面不再含全局 `1 秒／30 秒` 行情排程、Widget／Monitor／Mini 自訂行情更新秒數、手動請求的 JS 秒數輪詢；驗收需包含事件推送、Widget 原生點擊、浮動視窗兩種模式、快照到期及 Android QA APK。

## 不變的邊界

交易費稅、帳務公式和既有版面編輯器不改。Widget／Monitor 不獨立運算損益。此次以 V4.0.9 為基底升為 V4.0.10，完成驗證後建置 QA APK。
