import {normalizeFrameEffects} from './frameEffects';
import {normalizeTargetOverride,VISUAL_TARGET_KEYS,type TargetOverride} from './inspectionModel';
import type {FrameEditorConfig} from '../editor/editorModel';
import type {MaintenanceInstance} from './componentLibrary';

// Stored inside the existing @tf-asset/maintenance V3 transaction and SAF backup.
// One visual snapshot of the current REAL A per successful change. No ledger,
// quote payloads, event actions, label text, cash or source-data fields.
const FRAME_FIELDS=['width','height','minHeight','padding','titleFontSize','titleColor',
 'titleProfitColor','titleAlign','backgroundColor','backgroundProfitColor',
 'backgroundOpacity','borderColor','borderProfitColor','borderWidth','borderRadius',
 'shadowEnabled','shadowOpacity','effects'] as const satisfies readonly (keyof FrameEditorConfig)[];
export type VisualHistoryKind='frame'|'target'|'instance';
export type VisualSnapshot=Readonly<Record<string,unknown>>;
export type VisualHistoryEntry=Readonly<{id:string;at:number;kind:VisualHistoryKind;visual:VisualSnapshot}>;
export type VisualHistoryMap=Readonly<Record<string,readonly VisualHistoryEntry[]>>;
const validKey=(key:string)=>key.length<=260&&(
 /^frame:(home|ledger|portfolio|dividend|ai|settings):[a-z0-9-]+$/.test(key)||
 /^target:(home|ledger|portfolio|dividend|ai|settings):[a-z0-9-]+:.{1,150}$/.test(key)||
 /^instance:(home|ledger|portfolio|dividend|ai|settings):[a-z0-9-]+:i-[a-z0-9-]{1,92}$/.test(key));
export function visualHistoryKey(kind:VisualHistoryKind,page:string,frameKey:string,id?:string){
 const key=kind+':'+page+':'+frameKey+(kind!=='frame'?':'+(id??''):'');
 return validKey(key)?key:null;
}
const targetFields=[...VISUAL_TARGET_KEYS,'width','height'] as const;
export function targetVisualSnapshot(input:unknown):VisualSnapshot {
 const source=normalizeTargetOverride(input);
 return Object.fromEntries(targetFields.filter(field=>field!=='visible'&&
   field!=='labelText'&&field!=='captionText'&&field!=='prefixText'&&field!=='profitToneOverride'&&
   source[field as keyof TargetOverride]!==undefined).map(field=>[field,source[field as keyof TargetOverride]]));
}
const hex=(value:unknown)=>typeof value==='string'&&/^#[0-9a-f]{6}$/i.test(value);
export function frameVisualSnapshot(input:unknown):VisualSnapshot{
 if(!input||typeof input!=='object'||Array.isArray(input))return {};
 const frame=input as Record<string,unknown>,out:Record<string,unknown>={};
 for(const field of FRAME_FIELDS){
   const value=frame[field];if(value===undefined)continue;
   if(field==='effects'){
     if(value&&typeof value==='object'&&!Array.isArray(value))out.effects=normalizeFrameEffects(value);
   }else if(['titleColor','backgroundColor','borderColor'].includes(field)){
     if(hex(value))out[field]=(value as string).toUpperCase();
   }else if(['backgroundProfitColor','borderProfitColor','titleProfitColor','shadowEnabled'].includes(field)){
     if(typeof value==='boolean')out[field]=value;
   }else if(field==='titleAlign'){
     if(value==='left'||value==='center'||value==='right')out[field]=value;
   }else if(typeof value==='number'&&Number.isFinite(value)){
     const ranges:Record<string,[number,number]>={
       width:[160,1600],height:[80,2400],minHeight:[0,600],padding:[0,32],
       titleFontSize:[8,48],backgroundOpacity:[0,1],borderWidth:[0,8],borderRadius:[0,48],
       shadowOpacity:[0,.8],
     };
     const range=ranges[field];if(range)out[field]=Math.max(range[0],Math.min(range[1],value));
   }
 }
 return out;
}
/** Source fields of an engineer-owned A are separated from its native style overrides.
 * The history never contains instance identity, content, visibility, parentId or layout margin. */
