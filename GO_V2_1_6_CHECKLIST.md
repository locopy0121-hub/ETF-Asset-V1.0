# GO V2.1.6 QA — Continuous development cycle

Baseline: V2.1.5 head 23db8fa1e3a74963858d61504f947fcf4c95aef4.
Backup verified: backup-v2.1.5-20260923-pre-go-v216; branch: go-v2.1.6-20260923-continuous.

Old U01-U15, G01-G08, N01-N06, T01-T06 all retained; no Codex review required for development QA APK.

| ID | Item | Result / Carryover |
| --- | --- | --- |
| C01 | Safe version + backup | Backup created; target V2.1.6/20106 |
| C02 | Horizontal tabs swipe + preference | CODE submitted; device/gesture conflict pending |
| C03 | Widget explicit preview refresh | CODE submitted; native device click and shared snapshot verification pending |
| C04 | ETF official source normalization | NO PASS carryover: official feed schema and real 0050 strategy unverified |
| C05 | AI article body / summary | NO PASS carryover: live article and backend AI not verified |
| C06 | Dividend complete AB settings | NO PASS carryover: module-level settings incomplete |
| C07 | Widget wall typography / complete holdings | NO PASS carryover: native widget size and 8 holdings device verification pending |
| C08 | Old U/G/N/T coverage and regression | NO PASS carryover, preserve original checklist IDs |
| C09 | GitHub QA APK | Await Actions Quality + Gradle + artifact badging / SHA; not a formal release |

An APK build passing does not mark C02-C08 Feature PASS. Every NO PASS requires source evidence and next fix plan.
