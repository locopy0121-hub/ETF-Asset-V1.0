const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
let linkedCalls=[];
let display={profitColorMode:'red-up-green-down',gainColor:'#123456',lossColor:'#654321',neutralColor:'#ABCDEF'};
const React=require('react');
const react={...React,useState:v=>[v,()=>{}],useRef:v=>({current:v}),useEffect:()=>{},useMemo:f=>f()};
const flatten=s=>Array.isArray(s)?Object.assign({},...s.map(flatten)):s||{};
const rn={Text:'Text',View:'View',Pressable:'Pressable',ScrollView:'ScrollView',StyleSheet:{create:x=>x,flatten,hairlineWidth:1,absoluteFill:{}},PanResponder:{create:()=>({panHandlers:{}})},Easing:{linear:x=>x},Animated:{Text:'Text',View:'View',Value:class{stopAnimation(){} setValue(){} interpolate(){return 1;}},timing:()=>({}),sequence:()=>({start(){},stop(){}}),loop:x=>x}};
function load(file){
 file=path.resolve(file);let result={exports:{}};
 const src=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText;
 const req=id=>{
  if(id==='react')return react;
  if(id==='react/jsx-runtime')return require(id);
  if(id==='react-native')return rn;
  if(id.endsWith('/workspaceModel')){const actual=load('src/maintenance/workspaceModel.ts');return {...actual,linkedColor:(...args)=>{const result=actual.linkedColor(...args);linkedCalls.push({args,result});return result;}};}
  if(id.endsWith('/SettingsRuntime'))return {useSettingsRuntime:()=>({prefs:{display}})};
  if(id.endsWith('/ThemeRuntime'))return {THEME_BACKGROUNDS:[],useThemeRuntime:()=>({palette:{gain:'#EF4444',loss:'#10B981',text:'#000000',textSecondary:'#888888',surfaceMuted:'#FFFFFF',surface:'#FFFFFF',border:'#000000',primary:'#0066FF'}})};
  if(id.endsWith('/TargetSurfaceEffects'))return {TargetBackdrop:()=>null,targetShadowStyle:()=>({})};
  if(id.endsWith('/DashboardEditableContent'))return {DashboardEditableText:({children,style})=>React.createElement('Text',{style},children)};
  if(id.endsWith('/LayoutSelectionContext'))return {useLayoutRuntime:()=>({targets:{},active:false})};
  if(id.endsWith('/EtfBadgeRow'))return {EtfBadgeRow:()=>null};
  if(id.startsWith('.')){let p=path.resolve(path.dirname(file),id);for(const ext of ['.ts','.tsx','.js'])if(fs.existsSync(p+ext))return load(p+ext);}
  return require(id);
 };
 new Function('require','module','exports',src)(req,result,result.exports);return result.exports;
}
function texts(node){if(node==null||typeof node!=='object')return [];if(Array.isArray(node))return node.flatMap(texts);if(typeof node.type==='function')return texts(node.type(node.props));return [...(node.type==='Text'?[{text:node.props.children,color:flatten(node.props.style).color}]:[]),...texts(node.props?.children)];}
const matches=(actual,expected)=>actual.toUpperCase().startsWith(expected.toUpperCase())||actual===`rgba(${parseInt(expected.slice(1,3),16)},${parseInt(expected.slice(3,5),16)},${parseInt(expected.slice(5,7),16)},1.000)`;


const frame=load('src/components/FrameCard.tsx').FrameCard;
const rgb=c=>c.startsWith('#')?c.slice(1,7).toUpperCase():c.match(/^rgba?\((\d+),(\d+),(\d+)/)?.slice(1).map(n=>Number(n).toString(16).padStart(2,'0')).join('').toUpperCase();
const fx={backgroundMode:'gradient',gradientMidEnabled:true,gradientEndProfitColor:true,gradientMidProfitColor:true,maskProfitColor:true,maskOpacity:.5,shadowProfitColor:true,shadowSpreadEnabled:true,glowEnabled:true,glowProfitColor:true,outerGlowEnabled:true,outerGlowProfitColor:true,blinkEnabled:true,blinkProfitColor:true,borderGradientEnabled:true,borderGradientStartProfitColor:true,borderGradientEndProfitColor:true};
const editorStyle={backgroundColor:'#FEDCBA',backgroundProfitColor:true,borderColor:'#FEDCBA',borderProfitColor:true,borderWidth:1,titleColor:'#FEDCBA',titleProfitColor:true,shadowEnabled:true,effects:fx};
function nodes(n){if(!n||typeof n!=='object')return [];if(Array.isArray(n))return n.flatMap(nodes);return [n,...nodes(n.props?.children)];}
for(const mode of ['red-up-green-down','green-up-red-down'])for(const tone of ['gain','loss','neutral']){
 display={...display,profitColorMode:mode};linkedCalls=[];
 const tree=frame({title:'實際損益',tone,editorStyle});
 const expected=tone==='neutral'?'#ABCDEF':(tone==='gain')===(mode==='red-up-green-down')?'#123456':'#654321';
 assert.equal(linkedCalls.length,12,'all frame color inputs are covered');
 for(const call of linkedCalls){assert.equal(call.args[2],tone);assert.equal(rgb(call.result),rgb(expected));}
 const style=flatten(tree.props.style);assert.equal(rgb(style.borderColor),rgb(expected));assert.equal(rgb(style.shadowColor),rgb(expected));
 const title=texts(tree).find(n=>n.text==='實際損益');assert.equal(rgb(title.color),rgb(expected));
 const bands=nodes(tree).filter(n=>n.key&&/^shadow-spread-|^outer-glow-|^border-gradient-/.test(n.key));assert.ok(bands.length>0);
 for(const node of bands)assert.equal(rgb(flatten(node.props.style).borderColor),rgb(expected));
 const gradient=nodes(tree).filter(n=>flatten(n.props.style).flex===1&&flatten(n.props.style).backgroundColor);assert.equal(gradient.length,16);for(const n of gradient)assert.equal(rgb(flatten(n.props.style).backgroundColor),rgb(expected));
 const mask=nodes(tree).find(n=>flatten(n.props.style).backgroundColor?.endsWith(',0.500)'));assert.ok(mask);assert.equal(rgb(flatten(mask.props.style).backgroundColor),rgb(expected));
 const solid=frame({title:'S',tone,editorStyle:{...editorStyle,effects:{...fx,backgroundMode:'solid'}}});assert.equal(rgb(flatten(solid.props.style).backgroundColor),rgb(expected));
}
// Each independent switch must preserve the user's fixed color when disabled.
for(const [section,flag] of [['base','backgroundProfitColor'],['base','borderProfitColor'],['base','titleProfitColor'],...Object.keys(fx).filter(k=>k.endsWith('ProfitColor')).map(k=>['fx',k])]){
 const props=section==='base'?{...editorStyle,[flag]:false}:{...editorStyle,effects:{...fx,[flag]:false}};
 linkedCalls=[];frame({title:'F',tone:'gain',editorStyle:props});const fixed=linkedCalls.filter(c=>c.args[1]===false);assert.equal(fixed.length,1);assert.equal(fixed[0].result,fixed[0].args[0]);
}
linkedCalls=[];frame({title:'非金融框架',editorStyle});assert.ok(linkedCalls.every(c=>c.args[2]==='neutral'));
console.log('Actual FrameCard 12 color inputs / live two modes / gain loss neutral / gradient mask shadow glow blink / independent fixed switches PASS');
