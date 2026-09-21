import type {EtfCatalogItem} from './MarketRuntime';

export type EtfKind='市值'|'高股息'|'債券'|'產業'|'主題'|'主動'|'平衡'|'其他';
export type EtfIndustry='台灣大盤'|'半導體'|'科技'|'金融'|'ESG'|'美國'|'全球'|'債券'|'多資產'|'其他';
export type EtfMetrics=Readonly<{expenseRatioPct?:number;yieldPct?:number}>;
export type EtfScreenItem=EtfCatalogItem&Readonly<{kind:EtfKind;industry:EtfIndustry;expenseRatioPct?:number;yieldPct?:number}>;
export type EtfScreenFilters=Readonly<{
  query:string;
  market:'all'|'TWSE'|'TPEx';
  kind:'all'|EtfKind;
  industry:'all'|EtfIndustry;
  maxExpenseRatioPct?:number|undefined;
  minYieldPct?:number|undefined;
}>;

const has=(text:string,words:readonly string[])=>words.some(word=>text.includes(word));
export function classifyEtf(symbol:string,name:string):EtfKind{
  const text=(symbol+' '+name).toUpperCase();
  if(/[ADT]$/.test(symbol.toUpperCase())||has(text,['主動','ACTIVE']))return symbol.toUpperCase().endsWith('T')?'平衡':'主動';
  if(has(text,['平衡','多資產','股債']))return '平衡';
  if(has(text,['債','BOND','投資級','非投資級','公債','公司債']))return '債券';
  if(has(text,['高股息','高息','股利','優息','收益']))return '高股息';
  if(has(text,['半導體','金融','科技','電子','生技','航運']))return '產業';
  if(has(text,['ESG','AI','電動車','元宇宙','低碳','綠能','永續','主題']))return '主題';
  if(has(text,['50','大盤','市值','TAIWAN','臺灣50','台灣50']))return '市值';
  return '其他';
}
export function classifyIndustry(symbol:string,name:string):EtfIndustry{
  const text=(symbol+' '+name).toUpperCase();
  if(has(text,['半導體']))return '半導體';
  if(has(text,['科技','電子','AI']))return '科技';
  if(has(text,['金融']))return '金融';
  if(has(text,['ESG','永續','低碳','綠能']))return 'ESG';
  if(has(text,['美國','S&P','NASDAQ','道瓊','US ']))return '美國';
  if(has(text,['全球','WORLD','ACWI']))return '全球';
  if(has(text,['債','BOND','投資級','公債','公司債']))return '債券';
  if(has(text,['平衡','多資產','股債']))return '多資產';
  if(has(text,['台灣','臺灣','50','大盤','市值']))return '台灣大盤';
  return '其他';
}
export function buildEtfScreenItem(item:EtfCatalogItem,metrics?:EtfMetrics):EtfScreenItem{
  return {
    ...item,
    kind:classifyEtf(item.symbol,item.name),
    industry:classifyIndustry(item.symbol,item.name),
    ...(Number.isFinite(metrics?.expenseRatioPct)?{expenseRatioPct:metrics!.expenseRatioPct}:{}),
    ...(Number.isFinite(metrics?.yieldPct)?{yieldPct:metrics!.yieldPct}:{}),
  };
}
export function filterEtfs(items:readonly EtfScreenItem[],filters:EtfScreenFilters){
  const q=filters.query.trim().toLowerCase();
  return items.filter(item=>{
    if(q&&!item.symbol.toLowerCase().includes(q)&&!item.name.toLowerCase().includes(q))return false;
    if(filters.market!=='all'&&item.market!==filters.market)return false;
    if(filters.kind!=='all'&&item.kind!==filters.kind)return false;
    if(filters.industry!=='all'&&item.industry!==filters.industry)return false;
    if(filters.maxExpenseRatioPct!=null&&(!Number.isFinite(item.expenseRatioPct)||item.expenseRatioPct!>filters.maxExpenseRatioPct))return false;
    if(filters.minYieldPct!=null&&(!Number.isFinite(item.yieldPct)||item.yieldPct!<filters.minYieldPct))return false;
    return true;
  });
}

export function filterEtfsForMetricEnrichment(items:readonly EtfScreenItem[],filters:EtfScreenFilters){
  return filterEtfs(items,{
    ...filters,
    maxExpenseRatioPct:undefined,
    minYieldPct:undefined,
  });
}

const rawNumber=(value:unknown):number|undefined=>{
  const raw=value&&typeof value==='object'&&'raw' in (value as Record<string,unknown>)?(value as Record<string,unknown>).raw:value;
  const n=Number(raw);
  return Number.isFinite(n)?n:undefined;
};
export function parseYahooEtfMetrics(payload:unknown):EtfMetrics{
  const root=payload&&typeof payload==='object'?payload as Record<string,unknown>:{};
  const quote=root.quoteSummary&&typeof root.quoteSummary==='object'?root.quoteSummary as Record<string,unknown>:{};
  const results=Array.isArray(quote.result)?quote.result:[];
  const first=results[0]&&typeof results[0]==='object'?results[0] as Record<string,unknown>:{};
  const fund=first.fundProfile&&typeof first.fundProfile==='object'?first.fundProfile as Record<string,unknown>:{};
  const fees=fund.feesExpensesInvestment&&typeof fund.feesExpensesInvestment==='object'?fund.feesExpensesInvestment as Record<string,unknown>:{};
  const summary=first.summaryDetail&&typeof first.summaryDetail==='object'?first.summaryDetail as Record<string,unknown>:{};
  const expense=rawNumber(fees.annualReportExpenseRatio);
  const dividend=rawNumber(summary.trailingAnnualDividendYield??summary.dividendYield);
  return {
    ...(expense==null?{}:{expenseRatioPct:expense<=1?expense*100:expense}),
    ...(dividend==null?{}:{yieldPct:dividend<=1?dividend*100:dividend}),
  };
}

let crumbPromise:Promise<string>|null=null;
async function yahooCrumb(){
  if(crumbPromise)return crumbPromise;
  crumbPromise=(async()=>{
    await fetch('https://fc.yahoo.com',{credentials:'include'}).catch(()=>null);
    const response=await fetch('https://query1.finance.yahoo.com/v1/test/getcrumb',{credentials:'include',headers:{Accept:'text/plain'}});
    if(!response.ok)throw new Error('Yahoo crumb HTTP '+response.status);
    const crumb=(await response.text()).trim();
    if(!crumb)throw new Error('Yahoo crumb unavailable');
    return crumb;
  })();
  try{return await crumbPromise;}catch(error){crumbPromise=null;throw error;}
}
export async function fetchYahooEtfMetrics(item:Pick<EtfCatalogItem,'symbol'|'market'>):Promise<EtfMetrics>{
  const suffix=item.market==='TPEx'?'.TWO':'.TW';
  const symbol=encodeURIComponent(item.symbol+suffix);
  const crumb=encodeURIComponent(await yahooCrumb());
  const url=`https://query2.finance.yahoo.com/v10/finance/quoteSummary/${symbol}?modules=fundProfile,summaryDetail&formatted=false&lang=zh-TW&region=TW&corsDomain=finance.yahoo.com&crumb=${crumb}`;
  const response=await fetch(url,{credentials:'include',headers:{Accept:'application/json'}});
  if(!response.ok)throw new Error('Yahoo ETF profile HTTP '+response.status);
  return parseYahooEtfMetrics(await response.json());
}
