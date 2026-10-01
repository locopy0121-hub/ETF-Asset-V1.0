export const ZERO_COST_ONLY=true;

const free=(id,{official=false}={})=>Object.freeze({
  id,
  monetaryCost:0,
  creditCardRequired:false,
  autoBillingAllowed:false,
  trialOnly:false,
  productionEligible:true,
  official,
});

export const ZERO_COST_SOURCE_POLICY=Object.freeze({
  TWSE_MIS:free('TWSE_MIS',{official:true}),
  TWSE_DAILY:free('TWSE_DAILY',{official:true}),
  TPEX_DAILY:free('TPEX_DAILY',{official:true}),
  YAHOO:free('YAHOO'),
});

export const BLOCKED_CONDITIONAL_SOURCES=Object.freeze({
  FUGLE:Object.freeze({id:'FUGLE',reason:'credentialed or plan-dependent source is excluded from zero-cost production mode'}),
  SHIOAJI:Object.freeze({id:'SHIOAJI',reason:'broker-account bridge is excluded from zero-cost production mode'}),
});

export function zeroCostPolicy(source){
  const id=String(source??'').trim().toUpperCase();
  const allowed=ZERO_COST_SOURCE_POLICY[id];
  if(allowed)return {...allowed,allowed:true,reason:'zero-cost production source'};
  const blocked=BLOCKED_CONDITIONAL_SOURCES[id];
  if(blocked)return {...blocked,allowed:false,monetaryCost:null,creditCardRequired:null,autoBillingAllowed:false,trialOnly:null,productionEligible:false};
  return {id,allowed:false,monetaryCost:null,creditCardRequired:null,autoBillingAllowed:false,trialOnly:null,productionEligible:false,reason:'source is not registered by TF Asset zero-cost policy'};
}

export function isZeroCostSourceAllowed(source){
  return zeroCostPolicy(source).allowed===true;
}

export function assertZeroCostSourceSet(sources){
  const invalid=[...new Set(sources.map(source=>String(source).trim().toUpperCase()))]
    .filter(source=>!isZeroCostSourceAllowed(source));
  if(invalid.length)throw new Error('TF_ASSET_ZERO_COST_POLICY_BLOCKED: '+invalid.join(','));
}
