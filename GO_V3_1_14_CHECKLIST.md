# TF Asset V3.1.14 GO Checklist

## 目標
- [x] 移除 Runtime 硬編碼的 750,000 現金常數
- [x] 未建立明確現金來源時，期初現金固定正規化為 0
- [x] 舊系統 generated reversal 只以專用 ID + label 辨識，不再依金額
- [x] 移除設定頁手動建立負向 legacy reversal 的入口
- [x] Ledger schema 升至 4，備份 parser 接受 schema 1/2/3/4
- [x] App 版本 3.1.14 / Android+iOS 30114
- [x] 新增零值回歸 Gate
- [ ] GitHub quality PASS
- [ ] Backend integration PASS
- [ ] QA APK PASS
- [ ] Artifact / ZIP / SHA / AAPT 驗證
- [ ] Android 真機確認不再出現幽靈現金

## 保護範圍
Canonical Finance Core、成交金額、actual_fee、actual_tax、取整規則與歷史真實買賣／股息紀錄不修改。
