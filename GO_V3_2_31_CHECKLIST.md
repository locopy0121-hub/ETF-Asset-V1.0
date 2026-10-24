# GO V3.2.31｜AI Resilient Local Responder

> Screenshot feedback: V3.2.30 architecture exists, but Gemini outage still leaks through as the user-visible answer and several finance questions stop before producing a useful local result.
>
> Base: V3.2.30 head `11e8339275eed57494e06005f8232e8cf0806ac7`
>
> Backup: `backup-v3.2.30-20261001-pre-ai-responder`
>
> Work: `go-v3.2.31-20261001-ai-responder`

## Screenshot failures locked into this release

1. `預估00496A今年年化` must not return a generic Gemini outage message. If the symbol cannot be verified in the listed-security catalog and has no official history, TF Asset must explicitly say the annualized figure cannot be calculated reliably.
2. `00415A上市` must route to a Security Profile recipe and attempt listing/profile discovery instead of treating the request as general conversation.
3. `00415A新聞` must use symbol/name relevance filtering, prefer publisher article bodies, show concise summaries and Taiwan-local readable timestamps instead of dumping long raw RSS/GMT rows.
4. `00406A與00406A比較` must immediately recognize a self-comparison and ask for a second ETF instead of depending on Gemini.
5. Gemini is the presentation/reasoning layer, not the availability gate for deterministic App/market facts.

## Gates

| ID | Requirement | Evidence |
|---|---|---|
| R01 | SECURITY_PROFILE recipe | listing / 掛牌 / 募集 / 成立 queries route to profile evidence |
| R02 | Unknown-symbol truthfulness | UNKNOWN market + unresolved name remains PARTIAL, never VERIFIED |
| R03 | Performance fallback | no official history => specific no-calculation answer, no fabricated annualized number |
| R04 | Publisher-body news | RSS is discovery only; article body/highlights upgrade evidence when verified |
| R05 | News relevance | symbol or resolved security name must match the story |
| R06 | Local-time news display | no raw GMT dump in local fallback |
| R07 | Self compare | same symbol twice returns deterministic clarification and skips unnecessary history fetch |
| R08 | Profile listing discovery | listing date can be extracted from relevant publisher evidence; source status remains explicit |
| R09 | Gemini outage resilience | Evidence responder answers supported fact/performance/news/compare/profile paths |
| R10 | Finance Core lock | no changes to fee/tax/Ledger financial formulas |
| R11 | Version identity | 3.2.31 / Android 30231 / iOS 30231 / Settings / Backup / QA CI |
| R12 | Typecheck + aggregate regression | `npm run typecheck`, `npm run test:v3_2_31` |
| R13 | QA APK | GitHub APK, artifact, badging, SHA-256 |
| R14 | Android device | screenshot scenarios remain device acceptance; CI cannot claim them PASS |

V3.2.31 is a QA hardening release. R14 requires device evidence and is not inferred from build success.
