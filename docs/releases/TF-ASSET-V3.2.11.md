# TF Asset V3.2.11｜行情牆真實分時走勢

## 任務
把 V3.2.10 Mini 圖的「兩點直線 fallback」改為真正的當日分時走勢。行情牆 Mini 只畫可驗證的 09:00–13:30 交易時段資料，不再用昨收與現價兩個點假裝盤中曲線。

## 資料鏈
- TWSE MIS 實際成交／最近成交參考持續寫入 Market Center intraday history。
- Android 行情中心 SQLite 升級到 market DB schema 3，新增 market_intraday，只接受 trade／backup_realtime，禁止 bid/ask、previous close 進入分時線。
- App 中途開啟、盤後才開啟時，本機行情中心可用 Yahoo 1-minute range=1d 補齊缺少的盤中路徑；此資料明確保留 YAHOO／backup_realtime provenance。
- 已設定 HTTPS 後端時，手機不開第二條 crawler；後端 /v1/market/quotes?intraday=1 提供 market_quote_history＋1m fallback 合併後的分時序列。
- 後端及 Native 對外皆以每分鐘一點輸出，降低 UI/Bridge 負載。

## Mini 圖規格
- X 軸固定對應台北時間 09:00 → 13:30；盤中最新點只畫到當下，右側保留尚未發生的交易時間。
- Y 軸為實際分時價格；昨收僅作虛線基準。
- 線段位於昨收上方／下方時依全域漲跌色分段，穿越昨收即切色。
- 0 或 1 個實際分時點時顯示「分時走勢待取得／分時資料累積中」，禁止畫假直線。
- 行情牆仍是 Mini 摘要；完整 K 線與技術分析留在獨立圖表頁。

## 安全邊界
- 不修改 Immutable Finance Core。
- 不修改成交金額、手續費、證交稅、actual_fee/tax 固化、Math.floor 或 Portfolio 加總。
- 分時資料只屬行情展示層，不回寫交易帳務與歷史成本。

## 版本
- App 3.2.11
- Android versionCode 30211
- iOS buildNumber 30211
