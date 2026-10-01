import type {AiNewsItem} from './AiNewsRuntime';
import type {AnalysisContext} from './analysisTypes';
import type {AiToolResult,CoreAiToolPlan,QuoteToolData} from './coreAiToolRegistry';
import {AI_METRIC_REGISTRY,extractAiQuestionSymbols,resolveAiRecipe} from './aiRecipeRegistry';
import {DEFAULT_AI_INGREDIENT_ACQUIRER,type AiIngredientAcquirer,type ExternalNewsRow} from './aiIngredientGateway';
import {AI_INGREDIENT_CATALOG,evidenceSatisfiesIngredient,validateIngredientEvidence,type AiIngredientValidationIssue} from './aiIngredientCatalog';
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
import {quoteSourceLagMs,realtimeQuoteFreshness} from '../market/quoteFreshness';

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
          checkedAt:fetchedAt,
          ...(result.meta.freshness?{freshness:result.meta.freshness}:{}),
          ...(result.meta.sourceLagMs!=null?{sourceLagMs:result.meta.sourceLagMs}:{}),
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
  const quoteRequirement=plan.requirements.find(row=>row.ingredient==='MARKET_QUOTE');
  if(quoteRequirement){
    for(const symbol of plan.symbols){
      const existing=findEvidence(evidence,'MARKET_QUOTE',symbol);
      if(evidenceSatisfiesIngredient('MARKET_QUOTE',existing))continue;
      if(!acquirer.fetchQuote){
        attempts.push({
          ingredient:'MARKET_QUOTE',symbol,source:'TWSE_MIS',
          status:'NO_PROVIDER',message:'目前沒有外部即時行情 Provider。',
        });
        continue;
      }
      try{
        const quote=await acquirer.fetchQuote(symbol);
        if(quote){
          const freshness=quote.quality==='trade'
            ?realtimeQuoteFreshness(quote.sourceQuoteAt,quote.checkedAt)
            :'UNKNOWN';
          const sourceLagMs=quoteSourceLagMs(quote.sourceQuoteAt,quote.checkedAt);
          const verified=quote.price!==null&&quote.quality==='trade'&&freshness==='FRESH';
          upsertEvidence(evidence,{
            ingredient:'MARKET_QUOTE',
            symbol,
            status:verified?'VERIFIED':'PARTIAL',
            source:quote.source,
            fetchedAt:new Date(quote.checkedAt).toISOString(),
            ...(quote.sourceQuoteAt?{observedAt:new Date(quote.sourceQuoteAt).toISOString()}:{}),
            summary:verified
              ?'TWSE MIS 實際成交價 '+quote.price
              :freshness==='STALE'&&quote.price!==null
                ?'TWSE MIS 最近可核實成交價 '+quote.price+'，但來源時間已超過即時門檻'
                :quote.statusMessage,
            details:{
              price:quote.price,
              previousClose:quote.previousClose,
              quality:quote.quality,
              market:quote.market,
              statusMessage:quote.statusMessage,
              checkedAt:new Date(quote.checkedAt).toISOString(),
              freshness,
              ...(sourceLagMs!=null?{sourceLagMs}:{}),
            },
          });
          if(quote.market!=='UNKNOWN'&&quote.name&&quote.name!==symbol){
            upsertEvidence(evidence,{
              ingredient:'SECURITY_IDENTITY',
              symbol,
              status:'VERIFIED',
              source:'TWSE_MIS',
              fetchedAt:new Date(quote.checkedAt).toISOString(),
              summary:symbol+' '+quote.name+'（由 TWSE MIS 身分欄位確認）',
              details:{
                securityId:quote.market+':'+symbol,
                name:quote.name,
                market:quote.market,
                assetType:symbol.startsWith('00')?'ETF':'STOCK',
              },
            });
          }
          attempts.push({
            ingredient:'MARKET_QUOTE',symbol,source:'TWSE_MIS',
            status:'FETCHED',
            message:quote.statusMessage,
          });
        }else{
          attempts.push({ingredient:'MARKET_QUOTE',symbol,source:'TWSE_MIS',status:'UNAVAILABLE',message:'官方行情沒有回傳此代號。'});
        }
      }catch(error){
        attempts.push({
          ingredient:'MARKET_QUOTE',symbol,source:'TWSE_MIS',status:'FAILED',
          message:error instanceof Error?error.message:String(error),
        });
      }
    }
  }

  const mentions=plan.question.toUpperCase().match(/[0-9]{4,6}[A-Z]{0,2}/g)??[];
  const selfComparison=plan.recipe.id==='ETF_COMPARE'&&mentions.length>=2&&new Set(mentions).size===1;
  const needsHistory=!selfComparison&&plan.requirements.some(row=>row.ingredient==='HISTORICAL_PRICES');
  if(needsHistory){
    for(const symbol of plan.symbols){
      if(evidenceSatisfiesIngredient('HISTORICAL_PRICES',findEvidence(evidence,'HISTORICAL_PRICES',symbol)))continue;
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
      if(evidenceSatisfiesIngredient('MARKET_NEWS',findEvidence(evidence,'MARKET_NEWS',symbol)))continue;
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
      if(evidenceSatisfiesIngredient('SECURITY_PROFILE',findEvidence(evidence,'SECURITY_PROFILE',symbol)))continue;
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
    return !evidenceSatisfiesIngredient(ingredient,row);
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
    if(plan.symbols.length&&['SECURITY_IDENTITY','MARKET_QUOTE','HISTORICAL_PRICES','MARKET_NEWS','SECURITY_PROFILE'].includes(requirement.ingredient)){
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

function validationIssuesForPlan(
  plan:AiIntelligencePlan,
  evidence:readonly AiIngredientEvidence[],
  now=Date.now(),
):AiIngredientValidationIssue[]{
  const issues:AiIngredientValidationIssue[]=[];
  for(const requirement of plan.requirements){
    const scope=AI_INGREDIENT_CATALOG[requirement.ingredient].scope;
    const symbols=scope==='SYMBOL'&&plan.symbols.length?plan.symbols:[undefined];
    for(const symbol of symbols){
      const row=findEvidence(evidence,requirement.ingredient,symbol);
      const found=validateIngredientEvidence(requirement,row,now);
      for(const issue of found){
        issues.push(symbol&&!issue.symbol?{...issue,symbol}:issue);
      }
    }
  }
  return issues;
}

function requiredMissing(
  plan:AiIntelligencePlan,
  evidence:readonly AiIngredientEvidence[],
  now=Date.now(),
):AiIngredientKey[]{
  const missing:AiIngredientKey[]=[];
  for(const requirement of plan.requirements.filter(row=>row.required)){
    const scope=AI_INGREDIENT_CATALOG[requirement.ingredient].scope;
    const symbols=scope==='SYMBOL'&&plan.symbols.length?plan.symbols:[undefined];
    const ok=symbols.every(symbol=>{
      const row=findEvidence(evidence,requirement.ingredient,symbol);
      return validateIngredientEvidence(requirement,row,now).length===0;
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
  for(const [symbol,rows] of history){
    const historyEvidence=findEvidence(evidence,'HISTORICAL_PRICES',symbol);
    if(!evidenceSatisfiesIngredient('HISTORICAL_PRICES',historyEvidence))continue;
    computed.push(...historyMetrics(symbol,rows,plan.metrics));
  }
  const metrics=fillUnavailableMetrics(plan,evidence,computed);
  const validationIssues=validationIssuesForPlan(plan,evidence);
  const missingRequired=requiredMissing(plan,evidence);
  return {
    generatedAt:nowIso(),
    question:input.question,
    recipeId:plan.recipe.id,
    mode:plan.recipe.mode,
    symbols:plan.symbols,
    status:overallStatus(plan,evidence,missingRequired),
    ingredients:evidence,
    metrics,
    missingRequired,
    acquisitionAttempts:attempts,
    validationIssues,
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

const ingredientLabel:Readonly<Record<AiIngredientKey,string>>={
  SECURITY_IDENTITY:'證券身分',
  MARKET_QUOTE:'市場行情',
  HISTORICAL_PRICES:'官方歷史行情',
  MARKET_DIVIDENDS:'市場配息紀錄',
  NAV:'淨值/iNAV',
  ETF_META:'ETF 基本資料',
  ETF_HOLDINGS:'ETF 成分股',
  MARKET_NEWS:'外部新聞',
  SECURITY_PROFILE:'上市/掛牌資料',
  BENCHMARK_HISTORY:'追蹤指數歷史資料',
  CAPITAL_CONTEXT:'使用者資本狀態',
  TRANSACTIONS:'交易現金流',
  PORTFOLIO_DIVIDENDS:'使用者已記錄股息',
};

const evidenceIdentity=(evidence:AiEvidencePackage,symbol:string)=>
  evidence.ingredients.find(row=>row.ingredient==='SECURITY_IDENTITY'&&row.symbol===symbol);

const targetLabel=(evidence:AiEvidencePackage,symbol:string)=>{
  const identity=evidenceIdentity(evidence,symbol);
  const name=String(identity?.details?.name??'').trim();
  return name&&name!==symbol?symbol+' '+name:symbol;
};

const zhDateTime=(value:unknown)=>{
  const text=String(value??'').trim();
  const parsed=Date.parse(text);
  if(!Number.isFinite(parsed))return text;
  return new Date(parsed).toLocaleString('zh-TW',{
    timeZone:'Asia/Taipei',year:'numeric',month:'2-digit',day:'2-digit',
    hour:'2-digit',minute:'2-digit',
  });
};

const zhQuoteDateTime=(value:unknown)=>{
  const text=String(value??'').trim();
  const parsed=Date.parse(text);
  if(!Number.isFinite(parsed))return text;
  return new Date(parsed).toLocaleString('zh-TW',{
    timeZone:'Asia/Taipei',year:'numeric',month:'2-digit',day:'2-digit',
    hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false,
  });
};

const quoteLagLabel=(value:unknown)=>{
  const lag=Number(value);
  if(!Number.isFinite(lag)||lag<0)return '';
  const seconds=Math.floor(lag/1000);
  const minutes=Math.floor(seconds/60);
  const remain=seconds%60;
  return minutes>0?minutes+' 分 '+remain+' 秒':remain+' 秒';
};

const rawSecurityMentions=(question:string)=>question.toUpperCase().match(/[0-9]{4,6}[A-Z]{0,2}/g)??[];

function unavailableReason(evidence:AiEvidencePackage){
  if(!evidence.missingRequired.length)return '';
  return '缺少'+evidence.missingRequired.map(key=>ingredientLabel[key]).join('、');
}

export function localAnswerFromEvidence(evidence:AiEvidencePackage):string|null{
  if(evidence.recipeId==='MARKET_QUOTE'){
    const symbol=evidence.symbols[0];
    if(!symbol)return '目前沒有辨識到要查詢的證券代號。';
    const row=evidence.ingredients.find(item=>item.ingredient==='MARKET_QUOTE'&&item.symbol===symbol);
    const price=Number(row?.details?.price);
    const previousClose=Number(row?.details?.previousClose);
    if(row&&evidenceSatisfiesIngredient('MARKET_QUOTE',row)&&Number.isFinite(price)&&price>0){
      const parts=[targetLabel(evidence,symbol)+' 目前可核實行情 NT$ '+price.toLocaleString('zh-TW')];
      if(Number.isFinite(previousClose)&&previousClose>0){
        const change=price-previousClose;
        const pct=change/previousClose*100;
        parts.push((change>=0?'+':'')+change.toFixed(2)+'（'+(pct>=0?'+':'')+pct.toFixed(2)+'%）');
      }
      if(row.fetchedAt)parts.push('查詢時間 '+zhQuoteDateTime(row.fetchedAt));
      if(row.observedAt)parts.push('最近成交 '+zhQuoteDateTime(row.observedAt));
      parts.push('來源 '+row.source);
      return parts.join('｜')+'。';
    }
    if(row?.status==='PARTIAL'){
      const partialPrice=Number(row.details?.price);
      const freshness=String(row.details?.freshness??'');
      if(Number.isFinite(partialPrice)&&partialPrice>0&&freshness==='STALE'){
        const parts=[targetLabel(evidence,symbol)+' 最近可核實成交 NT$ '+partialPrice.toLocaleString('zh-TW')];
        if(row.fetchedAt)parts.push('查詢時間 '+zhQuoteDateTime(row.fetchedAt));
        if(row.observedAt)parts.push('最近成交 '+zhQuoteDateTime(row.observedAt));
        const lag=quoteLagLabel(row.details?.sourceLagMs);
        parts.push((lag?'來源時間距本次查詢約 '+lag+'，':'')+'因此不標示為即時行情');
        parts.push('來源 '+row.source);
        return parts.join('｜')+'。';
      }
      return targetLabel(evidence,symbol)+' 已向官方行情來源補查，但目前沒有可核實的實際成交價；TF Asset 不會把昨收、委買或委賣價格冒充現價。';
    }
    return targetLabel(evidence,symbol)+' 目前沒有取得可核實的官方行情。';
  }

  if(evidence.recipeId==='SECURITY_PROFILE'){
    const symbol=evidence.symbols[0];
    if(!symbol)return '目前沒有辨識到要查詢的證券代號。';
    const profile=evidence.ingredients.find(row=>row.ingredient==='SECURITY_PROFILE'&&row.symbol===symbol&&evidenceUsable(row));
    if(profile){
      const name=String(profile.details?.name??'').trim();
      const listingDate=String(profile.details?.listingDate??'').trim();
      const status=String(profile.details?.status??'UNKNOWN');
      if(listingDate){
        const verb=status==='PRELISTING'?'預計掛牌':'掛牌日期';
        const sourceNote=profile.status==='VERIFIED'
          ?'已取得出版社正文佐證'
          :'目前只有外部來源線索，正文驗證層級仍不足';
        return symbol+(name&&name!==symbol?' '+name:'')+' '+verb+'：'+listingDate+'。'+sourceNote+'，來源：'+profile.source+'。';
      }
    }
    const identity=evidenceIdentity(evidence,symbol);
    if(identity?.status==='VERIFIED'){
      return targetLabel(evidence,symbol)+' 已可在 '+String(identity.details?.market??'市場')+' 已上市證券目錄中確認；但目前中繼層沒有取得可核實的原始掛牌日期。';
    }
    return symbol+' 目前尚未在 TF Asset 取得可核實的已上市身分或掛牌日期；可能尚未掛牌、代號尚未生效，或外部來源尚未同步。這種情況不應回覆成 Gemini 服務錯誤。';
  }

  if(evidence.recipeId==='MARKET_PERFORMANCE'){
    const verified=evidence.metrics.map(formatMetric).filter((value):value is string=>Boolean(value));
    const period=evidence.metrics.find(row=>row.period)?.period;
    if(verified.length){
      const target=evidence.symbols.map(symbol=>targetLabel(evidence,symbol)).join('、')||'該標的';
      const range=period?'（'+period.from+'～'+period.to+'）':'';
      const total=evidence.metrics.find(row=>row.metric==='TOTAL_RETURN');
      const caveat=total?.status==='UNAVAILABLE'?'；目前缺市場配息材料，因此未把價格報酬冒充含息總報酬':'';
      return target+' 官方歷史行情'+range+'：'+verified.join('｜')+caveat+'。';
    }
    const symbol=evidence.symbols[0];
    if(symbol){
      const identity=evidenceIdentity(evidence,symbol);
      const historyAttempt=evidence.acquisitionAttempts.find(row=>row.ingredient==='HISTORICAL_PRICES'&&row.symbol===symbol);
      if(identity?.status!=='VERIFIED'){
        return symbol+' 目前無法在官方已上市目錄中確認完整身分，而且沒有足夠的官方歷史行情，因此不能可靠估算今年年化報酬。請先確認代號或等待掛牌後有實際交易資料。';
      }
      if(historyAttempt&&historyAttempt.status!=='FETCHED'){
        return targetLabel(evidence,symbol)+' 目前沒有足夠的官方日線資料可計算年化；TF Asset 不會用持股損益、模型記憶或猜測數字代替。';
      }
    }
  }

  if(evidence.recipeId==='ETF_COMPARE'){
    const mentions=rawSecurityMentions(evidence.question);
    if(mentions.length>=2&&new Set(mentions).size===1){
      return '你輸入的兩個代號都是 '+mentions[0]+'，屬於同一標的，沒有可比較的差異。請再提供另一檔 ETF 代號。';
    }
    if(evidence.symbols.length>=2){
      const lines=evidence.symbols.map(symbol=>{
        const metrics=evidence.metrics
          .filter(row=>row.symbol===symbol)
          .map(formatMetric)
          .filter((value):value is string=>Boolean(value));
        return metrics.length?targetLabel(evidence,symbol)+'：'+metrics.join('｜'):targetLabel(evidence,symbol)+'：目前缺少足夠且同口徑的市場材料';
      });
      const comparable=evidence.symbols.every(symbol=>evidence.metrics.some(row=>row.symbol===symbol&&row.status==='VERIFIED'));
      return '同一套公式／市場資料口徑比較：\n'+lines.join('\n')+
        (comparable?'。':'。目前材料未齊，不應強行判定哪一檔較好。');
    }
  }

  if(evidence.recipeId==='MARKET_NEWS'){
    const row=evidence.ingredients.find(item=>item.ingredient==='MARKET_NEWS'&&evidenceUsable(item));
    const items=(row?.details?.items??[]) as Array<{
      title?:unknown;source?:unknown;publishedAt?:unknown;
      articleBodyVerified?:unknown;highlights?:unknown;
    }>;
    const lines=items.slice(0,3).map((item,index)=>{
      const title=String(item.title??'').trim();
      const source=String(item.source??'').trim();
      const date=zhDateTime(item.publishedAt);
      const highlights=Array.isArray(item.highlights)
        ?item.highlights.map(value=>String(value).trim()).filter(Boolean).slice(0,2)
        :[];
      if(!title)return null;
      const summary=highlights.length?'\n   '+highlights.join(' '):'';
      return (index+1)+'. '+title+(source?'｜'+source:'')+(date?'｜'+date:'')+summary;
    }).filter((value):value is string=>Boolean(value));
    if(lines.length){
      const prefix=evidence.symbols.length?evidence.symbols.map(symbol=>targetLabel(evidence,symbol)).join('、')+' ':'';
      const note=row?.status==='PARTIAL'
        ?'目前只有標題／來源可核實，未把標題自行擴寫成新聞內容。'
        :'其中已有出版社正文可核實，摘要只取自實際正文。';
      return prefix+'近期新聞：\n'+lines.join('\n')+'\n'+note;
    }
    const symbol=evidence.symbols[0];
    if(symbol)return targetLabel(evidence,symbol)+' 目前沒有取得與代號/名稱直接相關且可核實的近期新聞。';
  }

  if(evidence.recipeId!=='GENERAL'&&evidence.missingRequired.length){
    return '目前這個問題的資料證據還不完整（'+unavailableReason(evidence)+'），TF Asset 不會把 Gemini 服務異常當成答案，也不會自行補猜市場數字。';
  }
  return null;
}
