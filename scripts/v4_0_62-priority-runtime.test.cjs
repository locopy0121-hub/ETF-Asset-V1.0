// Real FinanceProvider and DividendScreen; doubles only for RN host APIs, storage and unrelated services.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript'),React=require('react');
process.env.TZ='Asia/Taipei';
let clock=Date.parse('2026-10-08T01:03:00Z');
class TestDate extends Date{constructor(...args){super(...(args.length?args:[clock]));}static now(){return clock;}}
let host,ctx,alerts=[];
function newHost(){return {values:[],deps:[],cursor:0,effects:[],run(fn){this.cursor=0;this.effects=[];const result=fn();for(const effect of this.effects)effect();return result;}};}
const react={...React,useState(initial){const owner=host,i=owner.cursor++;if(!(i in owner.values))owner.values[i]=typeof initial==='function'?initial():initial;return [owner.values[i],update=>{owner.values[i]=typeof update==='function'?update(owner.values[i]):update;}];},useEffect(fn,deps){const i=host.cursor++;const prev=host.deps[i];if(!prev||!deps||deps.some((v,j)=>v!==prev[j])){host.deps[i]=deps;host.effects.push(fn);}},useMemo(fn,deps){const i=host.cursor++,prev=host.deps[i];if(!prev||!deps||deps.some((v,j)=>v!==prev[j])){host.deps[i]=deps;host.values[i]=fn();}return host.values[i];},useCallback(fn,deps){return react.useMemo(()=>fn,deps);},useRef(v){const i=host.cursor++;return host.values[i]??(host.values[i]={current:v});}};
const initial={schema:4,initialCash:0,cashConfigured:false,entries:[{id:'b1',kind:'buy',symbol:'0050',name:'ETF',date:'2026-10-01',shares:100,price:10,tradeMode:'ROUND_LOT'},{id:'b2',kind:'buy',symbol:'00919',name:'sold ETF',date:'2026-10-01',shares:100,price:10,tradeMode:'ROUND_LOT'},{id:'s2',kind:'sell',symbol:'00919',name:'sold ETF',date:'2026-10-02',shares:100,price:10,tradeMode:'ROUND_LOT'}]};
const storage=new Map([['@tf-asset/v1.0.2-ledger',JSON.stringify(initial)]]);
const externalStorage={getItem:async key=>storage.get(key)??null,setItem:async(key,value)=>storage.set(key,value)};
const rn={Text:'Text',View:'View',Pressable:'Pressable',ScrollView:'ScrollView',TextInput:'TextInput',Modal:'Modal',StyleSheet:{create:x=>x},AppState:{currentState:'active',addEventListener:()=>({remove(){}})},Alert:{alert:(...args)=>alerts.push(args)}};
let subscribed=[];let market,readCount=0,refreshCount=0,releaseFetch,marketListener;const timers=new Map();let timerId=0;const nativeRow={symbol:'0050',name:'ETF',currentPrice:11,previousClose:10,sourceQuoteAt:clock,quality:'trade',source:'FUGLE',priceType:'REALTIME_TRADE',isFallback:false,market:'TSE',statusMessage:'live',checkedAt:clock,sessionDate:'2026-10-08',quoteStatus:'LIVE'};let nativeSnapshot={version:1,queriedAt:clock,quotes:[],missing:['0050']};const slowFetch=new Promise(r=>{releaseFetch=r;});
const cache=new Map();
function load(file){file=path.resolve(file);if(cache.has(file))return cache.get(file);const m={exports:{}};cache.set(file,m.exports);
 const compiled=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText;
 const req=id=>{
  if(id==='react')return react;if(id==='react/jsx-runtime')return require(id);if(id==='react-native')return rn;
  if(id==='@react-native-async-storage/async-storage')return {default:externalStorage,__esModule:true};
  if(id.endsWith('/MarketRuntime'))return {useMarketRuntime:()=>market};
  if(id.endsWith('/TfAssetNativeBridge'))return {nativeRuntimeAvailable:true,updateNativeMarketSymbols:async rows=>{subscribed=rows;return true},loadNativeFugleApiKey:()=>new Promise(()=>{}),loadUnifiedMarketData:()=>new Promise(()=>{}),subscribeUnifiedMarketData:callback=>{marketListener=callback;return ()=>{marketListener=undefined;}},refreshUnifiedMarketData:async()=>{refreshCount++;return slowFetch;}};
  if(id.endsWith('/TaiwanSecurityCatalog'))return {fetchTaiwanSecurityCatalog:async()=>[]};
  if(id.endsWith('/FinanceRuntime')&&file.endsWith('DividendScreen.tsx'))return {useFinance:()=>ctx};
  if(id.endsWith('/SettingsRuntime'))return {useSettingsRuntime:()=>({prefs:{ai:{enabled:true},dividendCalendar:{showLastBuyDate:true,showExDate:true,showRecordDate:true,showPaymentDate:true,showStatus:true}}})};
  if(id.endsWith('/AiNewsRuntime'))return {useAiNewsRuntime:()=>({items:[]})};
  if(id.endsWith('/aiAssistant'))return {answerAiQuestion(){throw Error('AI should be idle');}};
  if(id.includes('/components/')){const name=path.basename(id);return {[name]:name};}
  if(id.startsWith('.')){const p=path.resolve(path.dirname(file),id);for(const ext of ['.ts','.tsx','.js'])if(fs.existsSync(p+ext))return load(p+ext);}
  return require(id);
 };
 new Function('require','module','exports','Date','setInterval','clearInterval',compiled)(req,m,m.exports,TestDate,(fn,ms)=>{const id=++timerId;timers.set(id,{fn,ms});return id;},id=>timers.delete(id));cache.set(file,m.exports);return m.exports;
}



(async()=>{
 const runtime=load('src/market/MarketRuntime.tsx');host=newHost();const owner=host;
 function render(){host=owner;market=host.run(()=>runtime.MarketRuntimeProvider({children:null})).props.value;}
 render();await new Promise(r=>setImmediate(r));render();
 market.setTrackedSymbols(['2330']);market.setWatchlistSymbols(['0050','0056','00878','00919','00929']);market.setResearchSymbols(['2317']);
 assert.equal(subscribed[0],'2330','held symbols must receive subscription slots before lower-code watched or research symbols');
 assert.equal(new Set(subscribed).size,7);assert.equal(subscribed.at(-1),'2317','transient search cannot displace held/watchlist priority');
 market.setResearchSymbols([]);assert.equal(subscribed[0],'2330');assert.equal(subscribed.length,6);
 console.log('V4.0.62 actual MarketRuntime held/watch/research slot priority and independent removal PASS');process.exit(0);
})().catch(e=>{console.error(e);process.exit(1)});
