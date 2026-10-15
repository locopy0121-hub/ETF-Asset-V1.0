const assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),ts=require('typescript'),React=require('react'),{create,act}=require('react-test-renderer');
global.IS_REACT_ACT_ENVIRONMENT=true;
let saved=[];
const initial={enabled:true,start:'09:00',end:'13:30',weekdays:[1,2,3,4,5]};
const bridge={loadMarketUpdateSchedule:async()=>initial,saveMarketUpdateSchedule:async v=>{saved.push(v);return true}};
function load(file){const m={exports:{}};const req=id=>{
 if(id==='react-native')return {View:'View',Text:'Text',TextInput:'TextInput',Pressable:'Pressable',Switch:'Switch',StyleSheet:{create:v=>v}};
 if(id.endsWith('/TfAssetNativeBridge'))return bridge;
 if(id.endsWith('/useThemeRuntime'))return {useThemeRuntime:()=>({palette:{}})};
 if(id.endsWith('/ThemeRuntime'))return {useThemeRuntime:()=>({palette:{}})};
 if(id.startsWith('.'))return load(path.resolve(path.dirname(file),id)+'.ts');return require(id);
};new Function('require','module','exports',ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText)(req,m,m.exports);return m.exports;}
(async()=>{const {MarketUpdateSchedulePanel}=load('src/components/MarketUpdateSchedulePanel.tsx');let ui;
 await act(async()=>{ui=create(React.createElement(MarketUpdateSchedulePanel));});
 const input=label=>ui.root.findByProps({accessibilityLabel:label});
 const save=()=>ui.root.findAllByType('Pressable').find(p=>p.findAllByType('Text').some(t=>t.children.includes('儲存排程')));
 await act(async()=>{input('行情開始時間').props.onChangeText('08:00');});
 await act(async()=>{await save().props.onPress();});assert.equal(saved.length,0);
 await act(async()=>{input('行情開始時間').props.onChangeText('10:00');});
 await act(async()=>{input('行情結束時間').props.onChangeText('12:00');});
 await act(async()=>{await save().props.onPress();});assert.equal(saved.at(-1).start,'10:00');assert.equal(saved.at(-1).end,'12:00');
 await act(async()=>{input('啟用行情排程').props.onValueChange(false);});
 await act(async()=>{await save().props.onPress();});assert.equal(saved.at(-1).enabled,false);
 await act(async()=>ui.unmount());console.log('Actual schedule UI: load/invalid time rejected/custom window save/disable PASS');
})().catch(e=>{console.error(e);process.exitCode=1});
