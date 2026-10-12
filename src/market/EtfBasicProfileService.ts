import AsyncStorage from '@react-native-async-storage/async-storage';
import {ETF_PROFILE_FIELDS,OFFICIAL_ETF_PROFILE_URL,parseOfficialEtfProfile,parseMoneyDjEtfProfile,mergeEtfProfiles,type EtfBasicProfile} from './etfBasicProfile';
const STORAGE='@tf-asset/etf-basic-profiles-v1',TTL=24*60*60*1000;
const cache=new Map<string,EtfBasicProfile>(),inFlight=new Map<string,Promise<ProfileResult>>();
let hydration:Promise<void>|null=null,writeQueue=Promise.resolve();
let officialRows:Record<string,unknown>[]|null=null,officialAt=0;
type ProfileResult=Readonly<{profile:EtfBasicProfile|null;warning:string|null}>;
function validated(value:unknown):value is EtfBasicProfile{
  if(!value||typeof value!=='object')return false;const p=value as EtfBasicProfile;
  if(!/^00[0-9A-Z]{2,6}$/.test(p.symbol??'')||!Number.isFinite(p.fetchedAt)||p.fetchedAt<=0||!p.fields||typeof p.fields!=='object')return false;
  const keys=new Set<string>(ETF_PROFILE_FIELDS.map(r=>r[0]));const entries=Object.entries(p.fields);
  return entries.length>0&&entries.length<=keys.size&&entries.every(([key,field])=>keys.has(key)&&field&&typeof field.value==='string'&&field.value.length>0&&field.value.length<=6000&&typeof field.source==='string'&&field.source.length<100&&
    typeof field.sourceUrl==='string'&&/^https:\/\/(?:openapi\.twse\.com\.tw|www\.moneydj\.com)\//.test(field.sourceUrl)&&(field.asOf===null||/^\d{4}-\d{2}-\d{2}$/.test(field.asOf)));
}
async function hydrate(){
  await (hydration??=AsyncStorage.getItem(STORAGE).then(raw=>{
    if(!raw)return;try{const rows:unknown=JSON.parse(raw);if(Array.isArray(rows))for(const row of rows.slice(0,300))if(validated(row))cache.set(row.symbol,row);}catch{}
  }).catch(()=>{}));
}
async function response(url:string){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
  try{const r=await fetch(url,{signal:controller.signal,headers:{Accept:url===OFFICIAL_ETF_PROFILE_URL?'application/json':'text/html'}});if(!r.ok)throw new Error('ETF 基本資料 HTTP '+r.status);
    const text=await r.text();if(text.length>5_000_000)throw new Error('ETF 基本資料超出上限');return text;
  }finally{clearTimeout(timer);}
}
async function official(symbol:string,now:number){
  if(!officialRows||now<officialAt||now-officialAt>=TTL){const rows:unknown=JSON.parse(await response(OFFICIAL_ETF_PROFILE_URL));if(!Array.isArray(rows))throw new Error('基金資料格式錯誤');officialRows=rows.filter(r=>r&&typeof r==='object');officialAt=now;}
  const raw=officialRows.find(r=>String(r['基金代號']??'').trim().toUpperCase()===symbol);return raw?parseOfficialEtfProfile(raw,symbol,now):null;
}
/** Reference data is fetched only on the profile tab or explicit refresh; no price timer or ledger writes. */
export async function loadEtfBasicProfile(symbol:string,force=false):Promise<ProfileResult>{
  if(!/^00[0-9A-Z]{2,6}$/.test(symbol))throw new Error('無效的 ETF 代號');
  await hydrate();const now=Date.now(),previous=cache.get(symbol)??null;
  if(!force&&previous&&now>=previous.fetchedAt&&now-previous.fetchedAt<TTL)return {profile:previous,warning:null};
  const active=inFlight.get(symbol);if(active)return active;
  if(force)officialAt=0;
  const request=(async()=>{
    const results=await Promise.allSettled([official(symbol,now),response(`https://www.moneydj.com/ETF/X/Basic/Basic0004.xdjhtm?etfid=${symbol}.TW`).then(html=>parseMoneyDjEtfProfile(html,symbol,now))]);
    const officialResult=results[0]!.status==='fulfilled'?results[0]!.value:null,secondary=results[1]!.status==='fulfilled'?results[1]!.value:null;
    const fresh=mergeEtfProfiles(secondary,officialResult),profile=mergeEtfProfiles(previous,fresh);
    let warning:string|null=results.some(r=>r.status==='rejected')||!secondary||!officialResult?'部分來源暫不可用；保留已取得資料並標示原資料日期':null;
    if(!fresh)warning=previous?'更新失敗，保留上次基本資料':'尚未取得 ETF 基本資料，請稍後重試';
    if(fresh&&profile){cache.set(symbol,profile);const json=JSON.stringify([...cache.values()].slice(-300));
      try{await (writeQueue=writeQueue.catch(()=>{}).then(()=>AsyncStorage.setItem(STORAGE,json)));}catch{warning='基本資料已取得，但本機快取儲存失敗；可重新更新';}}
    return {profile,warning};
  })().finally(()=>inFlight.delete(symbol));
  inFlight.set(symbol,request);return request;
}
