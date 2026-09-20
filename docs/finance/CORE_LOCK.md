# Finance Core Lock

Status: **LOCKED**

Source repository: `locopy0121-hub/ETF-Finance-Manager-V3.7`  
Source commit: `a872644c572d24fc5ffe597a97eb6d7d8bd7283f`  
Meaning: completed V3.7.8 APK after actual settlement truth fixes.

## Locked source blobs

- `src/types/etf.ts` — source blob `0a3ecf7c1fcc4b04124486d12a2d83c7f4035146`
- `src/utils/etfCalculators.ts` — source blob `ac4085c9faee26328aaa7d68dfdcd62f3f7459cd`
- `src/data/brokerProfiles.ts` — source blob `697de8f13ca57456471c9d28c2e6f4731ad86a62`
- `scripts/BREAKING_HUANAN_CORE_TEST.cjs` — source blob `d163b16e8023cb1e19ed90a8b016f29f288af58b`

## Rule

The copied finance core is a protected inheritance asset. Product UI, Widget, Monitor and page code may consume its outputs but must not reproduce or silently modify its financial formulas.

Any future finance-core change requires:
1. an explicit finance-core change request,
2. new golden tests,
3. a source-of-truth review,
4. a separate versioned decision record.
