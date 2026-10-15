# GO V3.2.33｜AI Material Catalog + Replenishment Quality Gate

> Base: V3.2.32 head `f884190d642583bbd572c2d87b3c6d35348e9db7`
>
> Backup: `backup-v3.2.32-20261001-pre-ai-material-gate`
>
> Work: `go-v3.2.33-20261001-ai-material-gate`

## 目的

把「資料不足就往外補，補回來後先檢整再回答」從概念正式落成一個可執行的 Material Gate。

流程固定為：

`Question → Recipe → Ingredient Catalog → App/Market evidence → missing/low-quality detection → external replenishment → freshness/completeness/verification gate → deterministic metric → Response Arbitration`

Gemini 仍不是市場事實的唯一入口，也不是資料不足時的補猜來源。

## 本版 Gate

| ID | Requirement | Acceptance |
|---|---|---|
| M01 | Ingredient Catalog | 每種材料有 scope、source priority、freshness、minItems、minimumStatus |
| M02 | External quote replenishment | MARKET_QUOTE 缺少/低驗證時可直接補查 TWSE MIS |
| M03 | No fake current price | TWSE MIS z 缺失時保持 PARTIAL；昨收/委買/委賣不得冒充現價 |
| M04 | Identity upgrade | MIS 同時回傳有效名稱/市場時，可把 parsed-only identity 升級為 VERIFIED |
| M05 | Freshness Gate | 需依材料類型驗證新鮮度；Quote 用「最後核實時間」而非盲看成交 timestamp |
| M06 | Completeness Gate | Historical performance 至少達到 recipe/catalog minItems 才可計算 |
| M07 | Verification Gate | VERIFIED-required 材料不得由 PARTIAL 冒充完整材料 |
| M08 | News partial semantics | 標題/來源材料可維持 PARTIAL 且只能回答已核實範圍 |
| M09 | Metric safety | History 不足時 Price Return / CAGR / Volatility / MDD 不得照算 |
| M10 | Response precedence | 若 App quote 只有 PENDING，而外補取得 VERIFIED，LOCAL_EVIDENCE 必須優先 |
| M11 | Validation visibility | Evidence Package 帶 validationIssues，供 AI/診斷理解缺料原因 |
| M12 | Finance Core lock | Canonical Ledger / fee / tax / Portfolio 計算不修改 |
| M13 | Version identity | 3.2.33 / Android+iOS 30233 / Settings / Backup / CI |
| M14 | Typecheck + regression | `npm run typecheck` + `npm run test:v3_2_33` |
| M15 | QA APK | GitHub Actions APK + artifact + badging + SHA-256 |
| M16 | Android device | 真機 AI 行情/年化/新聞/比較仍需裝機驗證，CI 不代替真機 |

## 目前外補能力

- MARKET_QUOTE → TWSE MIS official probe
- HISTORICAL_PRICES → TWSE / TPEx official daily
- MARKET_NEWS → News Center / Google News discovery / publisher body
- SECURITY_PROFILE → official catalog + external listing/profile discovery

## 尚待後續 Provider

- MARKET_DIVIDENDS
- NAV / iNAV
- BENCHMARK_HISTORY
- ETF_META external refresh
- ETF_HOLDINGS external refresh

這些已在 Ingredient Catalog 註冊為可補料項目，但 V3.2.33 不虛構「已接上」。
