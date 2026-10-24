const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
let overrides={},seenTargets=[];
let display={profitColorMode:'red-up-green-down',gainColor:'#123456',lossColor:'#654321',neutralColor:'#ABCDEF'};
const React=require('react');
const react={...React,useId:()=>':fixture:',useState:v=>[v,()=>{}],useRef:v=>({current:v}),useEffect:()=>{},useMemo:f=>f()};
const flatten=s=>Array.isArray(s)?Object.assign({},...s.map(flatten)):s||{};
const rn={Text:'Text',View:'View',Pressable:'Pressable',ScrollView:'ScrollView',useWindowDimensions:()=>({width:360,height:800}),StyleSheet:{create:x=>x,flatten,hairlineWidth:1,absoluteFill:{}},Animated:{Text:'Text',View:'View',Value:class{stopAnimation(){} setValue(){}},timing:()=>({}),sequence:()=>({start(){},stop(){}}),loop:x=>x}};
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
  if(id.endsWith('/InspectableTarget'))return {InspectableTarget:({target,children})=>{seenTargets.push(target);const override=overrides[target.id]??{};const tone=override.profitToneOverride&&override.profitToneOverride!=='auto'?override.profitToneOverride:target.profitTone??'neutral';const appearance={...target.base,...override};for(const [color,flag] of [['textColor','textProfitColor'],['backgroundColor','backgroundProfitColor'],['borderColor','borderProfitColor']])appearance[color]=load('src/maintenance/workspaceModel.ts').linkedColor(appearance[color],appearance[flag],tone,display);return children(appearance,Object.keys(override).length>0,override,{displayTone:tone,editing:false,simulated:false});}};
  if(id.endsWith('/MaintenanceRuntime'))return {useMaintenance:()=>({hasIndividualReset:()=>false})};
  if(id.endsWith('/MaintenanceWorkbench'))return {InstalledFrameComponents:()=>null};
  if(id.endsWith('/WorkspaceSurface'))return {WorkspaceSurface:({children})=>children};
  if(id.endsWith('/pageEditor'))return {usePageEditor:()=>({})};
  if(id.endsWith('/SettingsRuntime'))return {useSettingsRuntime:()=>({prefs:{display,marketCard:{showQuoteMetadata:false}}})};
  if(id.endsWith('/ThemeRuntime'))return {useThemeRuntime:()=>({palette:{gain:'#EF4444',loss:'#10B981',text:'#000000',textSecondary:'#888888',surfaceMuted:'#FFFFFF',primary:'#0066FF'}})};
  if(id.endsWith('/TargetSurfaceEffects'))return {TargetBackdrop:()=>null,targetShadowStyle:()=>({})};
  // Direct-function legacy renderer cannot run React context hooks; visual-only flag defaults OFF.
  if(id.endsWith('/equalGridContext'))return {useEqualGridActive:()=>false};
  
  if(id.endsWith('/LayoutSelectionContext'))return {useLayoutRuntime:()=>({targets:overrides,active:false})};
  if(id.endsWith('/HoldingQuoteTicker'))return {HoldingQuoteTicker:()=>null};
  if(id.endsWith('/MiniHoldingChart'))return {MiniHoldingChart:()=>null};
  if(id.endsWith('/EtfBadgeRow'))return {EtfBadgeRow:()=>null};
  if(id.startsWith('.')){let p=path.resolve(path.dirname(file),id);for(const ext of ['.ts','.tsx','.js'])if(fs.existsSync(p+ext))return load(p+ext);}
  return require(id);
 };
 new Function('require','module','exports',src)(req,result,result.exports);cache.set(file,result.exports);return result.exports;
}
function texts(node){if(node==null||typeof node!=='object')return [];if(Array.isArray(node))return node.flatMap(texts);if(typeof node.type==='function')return texts(node.type(node.props));return [...(node.type==='Text'?[{text:node.props.children,color:flatten(node.props.style).color}]:[]),...texts(node.props?.children)];}
const matches=(actual,expected)=>actual.toUpperCase().startsWith(expected.toUpperCase())||actual===`rgba(${parseInt(expected.slice(1,3),16)},${parseInt(expected.slice(3,5),16)},${parseInt(expected.slice(5,7),16)},1.000)`;


