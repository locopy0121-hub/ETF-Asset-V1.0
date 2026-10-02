# TF Asset V3.2.49 GO Checklist

- [x] Base: V3.2.48 / 30248.
- [x] Backup: backup-v3.2.48-20261002-pre-v3.2.49.
- [x] Version: 3.2.49 / 30249.
- [x] TWSE currentPrice accepts z only.
- [x] pz / bid / ask / y excluded from holdings currentPrice, PnL and market value.
- [x] Yahoo backup realtime remains the zero-cost trade-like fallback.
- [x] Newer trade-like source timestamp may replace an older trade-like source regardless of provider rank.
- [x] Equal timestamp still uses quality/source tie-break.
- [x] SQLite V8 removes legacy bid_ask primary rows.
- [x] JS unified adapter rejects bid_ask primary quote rows.
- [x] Server and Android local Market Center aligned.
- [ ] CI aggregate PASS.
- [ ] Backend integration PASS.
- [ ] QA APK / AAPT / SHA / artifact PASS.
- [ ] Device compare: 00406A / 009816 / 0050 against broker at same second.
