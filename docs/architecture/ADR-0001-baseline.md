# ADR-0001｜TF Asset Architecture Baseline

Status: Accepted

## Decision

TF Asset is a new product. Legacy product shell is not inherited.

The only protected inheritance is:
1. Canonical Finance Core from V3.7.8
2. Canonical Snapshot/Data Pipeline semantics
3. Monitor engine capabilities
4. Widget capabilities
5. A-B relationship law

## Boundaries

```
Raw Transactions + Market Data
          |
          v
Canonical Finance Core
          |
          v
Canonical Snapshot
   |          |          |
   v          v          v
TF Asset UI  Widget   Floating Monitor
```

UI layers may format, filter, sort and render data. They may not recreate finance formulas.

## Page model

Main tabs:
- Home
- Ledger
- Portfolio
- Dividend
- Settings

Secondary routes are pushed from these pages; they are not additional main tabs.

## Settings law

Page-level settings are frame-oriented:
Page -> Actual frame (A) -> Direct settings (B) -> deeper detail (C/D)

No cross-frame direct control.
