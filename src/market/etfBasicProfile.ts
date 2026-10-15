export type EtfProfileField=Readonly<{value:string;source:string;sourceUrl:string;asOf:string|null}>;
export const ETF_PROFILE_FIELDS=[
  ['chinese','基金中文名稱'],['english','英文名稱'],['symbol','交易所代碼'],['exchange','交易所'],['issuer','發行公司'],
  ['formation','成立日期'],['listing','上市日期'],['currency','計價幣別'],['size','ETF規模'],['close','ETF收盤價'],
  ['nav','ETF淨值'],['premium','折溢價'],['target','投資標的'],['region','投資區域'],['totalFee','總管理費用'],
  ['managerFee','經理費'],['frequency','配息頻率'],['yield','殖利率'],['custodian','保管銀行'],['manager','經理人'],
  ['tracking','追蹤指數'],['benchmark','基準指數'],['strategy','投資策略'],
] as const;
export type EtfProfileKey=typeof ETF_PROFILE_FIELDS[number][0];
export type EtfBasicProfile=Readonly<{symbol:string;fetchedAt:number;fields:Partial<Record<EtfProfileKey,EtfProfileField>>}>;
export const OFFICIAL_ETF_PROFILE_URL='https://openapi.twse.com.tw/v1/opendata/t187ap47_L';
const validSymbol=(symbol:string)=>/^00[0-9A-Z]{2,6}$/.test(symbol);
const clean=(v:unknown)=>String(v??'').replace(/\s+/g,' ').trim();
const missing=(v:string)=>!v||/^(?:-|--|—|N\/A|null)(?:\s*[（(].*)?$/i.test(v);
function date(raw:unknown):string|null{
  let s=clean(raw),y:number,m:number,d:number;
  if(/^\d{7}$/.test(s)){y=Number(s.slice(0,3))+1911;m=Number(s.slice(3,5));d=Number(s.slice(5));}
  else if(/^\d{8}$/.test(s)){y=Number(s.slice(0,4));m=Number(s.slice(4,6));d=Number(s.slice(6));}
  else {const x=s.match(/^(\d{3,4})[/-](\d{1,2})[/-](\d{1,2})/);if(!x)return null;y=Number(x[1]);if(y<1911)y+=1911;m=Number(x[2]);d=Number(x[3]);}
  const at=new Date(Date.UTC(y,m-1,d));return at.getUTCFullYear()===y&&at.getUTCMonth()+1===m&&at.getUTCDate()===d?`${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`:null;
}
export function parseOfficialEtfProfile(raw:Record<string,unknown>,symbol:string,fetchedAt:number):EtfBasicProfile|null{
  if(!validSymbol(symbol)||clean(raw['基金代號']).toUpperCase()!==symbol)return null;
  const fields:EtfBasicProfile['fields']={},asOf=date(raw['出表日期']);
  const keys:Partial<Record<EtfProfileKey,string>>={chinese:'基金中文名稱',english:'基金英文名稱',formation:'成立日期',listing:'上市日期',manager:'基金經理人',custodian:'保管機構',tracking:'標的指數/追蹤指數名稱'};
  for(const [key,label] of Object.entries(keys)){
    let value=clean(raw[label]);if(missing(value))continue;
    if(key==='formation'||key==='listing'){const d=date(value);if(!d)continue;value=d.replaceAll('-','/');}
    fields[key as EtfProfileKey]={value,source:'TWSE 基金基本資料',sourceUrl:OFFICIAL_ETF_PROFILE_URL,asOf};
  }
  return Object.keys(fields).length?{symbol,fetchedAt,fields}:null;
}
const htmlText=(s:string)=>s.replace(/<!--[^]*?-->/g,'').replace(/<script\b[^>]*>[^]*?<\/script>/gi,'').replace(/<style\b[^>]*>[^]*?<\/style>/gi,'')
  .replace(/<[^>]*>/g,' ').replace(/&nbsp;|&#160;/g,' ').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&#(\d+);/g,(_,n)=>Number(n)<=0x10ffff?String.fromCodePoint(Number(n)):'').replace(/\s+/g,' ').trim();
export function parseMoneyDjEtfProfile(html:string,symbol:string,fetchedAt:number):EtfBasicProfile|null{
  if(!validSymbol(symbol)||html.length>3_000_000||!htmlText(html).includes(symbol+'.TW'))return null;
  const table=[...html.matchAll(/<table\b[^>]*>[^]*?<\/table>/gi)].map(m=>m[0]).find(t=>/英文名稱/.test(t)&&/成立日期/.test(t))
    ??[...html.matchAll(/<table\b[^>]*>[^]*?<\/table>/gi)].map(m=>m[0]).find(t=>/英文名稱/.test(t)&&/ETF規模/.test(t));
  if(!table)return null;
  const values=new Map<string,string>();
  for(const row of table.replace(/<!--[^]*?-->/g,'').matchAll(/<tr\b[^>]*>([^]*?)<\/tr>/gi)){
    const cells=[...row[1]!.matchAll(/<(th|td)\b[^>]*>([^]*?)<\/(?:th|td)>/gi)];
    for(let i=0;i<cells.length-1;i++)if(cells[i]![1]!.toLowerCase()==='th'&&cells[i+1]![1]!.toLowerCase()==='td')values.set(htmlText(cells[i]![2]!),htmlText(cells[i+1]![2]!));
  }
  const code=values.get('交易所代碼')?.toUpperCase();
  if(!code||(code!==symbol&&code!==symbol+'.TW'&&code!==symbol+'.TWO'))return null;
  const sourceUrl=`https://www.moneydj.com/ETF/X/Basic/Basic0004.xdjhtm?etfid=${symbol}.TW`,fields:EtfBasicProfile['fields']={};
  const fullDate=['ETF規模','ETF市價','ETF收盤價','ETF淨值','殖利率(%)'].map(key=>values.get(key)??'').map(v=>v.match(/\d{4}[/-]\d{1,2}[/-]\d{1,2}/)?.[0]).filter(Boolean).map(v=>date(v)).filter((v):v is string=>!!v).sort().at(-1);
  const keys:Partial<Record<EtfProfileKey,string[]>>={english:['英文名稱'],issuer:['發行公司'],formation:['成立日期'],listing:['上市日期'],currency:['計價幣別'],size:['ETF規模'],close:['ETF收盤價','ETF市價'],nav:['ETF淨值'],premium:['折溢價(%)','折溢價'],target:['投資標的'],region:['投資區域'],totalFee:['總管理費用(%)','總管理費用'],managerFee:['經理費(%)','經理費'],frequency:['配息頻率'],yield:['殖利率(%)','殖利率'],custodian:['保管機構','保管銀行'],manager:['經理人'],tracking:['追蹤指數'],benchmark:['基準指數'],strategy:['投資策略']};
  for(const [key,labels] of Object.entries(keys)){
    let value=labels.map(label=>values.get(label)).find(v=>v&&!missing(v))??'';if(!value)continue;
    let asOf:string|null=null;
    const full=value.match(/\d{4}[/-]\d{1,2}[/-]\d{1,2}/)?.[0],short=value.match(/[（(](\d{1,2})\/(\d{1,2})[）)]/);
    if(full&&['size','close','nav','yield'].includes(key))asOf=date(full);
    else if(short&&['close','nav','yield'].includes(key)&&fullDate){
      const year=Number(fullDate.slice(0,4)),anchor=Date.parse(fullDate+'T00:00:00Z');
      const lastDate=new Date(fetchedAt+8*60*60*1000).toISOString().slice(0,10);
      asOf=[year-1,year,year+1].map(y=>date(`${y}/${short[1]}/${short[2]}`)).filter((v):v is string=>!!v&&v<=lastDate&&Math.abs(Date.parse(v)-anchor)<=45*86_400_000).sort((a,b)=>Math.abs(Date.parse(a)-anchor)-Math.abs(Date.parse(b)-anchor))[0]??null;
    }
    if(key==='formation'||key==='listing'){const d=date(value);if(!d)continue;value=d.replaceAll('-','/');}
    if(['totalFee','managerFee','yield','premium'].includes(key))value=value.replace(/^(-?\d+(?:\.\d+)?)(?![\d.%])/, '$1%');
    // Keep provider units and date labels; never treat a missing total fee as zero.
    fields[key as EtfProfileKey]={value:value.slice(0,6000),source:'MoneyDJ 理財網',sourceUrl,asOf};
  }
  return Object.keys(fields).length>=3?{symbol,fetchedAt,fields}:null;
}
export function mergeEtfProfiles(previous:EtfBasicProfile|null|undefined,next:EtfBasicProfile|null|undefined):EtfBasicProfile|null{
  if(!next)return previous??null;if(!previous||previous.symbol!==next.symbol)return next;
  const fields={...previous.fields};
  for(const [key,value] of Object.entries(next.fields)){
    const old=fields[key as EtfProfileKey];
    if(value&&(!old?.asOf||(value.asOf&&value.asOf>=old.asOf)))fields[key as EtfProfileKey]=value;
  }
  return {symbol:next.symbol,fetchedAt:Math.max(previous.fetchedAt,next.fetchedAt),fields};
}
export function profileRows(profile:EtfBasicProfile|null,symbol:string,market:string){
  return ETF_PROFILE_FIELDS.map(([key,label])=>{
    const field=profile?.symbol===symbol?profile.fields[key]:undefined;
    return {key,label,value:key==='symbol'?symbol+(market==='TPEx'?'.TWO':'.TW'):key==='exchange'?market:field?.value??'暫無資料',source:field?.source??null,sourceUrl:field?.sourceUrl??null,asOf:field?.asOf??null};
  });
}
