import {DEFAULT_PORTFOLIO_LIST} from '../domain/portfolioList';
import type {PageDisplayConfig} from '../editor/editorModel';
import type {MainPageKey} from '../domain/pageRegistry';
import type {InspectedTarget,TargetOverride} from './inspectionModel';

/** Only the selected native A is isolated; never clear shared style definitions. */
export type IndividualResetMap=Readonly<Record<string,readonly string[]>>;
export const individualScope=(page:MainPageKey,frameKey:string)=>page+':'+frameKey;
const validScope=/^(home|ledger|portfolio|dividend|ai|settings):[a-z0-9-]+$/;
const validId=(id:string)=>id.length>0&&id.length<=150&&
  !/[\u0000-\u001f]/.test(id)&&!/(^|\/)\.\.(\/|$)/.test(id)&&id!=='__proto__';
export function normalizeIndividualResets(raw:unknown):Record<string,string[]>{
  if(!raw||typeof raw!=='object'||Array.isArray(raw))return {};
  return Object.fromEntries(Object.entries(raw as Record<string,unknown>)
    .filter(([key,value])=>validScope.test(key)&&Array.isArray(value))
    .map(([key,value])=>[key,[...new Set((value as unknown[])
      .filter((id):id is string=>typeof id==='string'&&validId(id)))].slice(0,120)]));
}
export function isIndividualReset(map:IndividualResetMap,page:MainPageKey,frameKey:string,id:string):boolean{
  return (map[individualScope(page,frameKey)]??[]).includes(id);
}
export function withIndividualReset(map:IndividualResetMap,page:MainPageKey,frameKey:string,id:string):Record<string,string[]>{
  if(!validId(id))return normalizeIndividualResets(map);
  const key=individualScope(page,frameKey);
  return {...normalizeIndividualResets(map),[key]:[...new Set([...(map[key]??[]),id])].slice(0,120)};
}
/** A reset suppresses inherited frame/page/app style ONLY for this specific ID. */
export function effectiveIndividualOverride(local:TargetOverride,shared:TargetOverride,reset:boolean):TargetOverride{
  return reset?{...local}:{...local,...shared};
}
/** Clear even spatial, visibility and native-display overrides, not just appearance. */
export function clearIndividualOverride(all:Readonly<Record<string,TargetOverride>>,id:string):Record<string,TargetOverride>{
  return {...all,[id]:{}};
}
/** Only fields owned by a particular native A may be returned to defaults. */
export function individualNativeDisplayPatch(target:Pick<InspectedTarget,'page'|'frameKey'|'kind'|'properties'>):Partial<PageDisplayConfig>{
  if(target.page!=='portfolio'||target.frameKey!=='holding-view')return {};
  if(target.kind==='portfolio-list')return {portfolioList:DEFAULT_PORTFOLIO_LIST};
  if(target.kind!=='control')return {};
  const choices=target.properties.find(item=>item.name==='可選項目')?.value??'';
  if(target.label==='持股四鍵快捷列')return {portfolioViewMode:'list',quoteStyle:'quote',holdingLayoutMode:'list',sortKey:'manual'};
  if(choices.includes('清單模式')&&choices.includes('行情牆模式'))return {portfolioViewMode:'list'};
  if(choices.includes('純行情')&&choices.includes('精簡'))return {quoteStyle:'chart'};
  return {};
}
