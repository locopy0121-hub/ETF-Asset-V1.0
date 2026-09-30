import type {AiNewsItem} from './AiNewsRuntime';
import type {AnalysisContext} from './analysisTypes';
import type {AiToolResult,CoreAiToolPlan,QuoteToolData} from './coreAiToolRegistry';
import {AI_METRIC_REGISTRY,extractAiQuestionSymbols,resolveAiRecipe} from './aiRecipeRegistry';
import {DEFAULT_AI_INGREDIENT_ACQUIRER,type AiIngredientAcquirer,type ExternalNewsRow} from './aiIngredientGateway';
import type {
  AiAcquisitionAttempt,
  AiEvidencePackage,
  AiEvidenceStatus,
  AiIngredientEvidence,
  AiIngredientKey,
  AiIngredientRequirement,
  AiIntelligencePlan,
  AiMetricEvidence,
  AiMetricId,
} from './intelligenceTypes';
import type {DailyCandle} from '../market/twseDailyHistory';

const nowIso=()=>new Date().toISOString();

const uniqueRequirements=(rows:readonly AiIngredientRequirement[]):AiIngredientRequirement[]=>{
  const map=new Map<AiIngredientKey,AiIngredientRequirement>();
  for(const row of rows){
    const previous=map.get(row.ingredient);
    if(!previous){map.set(row.ingredient,row);continue;}
    map.set(row.ingredient,{
      ...previous,
      ...row,
      required:previous.required||row.required,
    });
  }
  return [...map.values()];
};

export function createAiIntelligencePlan(question:string,toolPlan:CoreAiToolPlan):AiIntelligencePlan{
  const recipe=resolveAiRecipe(question);
  const explicit=extractAiQuestionSymbols(question);
  const symbols=[...explicit];
  const resolved=toolPlan.resolvedSecurity?.symbol;
  if(resolved&&!symbols.includes(resolved))symbols.unshift(resolved);
  const requirements=[...recipe.requirements];
  for(const metric of recipe.metrics){
    for(const ingredient of AI_METRIC_REGISTRY[metric].requiredIngredients){
      if(!requirements.some(row=>row.ingredient===ingredient)){
        requirements.push({
          ingredient,
          required:false,
          purpose:'指標 '+AI_METRIC_REGISTRY[metric].label+' 所需材料',
        });
      }
    }
  }
  return {
    question,
    recipe,
    symbols,
    requirements:uniqueRequirements(requirements),
    metrics:recipe.metrics,
  };
}

const toolStatus=(result:AiToolResult<unknown>):AiEvidenceStatus=>{
  if(!result.ok)return 'UNAVAILABLE';
  if(result.meta.verificationStatus==='VERIFIED')return 'VERIFIED';
  if(result.meta.verificationStatus==='PENDING')return 'PARTIAL';
  if(result.meta.verificationStatus==='UNAVAILABLE')return 'UNAVAILABLE';
  return 'VERIFIED';
};

const evidenceKey=(row:AiIngredientEvidence)=>row.ingredient+'|'+(row.symbol??'*');

function upsertEvidence(target:AiIngredientEvidence[],next:AiIngredientEvidence){
  const key=evidenceKey(next);
  const index=target.findIndex(row=>evidenceKey(row)===key);
  if(index<0){target.push(next);return;}
  const current=target[index];
  if(!current){target.push(next);return;}
  const rank:Record<AiEvidenceStatus,number>={
    VERIFIED:6,PARTIAL:5,STALE:4,CONFLICT:3,UNAVAILABLE:2,INVALID:1,
  };
  if(rank[next.status]>=rank[current.status])target[index]=next;
}

