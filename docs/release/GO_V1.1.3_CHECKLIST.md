# TF Asset V1.1.3 — LOCKED GO Checklist
Baseline: main 9fdd92fcbc41e9628f4d3402264f4b1acfc10a7d (V1.1.2)
Backup: backup/V1.1.2-2026-09-22
Work branch: work/V1.1.3-2026-09-22
Status: IN PROGRESS — release NOT authorized until all checks pass.

## Original red-light items (8)
1. Frame-background integration ONLY, retaining all child element styles, A–B overrides, chart/position/size/effects. Verify all frame surfaces and per-frame background controls.
2. Page title and subtitle independently configurable by A–B page settings on every applicable page; Settings page itself never 360-editable.
3. Remove every obsolete *UI-facing* V3.7.8 label (do NOT change golden financial tests or immutable finance core references).
4. Restore dedicated AI control category inside Settings, properly persisted and collapsible.
5. Fix AI holding count/lookup/portfolio/quote freshness using canonical finance and currently held symbols. No duplicate computations.
6. Fix AI answer text layout (sections, table-like financial fields, line breaks and long text) in AI page and global floating AI.
7. Add persisted A–B controls for AI floating entry/button, positioning and open/minimized state, appearance and preview; ensure drag/collapse/close work.
8. Dividend information and clickable details, including calendar annotations for last eligible buy day, ex-dividend day, record date, payout date and booked payment; source provenance, missing-data indication, historical details and duplicate-ledger prevention.

## Mandatory acceptance gates for every applicable item
- A. CODE exists; B. RUNTIME wiring and persisted settings function; C. user-accessible UI interaction; D. result correctness and regression.
- Every new feature has its own settings entry and required controls/tools in its designed surface; A–B progressively collapsible.
- Every *color picking* tool offers linked **system gain and system loss color** choices, without replacing existing custom colors. No general blue-to-theme-primary replacement in this release.
- Finance immutable core untouched; V3.7.8 Golden Truth tests preserved. YELLOW scope unchanged / held to next release.
- No formal GitHub APK workflow until each item passes completeness and Final Checklist reconciliation. GitHub-only native APK, version increment, artifact/version/SHA/package verification.

## Progress log
- Repo identity and baseline: checked.
- Backup: created backup/V1.1.2-2026-09-22.
- ERROR_LESSONS.md and Work_Project_Rules.md: read in required order.
- [ ] Item 1 — IN PROGRESS; no final PASS yet.
- [ ] Item 2 — NOT STARTED.
- [ ] Item 3 — NOT STARTED.
- [ ] Item 4 — NOT STARTED.
- [ ] Item 5 — NOT STARTED.
- [ ] Item 6 — NOT STARTED.
- [ ] Item 7 — NOT STARTED.
- [ ] Item 8 — NOT STARTED.
- [ ] Final reconciliation — BLOCKED.
- [ ] Formal GitHub APK Action — NOT AUTHORIZED.
