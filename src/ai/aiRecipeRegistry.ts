import type {
  AiIngredientKey,
  AiIngredientRequirement,
  AiMetricDefinition,
  AiMetricId,
  AiRecipe,
  AiRecipeId,
} from './intelligenceTypes';

const DAY=24*60*60*1000;

const requirement=(
  ingredient:AiIngredientKey,
  required:boolean,
  purpose:string,
  options:Partial<Pick<AiIngredientRequirement,'freshnessMs'|'minItems'|'sameTimestampGroup'>>={},
):AiIngredientRequirement=>({ingredient,required,purpose,...options});

export const AI_METRIC_REGISTRY:Readonly<Record<AiMetricId,AiMetricDefinition>>={
  PRICE_RETURN:{
    id:'PRICE_RETURN',
    label:'價格報酬率',
    requiredIngredients:['HISTORICAL_PRICES'],
    method:'(期末收盤價 / 期初收盤價 - 1) × 100%',
  },
  TOTAL_RETURN:{
    id:'TOTAL_RETURN',
    label:'含息總報酬率',
    requiredIngredients:['HISTORICAL_PRICES','MARKET_DIVIDENDS'],
    method:'使用同期間市場價格與實際配息現金流計算；配息不足時不得以價格報酬冒充總報酬。',
  },
  CAGR:{
    id:'CAGR',
    label:'年化複合價格報酬率',
    requiredIngredients:['HISTORICAL_PRICES'],
    method:'(期末價格 / 期初價格)^(365.2425 / 經過日數) - 1',
  },
  XIRR:{
    id:'XIRR',
    label:'資金加權年化報酬率',
    requiredIngredients:['TRANSACTIONS','CAPITAL_CONTEXT'],
    method:'以實際日期現金流與期末資產價值計算 XIRR。',
  },
  ANNUALIZED_VOLATILITY:{
    id:'ANNUALIZED_VOLATILITY',
    label:'年化波動率',
    requiredIngredients:['HISTORICAL_PRICES'],
    method:'日報酬率樣本標準差 × √252。',
  },
  MAX_DRAWDOWN:{
    id:'MAX_DRAWDOWN',
    label:'最大回撤',
    requiredIngredients:['HISTORICAL_PRICES'],
    method:'歷史價格序列相對先前高點的最大跌幅。',
  },
  PREMIUM_DISCOUNT:{
    id:'PREMIUM_DISCOUNT',
    label:'折溢價率',
    requiredIngredients:['MARKET_QUOTE','NAV'],
    method:'(市場價格 - NAV/iNAV) / NAV/iNAV × 100%，價格與 NAV 必須時間對齊。',
  },
  DIVIDEND_YIELD:{
    id:'DIVIDEND_YIELD',
    label:'市場配息殖利率',
    requiredIngredients:['MARKET_DIVIDENDS','MARKET_QUOTE'],
    method:'同一市場期間的配息總額 / 對應市場價格。',
  },
  TRACKING_DIFFERENCE:{
    id:'TRACKING_DIFFERENCE',
    label:'追蹤差異',
    requiredIngredients:['HISTORICAL_PRICES','BENCHMARK_HISTORY'],
    method:'ETF 同期間報酬 - 追蹤指數同期間報酬。',
  },
  TRACKING_ERROR:{
    id:'TRACKING_ERROR',
    label:'追蹤誤差',
    requiredIngredients:['HISTORICAL_PRICES','BENCHMARK_HISTORY'],
    method:'ETF 與追蹤指數同期主動報酬序列的年化標準差。',
  },
  HOLDINGS_OVERLAP:{
    id:'HOLDINGS_OVERLAP',
    label:'成分重疊率',
    requiredIngredients:['ETF_HOLDINGS'],
    method:'依兩檔 ETF 成分及權重計算重疊曝險。',
  },
  SECTOR_OVERLAP:{
    id:'SECTOR_OVERLAP',
    label:'產業曝險重疊',
    requiredIngredients:['ETF_HOLDINGS'],
    method:'將成分股映射至產業後比較權重重疊。',
  },
  LIQUIDITY:{
    id:'LIQUIDITY',
    label:'流動性',
    requiredIngredients:['MARKET_QUOTE'],
    method:'以可核實成交量、成交額與買賣價差資料評估；缺欄位不得推估。',
  },
};