function toolEvidence(toolPlan:CoreAiToolPlan):AiIngredientEvidence[]{
  const rows:AiIngredientEvidence[]=[];
  for(const result of toolPlan.results){
    const fetchedAt=result.meta.fetchedAt||nowIso();
    if(result.tool==='get_quote'){
      const data=result.data as QuoteToolData|undefined;
      upsertEvidence(rows,{
        ingredient:'MARKET_QUOTE',
        ...(data?.security.symbol?{symbol:data.security.symbol}:{}),
        status:toolStatus(result),
        source:result.meta.source,
        fetchedAt,
        ...(result.meta.observedAt?{observedAt:result.meta.observedAt}:{}),
        summary:data?.price==null?'目前沒有可用市場價格':'目前市場價格 '+data.price,
        ...(data?{details:{
          price:data.price,
          previousClose:data.previousClose,
          change:data.change,
          changePercent:data.changePercent,
          quality:data.quality,
          statusMessage:data.statusMessage,
        }}:{}),
      });
      continue;
    }
    if(result.tool==='get_holding_detail'||result.tool==='get_portfolio_summary'){
      upsertEvidence(rows,{
        ingredient:'CAPITAL_CONTEXT',
        status:toolStatus(result),
        source:result.meta.source,
        fetchedAt,
        summary:'TF Asset 使用者資本狀態材料',
        ...(result.data?{details:{tool:result.tool,data:result.data}}:{}),
      });
      continue;
    }
    if(result.tool==='get_transactions'){
      upsertEvidence(rows,{
        ingredient:'TRANSACTIONS',
        status:toolStatus(result),
        source:result.meta.source,
        fetchedAt,
        summary:'TF Asset Canonical Ledger 交易材料',
        ...(result.data?{details:{data:result.data}}:{}),
      });
      continue;
    }
    if(result.tool==='get_dividends'){
      upsertEvidence(rows,{
        ingredient:'PORTFOLIO_DIVIDENDS',
        status:toolStatus(result),
        source:result.meta.source,
        fetchedAt,
        summary:'TF Asset 使用者已記錄股息材料',
        ...(result.data?{details:{data:result.data}}:{}),
      });
    }
  }
  return rows;
}

function localResearchEvidence(context:AnalysisContext):AiIngredientEvidence[]{
  if(!context.targetSymbol||!context.target)return [];
  const fetchedAt=context.generatedAt;
  const rows:AiIngredientEvidence[]=[];
  upsertEvidence(rows,{
    ingredient:'ETF_META',
    symbol:context.targetSymbol,
    status:context.target.meta?'VERIFIED':'UNAVAILABLE',
    source:context.target.meta?.source||'TF_ASSET_LOCAL_RESEARCH',
    fetchedAt,
    ...(context.target.meta?.effectiveDate?{observedAt:context.target.meta.effectiveDate}:{}),
    summary:context.target.meta?'本機 ETF 基本資料可用':'本機 ETF 基本資料尚未匯入',
    ...(context.target.meta?{details:{meta:context.target.meta}}:{}),
  });
  upsertEvidence(rows,{
    ingredient:'ETF_HOLDINGS',
    symbol:context.targetSymbol,
    status:context.target.components.length?'VERIFIED':'UNAVAILABLE',
    source:context.researchCoverage.find(row=>row.symbol===context.targetSymbol)?.source||'TF_ASSET_LOCAL_RESEARCH',
    fetchedAt,
    summary:context.target.components.length
      ?'本機 ETF 成分資料 '+context.target.components.length+' 筆'
      :'本機 ETF 成分資料尚未匯入',
    ...(context.target.components.length?{details:{
      componentRows:context.target.components.length,
      topComponents:context.target.components.slice(0,12),
    }}:{}),
  });
  return rows;
}

function existingNewsEvidence(
  plan:AiIntelligencePlan,
  items:readonly AiNewsItem[],
):AiIngredientEvidence[]{
  if(!plan.requirements.some(row=>row.ingredient==='MARKET_NEWS'))return [];
  const wanted=new Set(plan.symbols);
  const matches=items
    .filter(item=>!wanted.size||wanted.has(item.symbol))
    .slice()
    .sort((a,b)=>Date.parse(b.publishedAt||'')-Date.parse(a.publishedAt||''))
    .slice(0,10);
  if(!matches.length)return [];
  const verifiedArticle=matches.some(item=>item.summaryStatus==='article'&&item.summary.trim());
  const newest=matches.map(item=>Date.parse(item.publishedAt||'')).filter(Number.isFinite).sort((a,b)=>b-a)[0];
  const requirement=plan.requirements.find(row=>row.ingredient==='MARKET_NEWS');
  const stale=Boolean(newest&&requirement?.freshnessMs&&Date.now()-newest>requirement.freshnessMs);
  return [{
    ingredient:'MARKET_NEWS',
    ...(plan.symbols.length===1&&plan.symbols[0]?{symbol:plan.symbols[0]}:{}),
    status:stale?'STALE':verifiedArticle?'VERIFIED':'PARTIAL',
    source:'TF_ASSET_NEWS_CENTER',
    fetchedAt:plan.question?nowIso():nowIso(),
    ...(newest?{observedAt:new Date(newest).toISOString()}:{}),
    summary:'目前新聞中心有 '+matches.length+' 筆相關材料',
    details:{
      articleBodyVerified:verifiedArticle,
      items:matches.map(item=>({
        title:item.title,source:item.source,publishedAt:item.publishedAt,url:item.url,
        summaryStatus:item.summaryStatus??'unavailable',
        ...(item.summary?{summary:item.summary}:{}),
      })),
    },
  }];
}

