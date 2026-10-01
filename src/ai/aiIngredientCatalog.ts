import type {
  AiEvidenceStatus,
  AiIngredientEvidence,
  AiIngredientKey,
  AiIngredientRequirement,
} from './intelligenceTypes';

export type AiIngredientScope='SYMBOL'|'PORTFOLIO'|'GLOBAL';
export type AiIngredientMinimumStatus='PARTIAL'|'VERIFIED';

export type AiIngredientCatalogEntry=Readonly<{
  key:AiIngredientKey;
  label:string;
  scope:AiIngredientScope;
  canAcquireExternally:boolean;
  defaultFreshnessMs?:number;
  defaultMinItems?:number;
  minimumStatus:AiIngredientMinimumStatus;
  sourcePriority:readonly string[];
}>;

const MINUTE=60*1000;
const DAY=24*60*MINUTE;

export const AI_INGREDIENT_CATALOG:Readonly<Record<AiIngredientKey,AiIngredientCatalogEntry>>={
  SECURITY_IDENTITY:{
    key:'SECURITY_IDENTITY',label:'證券身分',scope:'SYMBOL',canAcquireExternally:true,
    defaultFreshnessMs:7*DAY,minimumStatus:'VERIFIED',
    sourcePriority:['TWSE/TPEX official catalog','TF Asset resolver','question parser'],
  },
  MARKET_QUOTE:{
    key:'MARKET_QUOTE',label:'市場行情',scope:'SYMBOL',canAcquireExternally:true,
    defaultFreshnessMs:2*MINUTE,minimumStatus:'VERIFIED',
    sourcePriority:['TF Asset Market Center','TWSE MIS official trade'],
  },
  HISTORICAL_PRICES:{
    key:'HISTORICAL_PRICES',label:'官方歷史行情',scope:'SYMBOL',canAcquireExternally:true,
    defaultFreshnessMs:DAY,defaultMinItems:20,minimumStatus:'VERIFIED',
    sourcePriority:['TWSE/TPEX official daily'],
  },
  MARKET_DIVIDENDS:{
    key:'MARKET_DIVIDENDS',label:'市場配息紀錄',scope:'SYMBOL',canAcquireExternally:true,
    defaultFreshnessMs:7*DAY,defaultMinItems:1,minimumStatus:'VERIFIED',
    sourcePriority:['TWSE/TPEX/SITCA/issuer official disclosure'],
  },
  NAV:{
    key:'NAV',label:'淨值/iNAV',scope:'SYMBOL',canAcquireExternally:true,
    defaultFreshnessMs:5*MINUTE,minimumStatus:'VERIFIED',
    sourcePriority:['TWSE MIS/issuer official NAV'],
  },
  ETF_META:{
    key:'ETF_META',label:'ETF 基本資料',scope:'SYMBOL',canAcquireExternally:true,
    defaultFreshnessMs:7*DAY,minimumStatus:'VERIFIED',
    sourcePriority:['TF Asset local research','issuer/SITCA official disclosure'],
  },
  ETF_HOLDINGS:{
    key:'ETF_HOLDINGS',label:'ETF 成分股',scope:'SYMBOL',canAcquireExternally:true,
    defaultFreshnessMs:2*DAY,defaultMinItems:1,minimumStatus:'VERIFIED',
    sourcePriority:['TF Asset local research','issuer official holdings'],
  },
  MARKET_NEWS:{
    key:'MARKET_NEWS',label:'外部新聞',scope:'SYMBOL',canAcquireExternally:true,
    defaultFreshnessMs:DAY,defaultMinItems:1,minimumStatus:'PARTIAL',
    sourcePriority:['TF Asset News Center','publisher article','Google News discovery'],
  },
  SECURITY_PROFILE:{
    key:'SECURITY_PROFILE',label:'上市/掛牌資料',scope:'SYMBOL',canAcquireExternally:true,
    defaultFreshnessMs:7*DAY,minimumStatus:'PARTIAL',
    sourcePriority:['TWSE/TPEX official catalog','issuer/publisher disclosure'],
  },
  BENCHMARK_HISTORY:{
    key:'BENCHMARK_HISTORY',label:'追蹤指數歷史資料',scope:'SYMBOL',canAcquireExternally:true,
    defaultFreshnessMs:DAY,defaultMinItems:20,minimumStatus:'VERIFIED',
    sourcePriority:['index owner/official benchmark source'],
  },
  CAPITAL_CONTEXT:{
    key:'CAPITAL_CONTEXT',label:'使用者資本狀態',scope:'PORTFOLIO',canAcquireExternally:false,
    minimumStatus:'VERIFIED',sourcePriority:['Canonical Portfolio Projection'],
  },
  TRANSACTIONS:{
    key:'TRANSACTIONS',label:'交易現金流',scope:'PORTFOLIO',canAcquireExternally:false,
    minimumStatus:'VERIFIED',sourcePriority:['Canonical Ledger'],
  },
  PORTFOLIO_DIVIDENDS:{
    key:'PORTFOLIO_DIVIDENDS',label:'使用者已記錄股息',scope:'PORTFOLIO',canAcquireExternally:false,
    minimumStatus:'VERIFIED',sourcePriority:['Canonical Ledger'],
  },
};

