# TF Asset｜資產管家

TF Asset **V4.0.1** 以 Canonical Finance Core 為帳務 SSOT，並將 SaiETF MARKET-CORE 架構完整移植為新的台股行情中心。

## V4.0.1 核心架構

- **金融核心鎖定**：V3.7.8 Canonical Finance Core 與歷史費稅規則不由行情中心重算。
- **單一行情中心**：Fugle WebSocket → TWSE MIS → Yahoo → 同交易日快取。
- **行情仲裁**：交易日 → sequence → source timestamp → quality → fallback level → source priority → received-at。
- **Provider 保護**：HEALTHY / DEGRADED / COOLDOWN / RECOVERING，含 403 / 429 cooldown 與 bounded backoff。
- **Hot Store SSOT**：高頻行情先進 Memory Market Store；UI、首頁、庫存、行情牆與 Finance adapter 共用同一份選價結果。
- **持久化分層**：5 秒節流 snapshot persistence，並維護 1 分鐘 candle。
- **全台股證券中心**：TWSE、TPEx 日行情目錄，加上 TWSE / TPEx MOPS 公司基本資料；不再限定 ETF 代號。
- **安全憑證**：Fugle API Key 使用 Android Keystore AES/GCM，不寫入 repo 或 AsyncStorage。
- **GitHub-only workflow**：程式、CI、APK 建置與 release artifact 均由 GitHub / GitHub Actions 完成。

舊版 React MarketRuntime 直接抓 TWSE、舊 snapshot 選價與 ETF-only Catalog 路徑已移除；MarketRuntime 現在只負責 React adapter、排程與 App lifecycle。
