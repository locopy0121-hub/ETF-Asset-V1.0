const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
let states=[],index=0,contextValue;
const react={useRef:initial=>{const i=index++;if(!(i in states))states[i]={current:initial};return states[i]},createContext:()=>({Provider:'Provider'}),useState:initial=>{const i=index++;if(!(i in states))states[i]=typeof initial==='function'?initial():initial;return [states[i],next=>states[i]=typeof next==='function'?next(states[i]):next]},useEffect:()=>{},useMemo:fn=>fn(),useContext:()=>contextValue};
function jsx(type,props){if(type==='Provider')contextValue=props.value;return typeof type==='function'?type(props):{type,props};}
const cache=new Map();
function load(file){file=path.resolve(file);if(cache.has(file))return cache.get(file);const m={exports:{}};
 const req=id=>{
  if(id==='react')return react;if(id==='react/jsx-runtime')return {jsx,jsxs:jsx};
  if(id==='react-native')return {Pressable:'Pressable',Text:'Text',TextInput:'TextInput',View:'View',StyleSheet:{create:s=>s,flatten:s=>Array.isArray(s)?Object.assign({},...s):s}};
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

const domain=load('src/monitor/monitorDomain.ts'),runtime=load('src/monitor/MonitorSettingsRuntime.tsx');
function provider(){index=0;runtime.MonitorSettingsRuntimeProvider({children:null});return contextValue;}
provider();const config={...domain.DEFAULT_MONITOR_CONFIG,normalStyle:{...domain.DEFAULT_MONITOR_CONFIG.normalStyle,fontScale:1.3,autoFit:{enabled:true,minFontSize:10,maxFontSize:30,rowHeight:48}}};
contextValue.setConfig(config);let persisted=provider().config;
assert.deepEqual(persisted.normalStyle.autoFit,config.normalStyle.autoFit);assert.equal(persisted.miniStyle.autoFit.enabled,false);assert.equal(persisted.normalStyle.fontScale,1.3);
contextValue.setConfig({...persisted,normalStyle:{...persisted.normalStyle,autoFit:{...persisted.normalStyle.autoFit,enabled:false}}});assert.equal(provider().config.normalStyle.fontScale,1.3,'turning auto fit off restores original stored manual scale');
states=[];index=0;const panel=load('src/components/monitor/MonitorControlPanel.tsx').MonitorControlPanel;let changed;
let view=panel({value:domain.DEFAULT_MONITOR_CONFIG,onChange:c=>changed=c});const toggle=nodes(view).find(x=>x.type==='Pressable'&&text(x).includes('字體自動適配（同列一致）'));assert.ok(toggle);toggle.props.onPress();assert.equal(changed.normalStyle.autoFit.enabled,true);assert.equal(changed.miniStyle.autoFit?.enabled??false,false);
const moduleFit=load('src/components/monitor/MonitorFitText.tsx');const options={enabled:true,minFontSize:8,maxFontSize:24,rowHeight:32};states=[];
function render(){index=0;const fit=moduleFit.useMonitorFit(options,'test');const a=moduleFit.MonitorFitText({fit,group:'row',cellKey:'a',children:'長名稱',style:{fontSize:24,fontWeight:'700',lineHeight:48}});const b=moduleFit.MonitorFitText({fit,group:'row',cellKey:'b',children:'123',style:{fontSize:24,lineHeight:24}});return {fit,a,b};}
let result=render();const a=nodes(result.a).filter(x=>x.type==='Text'),b=nodes(result.b).filter(x=>x.type==='Text');
a[0].props.onLayout({nativeEvent:{layout:{width:100,height:32}}});a[1].props.onTextLayout({nativeEvent:{lines:[{width:200,height:48}]}});b[0].props.onLayout({nativeEvent:{layout:{width:120,height:32}}});b[1].props.onTextLayout({nativeEvent:{lines:[{width:120,height:24}]}});
result=render();const flat=s=>Object.assign({},...s);assert.equal(flat(nodes(result.a).find(x=>x.type==='Text').props.style).fontSize,12);assert.equal(flat(nodes(result.b).find(x=>x.type==='Text').props.style).fontSize,12);assert.equal(flat(nodes(result.a).find(x=>x.type==='Text').props.style).fontWeight,'700');
const stale=result.fit;stale.rootLayout({nativeEvent:{layout:{width:300}}});result=render();stale.report('stale','row',{width:1,height:1,naturalWidth:1000,naturalHeight:1000});result=render();assert.equal(result.fit.size('row'),24,'late old-layout measurement is ignored');
console.log('V4.0.60 actual settings and panel switch, native measurement callbacks → shared row size, manual preservation and stale callback rejection PASS');

states=[];let mini={...domain.DEFAULT_MONITOR_CONFIG,mode:'mini',miniStyle:{...domain.DEFAULT_MONITOR_CONFIG.miniStyle,autoFit:options},miniColumns:domain.DEFAULT_MONITOR_CONFIG.miniColumns.map(c=>({...c,enabled:c.field==='price',paddingY:5,lineGap:2}))};
const snap={asset:{marketValue:1135,totalReturn:135},holdings:[{symbol:'0050',name:'元大台灣50',price:113.5,change:1,changePercent:1,shares:10,avgCost:100,marketValue:1135,pnl:135,roi:13.5,updatedAt:'2026-10-15T01:00:00Z'}]};
function miniRender(){index=0;return panel({value:mini,onChange:()=>{},previewSnapshot:snap});}
let miniUi=miniRender();let price=nodes(miniUi).find(x=>x.type==='Text'&&x.props.onLayout&&text(x).includes('113.50'));let measure=nodes(miniUi).find(x=>x.type==='Text'&&x.props.onTextLayout&&text(x).includes('113.50'));assert.ok(price&&measure);
assert.equal(flat(price.props.style).paddingTop,7);assert.equal(flat(price.props.style).paddingBottom,5);
price.props.onLayout({nativeEvent:{layout:{width:100,height:32}}});measure.props.onTextLayout({nativeEvent:{lines:[{width:50,height:28.8}]}});
miniUi=miniRender();price=nodes(miniUi).find(x=>x.type==='Text'&&x.props.onLayout&&text(x).includes('113.50'));assert.equal(flat(price.props.style).fontSize,16.6,'actual Mini preview subtracts gap + both paddings inside 32px row');
console.log('V4.0.60 actual Mini nonzero padding/gap reserved-height regression PASS');
