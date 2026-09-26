import {normalizeTargetOverride,targetToolSupported,VISUAL_TARGET_KEYS,
  type TargetAppearance,type TargetKind,type TargetOverride} from './inspectionModel';
import type {PositionedRect} from './workspaceModel';

// V3.0.17. All batch changes are presentational. Source ledger, text content,
// visibility, event actions and positions are intentionally NOT batch-writable.
export const BATCH_VISUAL_FIELDS=[
  ['fontSize','字號'],['textColor','文字顏色'],['backgroundColor','背景顏色'],
  ['backgroundOpacity','背景透明度'],['borderColor','邊框顏色'],
  ['borderWidth','邊框粗細'],['borderRadius','圓角'],
  ['shadowEnabled','陰影開關'],['glowEnabled','光效開關'],
  ['width','寬度'],['height','高度'],
] as const;
export type BatchField=typeof BATCH_VISUAL_FIELDS[number][0];
export const BATCH_FIELD_LABEL:Readonly<Record<BatchField,string>>=
  Object.fromEntries(BATCH_VISUAL_FIELDS) as Record<BatchField,string>;
export type VisualSource=TargetAppearance&{width?:number;height?:number};
export type BatchCandidate=Readonly<{id:string;label:string;kind:TargetKind;base:VisualSource}>;
export type VisualChange=Readonly<{field:string;label:string;before:unknown;after:unknown}>;
export type BatchPlan=Readonly<{
 id:string;label:string;kind:TargetKind;patch:TargetOverride;
 changes:readonly VisualChange[];unsupported:readonly BatchField[];
}>;

export function safeBatchPatch(source:VisualSource,keys:readonly BatchField[]):TargetOverride{
 const allowed=new Set<BatchField>(BATCH_VISUAL_FIELDS.map(([id])=>id));
 return normalizeTargetOverride(Object.fromEntries(
   [...new Set(keys)].filter(key=>allowed.has(key)&&source[key]!==undefined)
     .map(key=>[key,source[key]])));
}
export function batchPlan(source:VisualSource,keys:readonly BatchField[],
 candidates:readonly BatchCandidate[],
 getCurrent:(candidate:BatchCandidate)=>TargetOverride):readonly BatchPlan[]{
 const patch=safeBatchPatch(source,keys);
 return candidates.map(candidate=>{
   const current={...candidate.base,...getCurrent(candidate)};
   const unsupported:BatchField[]=[];
   const supported:Record<string,unknown>={};
   for(const [field,value] of Object.entries(patch)){
     if(targetToolSupported(candidate.kind,'target:'+field)){
       supported[field]=value;
     }else unsupported.push(field as BatchField);
   }
   const changes=Object.entries(supported).filter(([key,value])=>
     JSON.stringify(current[key as keyof VisualSource])!==JSON.stringify(value))
     .map(([field,after])=>({
       field,label:BATCH_FIELD_LABEL[field as BatchField],before:current[field as keyof VisualSource],after,
     }));
   return {id:candidate.id,label:candidate.label,kind:candidate.kind,
     patch:normalizeTargetOverride(supported),changes,unsupported};
 });
}
export function visualChanges(saved:Readonly<Record<string,unknown>>,
 draft:Readonly<Record<string,unknown>>,frame=false):readonly VisualChange[]{
 const keys=frame?[
  'width','height','minHeight','padding','borderWidth','borderRadius','backgroundColor',
  'backgroundOpacity','titleFontSize','titleColor','titleAlign','visible','shadowEnabled',
  'shadowOpacity','layout','appearance','effects',
 ]:[...VISUAL_TARGET_KEYS,'width','height'];
 return keys.filter(key=>JSON.stringify(saved[key])!==JSON.stringify(draft[key]))
   .map(field=>({field,label:BATCH_FIELD_LABEL[field as BatchField]??field,
      before:saved[field],after:draft[field]}));
}
export type HealthTarget=Readonly<{id:string;label:string;kind:TargetKind;rect:PositionedRect}>;
export type HealthFinding=Readonly<{
 id:string;label:string;type:'overflow'|'overlap'|'touch';message:string;
}>;
export function frameHealth(bounds:{width:number;height:number},
 targets:readonly HealthTarget[]):readonly HealthFinding[]{
 if(bounds.width<=0||bounds.height<=0)return [];
 const findings:HealthFinding[]=[];
 const measured=targets.filter(item=>item.rect.width>0&&item.rect.height>0);
 for(const item of measured){
   const box=item.rect;
   if(box.x<0||box.y<0||box.x+box.width>bounds.width||box.y+box.height>bounds.height)
     findings.push({id:item.id,label:item.label,type:'overflow',message:'超出目前框架可視邊界'});
   if(['action','control'].includes(item.kind)&&(box.width<44||box.height<44))
     findings.push({id:item.id,label:item.label,type:'touch',message:'可點區域低於 44 dp，請檢查手機觸控'});
   // Intentional parent/child nesting and native metric overlays should not be
   // reported as two faulty siblings. Only comparable action/metric siblings.
   const comparable=['action','metric','quote-card','control'].includes(item.kind);
   if(!comparable)continue;
   const overlaps=measured.filter(other=>other.id!==item.id&&
     other.id.localeCompare(item.id)>0&&other.kind===item.kind&&
     box.x<other.rect.x+other.rect.width&&box.x+box.width>other.rect.x&&
     box.y<other.rect.y+other.rect.height&&box.y+box.height>other.rect.y);
   for(const other of overlaps)
     findings.push({id:item.id,label:item.label,type:'overlap',
       message:'與「'+other.label+'」可能重疊（請以真實畫面確認）'});
 }
 return findings;
}
