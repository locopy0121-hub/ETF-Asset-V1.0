// Real FinanceProvider and DividendScreen; doubles only for RN host APIs, storage and unrelated services.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript'),React=require('react');
process.env.TZ='Asia/Taipei';
let clock=Date.parse('2026-10-08T01:03:00Z');
class TestDate extends Date{constructor(...args){super(...(args.length?args:[clock]));}static now(){return clock;}}
let host,ctx,alerts=[];
function newHost(){return {values:[],deps:[],cursor:0,effects:[],run(fn){this.cursor=0;this.effects=[];const result=fn();for(const effect of this.effects)effect();return result;}};}
const react={...React,useState(initial){const owner=host,i=owner.cursor++;if(!(i in owner.values))owner.values[i]=typeof initial==='function'?initial():initial;return [owner.values[i],update=>{owner.values[i]=typeof update==='function'?update(owner.values[i]):update;}];},useEffect(fn,deps){const i=host.cursor++;const prev=host.deps[i];if(!prev||!deps||deps.some((v,j)=>v!==prev[j])){host.deps[i]=deps;host.effects.push(fn);}},useMemo(fn,deps){const i=host.cursor++,prev=host.deps[i];if(!prev||!deps||deps.some((v,j)=>v!==prev[j])){host.deps[i]=deps;host.values[i]=fn();}return host.values[i];},useCallback(fn,deps){return react.useMemo(()=>fn,deps);},useRef(v){const i=host.cursor++;return host.values[i]??(host.values[i]={current:v});}};
const initial={schema:4,initialCash:0,cashConfigured:false,entries:[{id:'b1',kind:'buy',symbol:'0050',name:'ETF',date:'2026-10-01',shares:100,price:10,tradeMode:'ROUND_LOT'}]};
const storage=new Map([['@tf-asset/v1.0.2-ledger',JSON.stringify(initial)]]);
const externalStorage={getItem:async key=>storage.get(key)??null,setItem:async(key,value)=>storage.set(key,value)};
const rn={Text:'Text',View:'View',Pressable:'Pressable',ScrollView:'ScrollView',TextInput:'TextInput',Modal:'Modal',StyleSheet:{create:x=>x},AppState:{currentState:'active',addEventListener:()=>({remove(){}})},Alert:{alert:(...args)=>alerts.push(args)}};
let market,readCount=0,refreshCount=0,releaseFetch,marketListener;const timers=new Map();let timerId=0;const nativeRow={symbol:'0050',name:'ETF',currentPrice:11,previousClose:10,sourceQuoteAt:clock,quality:'trade',source:'FUGLE',priceType:'REALTIME_TRADE',isFallback:false,market:'TSE',statusMessage:'live',checkedAt:clock,sessionDate:'2026-10-08',quoteStatus:'LIVE'};let nativeSnapshot={version:1,queriedAt:clock,quotes:[],missing:['0050']};const slowFetch=new Promise(r=>{releaseFetch=r;});
const cache=new Map();
function load(file){file=path.resolve(file);if(cache.has(file))return cache.get(file);const m={exports:{}};cache.set(file,m.exports);
 const compiled=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText;
 const req=id=>{
  if(id==='react')return react;if(id==='react/jsx-runtime')return require(id);if(id==='react-native')return rn;
  if(id==='@react-native-async-storage/async-storage')return {default:externalStorage,__esModule:true};
  if(id.endsWith('/MarketRuntime'))return {useMarketRuntime:()=>market};
  if(id.endsWith('/TfAssetNativeBridge'))return {nativeRuntimeAvailable:true,updateNativeMarketSymbols:async()=>true,loadNativeFugleApiKey:async()=> 'configured',loadUnifiedMarketData:async symbols=>{readCount++;assert.deepEqual(symbols,['0050']);return nativeSnapshot;},refreshUnifiedMarketData:async()=>{refreshCount++;return slowFetch;},subscribeUnifiedMarketData:callback=>{marketListener=callback;return ()=>{marketListener=undefined;}}};
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

const runtime=load('src/market/MarketRuntime.tsx');
const finance=load('src/finance/FinanceRuntime.tsx');
const marketHost=newHost(),financeHost=newHost();
const tick=()=>new Promise(r=>setImmediate(r));
function renderMarket(){host=marketHost;market=host.run(()=>runtime.MarketRuntimeProvider({children:null})).props.value;}
function renderFinance(){host=financeHost;ctx=host.run(()=>finance.FinanceProvider({children:null})).props.value;}
(async()=>{
 renderMarket();await tick();renderMarket();renderFinance();await tick();renderFinance();renderMarket();await tick();renderMarket();
 assert.equal(market.hydrated,true);assert.ok(refreshCount>0);assert.equal(ctx.valuationComplete,false);
 nativeSnapshot={version:2,queriedAt:clock+1000,quotes:[nativeRow],missing:[]};
 marketListener(nativeSnapshot);await tick();renderMarket();renderFinance();
 assert.equal(market.quotes[0]?.currentPrice,11,'Fugle hot-store quote must reach App while HTTP fetch is pending');
 assert.equal(ctx.valuationComplete,true);assert.equal(ctx.snapshot.portfolio.totalMarketValue,1100);
 assert.equal(typeof marketListener,'function','hot-store subscription survives slow refresh');
 const priceBefore=ctx.snapshot.portfolio.totalMarketValue;
 // A later tick updates canonical valuation; an older read cannot roll it back.
 nativeSnapshot={version:3,queriedAt:clock+2000,quotes:[{...nativeRow,currentPrice:12,sourceQuoteAt:clock+1000}],missing:[]};
 marketListener(nativeSnapshot);await tick();renderMarket();renderFinance();assert.equal(ctx.snapshot.portfolio.totalMarketValue,1200);
 releaseFetch({version:1,queriedAt:clock,quotes:[],missing:['0050']});await tick();renderMarket();renderFinance();assert.equal(ctx.snapshot.portfolio.totalMarketValue,1200,'late pre-tick response must not replace newer hot-store data');
 nativeSnapshot={version:4,queriedAt:clock+3000,quotes:[{...nativeRow,sourceQuoteAt:clock-86400000,sessionDate:'2026-10-07',quoteStatus:'STALE'}],missing:['0050']};
 marketListener(nativeSnapshot);await tick();renderMarket();renderFinance();assert.equal(ctx.valuationComplete,true,'older snapshot must retain the last valid valuation');assert.equal(ctx.snapshot.portfolio.totalMarketValue,1200);
 console.log('Actual MarketRuntime pending HTTP -> hot store -> Finance live totals / next tick / late-response guard / stale rejection PASS');process.exit(0);
})().catch(e=>{console.error(e);process.exitCode=1;});
