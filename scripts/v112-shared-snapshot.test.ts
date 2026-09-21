import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import type {CanonicalLedgerSnapshot} from '../src/finance/canonicalLedger';
import {buildSharedSnapshot} from '../src/finance/sharedSnapshotAdapter';
import type {HoldingQuote} from '../src/domain/uiModels';

const canonical={
  cashBalance:125000,
  totalAssets:625000,
  portfolio:{
    totalMarketValue:500000,
    totalUnrealizedProfit:22000,
    realizedNetPnL:3500,
    totalDividendsReceived:4200,
    totalPnl:29700,
  },
  holdings:[],
} as unknown as CanonicalLedgerSnapshot;

const holding:HoldingQuote={
  symbol:'0050',
  name:'元大台灣50',
  shares:1000,
  price:50,
  previousClose:49,
  avgCost:45,
  tradeAvg:44.8,
  costAvg:45,
  marketValue:50000,
  pnl:5000,
  pricePnl:5200,
  roi:11.11,
  weight:10,
  cumulativeDividend:1000,
  realizedPnl:0,
  comprehensivePnl:6000,
  pinned:false,
  sparkline:[49,50],
};

const generatedAt=Date.parse('2026-09-21T12:34:56.000Z');
const snapshot=buildSharedSnapshot({canonical,holdings:[holding],generatedAt});
assert.equal(snapshot.source,'canonical-finance-core');
assert.equal(snapshot.contractVersion,1);
assert.equal(snapshot.generatedAt,'2026-09-21T12:34:56.000Z');

// TF Asset display contract: headline total assets excludes the separate cash field.
assert.equal(snapshot.asset.totalAssets,canonical.portfolio.totalMarketValue);
assert.equal(snapshot.asset.marketValue,canonical.portfolio.totalMarketValue);
assert.equal(snapshot.asset.cash,canonical.cashBalance);
assert.equal(snapshot.asset.unrealizedPnl,canonical.portfolio.totalUnrealizedProfit);
assert.equal(snapshot.asset.realizedPnl,canonical.portfolio.realizedNetPnL);
assert.equal(snapshot.asset.dividendIncome,canonical.portfolio.totalDividendsReceived);
assert.equal(snapshot.asset.totalReturn,canonical.portfolio.totalPnl);
assert.equal(snapshot.holdings.length,1);
assert.equal(snapshot.holdings[0]?.symbol,'0050');
assert.equal(snapshot.holdings[0]?.marketValue,holding.marketValue);
assert.equal(snapshot.holdings[0]?.pnl,holding.pnl);
assert.equal(snapshot.holdings[0]?.comprehensivePnl,holding.comprehensivePnl);
assert.ok(Math.abs((snapshot.holdings[0]?.changePercent??0)-((50-49)/49*100))<1e-9);

const finance=readFileSync('src/finance/FinanceRuntime.tsx','utf8');
const app=readFileSync('App.tsx','utf8');
const settings=readFileSync('src/screens/SettingsScreen.tsx','utf8');
const home=readFileSync('src/screens/HomeScreen.tsx','utf8');
const portfolio=readFileSync('src/screens/PortfolioScreen.tsx','utf8');
const dividend=readFileSync('src/screens/DividendScreen.tsx','utf8');
const ai=readFileSync('src/screens/AiScreen.tsx','utf8');
const widget=readFileSync('src/widget/widgetDomain.ts','utf8');
const monitor=readFileSync('src/monitor/monitorDomain.ts','utf8');

assert.match(finance,/buildSharedSnapshot\(\{canonical:snapshot,holdings,generatedAt:market\.lastSuccessAt\}\)/);
assert.match(finance,/\[snapshot,holdings,market\.lastSuccessAt\]/);
assert.match(app,/syncNativeWidget\(widgetSettings\.config,finance\.sharedSnapshot\)/);
assert.match(app,/syncNativeMonitor\(monitorSettings\.config,finance\.sharedSnapshot\)/);
assert.match(settings,/previewSnapshot=\{finance\.sharedSnapshot\}/g);
for(const source of [home,portfolio,dividend,ai])assert.match(source,/useFinance\(\)/,'App page must consume canonical Finance Runtime');
assert.match(widget,/snapshot\.holdings/);
assert.match(monitor,/snapshot\.holdings/);

console.log('v1.1.2 Shared Snapshot full-app linkage PASS');