const RECIPES:Readonly<Record<AiRecipeId,AiRecipe>>={
  MARKET_QUOTE:{
    id:'MARKET_QUOTE',
    mode:'FACT',
    description:'查詢單一市場標的的目前行情。',
    requirements:[
      requirement('SECURITY_IDENTITY',true,'確認查詢標的'),
      requirement('MARKET_QUOTE',true,'取得目前可核實市場價格',{freshnessMs:2*60*1000}),
    ],
    metrics:[],
  },
  MARKET_PERFORMANCE:{
    id:'MARKET_PERFORMANCE',
    mode:'EXPLAIN',
    description:'使用外部市場歷史資料分析標的近期或指定期間表現。',
    requirements:[
      requirement('SECURITY_IDENTITY',true,'確認分析標的'),
      requirement('HISTORICAL_PRICES',true,'建立同期間價格報酬、波動與回撤',{minItems:20,freshnessMs:DAY}),
      requirement('MARKET_DIVIDENDS',false,'計算含息總報酬'),
      requirement('NAV',false,'ETF 折溢價分析',{freshnessMs:DAY}),
      requirement('BENCHMARK_HISTORY',false,'追蹤差異與追蹤誤差'),
    ],
    metrics:['PRICE_RETURN','TOTAL_RETURN','CAGR','ANNUALIZED_VOLATILITY','MAX_DRAWDOWN','PREMIUM_DISCOUNT','TRACKING_DIFFERENCE','TRACKING_ERROR'],
  },
  MARKET_NEWS:{
    id:'MARKET_NEWS',
    mode:'NEWS',
    description:'查詢標的相關市場新聞與近期事件。',
    requirements:[
      requirement('SECURITY_IDENTITY',true,'確認新聞標的'),
      requirement('MARKET_NEWS',true,'取得近期外部新聞材料',{minItems:1,freshnessMs:DAY}),
    ],
    metrics:[],
  },
  SECURITY_PROFILE:{
    id:'SECURITY_PROFILE',
    mode:'FACT',
    description:'查詢證券或 ETF 的上市、掛牌、募集、成立與基本身分狀態。',
    requirements:[
      requirement('SECURITY_IDENTITY',true,'確認查詢代號'),
      requirement('SECURITY_PROFILE',true,'取得上市/掛牌/募集等外部身分事實',{freshnessMs:7*DAY}),
    ],
    metrics:[],
  },
  ETF_COMPARE:{
    id:'ETF_COMPARE',
    mode:'COMPARE',
    description:'使用同期間、同公式與同資料定義比較兩個以上 ETF。',
    requirements:[
      requirement('SECURITY_IDENTITY',true,'確認比較標的'),
      requirement('HISTORICAL_PRICES',true,'同期間績效與風險比較',{minItems:20,freshnessMs:DAY}),
      requirement('ETF_META',false,'基金屬性、費用與追蹤資訊'),
      requirement('ETF_HOLDINGS',false,'成分與曝險比較'),
      requirement('MARKET_DIVIDENDS',false,'含息報酬與配息比較'),
      requirement('NAV',false,'折溢價比較',{sameTimestampGroup:'ETF_COMPARE_NAV'}),
      requirement('BENCHMARK_HISTORY',false,'追蹤品質比較'),
    ],
    metrics:['PRICE_RETURN','TOTAL_RETURN','CAGR','ANNUALIZED_VOLATILITY','MAX_DRAWDOWN','PREMIUM_DISCOUNT','HOLDINGS_OVERLAP','SECTOR_OVERLAP','TRACKING_DIFFERENCE','TRACKING_ERROR'],
  },
  PORTFOLIO_CONTEXT:{
    id:'PORTFOLIO_CONTEXT',
    mode:'PORTFOLIO',
    description:'讀取使用者目前資本狀態；App 私人資料只作為條件材料，不替代市場事實。',
    requirements:[
      requirement('CAPITAL_CONTEXT',true,'取得股數、成本、市值或資產配置'),
      requirement('TRANSACTIONS',false,'需要時取得實際日期現金流'),
      requirement('PORTFOLIO_DIVIDENDS',false,'需要時取得使用者已記錄股息'),
    ],
    metrics:['XIRR'],
  },
  SCENARIO_ANALYSIS:{
    id:'SCENARIO_ANALYSIS',
    mode:'HYPOTHESIS',
    description:'建立不修改真實帳本的虛擬條件，進行情境、定期定額或資產轉換試算。',
    requirements:[
      requirement('SECURITY_IDENTITY',true,'確認情境標的'),
      requirement('HISTORICAL_PRICES',true,'歷史反事實與試算所需市場價格',{minItems:20,freshnessMs:DAY}),
      requirement('MARKET_DIVIDENDS',false,'含息或股息再投入情境'),
      requirement('CAPITAL_CONTEXT',false,'使用現有持股作為起始資本條件'),
      requirement('TRANSACTIONS',false,'需要真實歷史現金流時使用'),
      requirement('ETF_HOLDINGS',false,'配置重疊與曝險變化'),
      requirement('NAV',false,'ETF 進場折溢價條件'),
    ],
    metrics:['PRICE_RETURN','TOTAL_RETURN','CAGR','XIRR','ANNUALIZED_VOLATILITY','MAX_DRAWDOWN','PREMIUM_DISCOUNT','HOLDINGS_OVERLAP','SECTOR_OVERLAP'],
  },
  GENERAL:{
    id:'GENERAL',
    mode:'GENERAL',
    description:'一般穩定知識與自然對話；不需要把模型記憶當作即時市場資料。',
    requirements:[],
    metrics:[],
  },
};

