# TF Asset｜資產管家

TF Asset V1.0 是全新規劃的資產管理 App。

## 專案原則

- **歸零定律**：產品 UI、舊 360、Frame/Block、舊頁面與舊設定系統不繼承。
- **金融核心鎖定**：僅移植並保護 V3.7.8 Canonical Finance Core 與其驗證規則。
- **五大主頁**：首頁、紀錄、庫存、股息、設定。
- **A-B 關係層定律**：只允許相鄰關係逐層展開；B 可成為下一層新的 A；禁止跨層控制。
- **GitHub-only workflow**：規格、程式、CI、APK 建置均由 GitHub / GitHub Actions 完成，不依賴本機建置。

> Status: Phase 1 — Architecture & repository bootstrap
