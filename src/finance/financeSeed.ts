import { freezeTradeEntry, type CanonicalLedgerEntry } from './canonicalLedger';
import type { RuntimeQuote } from './FinanceRuntime';

export const INITIAL_CASH=750_000;

export const SEED_QUOTES:readonly RuntimeQuote[]=[
  {symbol:'0050',name:'元大台灣50',currentPrice:109.85,previousClose:108.65,liquidationTradeMode:'ROUND_LOT',dividendFrequency:4,latestDividendPerShare:1.05,pinned:true,sparkline:[104.8,105.2,104.9,106.1,107.4,108.2,109.1,109.85]},
  {symbol:'00878',name:'國泰永續高股息',currentPrice:21.56,previousClose:21.64,liquidationTradeMode:'ROUND_LOT',dividendFrequency:4,latestDividendPerShare:0.4,sparkline:[21.7,21.66,21.61,21.58,21.6,21.55,21.57,21.56]},
  {symbol:'00919',name:'群益台灣精選高息',currentPrice:23.84,previousClose:23.69,liquidationTradeMode:'ROUND_LOT',dividendFrequency:4,latestDividendPerShare:0.72,sparkline:[23.2,23.35,23.4,23.58,23.62,23.71,23.8,23.84]},
  {symbol:'00929',name:'復華台灣科技優息',currentPrice:18.38,previousClose:18.52,liquidationTradeMode:'ROUND_LOT',dividendFrequency:12,latestDividendPerShare:0.14,sparkline:[18.7,18.62,18.58,18.5,18.48,18.42,18.4,18.38]},
  {symbol:'00713',name:'元大台灣高息低波',currentPrice:53.75,previousClose:53.85,liquidationTradeMode:'ODD_LOT',dividendFrequency:4,latestDividendPerShare:1.1,sparkline:[52.9,53.05,53.2,53.18,53.4,53.6,53.7,53.75]},
];

const trades:CanonicalLedgerEntry[]=[
  freezeTradeEntry({id:'seed-b-0050',date:'2026-07-08',kind:'buy',symbol:'0050',name:'元大台灣50',tradeMode:'ROUND_LOT',shares:3000,price:95.23}),
  freezeTradeEntry({id:'seed-b-00878',date:'2026-07-12',kind:'buy',symbol:'00878',name:'國泰永續高股息',tradeMode:'ROUND_LOT',shares:5000,price:19.22}),
  freezeTradeEntry({id:'seed-b-00919',date:'2026-08-03',kind:'buy',symbol:'00919',name:'群益台灣精選高息',tradeMode:'ROUND_LOT',shares:4000,price:22.05}),
  freezeTradeEntry({id:'seed-b-00929',date:'2026-08-11',kind:'buy',symbol:'00929',name:'復華台灣科技優息',tradeMode:'ROUND_LOT',shares:3000,price:18.92}),
  freezeTradeEntry({id:'seed-b-00713',date:'2026-08-18',kind:'buy',symbol:'00713',name:'元大台灣高息低波',tradeMode:'ODD_LOT',shares:1500,price:49.10}),
];

const dividends:CanonicalLedgerEntry[]=[
  {id:'seed-d-0050',date:'2026-09-20',kind:'dividend',symbol:'0050',name:'元大台灣50',perShareAmount:1.05,sharesHeld:3000},
  {id:'seed-d-00878',date:'2026-09-05',kind:'dividend',symbol:'00878',name:'國泰永續高股息',perShareAmount:0.40,sharesHeld:5000},
  {id:'seed-d-00919',date:'2026-09-12',kind:'dividend',symbol:'00919',name:'群益台灣精選高息',perShareAmount:0.72,sharesHeld:4000},
];

export const SEED_LEDGER:readonly CanonicalLedgerEntry[]=[...trades,...dividends];
