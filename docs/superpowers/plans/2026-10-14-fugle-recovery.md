# Fugle recovery Implementation Plan

> **For agentic workers:** Execute inline using superpowers:executing-plans. User has authorized continuation, fixes and GitHub APK builds.

**Goal:** Repair reproducible subscription recovery defects and expose safe source diagnostics without claiming the unobserved phone error is proven.
**Architecture:** Keep TF Asset's process-wide direct Fugle socket and canonical data/finance center. Verify subscription acknowledgement before connection health/retry recovery; retain bounded diagnostic categories, never raw source payloads or credentials.
**Tech Stack:** Kotlin, OkHttp, React Native TypeScript, GitHub Actions.
**Spec:** User's current no-update reports and source screenshots; baseline d9c01b9 V4.0.56.

## Global Constraints
- V4.0.57 / 40057, verified APK required.
- No fixed price polling; keep schedule, shared native owner and V55 coalescing.
- Protected Settings shell only release constants; immutable finance and frozen center/arbitrator unchanged.
- Source diagnostics contain counts, timestamps, numeric codes and fixed categories only.

## Review Focus
- Symbol updates during cooldown must not bypass it.
- Auth/heartbeat with missing or partial ACK must not report healthy or reset retry backoff.
- Replacing subscriptions releases old IDs before adding symbols to avoid transient quota overlap.
- Credential errors remain terminal until credential change; transport errors retain automatic retry.
- Diagnostic storage stays bounded, replay-safe and below the existing 400-character detail limit.

### Task 1: Subscription recovery
**Files:** native/android/SaiEtfFugleWebSocketProvider.kt; scripts/native/V457RecoveryTest.kt; scripts/test-native-market-bridge.sh.
**Interfaces:** Existing provider connect/replaceSubscriptions/health; no new price authority.
- [ ] Write actual production-provider tests for pending health, retry gate/backoff, replacement ACK order; observe baseline failures.
- [ ] Gate health/retry reset on desired trade ACK coverage. Respect reconnect deadline. Wait for unsubscribe ACK before adding replacements.
- [ ] Run compiled native suite; add tests for successful recovery, credential rejection and valid trade receipt.

### Task 2: Source diagnostics and release
**Files:** native/android/TfAssetMarketFlowDiagnostics.kt; same provider; src/diagnostics/DiagnosticRuntime.tsx; diagnostic tests; release identities/workflow/docs.
**Interfaces:** Existing readNativeMarketFlowDiagnostics returns bounded records. Source records are separate from MARKET_FLOW and omit JS counters.
- [ ] Test provider-source checkpoint capture, bounded history and JS replay/type dispatch before implementation.
- [ ] Record fixed failure categories/numeric codes and auth/subscription counts. Never raw messages, symbol payloads, or API keys.
- [ ] Run full inherited gates, TypeScript, native compiled suite and independent branch review.
- [ ] Publish isolated branch/draft PR, follow GitHub QA to verified V4.0.57 APK and deliver it.

## Evidence ledger
- Baseline screenshot: trades=0 with snapshots/appApplied=984. Later FUGLE COOLDOWN. Auth/subscription failure reason absent. No connected phone/emulator, cannot validate genuine credentials or device lifecycle.
- Ruling: Repair only reproducible recovery flaws plus evidence capture; do not invent the phone's server error or add paid API/polling.
- Task 1: original production tests failed pending health, retry gate, replacement order and auth backoff; green after repair. Added unsubscribe ACK timeout red→green and successful ACK/valid trade/credential rejection coverage.
- Final review: obsolete pending subscribe replacement overlap identified; test red→green with pending-subscribe release gate. Initial reviewer was interrupted by unavailable model quota; a fresh independent review requested on available model.
- User steering 15:03 Taipei: external Widget and Monitor HH:mm:ss. Implement latest selected holding source clock, missing placeholder, seconds in per-row fields. Existing formatter test red→green; no timer or generatedAt substitution.
- Final review: clock shared a weighted toolbar row and could collapse on narrow high-density overlays; source-layout regression red→green, dedicated full-width clock row added. Widget clock retains its own wrap-content view. Device high-density visual acceptance still pending.
- Local verification: 150/150 inherited aggregate gates (native suite already executed successfully in this request and reused during the pure JS rerun), TypeScript, nine production-provider recovery cases, compiled clock formatter/selected-source tests, diagnostic persistence/replay and clock layout contract PASS. GitHub fresh full native QA and APK identity verification pending.
