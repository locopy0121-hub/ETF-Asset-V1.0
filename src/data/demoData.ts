import type { DividendDemoItem, HoldingQuote, LedgerDemoItem, MarketNewsItem } from '../domain/uiModels';

export const DEMO_HOLDINGS: HoldingQuote[] = [
  { symbol:'0050', name:'元大台灣50', shares:3000, price:109.85, previousClose:108.65, avgCost:95.23, marketValue:329550, pnl:43866, roi:15.35, weight:38.2, cumulativeDividend:12600, pinned:true, sparkline:[104.8,105.2,104.9,106.1,107.4,108.2,109.1,109.85] },
  { symbol:'00878', name:'國泰永續高股息', shares:5000, price:21.56, previousClose:21.64, avgCost:19.22, marketValue:107800, pnl:11700, roi:12.17, weight:21.8, cumulativeDividend:23800, sparkline:[21.7,21.66,21.61,21.58,21.6,21.55,21.57,21.56] },
  { symbol:'00919', name:'群益台灣精選高息', shares:4000, price:23.84, previousClose:23.69, avgCost:22.05, marketValue:95360, pnl:7160, roi:8.12, weight:19.3, cumulativeDividend:14600, sparkline:[23.2,23.35,23.4,23.58,23.62,23.71,23.8,23.84] },
  { symbol:'00929', name:'復華台灣科技優息', shares:3000, price:18.38, previousClose:18.52, avgCost:18.92, marketValue:55140, pnl:-1620, roi:-2.85, weight:11.1, cumulativeDividend:8200, sparkline:[18.7,18.62,18.58,18.5,18.48,18.42,18.4,18.38] },
  { symbol:'00713', name:'元大台灣高息低波', shares:1500, price:53.75, previousClose:53.85, avgCost:49.1, marketValue:80625, pnl:6975, roi:9.47, weight:9.6, cumulativeDividend:11200, sparkline:[52.9,53.05,53.2,53.18,53.4,53.6,53.7,53.75] },
];

export const DEMO_NEWS: MarketNewsItem[] = [
  { id:'n1', title:'台股量能回溫，ETF 資金持續流入大型權值族群', source:'市場快訊', time:'10:42' },
  { id:'n2', title:'高股息 ETF 配息季進入密集期，市場關注填息表現', source:'產業新聞', time:'09:58' },
  { id:'n3', title:'美股主要指數震盪，科技與金融板塊走勢分歧', source:'國際市場', time:'08:35' },
  { id:'n4', title:'債券殖利率變動，資產配置型 ETF 交易升溫', source:'資產配置', time:'07:50' },
];

export const DEMO_LEDGER: LedgerDemoItem[] = [
  { id:'l1', date:'09/20', kind:'買進', symbol:'0050', shares:1000, amount:109850, fee:101, tax:0 },
  { id:'l2', date:'09/18', kind:'股息', symbol:'00878', amount:1850 },
  { id:'l3', date:'09/16', kind:'賣出', symbol:'00929', shares:1000, amount:18420, fee:17, tax:18 },
  { id:'l4', date:'09/12', kind:'買進', symbol:'00919', shares:2000, amount:47200, fee:43, tax:0 },
];

export const DEMO_DIVIDENDS: DividendDemoItem[] = [
  { id:'d1', date:'2026-09-05', symbol:'00878', name:'國泰永續高股息', amount:1850, status:'已入帳' },
  { id:'d2', date:'2026-09-12', symbol:'00919', name:'群益台灣精選高息', amount:2400, status:'已入帳' },
  { id:'d3', date:'2026-09-20', symbol:'0050', name:'元大台灣50', amount:3200, status:'待入帳' },
  { id:'d4', date:'2026-09-26', symbol:'00713', name:'元大台灣高息低波', amount:1680, status:'預估' },
];
