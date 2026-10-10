const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
let overrides={},maintenanceOverrides={};
let display={profitColorMode:'red-up-green-down',gainColor:'#123456',lossColor:'#654321',neutralColor:'#ABCDEF'};
const React=require('react');
const react={...React,useId:()=>':fixture:',useState:v=>[v,()=>{}],useRef:v=>({current:v}),useEffect:()=>{},useMemo:f=>f()};
const flatten=s=>Array.isArray(s)?Object.assign({},...s.map(flatten)):s||{};
const rn={PanResponder:{create:()=>({panHandlers:{}})},Text:'Text',View:'View',Pressable:'Pressable',ScrollView:'ScrollView',useWindowDimensions:()=>({width:360,height:800}),StyleSheet:{create:x=>x,flatten,hairlineWidth:1,absoluteFill:{}},Animated:{Text:'Text',View:'View',Value:class{stopAnimation(){} setValue(){}},timing:()=>({}),sequence:()=>({start(){},stop(){}}),loop:x=>x}};
const cache=new Map();
function load(file){
 file=path.resolve(file);if(cache.has(file))return cache.get(file);let result={exports:{}};cache.set(file,result.exports);
 const src=ts.transpileModule((process.env.TF_TEXT_BASELINE==='1'?require('node:child_process').execFileSync('git',['show','6b5ac8e7:'+path.relative(process.cwd(),file)],{encoding:'utf8'}):fs.readFileSync(file,'utf8')).replace('function decorateContent(', 'export function decorateContent('),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText;
 const req=id=>{
  if(id==='react')return react;
  if(id==='react/jsx-runtime')return require(id);
  if(id==='react-native')return rn;
  if(id.endsWith('/EditableNative'))return {Text:rn.Text,TextInput:rn.TextInput,Pressable:rn.Pressable};
  if(id.endsWith('/FrameEditingContext'))return {FrameEditingProvider:({children})=>children};
  if(id.endsWith('/MaintenanceRuntime'))return {useMaintenance:()=>({enabled:false,session:null,selection:null,getTargetOverride:(_p,_f,id)=>maintenanceOverrides[id]??{}})};
  if(id.endsWith('/MaintenanceWorkbench'))return {InstalledFrameComponents:()=>null};
  if(id.endsWith('/WorkspaceSurface'))return {WorkspaceSurface:({children})=>children,useWorkspace:()=>null};
  // Direct-call smoke test renders no React tree; equal grid is visual and OFF by default.
  if(id.endsWith('/equalGridContext'))return {useEqualGridActive:()=>false};
  if(id.endsWith('/pageEditor'))return {usePageEditor:()=>({})};
  if(id.endsWith('/SettingsRuntime'))return {useSettingsRuntime:()=>({prefs:{display,marketCard:{showQuoteMetadata:false}}})};
  if(id.endsWith('/ThemeRuntime'))return {useThemeRuntime:()=>({palette:{gain:'#EF4444',loss:'#10B981',text:'#000000',textSecondary:'#888888',surfaceMuted:'#FFFFFF',primary:'#0066FF'}})};
  if(id.endsWith('/TargetSurfaceEffects'))return {TargetBackdrop:()=>null,targetShadowStyle:()=>({})};
  
  if(id.endsWith('/LayoutSelectionContext'))return {useLayoutRuntime:()=>({targets:overrides,active:false})};
  if(id.endsWith('/HoldingQuoteTicker'))return {HoldingQuoteTicker:()=>null};
  if(id.endsWith('/MiniHoldingChart'))return {MiniHoldingChart:()=>null};
  if(id.endsWith('/EtfBadgeRow'))return {EtfBadgeRow:()=>null};
  if(id.startsWith('.')){let p=path.resolve(path.dirname(file),id);for(const ext of ['.ts','.tsx','.js'])if(fs.existsSync(p+ext))return load(p+ext);}
  return require(id);
 };
 new Function('require','module','exports',src)(req,result,result.exports);cache.set(file,result.exports);return result.exports;
}
function texts(node){if(node==null||typeof node!=='object')return [];if(Array.isArray(node))return node.flatMap(texts);if(typeof node.type==='function')return texts(node.type(node.props));return [...(node.type==='Text'?[{text:node.props.children,style:flatten(node.props.style)}]:[]),...texts(node.props?.children)];}

const overview=load('src/components/dashboard/DashboardAssetOverview.tsx').DashboardAssetOverview;
const layout=load('src/domain/dashboardLayout.ts').DEFAULT_DASHBOARD_LAYOUT.overview;
function render(frame){return texts(overview({amount:'27,690',caption:'持股市值＋股數',layout,totalPnl:1245,pnlComplete:true,maintenance:frame})).find(t=>t.text==='27,690').style;}
const rgb=c=>c.startsWith('#')?c.slice(1,7).toUpperCase():c.match(/^rgba?\((\d+),(\d+),(\d+)/)?.slice(1).map(n=>Number(n).toString(16).padStart(2,'0')).join('').toUpperCase();
for(const mode of ['red-up-green-down','green-up-red-down'])for(const align of ['left','center','right']){
 display={...display,profitColorMode:mode};
 overrides={'dashboard:overview-value':{textProfitColor:true,align,fontSize:42}};
 // Mimic apply -> serialize -> restart and normal PageEditorStack frame context.
 const saved=JSON.parse(JSON.stringify({layoutTargets:overrides}));
 const preview=render(undefined);
 const actual=render({page:'home',frameKey:'asset-dashboard',frameTitle:'資產總覽',displayConfig:saved});
 assert.equal(rgb(actual.color),rgb(preview.color),'saved profit color must match preview');
 assert.equal(actual.textAlign,preview.textAlign,'saved alignment must match preview');
 assert.equal(actual.fontSize,42);
 maintenanceOverrides={'dashboard:overview-value':{textProfitColor:false,textColor:'#FEDCBA',align:'center'}};
 const individual=render({page:'home',frameKey:'asset-dashboard',frameTitle:'資產總覽',displayConfig:saved});
 assert.equal(rgb(individual.color),'FEDCBA');assert.equal(individual.textAlign,'center');
 maintenanceOverrides={};
}
overrides={'dashboard:overview-value':{textProfitColor:true,profitToneOverride:'loss',align:'right'}};
const manual=render({page:'home',frameKey:'asset-dashboard',frameTitle:'資產總覽',displayConfig:{layoutTargets:overrides}});
assert.equal(rgb(manual.color),'123456');assert.equal(manual.textAlign,'right');
console.log('Actual preview -> saved/restarted layout -> real InspectableTarget: color/alignment/font/manual/maintenance priority PASS');
