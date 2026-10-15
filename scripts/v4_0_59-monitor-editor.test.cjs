const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
let states=[],index=0,contextValue;
const react={useRef:initial=>{const i=index++;if(!(i in states))states[i]={current:initial};return states[i]},createContext:()=>({Provider:'Provider'}),useState:initial=>{const i=index++;if(!(i in states))states[i]=typeof initial==='function'?initial():initial;return [states[i],next=>states[i]=typeof next==='function'?next(states[i]):next]},useEffect:()=>{},useMemo:fn=>fn(),useContext:()=>contextValue};
function jsx(type,props){if(type==='Provider')contextValue=props.value;return typeof type==='function'?type(props):{type,props};}
const cache=new Map();
function load(file){file=path.resolve(file);if(cache.has(file))return cache.get(file);const m={exports:{}};
 const req=id=>{
  if(id==='react')return react;if(id==='react/jsx-runtime')return {jsx,jsxs:jsx};
  if(id==='react-native')return {PixelRatio:{get:()=>1},Pressable:'Pressable',Text:'Text',TextInput:'TextInput',View:'View',StyleSheet:{create:s=>s,flatten:s=>Array.isArray(s)?Object.assign({},...s):s}};
  if(id.includes('ColorPalettePicker'))return {ColorPalettePicker:props=>({type:'Palette',props})};
  if(id==='@react-native-async-storage/async-storage')return {__esModule:true,default:{getItem:async()=>null,setItem:async()=>{}}};
  if(id.startsWith('.')){const p=path.resolve(path.dirname(file),id);for(const ext of ['.ts','.tsx'])if(fs.existsSync(p+ext))return load(p+ext);}
  return require(id);
 };
 const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 new Function('require','module','exports',code)(req,m,m.exports);cache.set(file,m.exports);return m.exports;
}
function nodes(root){if(root==null||typeof root!=='object')return [];if(Array.isArray(root))return root.flatMap(nodes);return [root,...nodes(root.props?.children)];}
function text(root){return nodes(root).filter(x=>x.type==='Text').map(x=>x.props.children).flat(Infinity).filter(x=>typeof x==='string').join(' ');}
const domain=load('src/monitor/monitorDomain.ts'),models=load('src/monitor/monitorModels.ts'),runtime=load('src/monitor/MonitorSettingsRuntime.tsx');
function provider(){index=0;runtime.MonitorSettingsRuntimeProvider({children:null});return contextValue;}
provider();

const config=JSON.parse(JSON.stringify(domain.DEFAULT_MONITOR_CONFIG));
const format={fontWeight:'300',lineHeight:1.8,profitColors:['backgroundColor','borderColor']};
config.normalStyle.format=format;config.miniHeader.format=format;config.miniStatusBar.format=format;
config.normalItems[0].visual.format=format;config.miniColumns[0].format=format;config.miniStatusItems[0].format=format;
config.normalWall.header.format=format;config.normalWall.style.format=format;config.normalWall.fields[0].format=format;
config.normalClock={visible:false,fontScale:1.2,textColor:'#123456',backgroundColor:null,align:'right',paddingY:4,format};
contextValue.setConfig(config);const restored=provider().config;
for(const target of [restored.normalStyle,restored.miniHeader,restored.miniStatusBar,restored.normalItems[0].visual,restored.miniColumns[0],restored.miniStatusItems[0],restored.normalWall.header,restored.normalWall.style,restored.normalWall.fields[0]])assert.deepEqual(target.format,format,'format survives actual provider normalization');
assert.deepEqual(restored.normalClock,config.normalClock);assert.notDeepEqual(restored.normalClock,restored.miniClock);
contextValue.setConfig({...config,normalStyle:{...config.normalStyle,format:{fontWeight:'invalid',lineHeight:999,profitColors:['gainColor','textColor','textColor','garbage']}}});
const safe=provider().config.normalStyle.format;assert.equal(safe.fontWeight,undefined);assert.equal(safe.lineHeight,3);assert.deepEqual(safe.profitColors,['textColor']);
contextValue.setConfig(domain.DEFAULT_MONITOR_CONFIG);const legacy=provider().config;assert.equal(legacy.normalClock.visible,true);assert.equal(legacy.normalStyle.format.fontWeight,undefined);
console.log('V4.0.59 actual provider format/clock migration, isolation and sanitization PASS');

