// Exercise the actual HoldingQuoteCollection JSX, state and measured Android viewport.
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),ts=require('typescript'),React=require('react');
let cursor=0,states=[],screenWidth=420;
const react={...React,useState(initial){const i=cursor++;if(!(i in states))states[i]=typeof initial==='function'?initial():initial;
 return [states[i],change=>{states[i]=typeof change==='function'?change(states[i]):change;}];}};
const cache=new Map();
function load(file){
 file=path.resolve(file);if(cache.has(file))return cache.get(file);
 const m={exports:{}};const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText;
 function req(id){
  if(id==='react')return react;
  if(id==='react/jsx-runtime')return require(id);
  if(id==='react-native')return {ScrollView:'ScrollView',View:'View',Text:'Text',useWindowDimensions:()=>({width:screenWidth,height:900}),StyleSheet:{create:x=>x}};
  if(id.endsWith('/financialTone'))return {financialTone:()=> 'flat'};
  if(id.endsWith('/HoldingQuoteTicker'))return {HoldingQuoteTicker:'HoldingQuoteTicker'};
  if(id.endsWith('/HoldingQuoteModule'))return {HoldingQuoteModule:'HoldingQuoteModule'};
  if(id.endsWith('/InspectableTarget'))return {InspectableTarget:'InspectableTarget'};
  if(id.endsWith('/inspectionModel'))return {TARGET_APPEARANCE:{}};
  if(id.endsWith('/MaintenanceRuntime'))return {useMaintenance:()=>({enabled:false})};
  if(id.endsWith('/uiModels'))return {DEFAULT_HOLDING_WALL_CONFIG:{style:{},fields:[],ticker:{enabled:false}}};
  if(id.endsWith('/etfBadges'))return {DEFAULT_ETF_BADGES:{order:[]}};
  if(id.endsWith('/tokens'))return {spacing:{sm:8,md:16}};
  if(id.startsWith('.')){const q=path.resolve(path.dirname(file),id);for(const ext of ['.ts','.tsx'])if(fs.existsSync(q+ext))return load(q+ext);}
  return require(id);
 }
 new Function('require','module','exports',code)(req,m,m.exports);cache.set(file,m.exports);return m.exports;
}
const {HoldingQuoteCollection}=load('src/components/HoldingQuoteCollection.tsx');
const items=[{symbol:'2330',name:'台積電',price:110,previousClose:100,pnl:0},{symbol:'0050',name:'元大台灣50',price:150,previousClose:148,pnl:0}];
function nodes(node){if(!node||typeof node!=='object')return [];return [node,...React.Children.toArray(node.props?.children).flatMap(nodes)];}
function render(layoutMode='horizontal'){cursor=0;return HoldingQuoteCollection({rows:items,style:'quote',layoutMode,onOpenHolding:()=>{}});}
function scroll(tree,id){const x=nodes(tree).find(n=>n.props?.testID===id);assert.ok(x,id+' exists');return x;}
let root=render(),sc=scroll(root,'holding-home-horizontal');
assert.equal(sc.props.snapToInterval,314,'initial pre-measure width uses existing screen fallback');
assert.equal(React.Children.toArray(sc.props.children)[0].props.style.width,306);
sc.props.onLayout({nativeEvent:{layout:{width:280}}});
root=render();sc=scroll(root,'holding-home-horizontal');
assert.equal(React.Children.toArray(sc.props.children)[0].props.style.width,262,'holding card follows measured 280px viewport');
assert.equal(sc.props.snapToInterval,270,'snap step follows 262px card plus 8px gap');
sc.props.onLayout({nativeEvent:{layout:{width:340}}});root=render();sc=scroll(root,'holding-home-horizontal');
assert.equal(React.Children.toArray(sc.props.children)[0].props.style.width,322,'resizing remeasures holdings');
assert.equal(sc.props.snapToInterval,330,'snap follows new size');
sc.props.onLayout({nativeEvent:{layout:{width:0}}});root=render();sc=scroll(root,'holding-home-horizontal');
assert.equal(sc.props.snapToInterval,330,'invalid measure never breaks prior valid width');
screenWidth=480;root=render();sc=scroll(root,'holding-home-horizontal');
assert.equal(sc.props.snapToInterval,330,'measured width wins over changed screen dimensions');
root=render('paged2');
let view=nodes(root).find(n=>n.props?.style?.overflow==='hidden'&&typeof n.props.onLayout==='function');
assert.ok(view,'original paged2 measured viewport remains intact');
view.props.onLayout({nativeEvent:{layout:{width:320}}});root=render('paged2');
const paged=nodes(root).find(n=>n.type==='ScrollView'&&n.props.pagingEnabled);
assert.equal(paged.props.snapToInterval,320,'paged2 regression uses exact measured width');
assert.equal(items.length,2,'presentation never modifies holdings');
console.log('V5.0.24 actual HoldingQuoteCollection horizontal measurement, resize, invalid width and paged2 PASS');
