# TF Asset V3.1.15 GO Checklist

## 目標
- [x] 建立 V3.1.14 前置備份分支
- [x] NT$ + 主金額改成同一 responsive composite row
- [x] Android 取消 baseline 依賴，改 flex-end + lineHeight
- [x] 長金額自動縮放與 overflow 防護
- [x] 前綴 absolute XY／Anchor／獨立尺寸停用
- [x] 舊 prefix 絕對幾何覆寫於 Runtime 忽略
- [x] 前綴安全相對位移 X ±24dp／Y ±8dp
- [x] 儀表板摘要區縮減固定留白
- [x] App 版本 3.1.15 / Android+iOS 30115
- [x] 新增 dashboard layout regression gate
- [ ] TypeScript / aggregate quality PASS
- [ ] Backend integration PASS
- [ ] QA APK PASS
- [ ] Artifact / ZIP / SHA / AAPT 驗證
- [ ] Android 真機確認 NT$ 不再錯位

## 保護範圍
Canonical Finance Core、成交金額、actual_fee、actual_tax、取整規則、歷史 Ledger、行情來源與 SAF 備份格式不修改。
