# TF Asset GO 2026-09-23 — six additional acceptance items (V2.1.4 working branch)

Baseline: PR #20 V2.1.3 HEAD d715437e03127c3e2beecffe4de3bf8ee8396c0a. Mandatory backup: backup-v2.1.3-20260923-pre-go6 at same SHA. This new list is **additive** to UPDATE.md U01–U15 and G01–G08; no pre-existing item is removed or marked PASS by creating this file. Immutable Finance Core stays untouched. GitHub-only build, formal Action blocked until all items have CODE / RUNTIME / UI / RESULT evidence and full reconciliation.

| ID | Requirement | Acceptance / blocking evidence | Status |
| --- | --- | --- | --- |
| N01 | Global quote freshness | Verify TWSE quote timestamps, nontrading/stale/fallback display and source; portfolio + home + monitor + mini + widget agree per ticker after same refresh, market failure does not say fresh; verify shown prices vs same-second source | 未證實 |
| N02 | Widget tap forced refresh | Android widget refresh control launches/foregrounds App, consumes every new pending request (including while app already foreground), force-fetches market, updates native shared snapshot and visible widget, handles API failure/repeated taps; native device test | 進行中 |
| N03 | Floating full-card preview across all settings | Each applicable settings component shows exactly one entire target card using actual data / draft settings, not six tiles or isolated profit field; drag, resize, collapse, close, cancel rollback and persistence; cross-screen and device evidence | 未證實 |
| N04 | Automatic ETF strategy/dividend tags | ETF metadata from verified issuer/exchange records, taxonomy incl 市值型/高股息/債券 and 月/雙月/季/半年/年/不配/不定期, cache/update/provenance, unknown not guessed; each surface shares classification and retains style-only controls | 未開始 |
| N05 | Grounded AI full article reader | Legally readable article body, 3–5 non-title extracted claims with source/date, backend AI summarization only with genuine text; show failure if restricted/short article; related-holdings and duplicate news accuracy test | 未證實 |
| N06 | Horizontal main-page swiping and Android layered back | Swipe according to visible tab order while preserving page states; nested K-line/chart/calendar/wall/editor gesture precedence; back closes modal/detail before tab history and exits only at root; Android device gestures | 未開始 |

Gate sequence per ERROR_LESSONS.md and Work_Project_Rules.md: backup → lock checklist → prior lessons → preflight → one item implementation + runtime/UI/result regression → item PASS → next → final U/G/N reconciliation → only then formal GitHub Action, artifact, SHA-256, APK badging and real-device installation validation. A QA APK is non-release. No item passes solely because CI is green.
