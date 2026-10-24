import type {EtfConstituentSnapshot} from './etfConstituents';
export type ConstituentChange=Readonly<{kind:'added'|'removed'|'weight';symbol:string;name:string;before:number|null;after:number|null}>;
export type OfficialReplacement=Readonly<{from:string;to:string;effectiveDate:string;sourceUrl:string}>;
export type ConstituentComparison=Readonly<{status:'baseline'|'partial'|'source_changed'|'older'|'compared';from:string|null;to:string;changes:readonly ConstituentChange[];replacements:readonly OfficialReplacement[]}>;
const basis=(s:Pick<EtfConstituentSnapshot,'source'|'basis'>)=>s.basis??(s.source.includes('MoneyDJ')?'third_party_disclosed':'issuer_disclosed');
export function verifiedReplacement(value:unknown):value is OfficialReplacement{
  if(!value||typeof value!=='object')return false;const v=value as OfficialReplacement;
  if(!/^[A-Z0-9][A-Z0-9._-]{0,24}$/.test(v.from??'')||!/^[A-Z0-9][A-Z0-9._-]{0,24}$/.test(v.to??'')||v.from===v.to||!/^\d{4}-\d{2}-\d{2}$/.test(v.effectiveDate??''))return false;
  const at=new Date(v.effectiveDate+'T00:00:00Z');if(!Number.isFinite(at.getTime())||at.toISOString().slice(0,10)!==v.effectiveDate)return false;
  try{const url=new URL(v.sourceUrl);return url.protocol==='https:'&&!url.username&&!url.password&&['www.twse.com.tw','www.tpex.org.tw','www.yuantaetfs.com'].includes(url.hostname);}catch{return false;}
}
export function compareConstituents(previous:EtfConstituentSnapshot|null|undefined,current:EtfConstituentSnapshot):ConstituentComparison{
  const report=(status:ConstituentComparison['status'],changes:ConstituentChange[]=[],replacements:OfficialReplacement[]=[]):ConstituentComparison=>({status,from:previous?.asOf??null,to:current.asOf,changes,replacements});
  if(!previous||previous.symbol!==current.symbol)return report('baseline');
  if(current.asOf<previous.asOf)return report('older');
  if(!previous.complete||!current.complete)return report('partial');
  if(previous.source!==current.source||basis(previous)!==basis(current))return report('source_changed');
  if(current.source.includes('MoneyDJ')&&(current.completenessVerified!==true||previous.completenessVerified!==true))return report('partial');
  const before=new Map(previous.rows.map(r=>[r.symbol,r])),after=new Map(current.rows.map(r=>[r.symbol,r])),changes:ConstituentChange[]=[];
  for(const row of current.rows){const old=before.get(row.symbol);if(!old)changes.push({kind:'added',symbol:row.symbol,name:row.name,before:null,after:row.weight});
    else if(Math.abs(old.weight-row.weight)>=0.005)changes.push({kind:'weight',symbol:row.symbol,name:row.name,before:old.weight,after:row.weight});}
  for(const row of previous.rows)if(!after.has(row.symbol))changes.push({kind:'removed',symbol:row.symbol,name:row.name,before:row.weight,after:null});
  const usedFrom=new Set<string>(),usedTo=new Set<string>();
  const replacements=(current.replacements??[]).filter(v=>{
    if(!verifiedReplacement(v)||usedFrom.has(v.from)||usedTo.has(v.to)||!changes.some(c=>c.kind==='removed'&&c.symbol===v.from)||!changes.some(c=>c.kind==='added'&&c.symbol===v.to))return false;
    usedFrom.add(v.from);usedTo.add(v.to);return true;
  });
  return report('compared',changes,replacements);
}