function identityEvidence(plan:AiIntelligencePlan,toolPlan:CoreAiToolPlan):AiIngredientEvidence[]{
  const rows:AiIngredientEvidence[]=[];
  for(const symbol of plan.symbols){
    const resolved=toolPlan.resolvedSecurity?.symbol===symbol?toolPlan.resolvedSecurity:null;
    const resolvedVerified=Boolean(resolved&&resolved.market!=='UNKNOWN'&&resolved.name!==resolved.symbol);
    rows.push({
      ingredient:'SECURITY_IDENTITY',
      symbol,
      status:resolvedVerified?'VERIFIED':'PARTIAL',
      source:resolvedVerified?'TF_ASSET_SECURITY_RESOLVER':'QUESTION_SYMBOL_PARSER',
      fetchedAt:nowIso(),
      summary:resolvedVerified?symbol+' '+resolved!.name:symbol+'（代號已解析，但尚未在官方已上市目錄確認名稱/市場）',
      ...(resolved?{details:{
        securityId:resolved.securityId,
        name:resolved.name,
        market:resolved.market,
        assetType:resolved.assetType,
      }}:{}),
    });
  }
  return rows;
}

const evidenceUsable=(row:AiIngredientEvidence|undefined)=>Boolean(row&&['VERIFIED','PARTIAL'].includes(row.status));

function findEvidence(rows:readonly AiIngredientEvidence[],ingredient:AiIngredientKey,symbol?:string){
  return rows.find(row=>row.ingredient===ingredient&&(!symbol||!row.symbol||row.symbol===symbol));
}

const externalNewsToDetails=(rows:readonly ExternalNewsRow[])=>rows.slice(0,10).map(row=>({
  title:row.title,source:row.source,publishedAt:row.publishedAt,url:row.url,
  ...(row.publisherUrl?{publisherUrl:row.publisherUrl}:{}),
  articleBodyVerified:row.articleBodyVerified===true,
  ...(row.highlights?.length?{highlights:row.highlights.slice(0,5)}:{}),
}));

const securityNameFor=(symbol:string,evidence:readonly AiIngredientEvidence[])=>{
  const identity=findEvidence(evidence,'SECURITY_IDENTITY',symbol);
  const name=String(identity?.details?.name??'').trim();
  return name&&name!==symbol?name:symbol;
};

