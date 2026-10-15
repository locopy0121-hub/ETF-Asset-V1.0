const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const values=new Map(),events=new Map(),effects=[];const cache=new Map();
const checkpoint={id:'probe-1',reason:'monitor-close',trades:100,snapshots:105,emitFailures:0,requests:1000,renders:2,maxRenderMs:12,ui:true,writer:true,probeLagMs:4};
const bridge={readNativeMarketFlowDiagnostics:async()=>JSON.stringify([checkpoint]),subscribeNativeMarketFlowDiagnostics:fn=>{events.set('flow',fn);return()=>events.delete('flow')},readPendingNativeCrashJournal:async()=>'',acknowledgeNativeCrashJournal:async()=>true,saveCriticalNativeDiagnostic:()=>{}};
const react={createContext:()=>({}),useCallback:fn=>fn,useContext:()=>({}),useEffect:fn=>effects.push(fn()),useState:initial=>[typeof initial==='function'?initial():initial,()=>{}]};
function load(file){file=path.resolve(file);if(cache.has(file))return cache.get(file);const m={exports:{}};cache.set(file,m.exports);
 const req=id=>{
  if(id==='react')return react;
  if(id==='react/jsx-runtime')return {jsx:()=>null};
  if(id==='@react-native-async-storage/async-storage')return {__esModule:true,default:{getItem:async key=>values.get(key)??null,setItem:async(key,value)=>values.set(key,value),removeItem:async key=>values.delete(key)}};
  if(id.endsWith('/TfAssetNativeBridge'))return bridge;
  if(id.startsWith('.')){const p=path.resolve(path.dirname(file),id);for(const ext of ['.ts','.tsx'])if(fs.existsSync(p+ext))return load(p+ext);}
  return require(id);
 };
 const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 new Function('require','module','exports',code)(req,m,m.exports);cache.set(file,m.exports);return m.exports;
}
const tick=()=>new Promise(r=>setImmediate(r));
(async()=>{
 const metrics=load('src/market/marketFlowMetrics.ts');metrics.markMarketFlowApplied(9001);metrics.markMarketFlowApplied(9002);
 assert.deepEqual(metrics.marketFlowMetrics(),{appApplied:2,appVersion:9002});
 load('src/diagnostics/DiagnosticRuntime.tsx').DiagnosticsProvider({children:null});await tick();await tick();
 const model=load('src/diagnostics/diagnosticModel.ts');let rows=JSON.parse(values.get(model.DIAGNOSTIC_STORAGE_KEY));
 assert.equal(rows.length,1);assert.equal(rows[0].code,'MARKET_FLOW');let data=JSON.parse(rows[0].detail);assert.equal(data.trades,100);assert.equal(data.appApplied,2);assert.equal(data.appVersion,9002);assert.equal(data.renders,2);assert.equal(typeof data.appReceiptAt,'number');
 events.get('flow')(JSON.stringify(checkpoint));await tick();assert.equal(JSON.parse(values.get(model.DIAGNOSTIC_STORAGE_KEY)).length,1,'replayed checkpoint is not duplicated');
 events.get('flow')(JSON.stringify({...checkpoint,id:'probe-2',reason:'monitor-after-close',trades:110}));await tick();await tick();rows=JSON.parse(values.get(model.DIAGNOSTIC_STORAGE_KEY));assert.equal(rows.length,2);
 assert.ok(rows.every(r=>r.detail.length<400));assert.ok(!rows[0].detail.includes('symbol'));
 effects.forEach(off=>typeof off==='function'&&off());assert.equal(events.size,0);
 console.log('V4.0.55 actual diagnostics runtime: native/JS counters, bounded detail, duplicate replay and receiver cleanup PASS');
})().catch(e=>{console.error(e);process.exitCode=1});
