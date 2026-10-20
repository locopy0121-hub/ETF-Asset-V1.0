const assert=require('node:assert/strict');
const fs=require('node:fs');
const ts=require('typescript');
const React=require('react');
const {act,create}=require('react-test-renderer');
global.IS_REACT_ACT_ENVIRONMENT=true;

// Use real React state, effects, and element reconciliation, but no Android emulator.
let responderCreates=0;
const fakeNative={
 View:'View',Text:'Text',Pressable:'Pressable',Modal:'Modal',ScrollView:'ScrollView',
 StyleSheet:{hairlineWidth:1,create:styles=>styles},
 PanResponder:{create:handlers=>{
   responderCreates++;
   return {panHandlers:{
     onResponderGrant:handlers.onPanResponderGrant,
     onResponderMove:handlers.onPanResponderMove,
   }};
 }},
};
const display={profitColorMode:'red-up-green-down',gainColor:'#EF4444',lossColor:'#10B981',neutralColor:'#64748B'};
const dependencies={
 react:React,'react/jsx-runtime':require('react/jsx-runtime'),
 'react-native':fakeNative,
 '../settings/SettingsRuntime':{useSettingsRuntime:()=>({prefs:{display}})},
 '../settings/systemColorPalette':{buildSystemColorChoices:settings=>[
   {key:'gain',label:'系統上漲色',color:settings.gainColor},
   {key:'loss',label:'系統下跌色',color:settings.lossColor},
   {key:'neutral',label:'系統中性色',color:settings.neutralColor},
 ]},
 '../theme/tokens':{colors:{},radius:{md:8,pill:40},spacing:{lg:14}},
};
const raw=fs.readFileSync('src/components/ColorPalettePicker.tsx','utf8');
const code=ts.transpileModule(raw,{compilerOptions:{
 module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,
}}).outputText;
const mod={exports:{}};
new Function('require','module','exports',code)(name=>{
 assert.ok(Object.hasOwn(dependencies,name),'unexpected dependency '+name);
 return dependencies[name];
},mod,mod.exports);
const {ColorPaletteProvider,ColorPalettePicker}=mod.exports;
let saved=display.gainColor;
let savedCount=0;
const save=value=>{saved=value;savedCount++;};
const UI=(tick,value)=>React.createElement(ColorPaletteProvider,null,
 React.createElement(ColorPalettePicker,{label:'獲利 / 上漲色',value,onChange:save}),
 React.createElement('Text',null,'tick-'+tick)
);
let screen;
const findText=title=>{
 const text=screen.root.findAllByType('Text').find(x=>x.props.children===title);
 assert.ok(text,'missing text '+title);
 return text;
};
const press=title=>{const text=findText(title);assert.equal(text.parent.type,'Pressable');act(()=>text.parent.props.onPress());};
const modals=()=>screen.root.findAllByType('Modal');
const selectedCell=color=>screen.root.findAllByType('Pressable').find(x=>
 x.props.accessibilityRole==='button'&&Array.isArray(x.props.style)&&
 x.props.style.some(style=>style?.backgroundColor===color));
(async()=>{
 await act(async()=>{screen=create(UI(0,saved));});
 assert.equal(modals().length,0,'picker must start closed');
 press('開啟調色盤');
 assert.equal(modals().length,1,'tap must show native modal');
 const scroll=screen.root.findAllByType('ScrollView');
 assert.equal(scroll.length,1,'color picker must provide a scrollable body on small displays');
 assert.equal(scroll[0].props.style.flex,1,'picker scroll viewport must use available height');
 assert.ok(scroll[0].props.contentContainerStyle.paddingBottom>=32,'brightness bar must clear system navigation area');
 assert.equal(scroll[0].props.contentContainerStyle.flex,undefined,'scroll content cannot use flex:1 or clipping persists');
 await act(async()=>{screen.update(UI(1,saved));});
 assert.equal(modals().length,1,'market-triggered parent rerender must not dismiss modal');

 // Confirm uses the selected swatch and must commit exactly once.
 press('經典');
 const chosen=selectedCell('#FCA5A5');
 assert.ok(chosen,'classic color must be rendered');
 act(()=>chosen.props.onPress());
 press('完成');
 assert.equal(saved,'#FCA5A5');
 assert.equal(savedCount,1);
 assert.equal(modals().length,0,'done must close modal');

 // Cancel must discard the draft and preserve saved preferences.
 await act(async()=>{screen.update(UI(2,saved));});
 press('開啟調色盤');
 press('經典');
 act(()=>selectedCell('#0F172A').props.onPress());
 press('取消');
 assert.equal(saved,'#FCA5A5');
 assert.equal(savedCount,1);
 assert.equal(modals().length,0);

 // Gesture responder must remain identical during continuous HSV updates.
 press('開啟調色盤');
 const getWheel=()=>screen.root.findAllByType('View').find(x=>typeof x.props.onResponderMove==='function');
 let wheel=getWheel();
 assert.ok(wheel,'wheel drag surface missing');
 act(()=>wheel.props.onLayout({nativeEvent:{layout:{width:240}}}));
 wheel=getWheel();
 const drag=wheel.props.onResponderMove;
 const baseline=responderCreates;
 act(()=>drag({nativeEvent:{locationX:0,locationY:120}}));
 assert.strictEqual(getWheel().props.onResponderMove,drag,'re-render must not replace active drag responder');
 assert.equal(responderCreates,baseline,'HSV update must not create a new PanResponder');
 act(()=>drag({nativeEvent:{locationX:120,locationY:240}}));
 assert.strictEqual(getWheel().props.onResponderMove,drag,'second drag frame must stay on same responder');
 assert.equal(responderCreates,baseline);
 press('完成');
 assert.ok(/^#[0-9A-F]{6}$/.test(saved));
 assert.equal(savedCount,2);

 // Android hardware back should cancel a draft without persisting.
 press('開啟調色盤');
 act(()=>modals()[0].props.onRequestClose());
 assert.equal(modals().length,0);
 assert.equal(savedCount,2);
 await act(async()=>screen.unmount());
 console.log('V5.0.33 actual React palette open/rerender/confirm/cancel/back/drag lifecycle PASS');
})().catch(error=>{console.error(error);process.exitCode=1;});
