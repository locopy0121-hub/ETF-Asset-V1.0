const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
let states=[],index=0,contextValue;
const react={useRef:initial=>{const i=index++;if(!(i in states))states[i]={current:initial};return states[i]},createContext:()=>({Provider:'Provider'}),useState:initial=>{const i=index++;if(!(i in states))states[i]=typeof initial==='function'?initial():initial;return [states[i],next=>states[i]=typeof next==='function'?next(states[i]):next]},useEffect:()=>{},useMemo:fn=>fn(),useContext:()=>contextValue};
function jsx(type,props){if(type==='Provider')contextValue=props.value;return typeof type==='function'?type(props):{type,props};}
const cache=new Map();
function load(file){file=path.resolve(file);if(cache.has(file))return cache.get(file);const m={exports:{}};
 const req=id=>{
  if(id==='react')return react;if(id==='react/jsx-runtime')return {jsx,jsxs:jsx};
  if(id==='react-native')return {Pressable:'Pressable',Text:'Text',TextInput:'TextInput',View:'View',StyleSheet:{create:s=>s,flatten:s=>Array.isArray(s)?Object.assign({},...s):s}};
  if(id.includes('ColorPalettePicker'))return {ColorPalettePicker:()=>null};
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
const preset=models.applyMonitorModel(domain.DEFAULT_MONITOR_CONFIG,'volume');
contextValue.setConfig(JSON.parse(JSON.stringify(preset)));const restored=provider().config;
assert.equal(restored.model,'volume');assert.deepEqual(restored.normalWall.fields.map(x=>x.field),preset.normalWall.fields.map(x=>x.field));assert.equal(restored.normalWall.fields.find(x=>x.field==='volume').enabled,true);
contextValue.setConfig({template:'market-wall',normalWall:{fields:[{field:'price',enabled:true,label:'成交價'}]}});const legacy=provider().config;
assert.equal(legacy.normalWall.fields.find(x=>x.field==='volume').enabled,false);assert.equal(legacy.normalWall.fields.find(x=>x.field==='price').label,'成交價');
const row={symbol:'0050',name:'元大台灣50',price:113.5,previousClose:112.4,change:1.1,changePercent:0.98,volume:140553,shares:124,avgCost:110,marketValue:14074,pnl:434,roi:3.18,comprehensivePnl:434,quoteStatus:'LIVE'};
const snapshot={contractVersion:1,source:'canonical-finance-core',generatedAt:'2026-10-14T02:30:00Z',asset:{marketValue:14074},holdings:[row]};
for(const key of ['price','changePercent','volume','pnl','marketValue','roi'])for(const direction of ['asc','desc']){
 const config={...restored,sort:{key,direction,manualSymbols:[]}};
 const sorted=domain.sortMonitorHoldings({...snapshot,holdings:[{...row,symbol:'missing',[key]:null},row]},config);assert.equal(sorted.at(-1).symbol,'missing');
}
states=[];index=0;let changed;
const panel=load('src/components/monitor/MonitorControlPanel.tsx').MonitorControlPanel;
const view=panel({value:restored,onChange:c=>changed=c,availableSymbols:[row],previewSnapshot:snapshot});
assert.ok(text(view).includes('140,553'));assert.ok(text(view).includes('112.40'));
const button=nodes(view).find(x=>x.type==='Pressable'&&text(x)==='昨收對照');assert.ok(button);button.props.onPress();assert.equal(changed.model,'reference');
console.log('V4.0.56 actual settings migration/preset persistence, null-last sorting, model button and live field preview PASS');
