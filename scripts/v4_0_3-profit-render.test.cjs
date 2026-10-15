const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
let display={profitColorMode:'red-up-green-down',gainColor:'#123456',lossColor:'#654321',neutralColor:'#ABCDEF'};
const React=require('react');
const react={...React,useId:()=>':fixture:',useState:v=>[v,()=>{}],useRef:v=>({current:v}),useEffect:()=>{},useMemo:f=>f()};
const flatten=s=>Array.isArray(s)?Object.assign({},...s.map(flatten)):s||{};
const rn={Text:'Text',View:'View',Pressable:'Pressable',ScrollView:'ScrollView',StyleSheet:{create:x=>x,flatten,hairlineWidth:1,absoluteFill:{}},Animated:{Text:'Text',View:'View',Value:class{stopAnimation(){} setValue(){}},timing:()=>({}),sequence:()=>({start(){},stop(){}}),loop:x=>x}};
function load(file){
 file=path.resolve(file);let result={exports:{}};
 const src=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText;
 const req=id=>{
  if(id==='react')return react;
  if(id==='react/jsx-runtime')return require(id);
  if(id==='react-native')return rn;
  if(id.endsWith('/EditableNative'))return {Text:rn.Text,TextInput:rn.TextInput,Pressable:rn.Pressable};
  if(id.endsWith('/FrameEditingContext'))return {FrameEditingProvider:({children})=>children};
  if(id.endsWith('/SettingsRuntime'))return {useSettingsRuntime:()=>({prefs:{display}})};
  if(id.endsWith('/ThemeRuntime'))return {useThemeRuntime:()=>({palette:{gain:'#EF4444',loss:'#10B981',text:'#000000',textSecondary:'#888888',surfaceMuted:'#FFFFFF',primary:'#0066FF'}})};
  // Isolated renderer has no React dispatcher; equal-grid is a separate visual-only context.
  if(id.endsWith('/equalGridContext'))return {useEqualGridActive:()=>false};
  if(id.endsWith('/TargetSurfaceEffects'))return {TargetBackdrop:()=>null,targetShadowStyle:()=>({})};
  if(id.endsWith('/DashboardEditableContent'))return {DashboardEditableText:({children,style})=>React.createElement('Text',{style},children)};
  if(id.endsWith('/LayoutSelectionContext'))return {useLayoutRuntime:()=>({targets:{},active:false})};
  if(id.endsWith('/EtfBadgeRow'))return {EtfBadgeRow:()=>null};
  if(id.startsWith('.')){let p=path.resolve(path.dirname(file),id);for(const ext of ['.ts','.tsx','.js'])if(fs.existsSync(p+ext))return load(p+ext);}
  return require(id);
 };
 new Function('require','module','exports',src)(req,result,result.exports);return result.exports;
}
function texts(node){if(node==null||typeof node!=='object')return [];if(Array.isArray(node))return node.flatMap(texts);if(typeof node.type==='function')return texts(node.type(node.props));return [...(node.type==='Text'?[{text:node.props.children,color:flatten(node.props.style).color}]:[]),...texts(node.props?.children)];}
const matches=(actual,expected)=>actual.toUpperCase().startsWith(expected.toUpperCase())||actual===`rgba(${parseInt(expected.slice(1,3),16)},${parseInt(expected.slice(3,5),16)},${parseInt(expected.slice(5,7),16)},1.000)`;
const tableConfig=load('src/domain/portfolioList.ts').DEFAULT_PORTFOLIO_LIST;
const quote={symbol:'0050',name:'ETF',price:10,previousClose:9,pnl:42,roi:4,shares:100,marketValue:1000};
const cases=[
 ['src/components/PortfolioHoldingTable.tsx','PortfolioHoldingTable',{rows:[quote],config:{...tableConfig,columns:tableConfig.columns.filter(x=>x.key==='pnl').map(x=>({...x,enabled:true}))}},'NT$ 42'],
 ['src/components/dashboard/DashboardAssetOverview.tsx','DashboardAssetOverview',{amount:'100',caption:'',totalPnl:42,todayPnl:42,yesterdayPnl:42,pnlComplete:true,layout:{order:['amount'],align:'left'}},'+42'],
 ['src/components/ValueRow.tsx','ValueRow',{label:'P',value:'42',tone:'gain'},'42'],
 ['src/components/MetricTile.tsx','MetricTile',{label:'P',value:'42',tone:'gain'},'42'],
 ['src/components/dashboard/DashboardProfitDetail.tsx','DashboardProfitDetail',{rows:[{key:'x',label:'P',value:'42',tone:'gain'}],layout:{order:['x'],itemCount:1,align:'left'}},'42'],
 ['src/components/PortfolioSafeList.tsx','PortfolioSafeList',{rows:[{symbol:'0050',name:'ETF',price:10,pnl:42}],onOpenHolding:()=>{}},'損益 NT$ 42'],
];
for(const [file,name,props,text] of cases){const component=load(file)[name];for(const mode of ['red-up-green-down','green-up-red-down']){display={...display,profitColorMode:mode};const found=texts(component(props)).find(t=>t.text===text);assert.ok(found,`${name} rendered value missing`);assert.ok(matches(found.color,mode==='red-up-green-down'?'#123456':'#654321'),`${name} ignores live settings: ${found.color}`);}}
const metric=load('src/components/MetricTile.tsx').MetricTile;
const fixed=texts(metric({label:'P',value:'42',tone:'gain',editorStyle:{textProfitColor:false,textColor:'#FEDCBA'}})).find(t=>t.text==='42');
assert.ok(matches(fixed.color,'#FEDCBA'));
display={...display,profitColorMode:'red-up-green-down'};
const safe=load('src/components/PortfolioSafeList.tsx').PortfolioSafeList;
for(const [pnl,expected] of [[-42,'#654321'],[0,'#ABCDEF']]){const rendered=texts(safe({rows:[{...quote,pnl}],onOpenHolding:()=>{}})).find(t=>typeof t.text==='string'&&t.text.startsWith('損益 NT$'));assert.ok(matches(rendered.color,expected));}
const table=load('src/components/PortfolioHoldingTable.tsx').PortfolioHoldingTable;
for(const [pnl,expected] of [[-42,'#654321'],[0,'#ABCDEF']]){const rendered=texts(table({rows:[{...quote,pnl}],config:{...tableConfig,columns:tableConfig.columns.filter(x=>x.key==='pnl').map(x=>({...x,enabled:true}))}})).find(t=>t.text===`NT$ ${pnl}`);assert.ok(matches(rendered.color,expected));}
console.log('Actual homepage / metric / profit detail / holdings render updates with live settings; fixed override PASS');
