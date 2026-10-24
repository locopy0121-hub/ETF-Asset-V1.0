# GO V3.2.30｜TF Asset Intelligence Middleware 基礎架構

> 起點：V3.2.29 `go-v3.2.29-20260930-ai-tier2-read` / `acd97b9ddd244df94ca8a4aa042905a990b3886d`
>
> 開工備份：`backup-v3.2.29-20261001-pre-ai-intelligence-middleware`
>
> 工作分支：`go-v3.2.30-20261001-ai-intelligence-middleware`
>
> 本版定位：先建立 AI「問題 → 食譜 → 取料 → 缺料補取 → 檢整 → deterministic 計算 → Evidence → Gemini 表達」主幹；不把本版視為全部市場資料源已完成。

## 鎖定原則

1. **App / Portfolio 資料是資本與條件材料，不是市場事實本身。**
2. **持股與非持股使用相同 Market Evidence 基準；是否持有只影響 Capital Context。**
3. **材料不足時由 Intelligence Middleware 經 Provider/Gateway 補取；Gemini 不直接碰 SQLite、Ledger 或自行發明市場數字。**
4. **Fetch ≠ Answer。** 外部取得後仍需 Source / Freshness / Consistency / Requirement Gate，再由 deterministic calculator 產生 Metric Evidence。
5. **無必要材料即不得計算。** Total Return 不可用 Price Return 冒充；Premium/Discount 必須同時有 Market Quote 與 NAV/iNAV；XIRR 必須有日期現金流與資本條件。
6. **新聞標題／來源與已驗證正文分級。** 僅有 RSS metadata 時 Evidence 必須維持 PARTIAL。
7. Scenario / Hypothesis 只建立虛擬狀態，不修改真實帳本。
8. Canonical Finance Core、fee/tax、Ledger 寫入規則不修改。

## V3.2.30 Checklist

| ID | 項目 | 驗收 |
|---|---|---|
| A01 | Intelligence contracts | Recipe / Ingredient / Metric / Evidence / Acquisition status 型別存在 |
| A02 | Recipe Registry | Quote / Performance / News / ETF Compare / Portfolio / Scenario / General 可路由 |
| A03 | Metric Registry | Price Return、Total Return、CAGR、XIRR、年化波動、MDD、折溢價、Tracking、Overlap 等必要材料明確 |
| A04 | External Ingredient Gateway | 歷史行情可走 TWSE/TPEx 官方 daily；非持股新聞可經外部 RSS 補料 |
| A05 | Evidence Gate | VERIFIED / PARTIAL / STALE / CONFLICT / UNAVAILABLE / INVALID 明確，缺料不補猜 |
| A06 | Deterministic metrics | 官方 history 可計 Price Return / 價格 CAGR / Annualized Volatility / MDD |
| A07 | Total Return guard | 缺 MARKET_DIVIDENDS 時 Total Return 必須 UNAVAILABLE |
| A08 | Gemini integration | Gemini grounding 接收已檢整 Evidence；Portfolio data 保持 context-only |
| A09 | Provider failure fallback | Gemini 掛線時，可用已驗證 Evidence 回覆 performance / news 基本結果 |
| A10 | Version identity | package/app/settings/backup/CI/APK identity = 3.2.30 / 30230 |
| A11 | Regression / typecheck | `npm run typecheck` + `npm run test:v3_2_30` |
| A12 | QA APK | GitHub Actions Android QA APK、artifact、badging、SHA-256 實際驗證 |
| A13 | Android device validation | 00977新聞、00977近期表現、上下文承接與錯誤狀態待真機驗證 |

## 本版明確未宣稱完成

- 全市場 NAV / iNAV Provider 尚未全面接線。
- Market Dividend history Provider 尚未全面接線，因此含息 Total Return 在缺資料時保持 UNAVAILABLE。
- Benchmark history / Tracking Error / Tracking Difference Provider 尚未全面接線。
- ETF 非持股成分股與發行人 metadata 的外部自動補源仍需後續 Market Center Provider。
- 新聞正文驗證仍沿用既有 News Center 能力；新中繼的外部 RSS fallback 只把標題、來源、發布時間當 PARTIAL 材料。
- Android 真機結果、APK 安裝結果不得由 CI 推定。

只有 A01～A12 取得實際 CODE/CI/APK 證據後，才能稱 V3.2.30 QA Build Gate PASS；A13 仍需使用者真機驗收。
