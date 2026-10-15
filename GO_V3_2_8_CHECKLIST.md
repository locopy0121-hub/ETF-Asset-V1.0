# TF Asset V3.2.8 GO Checklist

- [x] 以 V3.2.7 成功 QA APK HEAD `985c961495f0cc919b7d3d507a755ed04ea09dfe` 為基底。
- [x] 建立備份分支 `backup-v3.2.7-20260929-before-settings-preview-pnl-sync`。
- [x] 根因：PageLayoutToolWorkbench 雖使用正式 DashboardAssetOverview renderer，但未傳入 V3.2.7 新增的 previousPnl / todayPnl / totalPnl / pnlComplete，故設定頁固定落入「損益待核對」分支。
- [x] 設定頁改用純 `deriveDailyPnlRecord` 與首頁同一 Canonical 輸入，不建立第二個持久化 history hook。
- [x] 設定預覽補上首頁相同 contentPadding。
- [x] 新增損益列文字／數值 target baseline。
- [x] 版本升級 3.2.8 / 30208。
- [x] 新增 V3.2.8 regression gate。
- [ ] GitHub Actions quality / backend / QA APK PASS。
- [ ] APK artifact、SHA256、AAPT versionName/versionCode 驗證。
