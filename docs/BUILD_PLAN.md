# TF Asset V1.0｜建置規劃生成書

## 0. 執行方式

本專案採 **GitHub-only** 建置流程：不依賴本機電腦，不以本機 Android Studio / PowerShell 為必要條件。所有程式碼、驗證、版本管理與 APK 建置皆透過 GitHub 與 GitHub Actions 執行。

### Hard Gate
每一階段必須達成 PASS 才能進下一階段。任何 TypeScript、測試、CI、建置或架構檢查失敗，皆停留在當前階段修正，不跳階段。

---

## 1. 核心不可變動區

### 1.1 Canonical Finance Core
來源：ETF-Finance-Manager-V3.7 最終 V3.7.8 帳務金融核心。

必須保留：
- 成交金額
- actualFee / actualTax 歷史真值
- 買進現金支出
- 賣出現金流入
- 純成交成本
- 含費成本
- 平均成本
- 庫存增減
- 目前市值
- 預估變現價值
- 未實現 / 已實現 / 含息損益
- 報酬率
- 股息淨額
- 手續費 / 稅制 / Math.floor 與最低費用規則
- 對應 Golden Tests

規則：UI、Widget、Monitor、報表不得自行重算金融公式。

### 1.2 Snapshot / Data Pipeline
提供 App / Widget / Monitor 共用的標準化資料輸出。

### 1.3 Monitor Engine
保留即時監控、刷新、Snapshot 同步、Normal/Mini 狀態隔離等能力；控制 UI 全新設計。

### 1.4 Widget System
定位為 Android Mobile Launcher/Home Screen Widget。與 Floating Monitor 共用資料，但產品邏輯與控制 UI 分離。

### 1.5 A-B 關係層定律
A 與 B 為相鄰關係層。B 可成為下一組關係的新 A。

A → B → C → D → E

禁止跨層直接控制。

---

## 2. 五大主頁

### 首頁｜資產儀表板
- 資產儀表板
- 市場新聞
- 持股行情模塊
- 損益明細

### 紀錄｜帳務中心
- 買進 / 賣出 / 股息 / 其他建檔
- 交易紀錄明細
- 月度摘要
- 稽核 / 管理

### 庫存｜持股分析
- 持股分析儀表板
- 資產配置
- 持股清單
- 行情牆模式
- 試算入口
- 單一標的詳細資訊

### 股息｜股息中心
- 股息月曆（必要主框架）
- 本月入金
- 年度股息 Total
- 月平均股息
- 股息清單
- 年度趨勢

### 設定｜控制中心
- 一般設定
- 帳務設定
- 外掛設定
- 系統設定
- 資料備份
- 免責聲明

---

## 3. 全局 UI 規則

1. 頁面設定採 Accordion 收合模式。
2. 每一個實際框架就是該頁設定的大項 A。
3. 展開 A 才進入直接相關的 B 層設定。
4. 禁止跨框架混合設定。
5. 清單：骨架固定、資料欄位可調；互動固定、資訊密度可調。
6. 持股清單第一欄固定為 ETF 代號＋名稱。
7. 持股清單點擊標的直接進入詳細資訊頁。
8. 持股行情模塊可共用於首頁與庫存。
9. 同一資料模塊支援多種呈現樣式：
   - 純行情
   - 行情＋小圖表
   - 精簡
   - 進階
10. 行情模塊可依條件自動排序，並支援釘選優先與手動排序。

---

## 4. 外掛架構

### Home Widget
- Android mobile 桌面元件
- 快速資產摘要 / 行情摘要
- 可自訂尺寸與模板
- 控制 UI 獨立

### Floating Monitor
- 跨 App 浮動即時視窗
- 即時行情刷新
- 可拖曳、Resize、Mini / Normal
- 控制 UI 獨立

共同原則：**共用資料，不共用產品邏輯與控制 UI。**

---

## 5. 建置階段

### Phase 1 — Repository Bootstrap
- README
- 本建置規劃生成書
- Architecture decision docs
- 專案目錄骨架
- PASS 條件：倉庫可追蹤、規格完整、無舊版程式碼污染

### Phase 2 — React Native / Expo Foundation
- Expo SDK 57
- TypeScript strict
- React Navigation
- Design tokens / Theme
- ESLint / typecheck
- GitHub Actions
- EAS preview APK pipeline
- PASS：CI 基礎檢查全綠

### Phase 3 — Finance Core Migration
- 從 V3.7.8 只移植 Canonical Finance Core
- 建立 Golden Tests
- 核心與 UI 完全隔離
- PASS：Golden Tests 全綠

### Phase 4 — Main Product UI
- 五大主頁
- Bottom Tabs
- 共用板塊 / 清單系統
- 共用持股行情模塊
- 頁面齒輪 / Accordion 框架設定骨架
- PASS：TypeScript + UI structure checks 全綠

### Phase 5 — Widget / Monitor Architecture
- Widget Domain
- Floating Monitor Domain
- Shared Snapshot contracts
- A-B relationship contracts
- 各自控制 UI 架構
- PASS：邊界檢查與測試全綠

### Phase 6 — Release Gate
- typecheck
- tests
- Expo doctor
- Android preview build
- artifact validation
- V1.0.0 release report
- PASS：GitHub Actions + APK artifact 成功

---

## 6. 明確不搬項目

- 舊版 UI 與視覺系統
- 舊版自由編輯器與拖曳模型
- 舊版 Frame / Block 與資料方塊模型
- 舊版 Settings、Screens 與 Navigation
- 舊版 Layout storage
- 舊版即時預覽機制

---

## 7. Version

初始版本：**1.0.0**
Android versionCode：**10000**

每次正式更新必須同步遞增 App version 與 Android versionCode。
