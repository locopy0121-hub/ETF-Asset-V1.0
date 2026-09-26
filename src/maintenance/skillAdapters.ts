import type {SkillTool} from './skillTree';
import {targetToolSupported,type TargetKind} from './inspectionModel';

// One resolver for B/C/D navigation, tool details and the CI coverage matrix.
// A context selects the rendering adapter; it never removes a skill from the catalog.
export type AdapterContext=Readonly<{
 scope:'frame'|'target'|'instance';
 kind?:TargetKind;
 frameKey:string;
 page:string;
 instanceOwned?:boolean;
 instanceParent?:boolean;
}>;
export type AdapterResult=Readonly<{
 status:'active'|'pending-adapter'|'planned';
 tool:SkillTool;reason:string;
}>;
export const FRAME_TO_TARGET:Readonly<Record<string,string>>={
 borderWidth:'target:borderWidth',borderRadius:'target:borderRadius',
 backgroundOpacity:'target:backgroundOpacity',backgroundColor:'target:backgroundColor',
 borderColor:'target:borderColor',shadowEnabled:'target:shadowEnabled',
 shadowOpacity:'target:shadowOpacity',titleFontSize:'target:fontSize',
 titleColor:'target:textColor',titleAlign:'target:align',padding:'target:padding',
 visible:'target:visible',
 'framefx:backgroundMode':'target:backgroundMode',
 'framefx:gradientEndColor':'target:gradientEndColor',
 'framefx:gradientDirection':'target:gradientDirection',
 'framefx:gradientMidEnabled':'target:gradientMidEnabled',
 'framefx:gradientMidColor':'target:gradientMidColor',
 'framefx:gradientMidStop':'target:gradientMidStop',
 'framefx:borderStyle':'target:borderStyle',
 'framefx:shadowColor':'target:shadowColor',
 'framefx:shadowBlur':'target:shadowBlur',
 'framefx:shadowOffsetX':'target:shadowOffsetX',
 'framefx:shadowOffsetY':'target:shadowOffsetY',
 'framefx:glowEnabled':'target:glowEnabled',
 'framefx:glowColor':'target:glowColor',
 'framefx:glowOpacity':'target:glowOpacity',
 'framefx:glowWidth':'target:glowWidth',
 'framefx:marginVertical':'target:marginVertical',
};
// Never alias one-sided frame padding to four-sided target padding: that silently
// changed the user's requested operation in the previous implementation.
const spatialFields=['target:xy','target:dimensions','target:anchors','target:offsetX',
 'target:offsetY','target:anchorX','target:anchorY','target:width','target:height'];
