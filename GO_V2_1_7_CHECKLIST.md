# TF Asset V2.1.7 GO / QA checklist (2026-09-23)
Baseline V2.1.6 PR #23 head 6e2764ce5acf31c277d407e42ef237f565eba2cc.
Verified pre-update source backup: backup-v2.1.6-20260923-pre-go-v217.
All U01–U15, G01–G08, N01–N06, T01–T06, C01–C09 carry over; do not mark them complete based on this QA build.
| ID | Requested acceptance | Status |
|---|---|---|
| D01 | Home Widget tap refreshes in place without opening App | CODE changed; native device result NO PASS pending |
| D02 | Native Widget 1–4 column fixed grid with consistent last row | CODE changed; device resizing NO PASS pending |
| D03 | Officially sourced ETF category and payout labels after symbol | Existing partial V2.1.5; official mapping and all-surface UI NO PASS |
| D04 | Independent AB font/color/effects with palette + floating card preview | NO PASS |
| D05 | Confirmed dividend event alerts including last purchase, ex-date, payment, received; optional blink | NO PASS |
| D06 | Widget quote refresh updates live quote on background worker; finance figures require canonical App refresh | Partial CODE; entire shared financial snapshot NO PASS |
| D07 | Full old checklist regression and device acceptance | NO PASS |
| D08 | GitHub-only V2.1.7 QA APK quality/build/artifact/aapt/SHA | Await CI |
No fabricated ETF metadata or ex-dividend date. Existing cached finance fields must not be recomputed in a display consumer.
