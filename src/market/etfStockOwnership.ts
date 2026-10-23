/** Public, date-labelled ETF reference positions; never canonical user holdings. */
import type {EtfConstituentSnapshot} from './etfConstituents';

export type StockEtfOwner=Readonly<{
  etfSymbol:string;etfName:string;stockSymbol:string;stockName:string;
  weight:number;quantity:number|null;asOf:string;source:string;sourceUrl:string;
  basis:'issuer_disclosed'|'third_party_disclosed'|'pcf_estimated';complete:boolean;
}>;
export const taipeiDisclosureDate=(timestamp=Date.now())=>
  new Date(timestamp+8*3600_000).toISOString().slice(0,10);
const validDate=(value:string)=>/^\d{4}-\d{2}-\d{2}$/.test(value)&&
  !Number.isNaN(Date.parse(value+'T00:00:00Z'))&&new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value;
const safeQuantity=(value:unknown):number|null=>typeof value==='number'&&Number.isSafeInteger(value)&&value>=0?value:null;
const sourceBasis=(s:EtfConstituentSnapshot):StockEtfOwner['basis']=>
  s.basis??(s.source.includes('MoneyDJ')?'third_party_disclosed':'issuer_disclosed');
export function localStockEtfOwners(stockSymbol:string,snapshots:readonly EtfConstituentSnapshot[],names:Readonly<Record<string,string>>={}):StockEtfOwner[]{
  if(!/^[A-Z0-9][A-Z0-9._-]{0,24}$/.test(stockSymbol))return [];
  return snapshots.filter(s=>s.rows.some(r=>r.symbol===stockSymbol)).map(s=>{
    const row=s.rows.find(r=>r.symbol===stockSymbol)!;
    return {etfSymbol:s.symbol,etfName:names[s.symbol]??s.symbol,stockSymbol,stockName:row.name,
      weight:row.weight,quantity:safeQuantity(row.quantity),asOf:s.asOf,source:s.source,
      sourceUrl:s.sourceUrl,basis:sourceBasis(s),complete:s.complete};
  }).sort((a,b)=>b.asOf.localeCompare(a.asOf)||b.weight-a.weight||a.etfSymbol.localeCompare(b.etfSymbol));
}
export function validateStockEtfOwners(raw:unknown,stockSymbol:string):{rows:StockEtfOwner[];coverage:number}|null{
  if(!raw||typeof raw!=='object'||!Array.isArray((raw as {rows?:unknown}).rows))return null;
  const input=raw as {rows:unknown[];coverage?:unknown};
  if(input.rows.length>300||typeof input.coverage!=='number'||!Number.isSafeInteger(input.coverage)||input.coverage<0||input.coverage>300)return null;
  const rows:StockEtfOwner[]=[],seen=new Set<string>();
  for(const entry of input.rows){
    if(!entry||typeof entry!=='object')return null;
    const r=entry as Record<string,unknown>;
    if(r.stockSymbol!==stockSymbol||typeof r.etfSymbol!=='string'||!/^00[0-9A-Z]{2,6}$/.test(r.etfSymbol)||seen.has(r.etfSymbol)||
       typeof r.etfName!=='string'||r.etfName.length>150||typeof r.stockName!=='string'||r.stockName.length>150||
       typeof r.weight!=='number'||!Number.isFinite(r.weight)||r.weight<0||r.weight>100||
       typeof r.asOf!=='string'||!validDate(r.asOf)||typeof r.source!=='string'||r.source.length>150||
       typeof r.sourceUrl!=='string'||!/^https:\/\/www\.(?:yuantaetfs|moneydj|twse)\.com(?:\.tw)?\//.test(r.sourceUrl)||
       !['issuer_disclosed','third_party_disclosed','pcf_estimated'].includes(String(r.basis))||typeof r.complete!=='boolean'||
       (r.quantity!=null&&safeQuantity(r.quantity)===null))return null;
    seen.add(r.etfSymbol);
    rows.push({etfSymbol:r.etfSymbol,etfName:r.etfName,stockSymbol,stockName:r.stockName,weight:r.weight,
      quantity:safeQuantity(r.quantity),asOf:r.asOf,source:r.source,sourceUrl:r.sourceUrl,
      basis:r.basis as StockEtfOwner['basis'],complete:r.complete});
  }
  return {rows:rows.sort((a,b)=>b.asOf.localeCompare(a.asOf)||b.weight-a.weight||a.etfSymbol.localeCompare(b.etfSymbol)),coverage:input.coverage};
}
export function mergeStockEtfOwners(local:readonly StockEtfOwner[],remote:readonly StockEtfOwner[]):StockEtfOwner[]{
  const byEtf=new Map<string,StockEtfOwner>();
  for(const row of [...remote,...local]){
    const before=byEtf.get(row.etfSymbol);
    if(!before||row.asOf>before.asOf||(row.asOf===before.asOf&&row.complete&&!before.complete))byEtf.set(row.etfSymbol,row);
  }
  return [...byEtf.values()].sort((a,b)=>b.asOf.localeCompare(a.asOf)||b.weight-a.weight||a.etfSymbol.localeCompare(b.etfSymbol));
}