export function instanceVisualSnapshot(input:unknown):VisualSnapshot{
 if(!input||typeof input!=='object'||Array.isArray(input))return {};
 const v=input as Record<string,unknown>,out:Record<string,unknown>={};
 if(typeof v.fontSize==='number'&&Number.isFinite(v.fontSize))
   out.fontSize=Math.max(10,Math.min(36,v.fontSize));
 if(hex(v.color))out.color=(v.color as string).toUpperCase();
 for(const [field,min,max] of [['frameWidth',160,1600],['frameHeight',80,2400]] as const){
   if(typeof v[field]==='number'&&Number.isFinite(v[field]))
     out[field]=Math.max(min,Math.min(max,v[field] as number));
 }
 const style=targetVisualSnapshot(v.style);
 if(Object.keys(style).length)out.style=style;
 return out;
}
export function restoreInstanceVisual(current:MaintenanceInstance,visual:VisualSnapshot):MaintenanceInstance{
 const restored=instanceVisualSnapshot(visual);
 return {...current,
   ...(restored.fontSize!==undefined?{fontSize:restored.fontSize as number}:{}),
   ...(restored.color!==undefined?{color:restored.color as string}:{}),
   ...(current.templateId==='parent-frame'?
     {...(restored.frameWidth!==undefined?{frameWidth:restored.frameWidth as number}:{}),
       ...(restored.frameHeight!==undefined?{frameHeight:restored.frameHeight as number}:{})}:{}),
 };
}
const snapshot=(kind:VisualHistoryKind,raw:unknown)=>kind==='frame'?
 frameVisualSnapshot(raw):kind==='instance'?instanceVisualSnapshot(raw):targetVisualSnapshot(raw);
export function normalizeVisualHistory(input:unknown):VisualHistoryMap{
 if(!input||typeof input!=='object'||Array.isArray(input))return {};
 return Object.fromEntries(Object.entries(input as Record<string,unknown>).filter(([key,value])=>
   validKey(key)&&Array.isArray(value)).map(([key,value])=>{
   const kind:VisualHistoryKind=key.startsWith('frame:')?'frame':key.startsWith('instance:')?'instance':'target';
   const entries=(value as unknown[]).flatMap(item=>{
     if(!item||typeof item!=='object'||Array.isArray(item))return [];
     const data=item as Record<string,unknown>;
     if(typeof data.id!=='string'||!/^[a-zA-Z0-9-]{1,55}$/.test(data.id)||
       typeof data.at!=='number'||!Number.isFinite(data.at)||data.at<0)return [];
     const visual=snapshot(kind,data.visual);
     return [{id:data.id,at:data.at,kind,visual}];
   }).sort((a,b)=>b.at-a.at).slice(0,10);
   return [key,entries];
 }));
}
export function appendVisualHistory(
 current:VisualHistoryMap,key:string,kind:VisualHistoryKind,previous:VisualSnapshot,
 at:number=Date.now(),id:string=String(at)+'-'+Math.random().toString(36).slice(2,10),
):VisualHistoryMap{
 if(!validKey(key)||key.startsWith(kind+':')===false)return current;
 const before=snapshot(kind,previous),old=current[key]??[];
 if(old[0]&&JSON.stringify(old[0].visual)===JSON.stringify(before))return current;
 const entry:VisualHistoryEntry={id,at,kind,visual:before};
 return {...current,[key]:[entry,...old].slice(0,10)};
}
export function hasVisualDifference(before:VisualSnapshot,after:VisualSnapshot){
 return JSON.stringify(before)!==JSON.stringify(after);
}
export function restoreFrameVisual(current:FrameEditorConfig,visual:VisualSnapshot):FrameEditorConfig{
 const restored=frameVisualSnapshot(visual);
 const next:Record<string,unknown>={...current};
 // Removing an override is safe only for optional frame dimensions/material.
 // Even a malformed old snapshot cannot delete mandatory native color/font keys.
 for(const field of ['width','height','minHeight','padding','effects'] as const)delete next[field];
 return {...next,...restored} as FrameEditorConfig;
}
export function restoreTargetVisual(current:TargetOverride,visual:VisualSnapshot):TargetOverride{
 const next:Record<string,unknown>={...current};
 for(const field of targetFields)if(!['visible','labelText','captionText','prefixText','profitToneOverride'].includes(field))
   delete next[field];
 return normalizeTargetOverride({...next,...targetVisualSnapshot(visual)});
}
