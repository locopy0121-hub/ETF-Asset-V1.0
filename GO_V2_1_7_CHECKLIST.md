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
| D08 | GitHub-only V2.1.7 QA APK quality/build/artifact/aapt/SHA | BUILD PASS: run 35820954643, artifact 10733321946; device acceptance still pending |
No fabricated ETF metadata or ex-dividend date. Existing cached finance fields must not be recomputed in a display consumer.

## QA build evidence (not Feature PASS / not formal Release)
- Source commit: `06da86c3ed608a01ab1c24a40240d154c489d91f`.
- Quality + Android Gradle + artifact upload successful: https://github.com/locopy0121-hub/ETF-Asset-V1.0/actions/runs/35820954643
- Artifact ZIP: `TF-Asset-V2.1.7-QA-APK`, ID `10733321946`, 23,296,018 bytes, ZIP SHA-256 `58e031807c5c82ee868f58fca820696db2a295ce67c198c21d89bfb7cd97bba5`.
- APK: `TF-Asset-V2.1.7-QA.apk`, 53,788,345 bytes, SHA-256 `5480b1829aaee9d52d888dcd3e77fee176f8afefdeb834fac56a99d96c48d0c4`; `unzip -t` PASS, `aapt` package `com.tfasset.app`, versionName `2.1.7`, versionCode `20107` PASS.
- Eight new checklist items: D08 BUILD PASS (1), D01/D02 code-built but device result pending (2), D03–D07 incomplete / NO PASS (5). **Feature ALL PASS: NO.** Retain original U/G/N/T/C failures and device validation queue.
- Native background refresh updates market quotes only; financial totals still require canonical App snapshot sync. Do not treat changes in quote prices as recalculated market value or PnL until canonical refresh occurs.
