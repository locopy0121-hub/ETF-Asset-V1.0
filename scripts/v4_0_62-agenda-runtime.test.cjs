// Real FinanceProvider and DividendScreen; doubles only for RN host APIs, storage and unrelated services.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript'),React=require('react');
process.env.TZ='Asia/Taipei';
let clock=Date.parse('2026-10-08T04:00:00Z');
class TestDate extends Date{constructor(...args){super(...(args.length?args:[clock]));}static now(){return clock;}}
let host,ctx,alerts=[];
function newHost(){return {values:[],deps:[],cursor:0,effects:[],run(fn){this.cursor=0;this.effects=[];const result=fn();for(const effect of this.effects)effect();return result;}};}
const react={...React,useState(initial){const owner=host,i=owner.cursor++;if(!(i in owner.values))owner.values[i]=typeof initial==='function'?initial():initial;return [owner.values[i],update=>{owner.values[i]=typeof update==='function'?update(owner.values[i]):update;}];},useEffect(fn,deps){const i=host.cursor++;const prev=host.deps[i];if(!prev||!deps||deps.some((v,j)=>v!==prev[j])){host.deps[i]=deps;host.effects.push(fn);}},useMemo:fn=>fn(),useCallback:fn=>fn,useRef(v){const i=host.cursor++;return host.values[i]??(host.values[i]={current:v});}};
const initial={schema:4,initialCash:0,cashConfigured:false,entries:[]};
const storage=new Map([['@tf-asset/v1.0.2-ledger',JSON.stringify(initial)]]);
const externalStorage={getItem:async key=>storage.get(key)??null,setItem:async(key,value)=>storage.set(key,value)};
const rn={Text:'Text',View:'View',Pressable:'Pressable',ScrollView:'ScrollView',TextInput:'TextInput',Modal:'Modal',StyleSheet:{create:x=>x},AppState:{addEventListener:()=>({remove(){}})},Alert:{alert:(...args)=>alerts.push(args)}};
const market={quotes:[],catalog:[],unresolvedSymbols:[],marketDataVersion:1,lastSuccessAt:null,setTrackedSymbols(){}};
const cache=new Map();
function load(file){file=path.resolve(file);if(cache.has(file))return cache.get(file);const m={exports:{}};cache.set(file,m.exports);
 const compiled=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText;
 const req=id=>{
  if(id==='react')return react;if(id==='react/jsx-runtime')return require(id);if(id==='react-native')return rn;
  if(id.endsWith('/EditableNative'))return {Text:rn.Text,TextInput:rn.TextInput,Pressable:rn.Pressable};
  if(id==='@react-native-async-storage/async-storage')return {default:externalStorage,__esModule:true};
  if(id.endsWith('/MarketRuntime'))return {useMarketRuntime:()=>market};
  if(id.endsWith('/FinanceRuntime')&&file.endsWith('DividendScreen.tsx'))return {useFinance:()=>ctx};
  if(id.endsWith('/SettingsRuntime'))return {useSettingsRuntime:()=>({prefs:{display:{fontScale:1,amountDecimals:0,percentDecimals:2,thousandsSeparator:true,dateFormat:'YYYY-MM-DD'},ai:{enabled:true},dividendCalendar:{showLastBuyDate:false,showExDate:false,showRecordDate:false,showPaymentDate:false,showStatus:true}}})};
  if(id.endsWith('/AiNewsRuntime'))return {useAiNewsRuntime:()=>({items:[]})};
  if(id.endsWith('/aiAssistant'))return {answerAiQuestion(){throw Error('AI should be idle');}};
  if(id.includes('/components/')){const name=path.basename(id);return {[name]:name};}
  if(id.startsWith('.')){const p=path.resolve(path.dirname(file),id);for(const ext of ['.ts','.tsx','.js'])if(fs.existsSync(p+ext))return load(p+ext);}
  return require(id);
 };
 new Function('require','module','exports','Date','setInterval','clearInterval',compiled)(req,m,m.exports,TestDate,()=>0,()=>{});cache.set(file,m.exports);return m.exports;
}
const finance=load('src/finance/FinanceRuntime.tsx');
const helpers=load('src/dividend/dividendPlans.ts');
const tick=()=>new Promise(r=>setImmediate(r));
let financeHost=newHost();
async function renderFinance(){host=financeHost;ctx=host.run(()=>finance.FinanceProvider({children:null})).props.value;await tick();host=financeHost;ctx=host.run(()=>finance.FinanceProvider({children:null})).props.value;await tick();return ctx;}
function nodes(node){if(!node||typeof node!=='object')return [];if(Array.isArray(node))return node.flatMap(nodes);if(node.type==='Modal'&&!node.props.visible)return [];return [node,...nodes(node.props?.children),...nodes(node.props?.actions),...(node.props?.frames??[]).flatMap(f=>nodes(f.element))];}
const text=node=>nodes(node).filter(n=>n.type==='Text').flatMap(n=>n.props.children).join('');

(async()=>{
 await renderFinance();
 const date='2026-10-08';
 for(let i=0;i<7;i++){
  const plan={id:'agenda'+i,symbol:'005'+i,name:'事件標的'+i,status:'forecast',paymentDate:'2026-11-01',lastBuyDate:'2026-10-07',exDate:date,recordDate:date,perShareAmount:null,sharesHeld:null,note:''};
  assert.equal(ctx.applyDividendPlan({type:'save',plan}),undefined);await renderFinance();
 }
 const before=JSON.stringify(ctx.entries),cash=ctx.snapshot.cashBalance;
 const screen=load('src/screens/DividendScreen.tsx');const screenHost=newHost();
 function render(){host=screenHost;return host.run(()=>screen.DividendScreen());}
 let tree=render();
 const find=id=>nodes(tree).find(n=>n.props.editorId===id);
 assert.equal(find('native:DividendScreen:eventDetailCount:16').props.children,'14 項');
 assert.equal(nodes(tree).filter(n=>n.props.editorId==='native:DividendScreen:eventSymbol:18').length,14);
 assert.ok(text(tree).includes('今日股息大事記'));
 // All month dots are hidden, yet agenda remains complete.
 assert.ok(!nodes(tree).some(n=>n.props.editorId==='native:DividendScreen:moreEvents:13'));
 nodes(tree).find(n=>n.props.accessibilityLabel?.startsWith('2026-10-09，')).props.onPress();tree=render();
 assert.equal(find('native:DividendScreen:eventDetailCount:16').props.children,'無事件');
 find('native:DividendScreen:agendaToday:97').props.onPress();tree=render();
 assert.equal(find('native:DividendScreen:eventDetailCount:16').props.children,'14 項');
 assert.equal(JSON.stringify(ctx.entries),before);assert.equal(ctx.snapshot.cashBalance,cash);
 console.log('V4.0.62 actual DividendScreen: unfiltered complete agenda, day navigation, Today action and forecast cash isolation PASS');
})().catch(error=>{console.error(error);process.exitCode=1;});