async function acquireMissing(
  plan:AiIntelligencePlan,
  evidence:AiIngredientEvidence[],
  attempts:AiAcquisitionAttempt[],
  acquirer:AiIngredientAcquirer,
):Promise<Map<string,readonly DailyCandle[]>>{
  const history=new Map<string,readonly DailyCandle[]>();
  const needsHistory=plan.requirements.some(row=>row.ingredient==='HISTORICAL_PRICES');
  if(needsHistory){
    for(const symbol of plan.symbols){
      if(evidenceUsable(findEvidence(evidence,'HISTORICAL_PRICES',symbol)))continue;
      try{
        const rows=await acquirer.fetchHistory(symbol,12);
        if(rows.length){
          history.set(symbol,rows);
          const first=rows[0],last=rows.at(-1);
          upsertEvidence(evidence,{
            ingredient:'HISTORICAL_PRICES',
            symbol,
            status:'VERIFIED',
            source:'TWSE_TPEX_OFFICIAL_DAILY',
            fetchedAt:nowIso(),
            ...(last?.date?{observedAt:last.date}:{}),
            summary:'官方日線歷史資料 '+rows.length+' 筆',
            details:{
              rowCount:rows.length,
              ...(first?.date?{from:first.date}:{}),
              ...(last?.date?{to:last.date}:{}),
              sources:[...new Set(rows.map(row=>row.source))],
            },
          });
          attempts.push({ingredient:'HISTORICAL_PRICES',symbol,source:'TWSE_TPEX_OFFICIAL_DAILY',status:'FETCHED'});
        }else{
          attempts.push({ingredient:'HISTORICAL_PRICES',symbol,source:'TWSE_TPEX_OFFICIAL_DAILY',status:'UNAVAILABLE',message:'官方來源沒有回傳可用日線資料'});
        }
      }catch(error){
        attempts.push({
          ingredient:'HISTORICAL_PRICES',symbol,source:'TWSE_TPEX_OFFICIAL_DAILY',status:'FAILED',
          message:error instanceof Error?error.message:String(error),
        });
      }
    }
  }

  const needsNews=plan.requirements.some(row=>row.ingredient==='MARKET_NEWS');
  if(needsNews){
    for(const symbol of plan.symbols){
      if(evidenceUsable(findEvidence(evidence,'MARKET_NEWS',symbol)))continue;
      const name=securityNameFor(symbol,evidence);
      try{
        const rows=await acquirer.fetchNews(symbol,name);
        if(rows.length){
          const newest=rows.map(row=>Date.parse(row.publishedAt||'')).filter(Number.isFinite).sort((a,b)=>b-a)[0];
          const bodyVerified=rows.some(row=>row.articleBodyVerified===true&&Boolean(row.highlights?.length));
          upsertEvidence(evidence,{
            ingredient:'MARKET_NEWS',
            symbol,
            status:bodyVerified?'VERIFIED':'PARTIAL',
            source:bodyVerified?'PUBLISHER_ARTICLE+GOOGLE_NEWS_DISCOVERY':'GOOGLE_NEWS_RSS',
            fetchedAt:nowIso(),
            ...(newest?{observedAt:new Date(newest).toISOString()}:{}),
            summary:bodyVerified
              ?'外部新聞中繼取得 '+rows.length+' 筆相關材料，且已有出版社正文驗證'
              :'外部新聞中繼取得 '+rows.length+' 筆相關標題/來源材料；正文尚未驗證',
            details:{articleBodyVerified:bodyVerified,items:externalNewsToDetails(rows)},
          });
          attempts.push({
            ingredient:'MARKET_NEWS',symbol,
            source:bodyVerified?'PUBLISHER_ARTICLE+GOOGLE_NEWS_DISCOVERY':'GOOGLE_NEWS_RSS',
            status:'FETCHED',
            message:bodyVerified?'已取得並驗證部分出版社正文':'已取得標題、來源與發布時間；正文仍待驗證',
          });
        }else{
          attempts.push({ingredient:'MARKET_NEWS',symbol,source:'GOOGLE_NEWS_RSS',status:'UNAVAILABLE',message:'沒有取得與代號/名稱直接相關的新聞'});
        }
      }catch(error){
        attempts.push({
          ingredient:'MARKET_NEWS',symbol,source:'GOOGLE_NEWS_RSS',status:'FAILED',
          message:error instanceof Error?error.message:String(error),
        });
      }
    }
  }

  const needsProfile=plan.requirements.some(row=>row.ingredient==='SECURITY_PROFILE');
  if(needsProfile){
    for(const symbol of plan.symbols){
      if(evidenceUsable(findEvidence(evidence,'SECURITY_PROFILE',symbol)))continue;
      const name=securityNameFor(symbol,evidence);
      if(!acquirer.fetchSecurityProfile){
        attempts.push({ingredient:'SECURITY_PROFILE',symbol,source:'TF_ASSET_PROFILE_DISCOVERY',status:'NO_PROVIDER',message:'沒有可用的上市/掛牌資料 Provider'});
        continue;
      }
      try{
        const profile=await acquirer.fetchSecurityProfile(symbol,name);
        if(profile){
          upsertEvidence(evidence,{
            ingredient:'SECURITY_PROFILE',
            symbol,
            status:profile.articleBodyVerified?'VERIFIED':'PARTIAL',
            source:profile.source,
            fetchedAt:nowIso(),
            ...(profile.publishedAt?{observedAt:profile.publishedAt}:{}),
            summary:profile.listingDate
              ?profile.symbol+' '+profile.name+' '+(profile.status==='PRELISTING'?'預計':'')+'掛牌日期 '+profile.listingDate
              :profile.symbol+' '+profile.name+' 上市狀態資料',
            details:{
              name:profile.name,
              status:profile.status,
              ...(profile.listingDate?{listingDate:profile.listingDate}:{}),
              sourceUrl:profile.sourceUrl,
              articleBodyVerified:profile.articleBodyVerified,
              evidenceText:profile.evidenceText,
            },
          });
          attempts.push({
            ingredient:'SECURITY_PROFILE',symbol,source:profile.source,status:'FETCHED',
            message:profile.articleBodyVerified?'已由出版社正文取得上市/掛牌事實':'僅由標題層取得上市/掛牌線索',
          });
        }else{
          attempts.push({ingredient:'SECURITY_PROFILE',symbol,source:'TF_ASSET_PROFILE_DISCOVERY',status:'UNAVAILABLE',message:'找不到可核實的上市/掛牌資料'});
        }
      }catch(error){
        attempts.push({
          ingredient:'SECURITY_PROFILE',symbol,source:'TF_ASSET_PROFILE_DISCOVERY',status:'FAILED',
          message:error instanceof Error?error.message:String(error),
        });
      }
    }
  }

  const required=plan.requirements.filter(row=>row.required);
  for(const requirement of required){
    if(['HISTORICAL_PRICES','MARKET_NEWS','SECURITY_PROFILE'].includes(requirement.ingredient))continue;
    const has=plan.symbols.length
      ?plan.symbols.some(symbol=>evidenceUsable(findEvidence(evidence,requirement.ingredient,symbol)))
        ||evidenceUsable(findEvidence(evidence,requirement.ingredient))
      :evidenceUsable(findEvidence(evidence,requirement.ingredient));
    if(!has&&!attempts.some(row=>row.ingredient===requirement.ingredient)){
      attempts.push({
        ingredient:requirement.ingredient,
        source:'TF_ASSET_INGREDIENT_GATEWAY',
        status:'NO_PROVIDER',
        message:'目前此材料沒有額外外部 Provider；不得由模型補猜。',
      });
    }
  }
  return history;
}