export type AiIngredientValidationIssue=Readonly<{
  ingredient:AiIngredientKey;
  symbol?:string;
  code:'MISSING'|'STATUS_TOO_LOW'|'STALE'|'INSUFFICIENT_ITEMS'|'INVALID_VALUE';
  message:string;
}>;

export const ingredientPolicy=(requirement:AiIngredientRequirement)=>{
  const catalog=AI_INGREDIENT_CATALOG[requirement.ingredient];
  return {
    ...catalog,
    freshnessMs:requirement.freshnessMs??catalog.defaultFreshnessMs,
    minItems:requirement.minItems??catalog.defaultMinItems,
  };
};

const statusRank:Readonly<Record<AiEvidenceStatus,number>>={
  INVALID:0,UNAVAILABLE:0,CONFLICT:0,STALE:0,PARTIAL:1,VERIFIED:2,
};

export function evidenceItemCount(row:AiIngredientEvidence):number|null{
  const details=row.details;
  if(!details)return null;
  const direct=Number(details.rowCount??details.componentRows);
  if(Number.isFinite(direct)&&direct>=0)return direct;
  if(Array.isArray(details.items))return details.items.length;
  if(Array.isArray(details.rows))return details.rows.length;
  return null;
}

export function evidenceHasValidValue(row:AiIngredientEvidence):boolean{
  if(row.ingredient!=='MARKET_QUOTE')return true;
  const value=Number(row.details?.price);
  return Number.isFinite(value)&&value>0;
}

export function validateIngredientEvidence(
  requirement:AiIngredientRequirement,
  row:AiIngredientEvidence|undefined,
  now=Date.now(),
):AiIngredientValidationIssue[]{
  const policy=ingredientPolicy(requirement);
  if(!row)return [{
    ingredient:requirement.ingredient,
    code:'MISSING',
    message:policy.label+' 尚未取得。',
  }];
  const issues:AiIngredientValidationIssue[]=[];
  const requiredRank=policy.minimumStatus==='VERIFIED'?2:1;
  if(statusRank[row.status]<requiredRank){
    issues.push({
      ingredient:requirement.ingredient,
      ...(row.symbol?{symbol:row.symbol}:{}),
      code:'STATUS_TOO_LOW',
      message:policy.label+' 驗證層級不足（'+row.status+'）。',
    });
  }
  if(policy.freshnessMs&&row.observedAt){
    const observed=Date.parse(row.observedAt);
    if(Number.isFinite(observed)&&now-observed>policy.freshnessMs){
      issues.push({
        ingredient:requirement.ingredient,
        ...(row.symbol?{symbol:row.symbol}:{}),
        code:'STALE',
        message:policy.label+' 已超過允許的新鮮度。',
      });
    }
  }
  if(policy.minItems){
    const count=evidenceItemCount(row);
    if(count!==null&&count<policy.minItems){
      issues.push({
        ingredient:requirement.ingredient,
        ...(row.symbol?{symbol:row.symbol}:{}),
        code:'INSUFFICIENT_ITEMS',
        message:policy.label+' 筆數不足（'+count+'/'+policy.minItems+'）。',
      });
    }
  }
  if(!evidenceHasValidValue(row)){
    issues.push({
      ingredient:requirement.ingredient,
      ...(row.symbol?{symbol:row.symbol}:{}),
      code:'INVALID_VALUE',
      message:policy.label+' 沒有有效可用的數值。',
    });
  }
  return issues;
}

export function evidenceSatisfiesIngredient(
  ingredient:AiIngredientKey,
  row:AiIngredientEvidence|undefined,
  now=Date.now(),
):boolean{
  if(!row)return false;
  return validateIngredientEvidence({
    ingredient,
    required:true,
    purpose:AI_INGREDIENT_CATALOG[ingredient].label,
  },row,now).length===0;
}
