# TF Asset V3.2.18｜行情 Fallback 與待取得修護

- MIS 僅有 bid/ask 或前收時，不再視為 realtime fallback 已完成。
- 仍缺 trade / backup_realtime 的標的會繼續嘗試 Yahoo backup realtime。
- 經驗證的 bid/ask 可作為「參考估值」進入 Finance 投影，避免行情中心已有資料但 UI 顯示待取得。
- 舊版工廠預設 5 秒盤中頻率遷移為 1 秒；其他使用者自訂秒數不變。
- Immutable Finance Core 未修改。
