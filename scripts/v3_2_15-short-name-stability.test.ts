import assert from 'node:assert/strict';
import fs from 'node:fs';
import {parseOfficialEtfRow} from '../src/market/etfMetadata';
import {marketIntradaySeriesFromRow} from '../src/market/marketCenterViews';
import type {RuntimeQuote} from '../src/finance/financeSeed';

const official=parseOfficialEtfRow({
  '基金代號':'0050',
  '基金中文名稱':'元大台灣卓越50證券投資信託基金',
  '基金簡稱':'元大台灣50',
  '標的指數名稱':'臺灣50指數',
},Date.now());
assert.equal(official?.name,'元大台灣50','mobile UI must prefer the official ETF short label');

const intraday=[
  {at:Date.now()-5_000,price:111.2,quality:'trade' as const,source:'TWSE_MIS' as const},
  {at:Date.now(),price:111.3,quality:'trade' as const,source:'TWSE_MIS' as const},
] as const;
const quote:RuntimeQuote={
  symbol:'0050',name:'元大台灣50',currentPrice:111.3,previousClose:112.4,
  sourceQuoteAt:Date.now(),quality:'trade',liquidationTradeMode:'ROUND_LOT',
  dividendFrequency:4,sparkline:[111.2,111.3],intraday,
};
assert.strictEqual(
  marketIntradaySeriesFromRow(quote).points,
  intraday,
  'intraday views must reuse the immutable market-center array instead of cloning it',
);

const read=(path:string)=>fs.readFileSync(path,'utf8');
const mini=read('src/components/MiniHoldingChart.tsx');
const finance=read('src/finance/FinanceRuntime.tsx');
const home=read('src/screens/HomeScreen.tsx');
const market=read('src/market/MarketRuntime.tsx');
const history=read('src/finance/useDailyPnlHistory.ts');
const editor=read('src/editor/pageEditor.tsx');

assert.match(mini,/MAX_MINI_RENDER_POINTS=160/);
assert.match(mini,/downsampleIntradayPoints/);
assert.doesNotMatch(mini,/new Intl\.DateTimeFormat/,
  'mini chart must not construct Intl formatters for thousands of points');
assert.match(finance,/new Map\(market\.quotes\.map/);
assert.match(finance,/ledgerNameBySymbol/);
assert.doesNotMatch(finance,/marketValuationQuoteFor\(market\.quotes,row\.symbol\)/,
  'finance projection must not rescan the whole quote array for each row');
assert.doesNotMatch(home,/marketIntradaySeriesFor\(market\.quotes/,
  'home must consume the already projected finance holdings instead of cloning intraday data again');
assert.match(market,/refreshVisibleRef/);
assert.match(market,/AppState\.currentState==='active'/,
  'scheduled quote polling must stay idle while the app is inactive');
assert.match(history,/30_000/,
  'live PnL persistence must be throttled instead of writing every 5-second quote tick');
assert.match(editor,/setTimeout\(\(\)=>\{/);
assert.match(editor,/\},300\);/,
  'layout editor persistence should be debounced during drag and resize');

console.log('V3.2.15 ETF short name + stability/resource regression PASS');