const dayMs=24*60*60*1000;
const round=(value:number,digits=4)=>{
  const factor=10**digits;
  return Math.round(value*factor)/factor;
};

function historyMetrics(
  symbol:string,
  rows:readonly DailyCandle[],
  requested:readonly AiMetricId[],
):AiMetricEvidence[]{
  const clean=rows
    .filter(row=>Number.isFinite(row.close)&&row.close>0)
    .slice()
    .sort((a,b)=>a.date.localeCompare(b.date));
  const first=clean[0],last=clean.at(-1);
  if(!first||!last||clean.length<2)return [];
  const fromMs=Date.parse(first.date+'T00:00:00Z');
  const toMs=Date.parse(last.date+'T00:00:00Z');
  const days=Math.max(1,(toMs-fromMs)/dayMs);
  const period={from:first.date,to:last.date};
  const out:AiMetricEvidence[]=[];

  if(requested.includes('PRICE_RETURN')){
    out.push({
      metric:'PRICE_RETURN',symbol,status:'VERIFIED',
      method:AI_METRIC_REGISTRY.PRICE_RETURN.method,
      value:round((last.close/first.close-1)*100),
      unit:'%',period,
    });
  }
  if(requested.includes('CAGR')){
    out.push({
      metric:'CAGR',symbol,status:'VERIFIED',
      method:AI_METRIC_REGISTRY.CAGR.method,
      value:round((Math.pow(last.close/first.close,365.2425/days)-1)*100),
      unit:'%/year',period,
      notes:['此值為價格年化，不包含配息；含息年化需 MARKET_DIVIDENDS。'],
    });
  }
  const returns:number[]=[];
  for(let index=1;index<clean.length;index++){
    const previous=clean[index-1],current=clean[index];
    if(previous&&current&&previous.close>0)returns.push(current.close/previous.close-1);
  }
  if(requested.includes('ANNUALIZED_VOLATILITY')&&returns.length>=2){
    const mean=returns.reduce((sum,value)=>sum+value,0)/returns.length;
    const variance=returns.reduce((sum,value)=>sum+(value-mean)**2,0)/(returns.length-1);
    out.push({
      metric:'ANNUALIZED_VOLATILITY',symbol,status:'VERIFIED',
      method:AI_METRIC_REGISTRY.ANNUALIZED_VOLATILITY.method,
      value:round(Math.sqrt(variance)*Math.sqrt(252)*100),
      unit:'%/year',period,
    });
  }
  if(requested.includes('MAX_DRAWDOWN')){
    let peak=clean[0]?.close??0;
    let maxDrawdown=0;
    for(const row of clean){
      if(row.close>peak)peak=row.close;
      if(peak>0)maxDrawdown=Math.min(maxDrawdown,row.close/peak-1);
    }
    out.push({
      metric:'MAX_DRAWDOWN',symbol,status:'VERIFIED',
      method:AI_METRIC_REGISTRY.MAX_DRAWDOWN.method,
      value:round(maxDrawdown*100),
      unit:'%',period,
    });
  }
  return out;
}

