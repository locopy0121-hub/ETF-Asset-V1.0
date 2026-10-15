# TF Asset V3.2.19｜TWSE ⇄ SQLite ⇄ App 三方同步

## 核心規則
App 內建 SQLite 為正式行情資料中心與唯一行情真實來源。

盤中資料鏈固定為：

TWSE / 備援來源 → Native Market Center → SQLite → App Runtime → 首頁 / 庫存 / 行情牆 / Mini / 圖表 / 損益 / Widget

## 本版修正
- App 啟動先讀 SQLite 已保存的 last-known-good 行情。
- native refresh 僅負責抓取、驗證並提交 SQLite。
- React App 不再直接採用 refresh 的網路回傳 snapshot；提交完成後會重新讀 SQLite，再發布給全部 Consumer。
- SQLite 版本與行情 snapshot 成為 App 畫面同步依據。
- 遠端 HTTPS 行情中心改為選填；留空即使用 App 內建 SQLite 正式資料中心。
- 保留 V3.2.18 realtime fallback 與盤中 1 秒規則。

Immutable Finance Core 未修改。
