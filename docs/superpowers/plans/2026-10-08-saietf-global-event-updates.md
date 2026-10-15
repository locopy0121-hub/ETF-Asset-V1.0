# SaiETF 全局事件更新 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** V4.0.10 讓 TF Asset 各畫面只由 SaiETF 行情事件及按需動作更新價格與損益，取消舊全局固定秒數排程。

**Architecture:** 原生 SaiETF `MarketDataCenter`／Memory Hot Store 仲裁並發布行情，React Native 的 `MarketRuntime` 訂閱事件，`FinanceRuntime` 投影唯一帳務快照。Widget、Monitor、Mini 由 Shared Snapshot 與原生相同市場版本渲染；手動刷新使用原生請求路徑，報價到期則單次重繪失效狀態。

**Tech Stack:** React Native／TypeScript、Android Kotlin、SQLite、Node 測試、GitHub Actions Android QA APK。

**Spec:** `docs/superpowers/specs/2026-10-08-saietf-global-event-updates-design.md`

## Global Constraints

- 由 V4.0.9 遞增至 V4.0.10；完成後產出 Android QA APK。
- Fugle LIVE 優先，TWSE MIS／Yahoo 由原生 SaiETF 仲裁；報價不得以 0.0 或前一交易日價冒充有效行情。
- Widget／Monitor／Mini 不另抓行情，不重算帳務；交易費稅及既有排版設定不變。
- 來源限流、心跳、重連、SQLite 批次寫入和到期失效機制仍由原生資料正確性規則管理，不視為畫面更新秒數。

## Review Focus

1. API 回傳 `0.0`／無效價格：Task 1、2 測試不接受為 LIVE，總值及損益顯示待核實。
2. 晚到 HTTP 覆蓋新 Fugle Tick：Task 1 測試版本及來源時間防倒退。
3. 盤中無成交超過有效期：Task 2、3 測試到期即失效，不依固定 30 秒刷新。
4. Widget 在 App 未執行時被點擊：Task 3 測試原生按需路徑或明示待同步。
5. Monitor Mini 與 Normal 切換：Task 3 測試同一快照版本，避免模式獨立輪詢。

---

### Task 1: 移除 React 行情排程，保留事件入口

**Files:** Modify `src/market/MarketRuntime.tsx`, `native/android/SaiEtfMarketRuntime.kt`, `native/android/SaiEtfMarketDataCenter.kt`, `scripts/v4_0_9-update-policy.test.ts`; create `scripts/v4_0_10-event-market.test.cjs`.

**Interfaces:** Consumes `subscribeUnifiedMarketData(onSnapshot)`, `refreshUnifiedMarketData(symbols)`, `updateNativeMarketSymbols(symbols)`；produces `MarketRuntimeValue.quotes`／`marketDataVersion` 由原生事件驅動。

- [ ] **Step 1:** 測試 Fugle Tick 到達時不依 timer 更新畫面；舊批次與 0.0 價不得覆蓋有效 LIVE；原始碼不含 `marketRefreshSeconds`、1／30 秒排程或 `setInterval(read,1000)`。
- [ ] **Step 2:** 執行 `node scripts/v4_0_10-event-market.test.cjs`，確認因舊排程而失敗。
- [ ] **Step 3:** 在 `MarketRuntime.tsx` 移除 JS 交易時段／固定更新讀取，只保留事件訂閱及啟動、持股異動、回前景一次補齊；必要時由原生 Snapshot 回傳狀態。
- [ ] **Step 4:** 執行新增測試與 `node scripts/v4_0_9-live-priority.test.cjs`，確認通過。
- [ ] **Step 5:** 提交此單元。

### Task 2: 財務快照按事件與到期時間更新

**Files:** Modify `src/finance/FinanceRuntime.tsx`, `src/market/marketCenterViews.ts`; create `scripts/v4_0_10-valuation-expiry.test.cjs`.

**Interfaces:** Consumes Task 1 的 `marketDataVersion`、`quotes` 及 `valuationValidUntil`；produces `FinanceContextValue.sharedSnapshot`。

- [ ] **Step 1:** 測試新行情立即重新投影持股／總資產；有效期屆滿後一次失效；無效 0.0 不產生假損益。
- [ ] **Step 2:** 執行 `node scripts/v4_0_10-valuation-expiry.test.cjs`，確認因 30 秒固定 timer 而失敗。
- [ ] **Step 3:** 用有效期的單次 timeout 與 App 前景恢復取代 `setInterval(...,30_000)`，只更改時間有效性，不改帳務公式。
- [ ] **Step 4:** 執行新增測試及現有財務黃金案例，確認通過。
- [ ] **Step 5:** 提交此單元。

### Task 3: Widget／Monitor／Mini 的原生按需刷新

**Files:** Modify `App.tsx`, `src/native/TfAssetNativeBridge.ts`, `native/android/TfAssetNativeModule.kt`, `native/android/TfAssetWidgetProvider.kt`, `native/android/TfAssetOverlayService.kt`, `src/components/widget/WidgetControlPanel.tsx`; create `scripts/v4_0_10-native-surfaces.test.ts` and a Kotlin bridge behavior test under `scripts/native/`.

**Interfaces:** Consumes Task 2 的 `SharedSnapshot`；produces 原生手動刷新事件及 Widget／Monitor／Mini 相同來源版本的呈現。

- [ ] **Step 1:** 測試 App 不再每秒 `consumeNativeMarketForceRefreshRequests`；Widget 點擊與 Monitor 按鈕能直接發出一次原生按需請求；Mini／Normal 共用同份快照；關閉 App 時不謊稱已同步。
- [ ] **Step 2:** 執行 `tsx scripts/v4_0_10-native-surfaces.test.ts` 及 Kotlin 行為測試，確認舊行為失敗。
- [ ] **Step 3:** 移除 `App.tsx` 秒數輪詢旗標，原生接手手動請求並在完成／失敗時更新狀態；原生到期重繪保留單次有效期事件，移除固定 30 秒反覆檢查。
- [ ] **Step 4:** 執行新增測試和原生橋接／Widget／Monitor 現有測試，確認通過。
- [ ] **Step 5:** 提交此單元。

### Task 4: 版本與交付驗證

**Files:** Modify `package.json`, `app.json`, `src/screens/SettingsScreen.tsx`, `docs/releases/V4.0.10-SAIETF-GLOBAL-EVENT-UPDATE.md`, `.github/workflows/ci.yml`, `.github/workflows/release-v1.yml` and version-sensitive tests.

**Interfaces:** Consumes Tasks 1–3；produces V4.0.10 QA APK 與驗證紀錄。

- [ ] **Step 1:** 新增版本／禁用舊秒數說明的測試，執行以確認 V4.0.9 身分與舊字句導致失敗。
- [ ] **Step 2:** 升為 V4.0.10／40010，更新文件及 CI 產物名稱，替換與新規則衝突的舊測試斷言。
- [ ] **Step 3:** 執行 `npm run test:v4_0_10`、TypeScript 檢查、原生市場橋接測試；失敗逐一記錄修正。
- [ ] **Step 4:** 啟動 Android QA 建置，追蹤品質／原生編譯／APK artifact 到結果，記錄提交 SHA、APK 大小及 checksum。
- [ ] **Step 5:** 提交版本與驗證文件；交付 QA APK 或明示建置阻礙。
