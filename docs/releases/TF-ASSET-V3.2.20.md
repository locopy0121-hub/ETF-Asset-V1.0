# TF Asset V3.2.20｜盤中即時性與行情不回退

- SQLite last-known-good 不再被較低品質的新 row 覆蓋。
- trade 等高品質行情只接受同級或更高品質資料取代，避免盤中畫面由實際成交退回 bid/ask / close 參考值。
- 行情診斷新增官方來源時間、SQLite 來源時間、兩者時差與同步判定。
- 診斷時鐘每秒更新，只影響診斷顯示，不製造新行情。
- 延續 TWSE → SQLite → App single-source 架構與盤中 1 秒排程。
