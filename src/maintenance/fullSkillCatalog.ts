import {ENGINEER_SKILLS,type EngineerSkill,type SkillTool} from './skillTree';

// Single B-level classification over the existing central engine. Do not copy tool implementations.
// Names here are the 30-class working taxonomy from the full-engineer design report.
// Historic 17-group IDs remain stable for storage, runtime adapters and old regression gates.
export type SkillCategoryId =
 '01'|'02'|'03'|'04'|'05'|'06'|'07'|'08'|'09'|'10'|
 '11'|'12'|'13'|'14'|'15'|'16'|'17'|'18'|'19'|'20'|
 '21'|'22'|'23'|'24'|'25'|'26'|'27'|'28'|'29'|'30';
export const FULL_SKILL_SECTIONS = [
 {id:'structure',label:'元件、框架與空間工程',ids:['01','02','03','04','05']},
 {id:'appearance',label:'完整視覺設計工程',ids:['06','07','08','09','10']},
 {id:'motion',label:'動態、狀態與互動工程',ids:['11','12','13','14','15']},
 {id:'information',label:'資訊、數據與媒體呈現',ids:['16','17','18','19','20']},
 {id:'app',label:'App 專用介面工程',ids:['21','22','23','24','25']},
 {id:'management',label:'全局設計與維護管理',ids:['26','27','28','29','30']},
] as const;
export const FULL_SKILL_CATEGORIES:readonly Readonly<{
 id:SkillCategoryId;label:string;description:string
}>[] = [
 {id:'01',label:'中央元件工程',description:'中央元件庫、新增、檢視與安全刪除'},
 {id:'02',label:'父子框架與容器',description:'父子框架、獨立尺寸、內容與裁切'},
 {id:'03',label:'幾何尺寸工程',description:'寬高、內外距、極值與比例'},
 {id:'04',label:'定位、排列與對齊',description:'XY、錨點、網格、吸附與排序'},
 {id:'05',label:'圖層、群組與堆疊',description:'圖層面板、群組、順序與選取'},
 {id:'06',label:'文字與字型排版',description:'完整字型、文字、段落與特效'},
 {id:'07',label:'色彩與損益色',description:'調色盤、色彩語意與損益色'},
 {id:'08',label:'背景、圖片與材質',description:'背景、圖片、漸層、遮罩、磨砂'},
 {id:'09',label:'邊框與幾何造型',description:'四邊邊框、圓角、線型與造型'},
 {id:'10',label:'光影與效果堆疊',description:'陰影、內外光、模糊與效果堆疊'},
 {id:'11',label:'動畫與時間軸',description:'跑馬燈、呼吸、轉場、動畫時間'},
 {id:'12',label:'視覺狀態工程',description:'一般、點按、載入與錯誤樣式'},
 {id:'13',label:'條件樣式工程',description:'條件視覺、事件與資料狀態'},
 {id:'14',label:'手勢與觸控工程',description:'點按、拖曳、縮放與手勢互斥'},
 {id:'15',label:'視覺事件與動作',description:'將 UI 事件綁定既有授權操作'},
 {id:'16',label:'數值與格式呈現',description:'純顯示的單位、前綴及數值格式'},
 {id:'17',label:'專業圖表工程',description:'K 線、十字線、座標與技術指標'},
 {id:'18',label:'表格與清單工程',description:'欄位、表頭、排序與清單'},
 {id:'19',label:'圖片、圖示與多媒體',description:'圖庫、裁切、圖片和媒體內容'},
 {id:'20',label:'資料狀態與模擬預覽',description:'唯讀來源、延遲、錯誤與情境預覽'},
 {id:'21',label:'頁面與導覽工程',description:'頁面表頭、切換、返回與浮動介面'},
 {id:'22',label:'行情牆與持股介面',description:'行情模式、ETF 標籤和持股布局'},
 {id:'23',label:'股息與月曆介面',description:'配息標記、月曆、狀態與提醒'},
 {id:'24',label:'Widget 與 Monitor',description:'桌面元件和懸浮行情介面'},
 {id:'25',label:'AI 與通知介面',description:'AI 介面、訊息卡片與提示'},
 {id:'26',label:'設計變數與主題',description:'設計變數、預設、主題與局部覆寫'},
 {id:'27',label:'中央模板與同步',description:'元件模板、同類視覺同步與跨頁'},
 {id:'28',label:'多選與批次工程',description:'批次選取、差異及批次套用'},
 {id:'29',label:'版本、差異與還原',description:'草稿、正式套用、歷史及比較'},
 {id:'30',label:'診斷、驗證與品質',description:'畫面健康與完整適配驗證'},
];

