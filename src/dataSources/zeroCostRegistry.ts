export type ZeroCostDataSourceRole='TAIWAN_OFFICIAL_MARKET'|'SECURITY_IDENTITY'|'PORTFOLIO_ANALYTICS'|'MACRO'|'LEGACY_MARKET_FALLBACK';
export type ZeroCostAuth='NONE'|'FREE_API_KEY';

export type ZeroCostDataSourcePolicy=Readonly<{
  id:string;
  label:string;
  role:ZeroCostDataSourceRole;
  monetaryCost:0;
  creditCardRequired:false;
  autoBillingAllowed:false;
  trialOnly:false;
  auth:ZeroCostAuth;
  productionEligible:true;
  official:boolean;
}>;

/** TF Asset production registry: zero monetary API cost only. */
export const ZERO_COST_DATA_SOURCES:readonly ZeroCostDataSourcePolicy[]=[
  {id:'TWSE_OPENAPI',label:'TWSE OpenAPI',role:'TAIWAN_OFFICIAL_MARKET',monetaryCost:0,creditCardRequired:false,autoBillingAllowed:false,trialOnly:false,auth:'NONE',productionEligible:true,official:true},
  {id:'TWSE_MIS',label:'TWSE MIS',role:'TAIWAN_OFFICIAL_MARKET',monetaryCost:0,creditCardRequired:false,autoBillingAllowed:false,trialOnly:false,auth:'NONE',productionEligible:true,official:true},
  {id:'TPEX_OPENAPI',label:'TPEx OpenAPI',role:'TAIWAN_OFFICIAL_MARKET',monetaryCost:0,creditCardRequired:false,autoBillingAllowed:false,trialOnly:false,auth:'NONE',productionEligible:true,official:true},
  {id:'OPENFIGI',label:'OpenFIGI',role:'SECURITY_IDENTITY',monetaryCost:0,creditCardRequired:false,autoBillingAllowed:false,trialOnly:false,auth:'NONE',productionEligible:true,official:false},
  {id:'PORTFOLIO_OPTIMIZER',label:'Portfolio Optimizer',role:'PORTFOLIO_ANALYTICS',monetaryCost:0,creditCardRequired:false,autoBillingAllowed:false,trialOnly:false,auth:'NONE',productionEligible:true,official:false},
  {id:'FRED',label:'FRED',role:'MACRO',monetaryCost:0,creditCardRequired:false,autoBillingAllowed:false,trialOnly:false,auth:'FREE_API_KEY',productionEligible:true,official:true},
  {id:'YAHOO_PUBLIC',label:'Yahoo public market fallback',role:'LEGACY_MARKET_FALLBACK',monetaryCost:0,creditCardRequired:false,autoBillingAllowed:false,trialOnly:false,auth:'NONE',productionEligible:true,official:false},
] as const;

export const EXCLUDED_METERED_OR_CONDITIONAL_SOURCES=Object.freeze([
  'TWELVE_DATA','MARKETSTACK','EODHD','ALPHA_VANTAGE','FINBRIDGE','FUGLE','SHIOAJI',
] as const);

const eligibleIds=new Set(ZERO_COST_DATA_SOURCES.map(source=>source.id));

export function isZeroCostDataSource(sourceId:string):boolean{
  return eligibleIds.has(sourceId.trim().toUpperCase());
}

export function assertZeroCostSourceSet(sourceIds:readonly string[]):void{
  const invalid=sourceIds.map(source=>source.trim().toUpperCase()).filter(source=>!eligibleIds.has(source));
  if(invalid.length)throw new Error('TF_ASSET_ZERO_COST_POLICY_BLOCKED: '+[...new Set(invalid)].join(','));
}
