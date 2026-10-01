import type {CanonicalLedgerEntry,CanonicalLedgerSnapshot,FrozenTradeLedgerEntry} from './canonicalLedger';

const EPSILON=1e-8;
const DAY_MS=24*60*60*1000;

export type PurchaseLotStatus='open'|'closed';

export type PurchaseLotPnlStat=Readonly<{
  id:string;
  date:string;
  symbol:string;
  name:string;
  originalShares:number;
  remainingShares:number;
  buyPrice:number;
  originalTradeAmount:number;
  purchaseFee:number;
  originalInvestmentCost:number;
  remainingTradeCost:number;
  remainingInvestmentCost:number;
  currentPrice:number;
  currentMarketValue:number;
  holdingPnl:number;
  holdingRoi:number;
  holdingDays:number;
  status:PurchaseLotStatus;
}>;

export type PurchaseSymbolPnlStat=Readonly<{
  symbol:string;
  name:string;
  shares:number;
  currentPrice:number;
  holdingCost:number;
  marketValue:number;
  holdingPnl:number;
  holdingRoi:number;
  purchaseCount:number;
  openPurchaseCount:number;
}>;

export type PurchasePnlStatistics=Readonly<{
  totalMarketValue:number;
  totalHoldingCost:number;
  holdingPnl:number;
  holdingRoi:number;
  totalPurchaseFees:number;
  purchaseCount:number;
  openPurchaseCount:number;
  lots:readonly PurchaseLotPnlStat[];
  symbols:readonly PurchaseSymbolPnlStat[];
}>;

type MutableLot={
  entry:FrozenTradeLedgerEntry;
  remainingShares:number;
  remainingTradeCost:number;
  remainingInvestmentCost:number;
  closedAt:string|null;
};

const tradeEntries=(entries:readonly CanonicalLedgerEntry[])=>entries
  .filter((entry):entry is FrozenTradeLedgerEntry=>entry.kind==='buy'||entry.kind==='sell')
  .slice()
  .sort((a,b)=>a.date.localeCompare(b.date)||a.id.localeCompare(b.id));

const dateMs=(date:string)=>{
  const match=/^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if(!match)return Number.NaN;
  return Date.UTC(Number(match[1]),Number(match[2])-1,Number(match[3]));
};

const holdingDays=(start:string,end:string)=>{
  const startMs=dateMs(start),endMs=dateMs(end);
  if(!Number.isFinite(startMs)||!Number.isFinite(endMs))return 0;
  return Math.max(0,Math.floor((endMs-startMs)/DAY_MS));
};

const scaleOpenLots=(lots:MutableLot[],shares:number,tradeCost:number,investmentCost:number)=>{
  const open=lots.filter(lot=>lot.remainingShares>EPSILON);
  if(!open.length)return;
  const shareTotal=open.reduce((sum,lot)=>sum+lot.remainingShares,0);
  const tradeTotal=open.reduce((sum,lot)=>sum+lot.remainingTradeCost,0);
  const investmentTotal=open.reduce((sum,lot)=>sum+lot.remainingInvestmentCost,0);
  const shareScale=shareTotal>EPSILON?shares/shareTotal:0;
  const tradeScale=tradeTotal>EPSILON?tradeCost/tradeTotal:0;
  const investmentScale=investmentTotal>EPSILON?investmentCost/investmentTotal:0;
  for(const lot of open){
    lot.remainingShares=Math.max(0,lot.remainingShares*shareScale);
    lot.remainingTradeCost=Math.max(0,lot.remainingTradeCost*tradeScale);
    lot.remainingInvestmentCost=Math.max(0,lot.remainingInvestmentCost*investmentScale);
  }
};

