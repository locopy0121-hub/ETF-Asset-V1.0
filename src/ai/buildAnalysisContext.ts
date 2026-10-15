import {
  queryLocalEtfComponents,
  queryLocalEtfMeta,
  type LocalEtfComponent,
} from '../native/TfAssetNativeBridge';
import type {AnalysisContext,AiHoldingProjection,EtfResearchCoverage} from './analysisTypes';
import {buildIndustryExposure,buildPairwiseOverlap,buildWhatIf} from './deterministicPortfolioAnalysis';

const SYMBOL=/^[0-9A-Z]{4,8}$/;
const normalizeSymbol=(value:string|undefined)=>String(value??'').trim().toUpperCase();

export function extractTargetSymbol(question:string):string|null{
  const candidates=question.toUpperCase().match(/[0-9]{4,6}[A-Z]{0,2}/g)??[];
  return candidates.find(value=>SYMBOL.test(value))??null;
}

export function extractInvestmentAmount(question:string):number|null{
  const normalized=question.replace(/,/g,'');
  const match=normalized.match(/(?:投入|買入|加碼|配置|用|拿)?\s*(?:NT\$|TWD|新台幣)?\s*(\d+(?:\.\d+)?)\s*(萬|千|元)?/i);
  if(!match)return null;
  let value=Number(match[1]);
  if(!Number.isFinite(value)||value<=0)return null;
  if(match[2]==='萬')value*=10000;
  if(match[2]==='千')value*=1000;
  // Avoid treating an ETF symbol itself as investment amount.
  if(!match[2]&&!/(投入|買入|加碼|配置|NT\$|TWD|新台幣|元)/i.test(match[0]))return null;
  return value;
}

export async function buildAnalysisContext(input:{
  targetSymbol?:string|null;
  investmentAmount?:number|null;
  holdings:readonly AiHoldingProjection[];
  totalMarketValue:number;
  topN?:number;
  researchEnabled?:boolean;
}):Promise<AnalysisContext>{
  const targetSymbol=normalizeSymbol(input.targetSymbol||undefined)||null;
  const warnings:string[]=[];
  const componentsBySymbol=new Map<string,readonly LocalEtfComponent[]>();
  const coverage:EtfResearchCoverage[]=[];
  const symbols=input.researchEnabled===false?[]:[...new Set([
    ...input.holdings.map(row=>row.symbol),
    ...(targetSymbol?[targetSymbol]:[]),
  ])];
  let targetMeta:null|Awaited<ReturnType<typeof queryLocalEtfMeta>>['meta']=null;
  for(const symbol of symbols){
    try{
      const [componentsResult,metaResult]=await Promise.all([
        queryLocalEtfComponents(symbol,input.topN??100),
        queryLocalEtfMeta(symbol),
      ]);
      componentsBySymbol.set(symbol,componentsResult.components);
      if(symbol===targetSymbol)targetMeta=metaResult.meta;
      const effectiveDate=metaResult.meta?.effectiveDate||
        componentsResult.components.map(row=>row.effectiveDate).filter(Boolean).sort().at(-1)||null;
      const source=metaResult.meta?.source||
        componentsResult.components.map(row=>row.source).find(Boolean)||null;
      coverage.push({
        symbol,componentRows:componentsResult.total,metaAvailable:metaResult.available,
        effectiveDate,source,
      });
      if(!componentsResult.available)warnings.push(symbol+' 本機 ETF 成分資料尚未匯入');
    }catch(error){
      componentsBySymbol.set(symbol,[]);
      warnings.push(symbol+' 本機研究資料讀取失敗：'+(error instanceof Error?error.message:String(error)));
      coverage.push({symbol,componentRows:0,metaAvailable:false,effectiveDate:null,source:null});
    }
  }
  const targetComponents=targetSymbol?(componentsBySymbol.get(targetSymbol)??[]):[];
  const isHeld=targetSymbol?input.holdings.some(row=>row.symbol===targetSymbol):null;
  const industryExposure=buildIndustryExposure(input.holdings,componentsBySymbol);
  const pairwiseOverlap=targetSymbol&&targetComponents.length
    ?buildPairwiseOverlap(targetSymbol,targetComponents,input.holdings,componentsBySymbol):[];
  const amount=input.investmentAmount??null;
  const whatIf=targetSymbol&&!isHeld&&amount&&amount>0
    ?buildWhatIf(amount,input.totalMarketValue,input.holdings,targetComponents,componentsBySymbol):null;
  if(targetSymbol&&!isHeld&&!amount)warnings.push('若要計算加入非持股後的曝險影響，請提供投入金額或目標比重');
  return {
    generatedAt:new Date().toISOString(),
    targetSymbol,
    isCurrentlyHeld:isHeld,
    portfolio:{
      totalMarketValue:input.totalMarketValue,
      holdingCount:input.holdings.length,
      holdings:input.holdings,
    },
    target:targetSymbol?{meta:targetMeta,components:targetComponents}:null,
    researchCoverage:coverage,
    industryExposure,
    pairwiseOverlap,
    whatIf,
    warnings:[...new Set(warnings)],
  };
}