function missingForMetric(
  metric:AiMetricId,
  symbol:string|undefined,
  evidence:readonly AiIngredientEvidence[],
):AiIngredientKey[]{
  return AI_METRIC_REGISTRY[metric].requiredIngredients.filter(ingredient=>{
    const row=findEvidence(evidence,ingredient,symbol);
    return !evidenceUsable(row);
  });
}

function fillUnavailableMetrics(
  plan:AiIntelligencePlan,
  evidence:readonly AiIngredientEvidence[],
  computed:AiMetricEvidence[],
):AiMetricEvidence[]{
  const rows=[...computed];
  const symbols=plan.symbols.length?plan.symbols:[undefined];
  for(const metric of plan.metrics){
    for(const symbol of symbols){
      if(rows.some(row=>row.metric===metric&&row.symbol===symbol))continue;
      const missing=missingForMetric(metric,symbol,evidence);
      rows.push({
        metric,
        ...(symbol?{symbol}:{}),
        status:'UNAVAILABLE',
        method:AI_METRIC_REGISTRY[metric].method,
        notes:missing.length
          ?['缺少必要材料：'+missing.join(', ')+'；不得推測數值。']
          :['材料存在但此版本尚未註冊對應的 deterministic calculator；不得交由模型自行計算。'],
      });
    }
  }
  return rows;
}

function overallStatus(
  plan:AiIntelligencePlan,
  evidence:readonly AiIngredientEvidence[],
  missingRequired:readonly AiIngredientKey[],
):AiEvidenceStatus{
  if(plan.recipe.id==='GENERAL')return 'VERIFIED';
  const requiredRows=plan.requirements.filter(row=>row.required).flatMap(requirement=>{
    if(plan.symbols.length&&['SECURITY_IDENTITY','MARKET_QUOTE','HISTORICAL_PRICES','MARKET_NEWS'].includes(requirement.ingredient)){
      return plan.symbols.map(symbol=>findEvidence(evidence,requirement.ingredient,symbol)).filter((row):row is AiIngredientEvidence=>Boolean(row));
    }
    const row=findEvidence(evidence,requirement.ingredient);
    return row?[row]:[];
  });
  if(requiredRows.some(row=>row.status==='CONFLICT'))return 'CONFLICT';
  if(requiredRows.some(row=>row.status==='INVALID'))return 'INVALID';
  if(missingRequired.length){
    return evidence.some(row=>row.status==='VERIFIED'||row.status==='PARTIAL')?'PARTIAL':'UNAVAILABLE';
  }
  if(requiredRows.some(row=>row.status==='STALE'))return 'STALE';
  if(requiredRows.some(row=>row.status==='PARTIAL'))return 'PARTIAL';
  return 'VERIFIED';
}

function requiredMissing(
  plan:AiIntelligencePlan,
  evidence:readonly AiIngredientEvidence[],
):AiIngredientKey[]{
  const missing:AiIngredientKey[]=[];
  for(const requirement of plan.requirements.filter(row=>row.required)){
    const symbols=plan.symbols.length&&['SECURITY_IDENTITY','MARKET_QUOTE','HISTORICAL_PRICES','MARKET_NEWS'].includes(requirement.ingredient)
      ?plan.symbols:[undefined];
    const ok=symbols.every(symbol=>{
      const row=findEvidence(evidence,requirement.ingredient,symbol);
      return Boolean(row&&['VERIFIED','PARTIAL'].includes(row.status));
    });
    if(!ok&&!missing.includes(requirement.ingredient))missing.push(requirement.ingredient);
  }
  return missing;
}

