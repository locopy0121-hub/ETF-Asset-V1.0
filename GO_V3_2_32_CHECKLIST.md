# GO V3.2.32｜App-first AI Response Arbitration

> Base: V3.2.31 head `d489006d7732bf374545585b7e4b01f6938d1ccb`
>
> Backup: `backup-v3.2.31-20261001-pre-ai-local-first`
>
> Work: `go-v3.2.32-20261001-ai-local-first`

## 根因

V3.2.31 已補齊 screenshot 中的 deterministic fallback，但如果 Gemini endpoint 正常「先被呼叫」再失敗，使用者仍會先付出 timeout / provider dependency。真正的架構應是：

`Question → App Tool/Evidence → Response Arbitration → (足夠資料直接回答) / (需要開放式推理才送 Gemini)`

Gemini 是 reasoning / presentation provider，不是 TF Asset 金融事實回答的 availability gate。

## Gate

| ID | Requirement | Acceptance |
|---|---|---|
| L01 | Response Arbitration | 新增純函式路由 LOCAL_CORE / LOCAL_EVIDENCE / GEMINI |
| L02 | Canonical facts local-first | 行情、持股、總資產、交易、股息有 Tool result 時不得先打 Gemini |
| L03 | Evidence facts local-first | SECURITY_PROFILE / PERFORMANCE / NEWS / ETF_COMPARE 有可用 Evidence 時不得先打 Gemini |
| L04 | General AI retained | 一般知識、開放式說明仍可進 Gemini |
| L05 | Scenario retained | 複雜 hypothetical / scenario 仍保留 Gemini reasoning |
| L06 | Screenshot cases | 00415A上市、00415A新聞、00496A年化、00406A自我比較均可不依賴 Gemini endpoint 取得 App 回答 |
| L07 | No extra fetch in arbitration | Arbitration 本身不得 fetch / query DB |
| L08 | Finance Core lock | fee/tax/Ledger immutable core 不變 |
| L09 | Version identity | 3.2.32 / Android+iOS 30232 / Settings / Backup / CI |
| L10 | Typecheck + regression | `npm run typecheck` + `npm run test:v3_2_32` |
| L11 | QA APK | GitHub-only APK + artifact + badging + SHA-256 |
| L12 | Android device | 真機 screenshot scenarios 仍需使用者驗收，不可由 CI 推定 |

本版的核心不是再加 keyword，而是把「誰有資格先回答」改成 App verified data 優先。