export function getAiRecipe(id:AiRecipeId):AiRecipe{return RECIPES[id];}

export function listAiRecipes():readonly AiRecipe[]{return Object.values(RECIPES);}

export function extractAiQuestionSymbols(question:string):string[]{
  const upper=question.toUpperCase();
  const matches=upper.match(/[0-9]{4,6}[A-Z]{0,2}/g)??[];
  const unique:string[]=[];
  for(const value of matches){
    const amountPattern=new RegExp(value+'\\s*(?:元|萬|千)');
    const leadingAmountPattern=new RegExp('(?:投入|加碼|金額|預算|每月|每期)\\s*(?:NT\\$|TWD|新台幣)?\\s*'+value,'i');
    if(amountPattern.test(upper)||leadingAmountPattern.test(question))continue;
    if(!unique.includes(value))unique.push(value);
  }
  return unique;
}

export function resolveAiRecipe(question:string):AiRecipe{
  const text=question.trim();
  const symbols=extractAiQuestionSymbols(text);
  if(/(如果|假設|試算|模擬|what[- ]?if|換成|改成|轉成|定期定額|每月投入|股息再投入|再平衡)/i.test(text)){
    return RECIPES.SCENARIO_ANALYSIS;
  }
  if(/(新聞|消息|公告|近期動態|消息面)/i.test(text))return RECIPES.MARKET_NEWS;
  if(/(上市|掛牌|何時上市|何時掛牌|募集|開募|成立日期|成立時間|發行日期|發行時間)/i.test(text))return RECIPES.SECURITY_PROFILE;
  if(/(比較|對比|vs\.?|差異|差別|重疊|哪一檔)/i.test(text)||(symbols.length>=2&&/(跟|和|與)/.test(text)){
    return RECIPES.ETF_COMPARE;
  }
  if(/(近期表現|最近表現|績效|報酬|年化|波動|回撤|近\s*\d+\s*(?:天|日|週|月|年)|YTD|今年表現)/i.test(text)){
    return RECIPES.MARKET_PERFORMANCE;
  }
  if(/(股價|行情|現價|目前價格|現在多少|漲跌|開盤|收盤|成交價)/i.test(text))return RECIPES.MARKET_QUOTE;
  if(/(我的|總資產|持股|成本|平均成本|資產配置|交易紀錄|帳務|我有幾|已領股息|我的損益)/i.test(text)){
    return RECIPES.PORTFOLIO_CONTEXT;
  }
  return RECIPES.GENERAL;
}

export function requiredIngredientsForMetrics(metrics:readonly AiMetricId[]):AiIngredientKey[]{
  const rows:AiIngredientKey[]=[];
  for(const metric of metrics){
    for(const ingredient of AI_METRIC_REGISTRY[metric].requiredIngredients){
      if(!rows.includes(ingredient))rows.push(ingredient);
    }
  }
  return rows;
}