states=[];index=0;const panel=load('src/components/monitor/MonitorControlPanel.tsx').MonitorControlPanel;
const row={symbol:'0050',name:'元大台灣50',price:113.5,change:-1,changePercent:-.9,shares:10,avgCost:100,marketValue:1135,pnl:135,roi:13.5,comprehensivePnl:135,updatedAt:'2026-10-14T05:30:09Z'};
const snapshot={asset:{marketValue:1135,totalReturn:135},holdings:[row],generatedAt:'2026-10-14T10:00:00Z'};
function flatStyle(style){return Array.isArray(style)?Object.assign({},...style.map(flatStyle)):style??{}}
const styled={...restored,mode:'mini',miniStyle:{...restored.miniStyle,format:{fontWeight:'300',lineHeight:1.8}},miniClock:{...restored.normalClock,visible:true},miniColumns:restored.miniColumns.map(x=>({...x,enabled:x.field==='price',format:{fontWeight:'600',lineHeight:2,profitColors:['backgroundColor']}}))};
const view=panel({value:styled,onChange:()=>{},previewSnapshot:snapshot});
assert.ok(text(view).includes('13:30:09'),'preview clock must use source seconds and Taipei, not generated time');
assert.ok(!text(view).includes('18:00:00'));
const price=nodes(view).find(x=>x.type==='Text'&&text(x).includes('113.50'));assert.ok(price);assert.equal(flatStyle(price.props.style).fontWeight,'600');assert.ok(flatStyle(price.props.style).lineHeight>15);
assert.ok(nodes(view).some(x=>flatStyle(x.props?.style).backgroundColor===styled.miniStyle.lossColor),'negative quote binds background to loss even though PnL positive');
console.log('V4.0.59 actual panel preview source clock, per-item weight/line height and financial background PASS');
const wallConfig={...legacy,template:'market-wall',normalWall:{...legacy.normalWall,style:{...legacy.normalWall.style,textColor:'#123456',secondaryTextColor:'#ABCDEF',format:{profitColors:['textColor']}},fields:legacy.normalWall.fields.map(x=>({...x,enabled:['name','price','pnl'].includes(x.field)}))}};
index=0;const wallView=panel({value:wallConfig,onChange:()=>{},previewSnapshot:snapshot});
const caption=nodes(wallView).find(x=>x.type==='Text'&&text(x)==='損益');assert.ok(caption);assert.equal(flatStyle(caption.props.style).color,'#ABCDEF','primary text binding must not overwrite independent detail caption color');
console.log('V4.0.59 primary/secondary color independence PASS');

states=[];let current=wallConfig;function render(){index=0;return panel({value:current,onChange:next=>current=next,previewSnapshot:snapshot});}
let ui=render();const fieldButton=nodes(ui).find(x=>x.type==='Pressable'&&text(x)==='價格');assert.ok(fieldButton);fieldButton.props.onPress();ui=render();
let bgPicker=nodes(ui).find(x=>x.type==='Palette'&&x.props.label==='單項背景');assert.ok(bgPicker);bgPicker.props.onProfitColorChange(true);
assert.ok(current.normalWall.fields.find(x=>x.field==='price').format.profitColors.includes('backgroundColor'));
ui=render();const textPicker=nodes(ui).find(x=>x.type==='Palette'&&x.props.label==='單項文字顏色');textPicker.props.onProfitColorChange(false);
assert.equal(current.normalWall.fields.find(x=>x.field==='price').useProfitColor,false);assert.ok(current.normalWall.fields.find(x=>x.field==='price').format.profitColors.includes('backgroundColor'));
ui=render();for(const picker of nodes(ui).filter(x=>x.type==='Palette'))if(!['上漲 / 獲利','下跌 / 虧損','持平 / 資料不足'].includes(picker.props.label))assert.equal(typeof picker.props.onProfitColorChange,'function',picker.props.label+' needs independent profit option');
console.log('V4.0.59 actual item selection → independent text/background bindings and complete color options PASS');