const rgb=c=>c.startsWith('#')?c.slice(1,7).toUpperCase():c.match(/^rgba?\((\d+),(\d+),(\d+)/)?.slice(1).map(n=>Number(n).toString(16).padStart(2,'0')).join('').toUpperCase();
const expected=(tone,mode)=>tone==='neutral'?'#ABCDEF':(tone==='gain')===(mode==='red-up-green-down')?'#123456':'#654321';
const metric=load('src/components/MetricTile.tsx').MetricTile;
const direct=load('src/components/dashboard/DashboardEditableContent.tsx').DashboardEditableText;
const detail=load('src/components/dashboard/DashboardProfitDetail.tsx').DashboardProfitDetail;
const decorate=load('src/components/PageEditorStack.tsx').decorateContent;
const frame={page:'home',frameKey:'asset-dashboard',frameTitle:'測試框架'};
const tests=[];
function check(name,fn){try{fn();}catch(e){tests.push(name+': '+e.message);}}
for(const mode of ['red-up-green-down','green-up-red-down'])for(const tone of ['gain','loss','neutral']){
 display={...display,profitColorMode:mode};const color=expected(tone,mode);
 check('metric '+mode+tone,()=>{overrides={};assert.equal(rgb(texts(metric({label:'Label',value:'42',caption:'Caption',tone})).find(x=>x.text==='42').color),rgb(color));
 const t=texts(metric({label:'Label',value:'42',caption:'Caption',tone,editorStyle:{textProfitColor:true,labelProfitColor:true,captionProfitColor:true}}));for(const value of ['Label','42','Caption'])assert.equal(rgb(t.find(x=>x.text===value).color),rgb(color));
 const fixed=texts(metric({label:'Label',value:'42',tone,editorStyle:{textProfitColor:false,textColor:'#FEDCBA'}}));assert.equal(rgb(fixed.find(x=>x.text==='42').color),'FEDCBA');});
 check('direct override '+mode+tone,()=>{overrides={'dashboard:t':{textProfitColor:true,profitToneOverride:tone}};assert.equal(rgb(texts(direct({id:'t',label:'T',children:'42',tone:'gain',style:{color:'#999999'}}))[0].color),rgb(color));});
 check('decorated text '+mode+tone,()=>{seenTargets=[];overrides={'text:root/0/0':{textProfitColor:true}};const tree=decorate(React.createElement('View',null,React.createElement('Text',{style:{color:'#999999'}},'Some label')),frame,'root',tone);const rendered=texts(tree);assert.equal(seenTargets[0].profitTone,tone);assert.equal(rgb(rendered[0].color),rgb(color));});
 check('dashboard labels and values '+mode+tone,()=>{overrides={'dashboard:detail-label-p':{textProfitColor:true},'dashboard:detail-value-p':{textProfitColor:true}};const t=texts(detail({rows:[{key:'p',label:'P',value:'42',tone}],layout:{order:['p'],itemCount:1,align:'left'},maintenance:frame}));for(const value of ['P','42'])assert.equal(rgb(t.find(x=>x.text===value).color),rgb(color));});
}
check('default nonfinancial text',()=>{overrides={};assert.equal(rgb(texts(metric({label:'Cost',value:'42'})).find(x=>x.text==='42').color),'000000');});
const wall=load('src/domain/uiModels.ts').DEFAULT_HOLDING_WALL_CONFIG;
const moduleView=load('src/components/HoldingQuoteModule.tsx').HoldingQuoteModule;
const quote={symbol:'0050',name:'ETF',price:10,previousClose:9,pnl:42,roi:4,shares:100,marketValue:1000,quoteVerified:true};
check('micro respects fixed field color',()=>{overrides={};const cfg={...wall,style:{...wall.style,textProfitColor:false},fields:wall.fields.map(f=>f.field==='pnl'?{...f,useProfitColor:false,textColor:'#FEDCBA'}:f)};const t=texts(moduleView({item:quote,layout:'micro',wallConfig:cfg}));assert.equal(rgb(t.find(x=>x.text==='NT$ 42').color),'FEDCBA');});
check('unverified micro uses neutral',()=>{overrides={};const t=texts(moduleView({item:{...quote,quoteVerified:false},layout:'micro'}));assert.equal(rgb(t.find(x=>x.text==='待取得').color),'ABCDEF');});
const collection=load('src/components/HoldingQuoteCollection.tsx').HoldingQuoteCollection;
for(const mode of ['red-up-green-down','green-up-red-down'])for(const [price,verified,tone] of [[10,true,'gain'],[8,true,'loss'],[9,true,'neutral'],[10,false,'neutral']])check('quote card '+mode+tone,()=>{
 display={...display,profitColorMode:mode};overrides={'quote:0050':{textProfitColor:true}};seenTargets=[];
 const cfg={...wall,fields:wall.fields.map(f=>({...f,useProfitColor:false}))};
 const t=texts(collection({rows:[{...quote,price,quoteVerified:verified}],style:'quote',layoutMode:'grid3',wallConfig:cfg,maintenance:frame,onOpenHolding(){}}));assert.equal(seenTargets[0].profitTone,tone);
 assert.equal(rgb(t.find(x=>x.text==='ETF').color),rgb(expected(tone,mode)));
 overrides={'quote:0050':{textProfitColor:false,textColor:'#FEDCBA'}};assert.equal(rgb(texts(collection({rows:[quote],style:'quote',layoutMode:'grid3',maintenance:frame,onOpenHolding(){}})).find(x=>x.text==='ETF').color),'FEDCBA');
});
check('wall main text header switch',()=>{overrides={};display={...display,profitColorMode:'red-up-green-down'};const cfg={...wall,style:{...wall.style,textProfitColor:true},fields:wall.fields.map(f=>f.field==='name'?{...f,useProfitColor:false}:f)};assert.equal(rgb(texts(moduleView({item:quote,layout:'micro',wallConfig:cfg})).find(x=>x.text==='ETF').color),'123456');});
check('quote fixed override beats secondary flag',()=>{overrides={'quote:0050':{textProfitColor:false,textColor:'#FEDCBA'}};const cfg={...wall,style:{...wall.style,secondaryTextProfitColor:true}};const t=texts(collection({rows:[quote],style:'quote',layoutMode:'grid3',wallConfig:cfg,maintenance:frame,onOpenHolding(){}}));assert.equal(rgb(t.find(x=>x.text==='0050').color),'FEDCBA');});
check('quote manual tone beats secondary flag',()=>{display={...display,profitColorMode:'red-up-green-down'};overrides={'quote:0050':{textProfitColor:true,profitToneOverride:'loss'}};const cfg={...wall,style:{...wall.style,secondaryTextProfitColor:true}};const t=texts(collection({rows:[quote],style:'quote',layoutMode:'grid3',wallConfig:cfg,maintenance:frame,onOpenHolding(){}}));assert.equal(rgb(t.find(x=>x.text==='0050').color),'654321');});
if(tests.length){console.error(tests.join('\n'));process.exitCode=1;}else console.log('Actual metric / labels / captions / direct override / recursively decorated text / dashboard values / two live modes / neutral / fixed colors PASS');
