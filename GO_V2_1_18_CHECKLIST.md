# GO V2.1.18｜八大項續接：第 07 項 Android 返回／主頁手勢（2026-09-24）

本輪是開發期 QA，不是正式 Release。使用者 01:51 截圖仍顯示 ETF「配息待確認」，最新指示先結轉，繼續八大項，禁止在 UI 偽造月配。G01–G08、U01–U15 及原八大項完整保留在 UPDATE.md。

## 起點與保護
- 起點 PR #34，commit `b70e78238d28623bd9ce6e4a6e2f5ad7f2e40df8`。
- 先建立並查驗 `backup-v2.1.17-20260924-pre-go-v2118`，其 package.json 仍為 2.1.17。
- 工作分支 `go-v2.1.18-20260924-navigation-layer`；App 2.1.18／Android 20118／iOS 20118／`com.tfasset.app`。
- Immutable Core：`src/utils/etfCalculators.ts`、`src/finance/canonicalLedger.ts`、`docs/finance/CORE_LOCK.md` 及 actualFee/tax 寫入與公式均不變。

## 八項接續矩陣（每項只記錄已取得證據）
| 項 | 項目 | 本輪狀態 |
|---|---|---|
| 01 | 已確認正確的帳務核心 | 鎖定，不可修改；保留 Golden Case |
| 02 | 基準、備份、APK | 更新前程式備份已核實；V2.1.18 CI／APK 待驗 |
| 03 | ETF 官方類別、配息頻率 | 前版局部 CODE 已寫入；配息政策及 Android 實機待驗。截圖仍顯示待確認 |
| 04 | Widget 點擊更新及財務快照同步 | 前版 CODE／QA 有證據；Native 裝置驗收待驗 |
| 05 | AI System／十二功能與新聞正文 | 前版新聞正文擷取局部 CODE 有證據；真 LLM 與其餘能力待驗 |
| 06 | A/B 標籤、單卡浮動預覽、保存 | 前版 CODE 有證據；配息標籤真實資料及完整實機仍未完成 |
| 07 | Android 返回、左右滑動及 K 線 | **本輪**：改進 AI 浮窗返回優先權與可選邊緣滑動；全巢狀 Modal／K 線仍待補 |
| 08 | Monitor／Mini 刷新反應度 | 待後續，只增強現有功能 |

## 第 07 項本輪範圍
- N01：已展開的全域 AI 懸浮視窗攔截 Android 返回並收合，第二次才返回持股詳情，再返回先前主頁；根首頁無歷史才交還系統退出。原生 Modal 的 onRequestClose 仍由自身處理。
- N02：主頁既有全畫面左右滑動與靈敏度設定不改，另提供「僅左右邊緣 32 px」可選開關，以降低橫向行情表和圖表衝突；垂直手勢優先，詳情頁不可切 Tab。
- N03：新增純函式返回優先權及水平手勢路由測試；保留 V2.1.17 所有歷史測試。設定持久化不更改 schema，舊資料預設仍採全畫面模式。
- N04：GitHub-only QA APK 必須實際核對 TypeScript、全套回歸、Artifact、ZIP/APK 完整性、SHA256、package 與 20118；Android 裝置表現與 K 線不能由 CI 推定 PASS。

## 仍待驗收
Android 實機包括：其他巢狀 Modal、長回答／圖表全螢幕返回、未儲存草稿、頁面位置、水平內容衝突與 Native 邊緣返回。OHLC K 線、日期價格軸、成交量及技術指標本輪未實作。原八項任何未通過項不得宣稱 ALL PASS。
