import {COMPLETE_ENGINEER_SKILLS} from './fullSkillCatalog';
import type {EngineerSkill,SkillTool} from './skillTree';

// A is the actual selected frame/component, not a catalog. B names an editable
// PROPERTY. C is the control on that property. Never render an extra grouping page.
// Internal category IDs are bookkeeping only; their 184 original tool IDs remain intact.
const GROUPS=[
 {id:'length',label:'長度',categories:[]},
 {id:'width',label:'寬度',categories:[]},
 {id:'color',label:'顏色',categories:['07','08']},
 {id:'text',label:'文字',categories:['06','16']},
 {id:'layout',label:'尺寸與位置',categories:['03','04','05']},
 {id:'border',label:'邊框',categories:['09']},
 {id:'effects',label:'特效與動態',categories:['10','11','12','13','14','15']},
 {id:'charts',label:'圖表',categories:['17']},
 {id:'lists',label:'清單',categories:['18']},
 {id:'images',label:'圖片',categories:['19']},
 {id:'data',label:'資訊顯示',categories:['20']},
 {id:'navigation',label:'頁面與導覽',categories:['21']},
 {id:'quotes',label:'行情',categories:['22']},
 {id:'dividend',label:'股息',categories:['23']},
 {id:'widget',label:'桌面元件',categories:['24']},
 {id:'ai',label:'AI 與通知',categories:['25']},
 {id:'theme',label:'主題',categories:['26']},
 {id:'sync',label:'同步',categories:['27']},
 {id:'batch',label:'批次編輯',categories:['28']},
 {id:'components',label:'元件與父框架',categories:['01','02']},
 {id:'maintenance',label:'版本與診斷',categories:['29','30']},
] as const;
export type AbPropertyId=typeof GROUPS[number]['id'];
export type EngineerSectionId='layout'|'appearance'|'insert'|'system';
export const ENGINEER_SECTIONS:readonly {id:EngineerSectionId;label:string;description:string}[]=[
 {id:'layout',label:'版面設置',description:'位置、對齊、排序、間距、容器與操作'},
 {id:'appearance',label:'外觀設置',description:'大小、文字、顏色、漸層、陰影與動畫'},
 {id:'insert',label:'插入',description:'中央元件、圖表、圖片、ETF、股息、Widget、AI'},
 {id:'system',label:'系統設置',description:'真實數值、主題、連動、批次、版本與診斷'},
];
export const PROPERTY_SECTIONS:Readonly<Record<AbPropertyId,EngineerSectionId>>={
 length:'appearance',width:'appearance',color:'appearance',text:'appearance',layout:'layout',
 border:'appearance',effects:'appearance',charts:'insert',lists:'layout',images:'insert',
 data:'system',navigation:'layout',quotes:'insert',dividend:'insert',widget:'insert',
 ai:'insert',theme:'system',sync:'system',batch:'system',components:'insert',maintenance:'system',
};
export type AbProperty=Readonly<{id:AbPropertyId;label:string;section:EngineerSectionId;tools:readonly SkillTool[]}>;
const lookup=new Map(COMPLETE_ENGINEER_SKILLS.map(category=>[category.id,category]));
export const AB_PROPERTY_GROUPS:readonly AbProperty[]=GROUPS.map(group=>({
 id:group.id,label:group.label,section:PROPERTY_SECTIONS[group.id],
 tools:group.categories.flatMap(id=>lookup.get(id)?.tools??[]),
}));
export const AB_PROPERTY_TOOL_IDS=AB_PROPERTY_GROUPS.flatMap(group=>group.tools.map(tool=>tool.id));
export const AB_PROPERTY_BASE_COUNT=COMPLETE_ENGINEER_SKILLS.reduce((total,category)=>total+category.tools.length,0);
export function findAbProperty(id:string){return AB_PROPERTY_GROUPS.find(group=>group.id===id);}
export function searchAbProperties(query:string){
 const word=query.trim().toLocaleLowerCase();
 return !word?AB_PROPERTY_GROUPS:AB_PROPERTY_GROUPS.filter(group=>
  [group.label,...group.tools.flatMap(tool=>[tool.label,tool.detail])].some(text=>text.toLocaleLowerCase().includes(word)));
}
// These are C controls presented inside B length/width; no new source tool IDs
// or duplicate central catalog entry are created.
export function sizeControlFor(scope:'frame'|'target'|'instance',axis:'width'|'height'){
 return scope==='frame'?'frame:size':scope==='instance'?'instance:parent-size':'target:dimensions';
}
