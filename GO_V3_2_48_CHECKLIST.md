# TF Asset V3.2.48 GO Checklist

## 基底
- [x] V3.2.47 / 30247 身份確認。
- [x] 備份分支：backup-v3.2.47-20261002-pre-v3.2.48。
- [x] 工作分支：go-v3.2.48-20261002-live-quote-integrity。

## 即時行情完整性
- [x] TWSE z 為正式成交價。
- [x] z 缺值時只允許最佳買／賣價作明確 bid_ask 參考。
- [x] pz 不得升格為 currentPrice。
- [x] previousClose(y) 僅保留比較基準，不得升格為盤中 currentPrice。
- [x] 盤中缺少可用即時價時持續啟動 Yahoo 零成本備援。
- [x] 盤中禁止用 TWSE/TPEx 前日 official close 補成目前行情。
- [x] 遠端行情中心回傳 legacy MIS pz row 時裝置端拒收。
- [x] SQLite V7 移除舊 previous_close 與 TWSE_MIS/BACKUP_REALTIME 污染列。
- [x] SQLite V7 移除舊 TWSE_MIS backup_realtime 分時點。
- [x] JS adapter 拒收 legacy MIS pseudo-realtime。
- [x] Server 與 Android local Market Center 使用相同 live-price 規則。
- [x] 0050 回歸：pz/y=112.90、bid=112.35 時 effective currentPrice=112.35。

## 版本
- [x] package/app/settings/backup = 3.2.48。
- [x] Android versionCode / iOS buildNumber = 30248。
- [x] CI / QA APK identity = V3.2.48。
- [x] Release workflow identity = V3.2.48。

## 驗證
- [ ] TypeScript
- [ ] V3.2.48 aggregate gates
- [ ] Server market-center tests
- [ ] Expo dependency / Doctor
- [ ] QA APK / ZIP / SHA / AAPT / Artifact
- [ ] Android 真機與券商行情對照