const active=(tool:SkillTool,reason:string):AdapterResult=>({status:'active',tool,reason});
const pending=(tool:SkillTool,reason:string):AdapterResult=>({status:'pending-adapter',tool,reason});
export function resolveSkillAdapter(tool:SkillTool,ctx:AdapterContext):AdapterResult{
 if(tool.status!=='ready')return {status:'planned',tool,reason:'已納入中央完整技能表，尚未實作或完成原生適配。'};
 const original=tool.field??'';
 if(!original)return pending(tool,'此工具缺少實際操作介面。');
 if(original==='maintenance:tokens')return ctx.scope==='frame'||ctx.scope==='target'||ctx.scope==='instance'&&ctx.instanceOwned?
   active(tool,'具名共享樣式槽、獨立持久化、經原生能力過濾的當前 A 局部預覽及明確套用。'):
   pending(tool,'請先選取真實框架、原生元件或工程師新增元件。');
 if(original==='maintenance:favorites')return active(tool,'每個 C 工具可收藏、最近使用及跨屬性捷徑；不寫入業務資料。');
 if(original==='maintenance:visual-history')return ctx.scope==='frame'||ctx.scope==='target'||
   ctx.scope==='instance'&&ctx.instanceOwned?
   active(tool,'已儲存 A 的獨立視覺歷史、差異比較、確認還原至目前局部草稿。'):
   pending(tool,'此 A 尚無可安全還原的獨立外觀歷史。');
 if(original==='maintenance:conditional-style')return ctx.scope==='target'&&ctx.kind&&
   ['metric','text','value','prefix','generic'].includes(ctx.kind)||
   ctx.scope==='instance'&&ctx.instanceOwned&&ctx.kind&&['text','generic'].includes(ctx.kind)?
   active(tool,'按真實顯示狀態套用目前 A 的顏色／背景條件外觀，不修改資料或交易金額。'):
   pending(tool,'此 A 缺少可驗證的原生條件視覺適配；僅保留中央工具，勿假裝套用。');
 if(original==='maintenance:batch')return ctx.scope==='target'||ctx.scope==='instance'&&ctx.instanceOwned?
   active(tool,'實際元件註冊、屬性白名單、多選差異預覽及草稿批次寫入。'):
   pending(tool,'請先在真實頁面選取一個原生元件或工程師新增元件作為樣式來源。');
 if(original==='maintenance:local-diff')return active(tool,'只比較當前 A 的已儲存設定與暫存外觀，不涉及數據原值。');
 if(original==='maintenance:health')return active(tool,'只依目前真實量測分析越界、疑似重疊及觸控尺寸。');
 if(original.startsWith('workspace:'))return active(tool,'使用本頁實際工作區的共用工具。');
 const field=ctx.scope!=='frame'&&ctx.kind&&FRAME_TO_TARGET[original]?
   FRAME_TO_TARGET[original]!:original;
 const adapted=field!==original?{...tool,field}:tool;
 if(field.startsWith('target:')){
   if(!ctx.kind)return pending(tool,'需先選取實際元件；不限制中央技能的可見性。');
   if(ctx.scope==='instance'&&!ctx.instanceOwned)return pending(tool,'內建元件須使用原生選取器進入編輯。');
   if(ctx.scope==='instance'&&spatialFields.includes(field))
     return pending(tool,'工程師新增元件的空間工具尚缺真實座標量測，不顯示假編輯面板。');
   return targetToolSupported(ctx.kind,field)?
     active(adapted,field!==original?'共用技能已連接目前元件的原生視覺適配。':'目前元件已接入此技能。'):
     pending(tool,'目前渲染器缺少此技能的原生適配；不視為權限鎖定。');
 }
 if(original==='frame:size')return ctx.scope==='frame'?active(tool,'框架實際寬高。'):pending(tool,'子框架尺寸需接入原生布局量測。');
 if(original.startsWith('framefx:'))return ctx.scope==='frame'?active(tool,'目前框架特效。'):
   pending(tool,'目前元件尚缺等效材質渲染器；中央工具仍完整保留。');
 if(original==='instance:sync')return ctx.scope==='target'||ctx.scope==='instance'&&ctx.instanceOwned?
   active(tool,'同類外觀同步：本框架預設，跨頁與全 App 僅明確選擇。'):pending(tool,'請選取一個真實元件或工程師新增元件。');
 if(original==='instance:parent-size')return ctx.scope==='instance'&&ctx.instanceOwned&&ctx.instanceParent?
   active(tool,'新增父框架獨立寬高。'):pending(tool,'此工具須選取工程師新增父框架。');
 if(original==='instances')return ctx.scope==='frame'||ctx.scope==='instance'&&ctx.instanceOwned&&
   (tool.id==='remove'||tool.id==='install'&&ctx.instanceParent)?
   active(tool,'新增元件安裝或安全刪除。'):pending(tool,'內建元件不得刪除；新增操作請使用真實框架工作區。');
 if(original.startsWith('page:')){
   const quote=ctx.frameKey==='holding-quotes'||ctx.frameKey==='holding-view';
   const onList=original==='page:list'&&ctx.page==='portfolio'&&ctx.frameKey==='holding-view';
   const onWall=ctx.scope==='target'&&ctx.kind==='wall';
   const onPortfolio=ctx.scope==='target'&&ctx.kind==='portfolio-list';
   if(onWall||onPortfolio&&original==='page:list'||ctx.scope==='frame'&&(onList||original!=='page:list'&&quote))
     return active(tool,'此為本頁共用控制，使用現有頁面設定編輯器。');
   return pending(tool,'此技能需在對應頁面配置原生控制面板。');
 }
 if(ctx.scope==='target')return original==='session'?active(tool,'套用、取消與還原。'):
   pending(tool,'框架級工具尚缺當前內部元件的原生適配。');
 if(ctx.scope==='instance')return original==='session'||
   ['instance-text','visible','titleFontSize','titleColor','padding'].includes(original)?
    active(tool,'工程師新增元件的局部設定。'):pending(tool,'此元件尚缺等效操作面板。');
 return active(tool,'目前框架已接入此工具。');
}
export const ADAPTER_TARGET_KINDS:readonly TargetKind[]=[
 'metric','text','value','action','quote-card','wall','portfolio-list','control','generic','prefix','frame',
];
export function auditAdapterMatrix(tools:readonly SkillTool[]){
 return ADAPTER_TARGET_KINDS.flatMap(kind=>tools.map(tool=>{
   const result=resolveSkillAdapter(tool,{scope:'target',kind,frameKey:'holding-view',page:'portfolio'});
   return {kind,id:tool.id,field:result.tool.field??'',status:result.status,reason:result.reason};
 }));
}
