import type {LocalEtfComponent} from '../native/TfAssetNativeBridge';
import type {AiHoldingProjection,IndustryExposure,PairwiseOverlap,WhatIfAnalysis} from './analysisTypes';

const safePct=(value:number)=>Number.isFinite(value)?Math.max(0,value):0;
const sortedExposure=(map:Map<string,number>):IndustryExposure[]=>[...map.entries()]
  .map(([industry,weight])=>({industry,weight:Number(weight.toFixed(4))}))
  .filter(row=>row.weight>0)
  .sort((a,b)=>b.weight-a.weight);

export function weightedEtfOverlap(a:readonly LocalEtfComponent[],b:readonly LocalEtfComponent[]):number{
  const bWeight=new Map(b.map(row=>[row.stockSymbol,safePct(row.weight)] as const));
  const overlap=a.reduce((sum,row)=>sum+Math.min(safePct(row.weight),bWeight.get(row.stockSymbol)??0),0);
  return Number(Math.min(100,overlap).toFixed(4));
}

export function buildIndustryExposure(
  holdings:readonly AiHoldingProjection[],
  componentsBySymbol:ReadonlyMap<string,readonly LocalEtfComponent[]>,
):IndustryExposure[]{
  const map=new Map<string,number>();
  for(const holding of holdings){
    const components=componentsBySymbol.get(holding.symbol)??[];
    for(const component of components){
      const industry=component.industry.trim()||'未分類';
      const contribution=safePct(holding.portfolioWeight)*safePct(component.weight)/100;
      map.set(industry,(map.get(industry)??0)+contribution);
    }
  }
  return sortedExposure(map);
}

export function buildPairwiseOverlap(
  targetSymbol:string,
  target:readonly LocalEtfComponent[],
  holdings:readonly AiHoldingProjection[],
  componentsBySymbol:ReadonlyMap<string,readonly LocalEtfComponent[]>,
):PairwiseOverlap[]{
  return holdings
    .filter(row=>row.symbol!==targetSymbol)
    .map(row=>({
      heldSymbol:row.symbol,
      targetSymbol,
      overlapPercent:weightedEtfOverlap(target,componentsBySymbol.get(row.symbol)??[]),
    }))
    .filter(row=>row.overlapPercent>0)
    .sort((a,b)=>b.overlapPercent-a.overlapPercent);
}

export function buildWhatIf(
  investmentAmount:number,
  totalMarketValue:number,
  holdings:readonly AiHoldingProjection[],
  target:readonly LocalEtfComponent[],
  componentsBySymbol:ReadonlyMap<string,readonly LocalEtfComponent[]>,
):WhatIfAnalysis|null{
  if(!Number.isFinite(investmentAmount)||investmentAmount<=0||!Number.isFinite(totalMarketValue)||totalMarketValue<0||!target.length)return null;
  const newTotal=totalMarketValue+investmentAmount;
  if(newTotal<=0)return null;
  const targetWeightAfter=investmentAmount/newTotal*100;
  const scale=totalMarketValue/newTotal;
  const scaledHoldings=holdings.map(row=>({...row,portfolioWeight:row.portfolioWeight*scale}));
  const before=buildIndustryExposure(holdings,componentsBySymbol);
  const afterMap=new Map(buildIndustryExposure(scaledHoldings,componentsBySymbol).map(row=>[row.industry,row.weight] as const));
  for(const component of target){
    const industry=component.industry.trim()||'未分類';
    const contribution=targetWeightAfter*safePct(component.weight)/100;
    afterMap.set(industry,(afterMap.get(industry)??0)+contribution);
  }
  const existingStocks=new Set<string>();
  for(const holding of holdings){
    for(const component of componentsBySymbol.get(holding.symbol)??[])existingStocks.add(component.stockSymbol);
  }
  const duplicateShare=Math.min(100,target.reduce((sum,row)=>sum+(existingStocks.has(row.stockSymbol)?safePct(row.weight):0),0));
  return {
    investmentAmount,
    targetWeightAfter:Number(targetWeightAfter.toFixed(4)),
    duplicateShareOfNewEtf:Number(duplicateShare.toFixed(4)),
    duplicateCapitalAmount:Math.round(investmentAmount*duplicateShare/100),
    industryBefore:before,
    industryAfter:sortedExposure(afterMap),
  };
}
