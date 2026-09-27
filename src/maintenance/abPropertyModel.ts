import {COMPLETE_ENGINEER_SKILLS} from './fullSkillCatalog';
import type {SkillTool} from './skillTree';

export const TOOLBOX_MAIN_CATEGORIES=[
 {id:'layout',label:'版面設置'},
 {id:'appearance',label:'外觀設置'},
 {id:'insert',label:'插入'},
 {id:'system',label:'系統設置'},
] as const;
export type ToolboxMainCategoryId=typeof TOOLBOX_MAIN_CATEGORIES[number]['id'];

const GROUPS=[
 {id:'size',mainCategory:'appearance',label:'大小設置',categories:['03','06']},
 {id:'text',mainCategory:'appearance',label:'文字設置',categories:['06','16']},
 {id:'color',mainCategory:'appearance',label:'顏色設置',categories:['07','08']},
 {id:'material',mainCategory:'appearance',label:'邊框與材質',categories:['09','10']},
 {id:'static-effects',mainCategory:'appearance',label:'靜態特效',categories:['11','12']},
 {id:'animation',mainCategory:'appearance',label:'動畫特效',categories:['13','14','15']},
 {id:'state-appearance',mainCategory:'appearance',label:'狀態外觀',categories:['20']},

 {id:'position',mainCategory:'layout',label:'定位設置',categories:['04']},
 {id:'alignment',mainCategory:'layout',label:'排列與對齊',categories:['04','05']},
 {id:'spacing',mainCategory:'layout',label:'間距設置',categories:['03','05']},
 {id:'layers',mainCategory:'layout',label:'圖層設置',categories:['05']},
 {id:'containers',mainCategory:'layout',label:'子框架與容器',categories:['02']},
 {id:'interaction',mainCategory:'layout',label:'操作與互動',categories:['21']},
 {id:'lists',mainCategory:'layout',label:'清單與行情排列',categories:['18','22']},

 {id:'components',mainCategory:'insert',label:'中央元件庫',categories:['01']},
 {id:'charts',mainCategory:'insert',label:'圖表庫',categories:['17']},
 {id:'images',mainCategory:'insert',label:'圖片與媒體',categories:['19']},
 {id:'finance-modules',mainCategory:'insert',label:'財務專用模組',categories:['22','23','24']},
 {id:'ai-components',mainCategory:'insert',label:'AI 與通知元件',categories:['25']},

 {id:'actual-values',mainCategory:'system',label:'當前物件數值',categories:['20']},
 {id:'sync',mainCategory:'system',label:'連動編輯',categories:['27','28']},
 {id:'preview',mainCategory:'system',label:'預覽與套用',categories:['30']},
 {id:'theme',mainCategory:'system',label:'設計變數與主題',categories:['26']},
 {id:'history',mainCategory:'system',label:'歷史與安全管理',categories:['29']},
 {id:'diagnostics',mainCategory:'system',label:'診斷與驗證',categories:['29','30']},
] as const;

export type AbPropertyId=typeof GROUPS[number]['id'];
export type AbProperty=Readonly<{id:AbPropertyId;mainCategory:ToolboxMainCategoryId;label:string;tools:readonly SkillTool[]}>;
const lookup=new Map(COMPLETE_ENGINEER_SKILLS.map(category=>[category.id,category]));
export const AB_PROPERTY_GROUPS:readonly AbProperty[]=GROUPS.map(group=>({
 id:group.id,mainCategory:group.mainCategory,label:group.label,
 tools:[...new Map(group.categories.flatMap(id=>lookup.get(id)?.tools??[]).map(tool=>[tool.id,tool])).values()],
}));
export const AB_PROPERTY_TOOL_IDS=[...new Set(AB_PROPERTY_GROUPS.flatMap(group=>group.tools.map(tool=>tool.id)))];
export const AB_PROPERTY_BASE_COUNT=COMPLETE_ENGINEER_SKILLS.reduce((total,category)=>total+category.tools.length,0);
export function findAbProperty(id:string){return AB_PROPERTY_GROUPS.find(group=>group.id===id);}
export function findToolboxMainCategory(id:string){return TOOLBOX_MAIN_CATEGORIES.find(group=>group.id===id);}
export function searchAbProperties(query:string,mainCategory?:ToolboxMainCategoryId|null){
 const word=query.trim().toLocaleLowerCase();
 return AB_PROPERTY_GROUPS.filter(group=>(!mainCategory||group.mainCategory===mainCategory)&&
  (!word||[group.label,...group.tools.flatMap(tool=>[tool.label,tool.detail])].some(text=>text.toLocaleLowerCase().includes(word))));
}
export function sizeControlFor(scope:'frame'|'target'|'instance',axis:'width'|'height'){
 return scope==='frame'?'frame:size':scope==='instance'?'instance:parent-size':'target:dimensions';
}
