import AsyncStorage from '@react-native-async-storage/async-storage';

export type Instrument = Readonly<{symbol:string;name:string;market:'TWSE'|'TPEX';type:'ETF'}>;

const CACHE='@tf-asset/instrument-registry-v1';
export const FALLBACK_INSTRUMENTS:readonly Instrument[]=[
{symbol:'0050',name:'元大台灣50',market:'TWSE',type:'ETF'},
{symbol:'0051',name:'元大中型100',market:'TWSE',type:'ETF'},
{symbol:'0052',name:'富邦科技',market:'TWSE',type:'ETF'},
{symbol:'0053',name:'元大電子',market:'TWSE',type:'ETF'},
{symbol:'0056',name:'元大高股息',market:'TWSE',type:'ETF'},
{symbol:'006208',name:'富邦台50',market:'TWSE',type:'ETF'},
{symbol:'00713',name:'元大台灣高息低波',market:'TWSE',type:'ETF'},
{symbol:'00878',name:'國泰永續高股息',market:'TWSE',type:'ETF'},
{symbol:'00919',name:'群益台灣精選高息',market:'TWSE',type:'ETF'},
{symbol:'00929',name:'復華台灣科技優息',market:'TWSE',type:'ETF'},
];
const first=(row:Record<string,unknown>,keys:string[])=>{for(const key of keys){const v=row[key];if(typeof v==='string'&&v.trim())return v.trim();}return '';};
function normalize(rows:unknown):Instrument[]{if(!Array.isArray(rows))return [];const out:Instrument[]=[];for(const raw of rows){if(!raw||typeof raw!=='object')continue;const row=raw as Record<string,unknown>;const symbol=first(row,['證券代號','基金代號','股票代號','Code','code']).toUpperCase();const name=first(row,['證券簡稱','基金簡稱','證券名稱','基金名稱','Name','name']);if(!symbol||!name||!/^[0-9A-Z]{4,8}$/.test(symbol))continue;out.push({symbol,name,market:'TWSE',type:'ETF'});}return Array.from(new Map(out.map(x=>[x.symbol,x])).values()).sort((a,b)=>a.symbol.localeCompare(b.symbol));}
export async function loadInstrumentRegistry():Promise<Instrument[]>{try{const res=await fetch('https://openapi.twse.com.tw/v1/opendata/t187ap47_L',{headers:{Accept:'application/json'}});if(res.ok){const fresh=normalize(await res.json());if(fresh.length>20){await AsyncStorage.setItem(CACHE,JSON.stringify(fresh));return fresh;}}}catch{}try{const cached=await AsyncStorage.getItem(CACHE);if(cached){const parsed=JSON.parse(cached) as Instrument[];if(Array.isArray(parsed)&&parsed.length)return parsed;}}catch{}return [...FALLBACK_INSTRUMENTS];}
export function searchInstruments(items:readonly Instrument[],query:string,limit=20):Instrument[]{const q=query.trim().toUpperCase();if(!q)return [];const bySymbol=items.filter(x=>x.symbol.startsWith(q));const byName=items.filter(x=>!bySymbol.includes(x)&&x.name.toUpperCase().includes(q));return [...bySymbol,...byName].slice(0,limit);}
