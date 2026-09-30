export type AiQuestionMode='FACT'|'COMPARE'|'EXPLAIN'|'HYPOTHESIS'|'NEWS'|'PORTFOLIO'|'GENERAL';

export type AiRecipeId=
  |'MARKET_QUOTE'
  |'MARKET_PERFORMANCE'
  |'MARKET_NEWS'
  |'SECURITY_PROFILE'
  |'ETF_COMPARE'
  |'PORTFOLIO_CONTEXT'
  |'SCENARIO_ANALYSIS'
  |'GENERAL';

export type AiIngredientKey=
  |'SECURITY_IDENTITY'
  |'MARKET_QUOTE'
  |'HISTORICAL_PRICES'
  |'MARKET_DIVIDENDS'
  |'NAV'
  |'ETF_META'
  |'ETF_HOLDINGS'
  |'MARKET_NEWS'
  |'SECURITY_PROFILE'
  |'BENCHMARK_HISTORY'
  |'CAPITAL_CONTEXT'
  |'TRANSACTIONS'
  |'PORTFOLIO_DIVIDENDS';

export type AiMetricId=
  |'PRICE_RETURN'
  |'TOTAL_RETURN'
  |'CAGR'
  |'XIRR'
  |'ANNUALIZED_VOLATILITY'
  |'MAX_DRAWDOWN'
  |'PREMIUM_DISCOUNT'
  |'DIVIDEND_YIELD'
  |'TRACKING_DIFFERENCE'
  |'TRACKING_ERROR'
  |'HOLDINGS_OVERLAP'
  |'SECTOR_OVERLAP'
  |'LIQUIDITY';

export type AiEvidenceStatus=
  |'VERIFIED'
  |'PARTIAL'
  |'STALE'
  |'CONFLICT'
  |'UNAVAILABLE'
  |'INVALID';

export type AiIngredientRequirement=Readonly<{
  ingredient:AiIngredientKey;
  required:boolean;
  purpose:string;
  freshnessMs?:number;
  minItems?:number;
  sameTimestampGroup?:string;
}>;

export type AiMetricDefinition=Readonly<{
  id:AiMetricId;
  label:string;
  requiredIngredients:readonly AiIngredientKey[];
  method:string;
}>;

export type AiRecipe=Readonly<{
  id:AiRecipeId;
  mode:AiQuestionMode;
  description:string;
  requirements:readonly AiIngredientRequirement[];
  metrics:readonly AiMetricId[];
}>;

export type AiIngredientEvidence=Readonly<{
  ingredient:AiIngredientKey;
  symbol?:string;
  status:AiEvidenceStatus;
  source:string;
  fetchedAt:string;
  observedAt?:string;
  summary:string;
  details?:Readonly<Record<string,unknown>>;
}>;

export type AiMetricEvidence=Readonly<{
  metric:AiMetricId;
  symbol?:string;
  status:AiEvidenceStatus;
  method:string;
  value?:number;
  unit?:string;
  period?:Readonly<{from:string;to:string}>;
  notes?:readonly string[];
}>;

export type AiAcquisitionAttempt=Readonly<{
  ingredient:AiIngredientKey;
  symbol?:string;
  source:string;
  status:'FETCHED'|'UNAVAILABLE'|'FAILED'|'NO_PROVIDER';
  message?:string;
}>;

export type AiIntelligencePlan=Readonly<{
  question:string;
  recipe:AiRecipe;
  symbols:readonly string[];
  requirements:readonly AiIngredientRequirement[];
  metrics:readonly AiMetricId[];
}>;

export type AiEvidencePackage=Readonly<{
  generatedAt:string;
  question:string;
  recipeId:AiRecipeId;
  mode:AiQuestionMode;
  symbols:readonly string[];
  status:AiEvidenceStatus;
  ingredients:readonly AiIngredientEvidence[];
  metrics:readonly AiMetricEvidence[];
  missingRequired:readonly AiIngredientKey[];
  acquisitionAttempts:readonly AiAcquisitionAttempt[];
  rules:Readonly<{
    marketFactsFromMarketSources:boolean;
    portfolioDataIsContextOnly:boolean;
    noFabricationOnMissingData:boolean;
  }>;
}>;
