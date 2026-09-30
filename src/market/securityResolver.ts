export type ResolvedSecurity=Readonly<{
  securityId:string;
  symbol:string;
  market:'TWSE'|'TPEX'|'UNKNOWN';
  name:string;
  assetType:'STOCK'|'ETF'|'UNKNOWN';
}>;

export type SecurityCandidate=Readonly<{
  symbol:string;
  name:string;
  market?:'TWSE'|'TPEX'|'UNKNOWN';
  assetType?:'STOCK'|'ETF'|'UNKNOWN';
}>;

const normalize=(value:string)=>value.trim().toUpperCase().replace(/\s+/g,'');
const symbolFromText=(value:string)=>value.toUpperCase().match(/(?:TWSE:|TPEX:)?([0-9]{4,6}[A-Z]{0,2})/)?.[1]??null;
const assetTypeFromSymbol=(symbol:string):ResolvedSecurity['assetType']=>symbol.startsWith('00')?'ETF':'STOCK';
const toResolved=(row:SecurityCandidate):ResolvedSecurity=>{
  const symbol=row.symbol.trim().toUpperCase();
  const market=row.market??'UNKNOWN';
  return {
    securityId:(market==='UNKNOWN'?'TW':market)+':'+symbol,
    symbol,
    market,
    name:row.name.trim()||symbol,
    assetType:row.assetType??assetTypeFromSymbol(symbol),
  };
};

export function resolveSecurityFromKnown(query:string,known:readonly SecurityCandidate[]):ResolvedSecurity|null{
  const raw=query.trim();
  const normalized=normalize(raw);
  const directSymbol=symbolFromText(raw);
  if(directSymbol){
    const exact=known.find(row=>row.symbol.trim().toUpperCase()===directSymbol);
    return exact?toResolved(exact):null;
  }
  const exactName=known.find(row=>normalize(row.name)===normalized);
  if(exactName)return toResolved(exactName);
  const contained=known
    .filter(row=>{
      const name=normalize(row.name);
      return name.length>=2&&normalized.includes(name);
    })
    .sort((a,b)=>normalize(b.name).length-normalize(a.name).length);
  return contained[0]?toResolved(contained[0]):null;
}

type CatalogState=Readonly<{expiresAt:number;rows:readonly SecurityCandidate[]}>;
let catalogCache:CatalogState|null=null;
const CACHE_MS=6*60*60*1000;

async function fetchOfficialSecurityCatalog():Promise<readonly SecurityCandidate[]>{
  if(catalogCache&&catalogCache.expiresAt>Date.now())return catalogCache.rows;
  const rows:SecurityCandidate[]=[];
  const seen=new Set<string>();
  const push=(symbol:unknown,name:unknown,market:'TWSE'|'TPEX')=>{
    const code=String(symbol??'').trim().toUpperCase();
    const label=String(name??'').trim();
    if(!/^[0-9A-Z]{4,8}$/.test(code)||!label)return;
    const key=market+':'+code;
    if(seen.has(key))return;
    seen.add(key);
    rows.push({symbol:code,name:label,market,assetType:assetTypeFromSymbol(code)});
  };
  const requests=[
    fetch('https://openapi.twse.com.tw/v1/exchangeReport/STOCK_DAY_ALL',{headers:{Accept:'application/json'}})
      .then(async response=>{
        if(!response.ok)throw new Error('TWSE security catalog HTTP '+response.status);
        const data=await response.json() as Array<Record<string,unknown>>;
        for(const row of Array.isArray(data)?data:[])push(row.Code??row.code,row.Name??row.name,'TWSE');
      }),
    fetch('https://www.tpex.org.tw/openapi/v1/tpex_mainboard_quotes',{headers:{Accept:'application/json'}})
      .then(async response=>{
        if(!response.ok)throw new Error('TPEX security catalog HTTP '+response.status);
        const data=await response.json() as Array<Record<string,unknown>>;
        for(const row of Array.isArray(data)?data:[])push(
          row.SecuritiesCompanyCode??row.Code??row.code??row.SecuritiesCode,
          row.CompanyName??row.Name??row.name??row.SecuritiesCompanyName,
          'TPEX',
        );
      }),
  ];
  await Promise.allSettled(requests);
  catalogCache={rows,expiresAt:Date.now()+(rows.length?CACHE_MS:60_000)};
  return rows;
}

function looksLikeSecurityQuery(query:string){
  const text=query.trim();
  return Boolean(symbolFromText(text))
    ||/(股價|行情|價格|現價|股票|ETF|走勢|漲跌|配息|股息|幾張|幾股|成本|市值)/i.test(text)
    ||(text.length>=2&&text.length<=12&&/[\u4e00-\u9fff]/.test(text));
}

export async function resolveSecurity(
  query:string,
  known:readonly SecurityCandidate[]=[],
):Promise<ResolvedSecurity|null>{
  const knownMatch=resolveSecurityFromKnown(query,known);
  if(knownMatch)return knownMatch;
  if(!looksLikeSecurityQuery(query))return null;
  const catalog=await fetchOfficialSecurityCatalog();
  const raw=query.trim();
  const normalized=normalize(raw);
  const directSymbol=symbolFromText(raw);
  if(directSymbol){
    const exact=catalog.find(row=>row.symbol===directSymbol);
    return exact?toResolved(exact):{
      securityId:'TW:'+directSymbol,
      symbol:directSymbol,
      market:'UNKNOWN',
      name:directSymbol,
      assetType:assetTypeFromSymbol(directSymbol),
    };
  }
  const exactName=catalog.find(row=>normalize(row.name)===normalized);
  if(exactName)return toResolved(exactName);
  const contained=catalog
    .filter(row=>{
      const name=normalize(row.name);
      return name.length>=2&&normalized.includes(name);
    })
    .sort((a,b)=>normalize(b.name).length-normalize(a.name).length);
  return contained[0]?toResolved(contained[0]):null;
}
