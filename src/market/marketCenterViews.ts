import type {RuntimeQuote} from '../finance/financeSeed';

const VALUATION_QUALITIES=new Set(['trade','backup_realtime','previous_close','official_close']);
const EMPTY_INTRADAY:NonNullable<RuntimeQuote['intraday']>=[];

const sourceTimeValid=(row:RuntimeQuote|undefined)=>
  Boolean(row&&typeof row.sourceQuoteAt==='number'&&Number.isFinite(row.sourceQuoteAt)&&row.sourceQuoteAt>0);

/**
 * Row-level helpers avoid repeated Array.find calls when a consumer already
 * indexed the Market Center snapshot by symbol.
 */
export function marketQuoteSnapshotFromRow(row:RuntimeQuote|undefined):RuntimeQuote|undefined{
  return row&&Number.isFinite(row.currentPrice)&&row.currentPrice>0?row:undefined;
}

export function marketIntradaySeriesFromRow(row:RuntimeQuote|undefined){
  return {
    date:row?.intradayDate??null,
    previousClose:row?.intradayPreviousClose??null,
    // Keep the immutable Market Center array by reference. Copying thousands
    // of 5-second points on every render caused avoidable memory pressure.
    points:row?.intraday??EMPTY_INTRADAY,
  };
}

export type ValuationContext={now?:number;unresolvedSymbols?:readonly string[]};
const DAY=86_400_000;
const taipeiDate=(at:number)=>new Date(at+8*3_600_000).toISOString().slice(0,10);

// TWSE 115-year official calendar, offline bootstrap; native refresh adds published dates.
// https://www.twse.com.tw/holidaySchedule/holidaySchedule?queryYear=115&response=html
const closedDates=new Set('2026-01-01 2026-02-12 2026-02-13 2026-02-15 2026-02-16 2026-02-17 2026-02-18 2026-02-19 2026-02-20 2026-02-27 2026-02-28 2026-04-03 2026-04-04 2026-04-05 2026-04-06 2026-05-01 2026-06-19 2026-09-25 2026-09-28 2026-10-09 2026-10-10 2026-10-25 2026-10-26 2026-12-25'.split(' '));
export function applyMarketClosedDates(dates:readonly string[],names:Record<string,string>={}){
  for(const date of dates)if(typeof names[date]==='string'&&names[date])holidayNames[date]=names[date];
  for(const date of dates)if(/^\d{4}-\d{2}-\d{2}$/.test(date))closedDates.add(date);
}
const holidayNames:Record<string,string>={
 '2026-01-01':'開國紀念日','2026-02-12':'春節前市場無交易','2026-02-13':'春節前市場無交易',
 '2026-02-27':'和平紀念日補假','2026-02-28':'和平紀念日','2026-04-03':'兒童節補假',
 '2026-04-04':'兒童節','2026-04-05':'清明節','2026-04-06':'清明節補假',
 '2026-05-01':'勞動節','2026-06-19':'端午節','2026-09-25':'中秋節','2026-09-28':'教師節',
 '2026-10-09':'國慶日補假','2026-10-10':'國慶日','2026-10-25':'臺灣光復紀念日',
 '2026-10-26':'臺灣光復紀念日補假','2026-12-25':'行憲紀念日',
};
export function marketCalendarLabel(date:string){
 const at=Date.parse(date+'T12:00:00+08:00');
 if(!Number.isFinite(at))return '';
 if(holidayNames[date])return holidayNames[date]+'｜休市';
 if(closedDates.has(date))return date>='2026-02-15'&&date<='2026-02-20'?'農曆春節｜休市':'交易所公告休市';
 return marketClosed(at)?'週末休市':'';
}
export function marketClosed(now:number){
  const local=new Date(now+8*3_600_000);
  return [0,6].includes(local.getUTCDay())||closedDates.has(taipeiDate(now));
}
export function valuationSessionActive(now:number){
  const local=new Date(now+8*3_600_000);
  const minutes=local.getUTCHours()*60+local.getUTCMinutes();
  return !marketClosed(now)&&minutes>=540&&minutes<810;
}

export function valuationValidUntil(row:RuntimeQuote,now:number){
  // This clock refreshes status at session boundaries; it never deletes the price.
  const local=new Date(now+8*3_600_000);
  const midnight=Date.UTC(local.getUTCFullYear(),local.getUTCMonth(),local.getUTCDate())-8*3_600_000;
  if(valuationSessionActive(now))return midnight+810*60_000;
  let open=midnight+540*60_000;
  if(open<=now)open+=DAY;
  while(marketClosed(open))open+=DAY;
  return Math.min(open,midnight+DAY);
}

export function marketValuationQuoteFromRow(row:RuntimeQuote|undefined,context:ValuationContext={}):RuntimeQuote|undefined{
  const now=context.now??Date.now();
  if(!Number.isFinite(now)||!row||!Number.isFinite(row.currentPrice)||row.currentPrice<=0||!sourceTimeValid(row))return undefined;
  const at=row.sourceQuoteAt!;
  if(at>now+120_000)return undefined;
  if(typeof row.quality!=='string'||!VALUATION_QUALITIES.has(row.quality))return undefined;
  if(row.sessionDate&&row.sessionDate!==taipeiDate(at))return undefined;
  return row;
}

/**
 * Quote-wall view. It only needs the latest normalized quote snapshot and does
 * not depend on whether an intraday series exists.
 */
export function marketQuoteSnapshotFor(rows:readonly RuntimeQuote[],symbol:string):RuntimeQuote|undefined{
  return marketQuoteSnapshotFromRow(rows.find(item=>item.symbol===symbol));
}

/**
 * Chart view. Intraday readiness is deliberately independent from quote and
 * portfolio valuation readiness. After close the last session stays available
 * until the market center publishes the next session.
 */
export function marketIntradaySeriesFor(rows:readonly RuntimeQuote[],symbol:string){
  return marketIntradaySeriesFromRow(rows.find(item=>item.symbol===symbol));
}

/**
 * Portfolio valuation view. A session-valid trade, backup real-time quote, previous
 * close, or official close may value holdings outside the session. Missing 09:00-13:30 intraday
 * points must never invalidate this view.
 */
export function marketValuationQuoteFor(rows:readonly RuntimeQuote[],symbol:string,context:ValuationContext={}):RuntimeQuote|undefined{
  return marketValuationQuoteFromRow(rows.find(item=>item.symbol===symbol),context);
}

export function marketValuationComplete(rows:readonly RuntimeQuote[],symbols:readonly string[],context:ValuationContext={}){
  const bySymbol=new Map(rows.map(row=>[row.symbol,row]));
  return symbols.every(symbol=>Boolean(marketValuationQuoteFromRow(bySymbol.get(symbol),context)));
}
