const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const clock=Date.parse('2026-10-12T03:00:00Z'),RealDate=Date;
class TestDate extends RealDate{constructor(...a){super(...(a.length?a:[clock]));}static now(){return clock;}}
const ledger={schema:4,initialCash:0,cashConfigured:false,entries:[{id:'b1',kind:'buy',symbol:'0050',name:'元大台灣50',date:'2026-10-01',shares:100,price:10,tradeMode:'ROUND_LOT'}]};
const config={forceRefreshOnTap:false,template:'quote-wall'};
const storage=new Map([['@tf-asset/v1.0.2-ledger',JSON.stringify(ledger)],['@tf-asset/widget-settings',JSON.stringify(config)]]);
const events=new Map();let listener,appListener,writes=[],subscribed=false;
const state={currentState:'active',addEventListener:(name,fn)=>{appListener=fn;return{remove(){}}}};
const nativeRow={symbol:'0050',name:'元大台灣50',currentPrice:11,previousClose:10,officialTradePrice:11,sourceQuoteAt:clock,sessionDate:'2026-10-12',source:'FUGLE',quality:'trade',priceType:'REALTIME_TRADE',quoteStatus:'LIVE',streamingHealthy:true,streamingCheckedAt:clock,isFallback:false,market:'TSE',statusMessage:'live',checkedAt:clock};
const snap=(version,price)=>({version,queriedAt:clock,phase:'live',quotes:[{...nativeRow,currentPrice:price,sourceQuoteAt:clock+version}]});
const bridge={subscribeUnifiedMarketData:fn=>{listener=fn;return()=>{listener=undefined}},loadUnifiedMarketData:async()=>snap(1,11),refreshUnifiedMarketData:async()=>snap(1,11),updateNativeMarketSymbols:async symbols=>{subscribed=symbols.includes('0050');return true},syncNativeWidget:async(cfg,snapshot)=>{assert.equal(cfg.forceRefreshOnTap,false);writes.push(snapshot);return true},requestNativeWidgetRefresh:()=>{throw Error('Manual update is forbidden in auto update test')}};
const cache=new Map();
function load(file){file=path.resolve(file);if(cache.has(file))return cache.get(file);const m={exports:{}};
 const req=id=>{
  if(id==='react-native')return {AppState:state,DeviceEventEmitter:{addListener:(name,fn)=>{events.set(name,fn);return{remove:()=>events.delete(name)}}}};
  if(id==='@react-native-async-storage/async-storage')return {__esModule:true,default:{getItem:async key=>storage.get(key)??null}};
  if(id.endsWith('/TfAssetNativeBridge'))return bridge;
  if(id.startsWith('.')){const p=path.resolve(path.dirname(file),id);for(const ext of ['.ts','.tsx','.js'])if(fs.existsSync(p+ext))return load(p+ext);}
  return require(id);
 };
 const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 new Function('require','module','exports','Date',code)(req,m,m.exports,TestDate);cache.set(file,m.exports);return m.exports;
}
const tick=()=>new Promise(resolve=>setImmediate(resolve));
(async()=>{
 // Execute the actual entrypoint emitted by GitHub before launching a native task.
 const workflow=fs.readFileSync('.github/workflows/ci.yml','utf8');
 const entry=workflow.match(/cat > \.\.\/TFAssetNative\/index\.js <<'EOF'\n([\s\S]*?)\n          EOF/);
 assert.ok(entry,'native build entrypoint fixture must come from workflow');
 const components=new Map(),tasks=new Map();
 const registry={registerComponent:(key,provider)=>components.set(key,provider),registerHeadlessTask:(key,provider)=>tasks.set(key,provider)};
 const app=()=>null;
 const emitted=ts.transpileModule(process.argv[2]?fs.readFileSync(path.resolve(process.argv[2]),'utf8'):entry[1],{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const req=id=>id==='react-native'?{AppRegistry:registry}:id==='./App'?{__esModule:true,default:app}:id==='./app.json'?{name:'TFAssetNative'}:id==='./src/widget/widgetLiveTask'?load('src/widget/widgetLiveTask.ts'):(()=>{throw Error('Unexpected entrypoint dependency: '+id)})();
 const m={exports:{}};new Function('require','module','exports',emitted)(req,m,m.exports);
 assert.equal(components.get('TFAssetNative')(),app,'native root registration must remain intact');
 assert.equal(tasks.size,1,'packaged entrypoint must register exactly one headless task');
 assert.equal(typeof tasks.get('TfAssetWidgetLive'),'function','native service task name must be registered');
 const task=tasks.get('TfAssetWidgetLive')()();
 await tick();await tick();assert.equal(writes.length,0,'foreground App owns writes');state.currentState='background';appListener('background');await tick();await tick();assert.equal(subscribed,true);assert.ok(writes.length>0);
 listener(snap(2,12));listener(snap(3,13));listener(snap(2,12));await tick();await tick();
 assert.equal(writes.at(-1).asset.marketValue,1300);
 assert.equal(writes.at(-1).holdings[0].pnl,259);
 const count=writes.length;state.currentState='active';appListener('active');listener(snap(4,14));await tick();assert.equal(writes.length,count,'visible App must own foreground writes');
 state.currentState='background';appListener('background');await tick();listener(snap(5,15));await tick();await tick();assert.equal(writes.at(-1).asset.marketValue,1500);
 listener(snap(2,12));await tick();assert.equal(writes.at(-1).asset.marketValue,1500,'late event cannot roll Widget back');
 events.get('TfAssetWidgetLiveStopped')();await task;assert.equal(listener,undefined);
 storage.set('@tf-asset/v1.0.2-ledger','{broken');
 const retryTask=tasks.get('TfAssetWidgetLive')()();await tick();assert.equal(typeof listener,'function','failed bootstrap must retain listener');
 storage.set('@tf-asset/v1.0.2-ledger',JSON.stringify(ledger));listener(snap(6,16));await tick();await tick();assert.equal(writes.at(-1).asset.marketValue,1600);
 events.get('TfAssetWidgetLiveStopped')();await retryTask;assert.equal(listener,undefined);
 console.log('V4.0.53 packaged native entrypoint + registered background task: button OFF, background LIVE, latest event, canonical PnL, foreground handoff, stop cleanup PASS');
})().catch(e=>{console.error(e);process.exitCode=1});
