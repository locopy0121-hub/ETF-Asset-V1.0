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
  if(id.endsWith('/SettingsRuntime'))return {useSettingsRuntime:()=>({prefs:{display:{fontScale:1,amountDecimals:0,percentDecimals:2,thousandsSeparator:true,dateFormat:'YYYY-MM-DD'},ai:{enabled:true},dividendCalendar:{showLastBuyDate:true,showExDate:true,showRecordDate:true,showPaymentDate:true,showStatus:true}}})};
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
 await renderFinance();assert.equal(ctx.hydrated,true);
 assert.equal(typeof ctx.applyDividendPlan,'function');
 const plan={id:'p1',symbol:'0050',name:'元大台灣50',status:'forecast',paymentDate:'2026-10-15',lastBuyDate:'',exDate:'2026-10-01',recordDate:'',perShareAmount:2,sharesHeld:100,note:'公告'};
 assert.equal(ctx.applyDividendPlan({type:'save',plan}),undefined);await renderFinance();assert.equal(ctx.snapshot.cashBalance,0);assert.equal(JSON.parse(storage.get('@tf-asset/v1.0.2-ledger')).dividendPlans.length,1);
 assert.equal(ctx.applyDividendPlan({type:'confirm',id:'p1'}),undefined);await renderFinance();assert.ok(ctx.applyDividendPlan({type:'post',id:'p1'}));assert.equal(ctx.entries.length,0);
 clock=Date.parse('2026-10-15T04:00:00Z');
 assert.equal(ctx.applyDividendPlan({type:'post',id:'p1'}),undefined);await renderFinance();assert.equal(ctx.snapshot.cashBalance,190);assert.equal(ctx.entries.length,1);
 ctx.applyDividendPlan({type:'post',id:'p1'});await renderFinance();assert.equal(ctx.entries.length,1);
 assert.equal(ctx.addDividend({id:'different-amount',kind:'dividend',symbol:'0050',name:'ETF',date:'2026-10-15',sharesHeld:99,perShareAmount:2}),false);await renderFinance();assert.equal(ctx.entries.length,1);
 financeHost=newHost();await renderFinance();assert.equal(ctx.snapshot.cashBalance,190);assert.equal(helpers.dividendPlanStatus(ctx.dividendPlans[0],ctx.entries),'paid');
 assert.equal(ctx.addDividend({id:'future',kind:'dividend',symbol:'0050',name:'ETF',date:'2026-10-16',sharesHeld:100,perShareAmount:2}),false);await renderFinance();assert.equal(ctx.entries.length,1);
 ctx.clearFinance();await renderFinance();assert.equal(ctx.dividendPlans.length,0);
 ctx.addTrade({id:'b1',kind:'buy',symbol:'0050',name:'元大台灣50',date:'2026-09-01',shares:100,price:10,tradeMode:'ROUND_LOT'});await renderFinance();
 const cashBefore=ctx.snapshot.cashBalance;
 const screen=load('src/screens/DividendScreen.tsx').DividendScreen,screenHost=newHost();
 const render=()=>{host=screenHost;return host.run(screen);};
 let tree=render();const find=(predicate)=>{const node=nodes(tree).find(predicate);assert.ok(node,'UI control not found');return node;};
 find(n=>n.props.accessibilityLabel==='新增股息').props.onPress();tree=render();
 const symbolInput=()=>find(n=>n.type==='TextInput'&&n.props.placeholder==='例如 0050');
 assert.equal(find(n=>n.type==='TextInput'&&n.props.placeholder==='ETF 名稱').props.value,'元大台灣50');
 symbolInput().props.onChangeText('9999');tree=render();assert.equal(find(n=>n.type==='TextInput'&&n.props.placeholder==='ETF 名稱').props.value,'');assert.equal(nodes(tree).filter(n=>n.type==='TextInput'&&n.props.placeholder==='0').at(-1).props.value,'');
 symbolInput().props.onChangeText('0050');tree=render();
 find(n=>n.props.accessibilityLabel==='登錄股息預告').props.onPress();tree=render();
 find(n=>n.props.accessibilityLabel==='選擇股息配發／入帳日').props.onPress();tree=render();find(n=>n.type==='CalendarDatePickerModal').props.onChange('2026-10-20');tree=render();
 nodes(tree).filter(n=>n.type==='TextInput'&&n.props.placeholder==='0')[0].props.onChangeText('2');tree=render();
 const save=find(n=>n.type==='Pressable'&&text(n)==='儲存股息預告');assert.equal(save.props.disabled,false);save.props.onPress();await renderFinance();tree=render();assert.equal(ctx.dividendPlans.length,1);assert.equal(ctx.snapshot.cashBalance,cashBefore);assert.equal(ctx.entries.filter(e=>e.kind==='dividend').length,0);
 const persisted=JSON.parse(storage.get('@tf-asset/v1.0.2-ledger'));assert.equal(persisted.dividendPlans[0].paymentDate,'2026-10-20');
 find(n=>n.props.accessibilityLabel==='確認股息預告 0050').props.onPress();await renderFinance();tree=render();assert.equal(ctx.dividendPlans[0].status,'confirmed');
 assert.equal(find(n=>n.props.accessibilityLabel==='入帳股息 0050').props.disabled,true);
 clock=Date.parse('2026-10-20T04:00:00Z');tree=render();find(n=>n.props.accessibilityLabel==='入帳股息 0050').props.onPress();
 alerts.at(-1)[2].find(b=>b.text==='確認入帳').onPress();await renderFinance();tree=render();assert.equal(ctx.entries.filter(e=>e.kind==='dividend').length,1);assert.ok(text(tree).includes('已入帳'));
 const cashAfterReceipt=ctx.snapshot.cashBalance;
 const aiEvent={id:'0056-2026-10-10',symbol:'0056',name:'高股息',exDate:'2026-10-10',lastPurchaseDate:'2026-10-09',recordDate:'',paymentDate:'',perShareAmount:2,eligibleShares:100,estimatedDividend:200,distributionYield:1,status:'待配發',alreadyRecorded:false};
 find(n=>n.type==='AiQuestionBox').props.onAction({kind:'addDividend',event:aiEvent});await renderFinance();tree=render();
 assert.equal(ctx.snapshot.cashBalance,cashAfterReceipt);assert.equal(ctx.dividendPlans.length,2);assert.equal(ctx.dividendPlans[1].paymentDate,'');assert.equal(ctx.dividendPlans[1].sharesHeld,null);
 const aiBefore=JSON.stringify(ctx.dividendPlans[1]);find(n=>n.type==='AiQuestionBox').props.onAction({kind:'addDividend',event:aiEvent});await renderFinance();tree=render();assert.equal(ctx.dividendPlans.length,2);assert.equal(JSON.stringify(ctx.dividendPlans[1]),aiBefore);assert.equal(alerts.at(-1)[0],'未儲存股息預告');
 const backup=load('src/settings/backupDocumentFormat.ts');
 const document=backup.buildBackupDocument({payload:{'@tf-asset/v1.0.2-ledger':storage.get('@tf-asset/v1.0.2-ledger')},history:[],appVersion:'4.0.5',exportedAt:new TestDate().toISOString()});
 assert.equal(JSON.parse(backup.parseBackupDocument(document).payload['@tf-asset/v1.0.2-ledger']).dividendPlans.length,2);
 const bad=JSON.parse(document);const ledger=JSON.parse(bad.payload['@tf-asset/v1.0.2-ledger']);ledger.dividendPlans[0].paymentDate='2026-02-31';bad.payload['@tf-asset/v1.0.2-ledger']=JSON.stringify(ledger);assert.throws(()=>backup.parseBackupDocument(JSON.stringify(bad)));
 const corrupted=[{...plan,paymentDate:'2026-02-31'}];
 const savedLedger=JSON.parse(storage.get('@tf-asset/v1.0.2-ledger'));savedLedger.dividendPlans=corrupted;storage.set('@tf-asset/v1.0.2-ledger',JSON.stringify(savedLedger));financeHost=newHost();await renderFinance();
 assert.ok(ctx.dividendPlanError);assert.ok(ctx.applyDividendPlan({type:'save',plan}));ctx.addOther({id:'cash1',kind:'other',date:'2026-10-20',amount:1,note:'測試現金'});await renderFinance();assert.deepEqual(JSON.parse(storage.get('@tf-asset/v1.0.2-ledger')).dividendPlans,corrupted,'corrupt plan data must be preserved, not overwritten as []');
 console.log('Actual Finance persistence/restart + dividend UI controls + future gate + receipt replay + backup roundtrip PASS');
})().catch(error=>{console.error(error);process.exitCode=1;});