export function buildPurchasePnlStatistics(input:{
  entries:readonly CanonicalLedgerEntry[];
  holdings:CanonicalLedgerSnapshot['holdings'];
  asOfDate?:string;
}):PurchasePnlStatistics{
  const asOfDate=input.asOfDate??new Date().toISOString().slice(0,10);
  const lotsBySymbol=new Map<string,MutableLot[]>();

  for(const entry of tradeEntries(input.entries)){
    const lots=lotsBySymbol.get(entry.symbol)??[];
    if(!lotsBySymbol.has(entry.symbol))lotsBySymbol.set(entry.symbol,lots);

    if(entry.kind==='buy'){
      lots.push({
        entry,
        remainingShares:Math.max(0,entry.shares),
        remainingTradeCost:Math.max(0,entry.amount),
        remainingInvestmentCost:Math.max(0,entry.amount+entry.actualFee),
        closedAt:null,
      });
      continue;
    }

    const open=lots.filter(lot=>lot.remainingShares>EPSILON);
    const beforeShares=open.reduce((sum,lot)=>sum+lot.remainingShares,0);
    if(beforeShares<=EPSILON)continue;
    const releasedShares=Math.min(Math.max(0,entry.shares),beforeShares);
    const retention=Math.max(0,(beforeShares-releasedShares)/beforeShares);
    for(const lot of open){
      lot.remainingShares*=retention;
      lot.remainingTradeCost*=retention;
      lot.remainingInvestmentCost*=retention;
      if(lot.remainingShares<=EPSILON){
        lot.remainingShares=0;
        lot.remainingTradeCost=0;
        lot.remainingInvestmentCost=0;
        lot.closedAt=entry.date;
      }
    }
  }

  const holdingBySymbol=new Map(input.holdings.map(row=>[row.etfCode,row] as const));

  // Reconcile the display-only lot allocation back to the canonical moving-average totals.
  for(const [symbol,lots] of lotsBySymbol){
    const holding=holdingBySymbol.get(symbol);
    if(!holding)continue;
    scaleOpenLots(lots,holding.totalShares,holding.totalTradeCost,holding.totalInvestmentCost);
  }

  const lots:PurchaseLotPnlStat[]=[];
  for(const symbolLots of lotsBySymbol.values()){
    for(const lot of symbolLots){
      const entry=lot.entry;
      if(entry.kind!=='buy')continue;
      const holding=holdingBySymbol.get(entry.symbol);
      const status:PurchaseLotStatus=lot.remainingShares>EPSILON?'open':'closed';
      const currentPrice=holding?.currentPrice??0;
      const currentMarketValue=status==='open'&&holding&&holding.totalShares>EPSILON
        ?holding.currentMarketValue*(lot.remainingShares/holding.totalShares)
        :0;
      const holdingPnl=currentMarketValue-lot.remainingTradeCost;
      const holdingRoi=lot.remainingTradeCost>EPSILON?holdingPnl/lot.remainingTradeCost*100:0;
      lots.push({
        id:entry.id,
        date:entry.date,
        symbol:entry.symbol,
        name:entry.name,
        originalShares:entry.shares,
        remainingShares:status==='open'?lot.remainingShares:0,
        buyPrice:entry.price,
        originalTradeAmount:entry.amount,
        purchaseFee:entry.actualFee,
        originalInvestmentCost:entry.amount+entry.actualFee,
        remainingTradeCost:status==='open'?lot.remainingTradeCost:0,
        remainingInvestmentCost:status==='open'?lot.remainingInvestmentCost:0,
        currentPrice,
        currentMarketValue,
        holdingPnl:status==='open'?holdingPnl:0,
        holdingRoi:status==='open'?holdingRoi:0,
        holdingDays:holdingDays(entry.date,status==='closed'?(lot.closedAt??asOfDate):asOfDate),
        status,
      });
    }
  }

  const purchaseCountBySymbol=new Map<string,number>();
  const openPurchaseCountBySymbol=new Map<string,number>();
  let totalPurchaseFees=0;
  for(const lot of lots){
    purchaseCountBySymbol.set(lot.symbol,(purchaseCountBySymbol.get(lot.symbol)??0)+1);
    if(lot.status==='open')openPurchaseCountBySymbol.set(lot.symbol,(openPurchaseCountBySymbol.get(lot.symbol)??0)+1);
    totalPurchaseFees+=lot.purchaseFee;
  }

  const symbols:PurchaseSymbolPnlStat[]=input.holdings
    .filter(row=>row.totalShares>EPSILON)
    .map(row=>{
      const holdingCost=row.totalTradeCost;
      const holdingPnl=row.currentMarketValue-holdingCost;
      return {
        symbol:row.etfCode,
        name:row.name,
        shares:row.totalShares,
        currentPrice:row.currentPrice,
        holdingCost,
        marketValue:row.currentMarketValue,
        holdingPnl,
        holdingRoi:holdingCost>EPSILON?holdingPnl/holdingCost*100:0,
        purchaseCount:purchaseCountBySymbol.get(row.etfCode)??0,
        openPurchaseCount:openPurchaseCountBySymbol.get(row.etfCode)??0,
      };
    })
    .sort((a,b)=>b.marketValue-a.marketValue||a.symbol.localeCompare(b.symbol));

  const totalMarketValue=input.holdings.reduce((sum,row)=>sum+row.currentMarketValue,0);
  const totalHoldingCost=input.holdings.reduce((sum,row)=>sum+row.totalTradeCost,0);
  const holdingPnl=totalMarketValue-totalHoldingCost;

  return {
    totalMarketValue,
    totalHoldingCost,
    holdingPnl,
    holdingRoi:totalHoldingCost>EPSILON?holdingPnl/totalHoldingCost*100:0,
    totalPurchaseFees,
    purchaseCount:lots.length,
    openPurchaseCount:lots.filter(lot=>lot.status==='open').length,
    lots:lots.sort((a,b)=>b.date.localeCompare(a.date)||b.id.localeCompare(a.id)),
    symbols,
  };
}
