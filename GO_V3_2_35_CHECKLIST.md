# GO V3.2.35｜Runtime Performance + App Response Speed

> Base: V3.2.34
>
> Backup: `backup-v3.2.34-20261001-pre-performance`
>
> Work: `go-v3.2.35-20261001-runtime-performance`

## 目的

在不降低盤中 1 秒行情更新下限、不修改 Canonical Finance Core、手續費、證交稅與 Ledger 算法的前提下，降低每秒行情更新對 JS / Native bridge / SQLite / UI render 的壓力，並縮短 AI 行情回答等待時間。

## 本版 Gate

| ID | Requirement | Acceptance |
|---|---|---|
| P01 | Market refresh single read | Native refresh 回傳的 post-transaction SQLite snapshot 直接使用，不再每 tick 再 readUnifiedMarketData 一次 |
| P02 | 1-second cadence preserved | 行情排程仍允許盤中 1 秒；本版只減少重複工作 |
| P03 | AI quote fast path | SQLite 已有 fresh VERIFIED quote 時，AI 不再額外強制 network/native refresh |
| P04 | Stale quote safety | stale / pending 行情仍必須走 refresh，不可因效能優化降低 freshness gate |
| P05 | History rebuild isolation | 盤中 marketDataVersion 每秒變動不得 abort/restart 全歷史 PnL rebuild |
| P06 | Native force refresh batching | Widget + Monitor 強制刷新請求合併成單一 JS↔Native poll |
| P07 | Native sync coalescing | Widget/Monitor sync 採 last-write-wins；慢 bridge 不堆積每秒 Promise |
| P08 | Disabled monitor quiet mode | Monitor 關閉時不因行情每秒變動持續同步完整 Snapshot |
| P09 | Startup responsiveness | AI 新聞文章抓取/正文解析延後到首屏互動完成後 |
| P10 | Home render memoization | ETF catalog map、股息提醒、交易次數統計不在每個 quote tick 重掃 Ledger |
| P11 | Finance Core lock | Canonical Ledger / fee / tax / Portfolio 計算不修改 |
| P12 | Version identity | 3.2.35 / Android+iOS 30235 / Settings / Backup / CI |
| P13 | Regression | `npm run typecheck` + `npm run test:v3_2_35` |
| P14 | QA APK | GitHub Actions release APK + badging + SHA-256 |
| P15 | Device QA | 真機切頁、快速點擊、1 秒行情、Widget/Monitor、AI 問答仍需裝機驗收 |

## 效能熱點修正

1. **行情中心**
   - 原本：`refreshUnifiedMarketData()` 完成後，再呼叫 `loadUnifiedMarketData()`。
   - 現在：直接採用 refresh 已回傳的 authoritative SQLite snapshot。
   - 效果：盤中每次更新少一次 Native bridge、SQLite read、JSON stringify/parse。

2. **AI 行情**
   - fresh VERIFIED 本機行情直接回答。
   - 只有 stale / pending / missing 才向行情來源補抓。
   - freshness / provenance 規則不降級。

3. **每日損益歷史**
   - full-range official rebuild 不再把 live `marketDataVersion` 當 effect dependency。
   - 最新版本透過 ref 帶入結果，避免每秒 abort/restart 大型 fetch。

4. **Widget / Monitor**
   - 強制刷新 request 合併為一次 bridge poll。
   - Snapshot sync 採 coalescing queue，只保留最新待同步版本。
   - Monitor 關閉時停止每 tick Snapshot sync。

5. **首頁**
   - catalog map / dividend reminders / transaction counts 分離 memo。
   - 行情每秒更新時不再重複掃描不變的 Ledger/metadata。

## 不變條件

- 盤中 1 秒最低行情更新能力保留。
- TWSE <=> SQLite <=> App 單一行情中心原則保留。
- Immutable Finance Core 不修改。
- Widget / Monitor / App 仍共享同一份市場與財務資料來源。