// All twelve cross-category engineering capabilities remain in the procedure as real
// pending adapters until tests prove the actual operation, preview, persistence and rollback.
export const ADVANCED_ENGINEER_CAPABILITIES:readonly Readonly<{
 id:string;category:SkillCategoryId;label:string;detail:string
}>[] = [
 {id:'batch',category:'28',label:'多選批次編輯',detail:'多選元件、批量調整及套用前差異預覽；需新增交易式 Runtime'},
 {id:'effect-stack',category:'10',label:'效果堆疊編輯器',detail:'多層背景、陰影、光效、遮罩及動畫，支援堆疊排序'},
 {id:'tokens',category:'26',label:'設計變數系統',detail:'統一管理間距、圓角、色彩、字型與動畫速度，提供局部覆寫'},
 {id:'conditional-style',category:'13',label:'條件樣式引擎',detail:'漲跌、股息、資料狀態等驅動的視覺規則；唯讀金融資料'},
 {id:'visual-states',category:'12',label:'視覺狀態編輯器',detail:'正常、按下、選取、停用、載入與錯誤的獨立視覺設定'},
 {id:'layer-panel',category:'05',label:'真正的圖層面板',detail:'列出所有父子元件與效果圖層，支援群組、順序與裁切'},
 {id:'event-editor',category:'15',label:'可視化事件編輯器',detail:'只允許白名單授權動作：刷新、詳情、顯示或播放既有動畫'},
 {id:'data-simulation',category:'20',label:'資料狀態模擬預覽',detail:'在獨立預覽沙盒模擬漲跌、延遲、失敗，絕不寫入真實帳務'},
 {id:'local-diff',category:'29',label:'局部設定差異比較',detail:'對照原始值、共用模板與當前實例的視覺參數'},
 {id:'health',category:'30',label:'畫面健康診斷',detail:'文字溢出、低對比、觸控區過小、遮擋與動畫過量'},
 {id:'favorites',category:'01',label:'技能搜尋與收藏',detail:'既有搜尋加上收藏、常用組合及最近編輯記錄'},
 {id:'adapter-lab',category:'30',label:'全局適配驗證台',detail:'逐技能跨元件、跨頁面檢查操作、預覽、儲存與還原'},
] as const;

