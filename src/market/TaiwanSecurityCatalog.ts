import {mergeEtfCatalog,parseOfficialEtfRow} from './etfMetadata';
import {VERIFIED_ISSUER_DIVIDEND_POLICIES} from './issuerDividendPolicies';

export type TaiwanMarket='TWSE'|'TPEx';
export type TaiwanSecurityInfo=Readonly<{
  symbol:string;
  name:string;
  companyName:string|null;
  market:TaiwanMarket;
  industry:string|null;
  paidInCapitalTwd:number|null;
  issuedCommonShares:number|null;
  englishShortName:string|null;
  phone:string|null;
  website:string|null;
  listingDate:string|null;
  parValueText:string|null;
  chairman:string|null;
  generalManager:string|null;
  address:string|null;
  source:string;
  etfType?:string|null;
  dividendType?:string|null;
  metadataSource?:string|null;
  metadataVerifiedAt?:number|null;
  dividendSource?:string|null;
  dividendSourceUrl?:string|null;
  dividendVerifiedAt?:number|null;
}>;

type Row=Record<string,unknown>;
const textOf=(row:Row,...keys:string[]):string|null=>{
  for(const key of keys){
    const value=String(row[key]??'').trim();
    if(value&&value!=='-'&&value!=='--')return value;
  }
  return null;
};
const numberOf=(row:Row,...keys:string[]):number|null=>{
  const raw=textOf(row,...keys);if(!raw)return null;
  const value=Number(raw.replace(/,/g,''));return Number.isFinite(value)&&value>=0?value:null;
};
const normalizeSymbol=(value:unknown)=>String(value??'').trim().toUpperCase();
const validSymbol=(value:string)=>/^[0-9A-Z]{4,10}$/.test(value);

async function jsonRows(url:string):Promise<Row[]>{
  const response=await fetch(url,{headers:{Accept:'application/json'}});
  if(!response.ok)throw new Error('Taiwan catalog HTTP '+response.status);
  const payload=await response.json();
  return Array.isArray(payload)?payload as Row[]:[];
}

function blank(symbol:string,name:string,market:TaiwanMarket,source:string):TaiwanSecurityInfo{
  return {
    symbol,name,companyName:null,market,industry:null,paidInCapitalTwd:null,issuedCommonShares:null,
    englishShortName:null,phone:null,website:null,listingDate:null,parValueText:null,
    chairman:null,generalManager:null,address:null,source,
  };
}

function profileFrom(row:Row,market:TaiwanMarket,source:string):TaiwanSecurityInfo|null{
  const symbol=normalizeSymbol(textOf(row,'公司代號','股票代號','證券代號'));
  if(!validSymbol(symbol))return null;
  const companyName=textOf(row,'公司名稱','名稱');
  const name=textOf(row,'公司簡稱','證券名稱')??companyName??symbol;
  return {
    symbol,name,companyName,market,
    industry:textOf(row,'產業別'),
    paidInCapitalTwd:numberOf(row,'實收資本額'),
    issuedCommonShares:numberOf(row,'已發行普通股數或TDR原發行股數','已發行普通股數'),
    englishShortName:textOf(row,'英文簡稱'),
    phone:textOf(row,'總機電話','電話'),
    website:textOf(row,'網址','公司網址'),
    listingDate:textOf(row,'上市日期','上櫃日期'),
    parValueText:textOf(row,'普通股每股面額'),
    chairman:textOf(row,'董事長'),
    generalManager:textOf(row,'總經理'),
    address:textOf(row,'住址','公司地址'),
    source,
  };
}

export async function fetchTaiwanSecurityCatalog():Promise<TaiwanSecurityInfo[]>{
  const sources=await Promise.allSettled([
    jsonRows('https://openapi.twse.com.tw/v1/exchangeReport/STOCK_DAY_ALL'),
    jsonRows('https://www.tpex.org.tw/openapi/v1/tpex_mainboard_quotes'),
    jsonRows('https://openapi.twse.com.tw/v1/opendata/t187ap03_L'),
    jsonRows('https://www.tpex.org.tw/openapi/v1/mopsfin_t187ap03_O'),
    jsonRows('https://openapi.twse.com.tw/v1/opendata/t187ap47_L'),
  ]);
  const twseDaily=sources[0].status==='fulfilled'?sources[0].value:[];
  const tpexDaily=sources[1].status==='fulfilled'?sources[1].value:[];
  const twseProfiles=sources[2].status==='fulfilled'?sources[2].value:[];
  const tpexProfiles=sources[3].status==='fulfilled'?sources[3].value:[];
  const etfOfficialRows=sources[4].status==='fulfilled'?sources[4].value:[];

  const map=new Map<string,TaiwanSecurityInfo>();
  for(const row of twseDaily){
    const symbol=normalizeSymbol(textOf(row,'Code','code','證券代號','股票代號'));
    const name=textOf(row,'Name','name','證券名稱','股票名稱');
    if(validSymbol(symbol)&&name)map.set(symbol,blank(symbol,name,'TWSE','TWSE OpenAPI'));
  }
  for(const row of tpexDaily){
    const symbol=normalizeSymbol(textOf(row,'SecuritiesCompanyCode','Code','code','SecuritiesCode','證券代號'));
    const name=textOf(row,'CompanyName','Name','name','SecuritiesCompanyName','證券名稱');
    if(validSymbol(symbol)&&name&&!map.has(symbol))map.set(symbol,blank(symbol,name,'TPEx','TPEx OpenAPI'));
  }
  for(const row of twseProfiles){
    const profile=profileFrom(row,'TWSE','TWSE OpenAPI / MOPS');
    if(profile)map.set(profile.symbol,{...(map.get(profile.symbol)??profile),...profile,name:profile.name||map.get(profile.symbol)?.name||profile.symbol});
  }
  for(const row of tpexProfiles){
    const profile=profileFrom(row,'TPEx','TPEx OpenAPI / MOPS');
    if(profile)map.set(profile.symbol,{...(map.get(profile.symbol)??profile),...profile,name:profile.name||map.get(profile.symbol)?.name||profile.symbol});
  }
  const now=Date.now();
  const official=etfOfficialRows.map(row=>parseOfficialEtfRow(row,now)).filter((row):row is NonNullable<ReturnType<typeof parseOfficialEtfRow>>=>row!==null);
  const tags=mergeEtfCatalog(
    [],
    [],
    [...map.values()].map(item=>({symbol:item.symbol,name:item.name,market:item.market})),
    official,
    VERIFIED_ISSUER_DIVIDEND_POLICIES,
  );
  const tagMap=new Map(tags.map(item=>[item.symbol,item] as const));
  return [...map.values()].map(item=>{
    const tag=tagMap.get(item.symbol);
    return tag?{...item,
      etfType:tag.etfType??null,dividendType:tag.dividendType??null,
      metadataSource:tag.metadataSource??null,metadataVerifiedAt:tag.metadataVerifiedAt??null,
      dividendSource:tag.dividendSource??null,dividendSourceUrl:tag.dividendSourceUrl??null,
      dividendVerifiedAt:tag.dividendVerifiedAt??null,
    }:item;
  }).sort((a,b)=>a.symbol.localeCompare(b.symbol,'en'));
}

export function securityNameMap(catalog:readonly TaiwanSecurityInfo[]):ReadonlyMap<string,string>{
  return new Map(catalog.map(item=>[item.symbol,item.name] as const));
}