export async function buildAiEvidencePackage(input:{
  question:string;
  toolPlan:CoreAiToolPlan;
  analysisContext:AnalysisContext;
  newsItems:readonly AiNewsItem[];
  acquirer?:AiIngredientAcquirer;
}):Promise<AiEvidencePackage>{
  const plan=createAiIntelligencePlan(input.question,input.toolPlan);
  const evidence:AiIngredientEvidence[]=[
    ...identityEvidence(plan,input.toolPlan),
    ...toolEvidence(input.toolPlan),
    ...localResearchEvidence(input.analysisContext),
    ...existingNewsEvidence(plan,input.newsItems),
  ];
  const attempts:AiAcquisitionAttempt[]=[];
  const history=await acquireMissing(plan,evidence,attempts,input.acquirer??DEFAULT_AI_INGREDIENT_ACQUIRER);
  const computed:AiMetricEvidence[]=[];
  for(const [symbol,rows] of history)computed.push(...historyMetrics(symbol,rows,plan.metrics));
  const metrics=fillUnavailableMetrics(plan,evidence,computed);
  const missingRequired=requiredMissing(plan,evidence);
  return {
    generatedAt:nowIso(),
    recipeId:plan.recipe.id,
    mode:plan.recipe.mode,
    symbols:plan.symbols,
    status:overallStatus(plan,evidence,missingRequired),
    ingredients:evidence,
    metrics,
    missingRequired,
    acquisitionAttempts:attempts,
    rules:{
      marketFactsFromMarketSources:true,
      portfolioDataIsContextOnly:true,
      noFabricationOnMissingData:true,
    },
  };
}

const formatMetric=(row:AiMetricEvidence)=>{
  if(row.status!=='VERIFIED'||typeof row.value!=='number')return null;
  const value=row.value.toLocaleString('zh-TW',{maximumFractionDigits:2});
  if(row.metric==='PRICE_RETURN')return '價格報酬 '+value+'%';
  if(row.metric==='CAGR')return '價格年化 '+value+'%';
  if(row.metric==='ANNUALIZED_VOLATILITY')return '年化波動 '+value+'%';
  if(row.metric==='MAX_DRAWDOWN')return '最大回撤 '+value+'%';
  return null;
};

export function localAnswerFromEvidence(evidence:AiEvidencePackage):string|null{
  if(evidence.recipeId==='MARKET_PERFORMANCE'){
    const verified=evidence.metrics.map(formatMetric).filter((value):value is string=>Boolean(value));
    const period=evidence.metrics.find(row=>row.period)?.period;
    if(verified.length){
      const target=evidence.symbols.join('、')||'該標的';
      const range=period?'（'+period.from+'～'+period.to+'）':'';
      const total=evidence.metrics.find(row=>row.metric==='TOTAL_RETURN');
      const caveat=total?.status==='UNAVAILABLE'?'；目前缺市場配息材料，因此未把價格報酬冒充含息總報酬':'';
      return target+' 官方歷史行情'+range+'：'+verified.join('｜')+caveat+'。';
    }
  }
  if(evidence.recipeId==='MARKET_NEWS'){
    const row=evidence.ingredients.find(item=>item.ingredient==='MARKET_NEWS'&&evidenceUsable(item));
    const items=(row?.details?.items??[]) as Array<{title?:unknown;source?:unknown;publishedAt?:unknown}>;
    const lines=items.slice(0,5).map((item,index)=>{
      const title=String(item.title??'').trim();
      const source=String(item.source??'').trim();
      const date=String(item.publishedAt??'').trim();
      return title?(index+1)+'. '+title+(source?'｜'+source:'')+(date?'｜'+date:''):null;
    }).filter((value):value is string=>Boolean(value));
    if(lines.length){
      const prefix=evidence.symbols.length?evidence.symbols.join('、')+' ':'';
      const note=row?.status==='PARTIAL'?'目前為外部新聞標題／來源材料，正文尚未完成驗證。':'';
      return prefix+'近期新聞材料：\n'+lines.join('\n')+(note?'\n'+note:'');
    }
  }
  return null;
}