// No filtering or permission assignment by selected component: this classifies skills
// by their MEANING. A separate adapter layer resolves how each skill renders.
const BASE_CATEGORY:Record<string,SkillCategoryId>={
 components:'01',frames:'02',dimensions:'03',layout:'04',typography:'06',numbers:'16',
 'target-materials':'08',colors:'07',effects:'10',animations:'11',charts:'17',
 interaction:'14',data:'20',conditions:'13',responsive:'04',sharing:'27',versions:'29',
};
export function categoryForTool(group:string,tool:SkillTool):SkillCategoryId {
 const id=tool.id,field=tool.field??'';
 if(group==='components'){
   if(id==='parent-size')return '02';
   if(id==='added-style-sync')return '27';
   if(id==='edit-copy')return '06';
   if(id==='inspect-existing')return '20';
 }
 if(group==='frames'){
   if(id==='appearance')return '26';
   if(/(?:border|corner|radius)/.test(id))return '09';
   if(/(?:shadow|glow|glass)/.test(id))return /pulse|period/.test(id)?'11':'10';
   if(/^(?:fx-img|fx-background-image)/.test(id))return '19';
   if(/(?:fx-bg|fx-mask|multi-gradient)/.test(id))return '08';
   if(/(?:padding|margin|max-width)/.test(id))return '03';
   if(/(?:content-gap|drag-sort|responsive)/.test(id))return '04';
   if(/animation/.test(id))return '11';
   if(/interaction/.test(id))return '15';
 }
 if(group==='layout'&&id==='workspace-diagnostics')return '30';
 if(group==='layout'&&id==='page-holding-layout')return '22';
 if(group==='typography'&&id==='title-color')return '07';
 if(group==='numbers'&&id==='target-source')return '20';
 if(group==='target-materials'){
   if(/preset/.test(id))return '26';
   if(/reset/.test(id))return '29';
   if(/border/.test(id))return '09';
   if(/shadow|glow|blur/.test(id))return '10';
   if(/margin/.test(id))return '03';
 }
 if(group==='data'){
   if(id==='wall-settings')return '22';
   if(id==='badge-settings')return '23';
   if(id==='list-settings')return '18';
   if(id==='visibility')return '12';
 }
 if(group==='interaction'){
   if(id==='quote-style')return '22';
   if(id==='tap')return '15';
 }
 if(group==='responsive')return '04';
 if(field==='instance:sync')return '27';
 return BASE_CATEGORY[group]??'30';
}
export type ClassifiedTool=Readonly<SkillTool&{sourceGroup:string;sourceId:string}>;
const existing=ENGINEER_SKILLS.flatMap(group=>group.tools.map(tool=>({
 ...tool,sourceGroup:group.id,sourceId:tool.id,category:categoryForTool(group.id,tool),
})));
const advanced=ADVANCED_ENGINEER_CAPABILITIES.map(item=>({
 id:'advanced-'+item.id,label:item.label,detail:item.detail,status:'adapter-required' as const,
 sourceGroup:'advanced',sourceId:item.id,category:item.category,
}));
// A domain without a native adapter is an explicit item in the backlog, not an empty
// group that can be incorrectly called complete.
const missingDomain:Readonly<Record<string,string>>={
 '21':'頁面標題與導覽原生適配','24':'Widget／Monitor 原生適配','25':'AI 對話框與通知原生適配',
};
export const COMPLETE_ENGINEER_SKILLS:readonly EngineerSkill[]=
 FULL_SKILL_CATEGORIES.map(category=>({
  id:category.id,label:category.id+'｜'+category.label,description:category.description,
  tools:[
   ...existing.filter(tool=>tool.category===category.id).map(({category:_category,...tool})=>tool),
   ...advanced.filter(tool=>tool.category===category.id).map(({category:_category,...tool})=>tool),
   ...(missingDomain[category.id]?[{
     id:'domain-'+category.id,label:missingDomain[category.id]!,detail:'此專屬 App 介面尚未納入中央技能引擎；保留在全局整合清單，待真實 Runtime 適配。',
     status:'adapter-required' as const,sourceGroup:'unregistered',sourceId:category.id,
   }]:[]),
  ],
 }));
export function completeCatalogAudit(){
 const all=COMPLETE_ENGINEER_SKILLS.flatMap(skill=>skill.tools);
 const existingIds=all.filter(tool=>(tool as ClassifiedTool).sourceGroup!=='advanced'&&
   (tool as ClassifiedTool).sourceGroup!=='unregistered');
 return {
  categories:COMPLETE_ENGINEER_SKILLS.length,existing:existingIds.length,
  advanced:all.filter(tool=>(tool as ClassifiedTool).sourceGroup==='advanced').length,
  unregistered:all.filter(tool=>(tool as ClassifiedTool).sourceGroup==='unregistered').length,
  pending:all.filter(tool=>tool.status==='adapter-required').length,
  readyDeclared:all.filter(tool=>tool.status==='ready').length,
  duplicateIds:all.map(tool=>tool.id).filter((id,i,ids)=>ids.indexOf(id)!==i),
  emptyCategories:COMPLETE_ENGINEER_SKILLS.filter(skill=>skill.tools.length===0).map(skill=>skill.id),
 };
}
