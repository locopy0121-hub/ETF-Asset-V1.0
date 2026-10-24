# V4.0.12 After-hours Stability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep the verified closing snapshot stable across the quote wall, Mini monitor, and Widget after Taiwan market close.

**Architecture:** The native SaiETF market core remains the only quote authority. `MarketDataCenter` will retain a same-session trusted trade after close and fetch only symbols without a usable closing snapshot; `MarketArbitrator` will prevent a lower-priority fallback from replacing that trade merely because its timestamp is later. JS and Android will use the same `[09:00, 13:30)` session boundary.

**Tech Stack:** Kotlin/JVM market core, React Native TypeScript, Node and Kotlin regression scripts, Android Gradle.

**Spec:** `docs/releases/V4.0.12-AFTER-HOURS-STABILITY.md`

## Global Constraints

- Preserve Fugle as highest-priority live source and Yahoo as fallback.
- Keep row-level fault isolation; one missing symbol cannot blank valid symbols.
- Do not synthesize timestamps or prices.
- Preserve seven-day bounded offline snapshots and next-session expiry behavior.

## Review Focus

- A newer Yahoo timestamp after close must not replace a same-session Fugle trade.
- A same-session trusted close must avoid unnecessary fallback calls after close.
- Missing symbols must still be fetched without replacing covered symbols.
- Exactly 13:30 Asia/Taipei must be after-hours in both Kotlin and TypeScript.
- Restarted persisted snapshots must remain usable and keep their original source clock.

---

### Task 1: Post-close source protection

**Files:**
- Modify: `native/android/SaiEtfMarketArbitrator.kt`
- Modify: `native/android/SaiEtfMarketDataCenter.kt`
- Test: `scripts/native/V412AfterHoursStabilityTest.kt`

**Interfaces:**
- Consumes: `MarketQuote`, `MarketBatch`, `MarketArbitrator.decide`.
- Produces: session-aware arbitration and after-hours coverage in `MarketDataCenter.refresh`.

- [ ] Write failing tests for lower-priority overwrite, covered-symbol fallback suppression, and missing-symbol fetch.
- [ ] Run the native test and confirm the expected assertions fail.
- [ ] Add the smallest session-aware arbitration and refresh changes.
- [ ] Run the native test and existing native bridge suite until green.

### Task 2: Shared close boundary and release

**Files:**
- Modify: `native/android/SaiEtfMarketRuntime.kt`
- Modify: `package.json`
- Modify: `app.json`
- Create: `docs/releases/V4.0.12-AFTER-HOURS-STABILITY.md`
- Test: `scripts/native/V412AfterHoursStabilityTest.kt`
- Test: `scripts/v4_0_12-after-hours-contract.test.cjs`

**Interfaces:**
- Consumes: native runtime phase and TypeScript valuation session contract.
- Produces: consistent 13:30 after-hours classification and V4.0.12 metadata.

- [ ] Add a failing boundary contract for exactly 13:30 Asia/Taipei.
- [ ] Change the native end boundary to exclusive and record the release behavior.
- [ ] Run V4.0.12 tests, the full repository suite, typecheck, and Android release build.
- [ ] Record APK size, package metadata, and SHA-256 evidence.
