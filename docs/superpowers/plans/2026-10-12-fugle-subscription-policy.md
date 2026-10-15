# TF Asset V4.0.47 direct subscription update policy

User authorization: replace intraday update definitions with direct Fugle subscription, using SaiETF V2.0.2 native market arbitration and StateFlow model. Preserve protected Settings and immutable Finance Core.

1. RED: execute actual MarketRuntime and FinanceProvider with injected bridge events. Assert no price polling timer, independent per-symbol updates, immediate canonical price/PnL update while bootstrap HTTP remains pending, and healthy subscription retaining unchanged last trade.
2. Native: retain frozen SaiETF core verbatim. Intraday refresh uses Fugle REST once at startup/resume/manual/reconnect for lastTrade/referencePrice; accepted trades use the same center. No intraday TWSE/Yahoo price refresh. Socket health/subscription acknowledgements publish metadata independently of ticks. Baseline completion cannot roll back a newer stream trade; same-session referencePrice enriches stream quotes.
3. Frontend: remove foreground cadence interval. Subscribe before initial read; preserve foreground/position/research/manual triggers. Propagate per-symbol streaming health, separating healthy unchanged trades from disconnected last-known prices. No accounting formula change.
4. Test native bootstrap parsing, microseconds, stale response/sequence rejection, trial separation, missing timestamps, session reference isolation. Run inherited suite, typecheck, native bridge and settings/finance locks.
5. Advance all release identities to 4.0.47/40047, backup V4.0.46 ref, atomic feature branch commit, Actions QA APK. Verify artifact integrity, signing identity, version and SHA-256; real-device Fugle validation remains pending.

Review focus: lifecycle event loss, socket authentication/subscription failures, concurrent bootstrap vs trades, HTTP errors and per-symbol coverage. REST is one-shot on explicit lifecycle/recovery triggers; heartbeat/reconnect/persistence timers are not price polling.

## Execution evidence
- Baseline f95c8ce / V4.0.46; backup ref backup-v4.0.46-pre-subscription-20261012.
- RED: actual MarketRuntime test observed one forbidden price interval. GREEN: no interval, pushed price/PnL, independent symbols, late bridge envelope protection, quiet subscription and disconnect status.
- RED: missing native bootstrap/sink support; new native tests exercise lastTrade/time/reference parsing, 500 concurrent admissions, and late REST metadata without price rollback. GREEN.
- RED: actual socket watchdog left unauthenticated connection alive. GREEN: auth/subscription deadlines and failed-send teardown.
- RED: baseline native presentation mislabeled quiet subscribed quote delayed. GREEN: health-clock-aware native presentation and last-price retention.
- Full inherited suite: 132 commands passed via node --import tsx locally (tsx CLI IPC pipes are restricted in this runtime); CI retains standard npm commands.
- Review findings: short atomic admission and late baseline enrichment fixed; inherited auth/subscription recovery fixed. Core six frozen files and canonicalLedger.ts unchanged; protected Settings only VERSION/BUILD.
- Ruling: keep heartbeat, reconnect, persistence and one-shot session boundary timers; these detect connection/session state and do not poll prices.
- Ruling: pin intraday price source to direct Fugle even during outages; retain last-known price with explicit health instead of silently substituting TWSE/Yahoo. Other sources remain available outside trading session. This matches the direct LIVE requirement; without a working Fugle key, intraday updates remain unavailable.
- Device/API-key validation pending. No release-completion claim from CI alone.
