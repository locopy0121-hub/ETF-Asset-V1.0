const assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),ts=require('typescript'),React=require('react'),{create,act}=require('react-test-renderer');
global.IS_REACT_ACT_ENVIRONMENT=true;
let resolveOld;const oldRequest=new Promise(r=>{resolveOld=r;});
const profile=symbol=>({symbol,fetchedAt:1,fields:{english:{value:'English '+symbol,source:'TWSE',sourceUrl:'https://openapi.twse.com.tw/v1/opendata/t187ap47_L',asOf:'2026-10-12'},strategy:{value:'測試策略',source:'TWSE',sourceUrl:'https://openapi.twse.com.tw/v1/opendata/t187ap47_L',asOf:null}}});
let force=false;
function load(file){const m={exports:{}};const req=id=>{
 if(id==='react-native')return {View:'View',Pressable:'Pressable',Text:'Text',Linking:{openURL:async()=>{}},StyleSheet:{create:x=>x}};
 if(id.endsWith('/EditableNative'))return {Pressable:'Pressable',Text:'Text'};
 if(id.endsWith('/MarketEditableContent'))return {MarketEditableText:({children,...props})=>React.createElement('Text',props,children),MarketPreviewActionGuard:({children})=>children};
 if(id.endsWith('/ThemeRuntime'))return {useThemeRuntime:()=>({palette:{}})};
 if(id.endsWith('/useSystemColors'))return {useSystemColors:()=>({})};
 if(id.endsWith('/EtfBasicProfileService'))return {loadEtfBasicProfile:async(symbol,refresh)=>{force=refresh;if(symbol==='00406A')return oldRequest;return {profile:profile(symbol),warning:null};}};
 if(id.startsWith('.'))return require(path.resolve(path.dirname(file),id)+'.ts');return require(id);
 };new Function('require','module','exports',ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText)(req,m,m.exports);return m.exports;}
(async()=>{
 const {EtfBasicProfileContent}=load('src/components/EtfBasicProfileContent.tsx');let ui;
 await act(async()=>{ui=create(React.createElement(EtfBasicProfileContent,{symbol:'00406A',market:'TWSE'}));});
 await act(async()=>ui.update(React.createElement(EtfBasicProfileContent,{symbol:'0050',market:'TWSE'})));
 const text=()=>ui.root.findAllByType('Text').map(t=>t.children.join('')).join('\n');
 assert.match(text(),/English 0050/);assert.match(text(),/投資策略/);assert.match(text(),/總管理費用/);assert.doesNotMatch(text(),/董事長|資本額/);
 await act(async()=>resolveOld({profile:profile('00406A'),warning:null}));assert.doesNotMatch(text(),/English 00406A/,'late profile must not cross symbols');
 await act(async()=>ui.root.findByProps({accessibilityLabel:'更新 ETF 基本資料'}).props.onPress());assert.equal(force,true);
 await act(async()=>ui.update(React.createElement(EtfBasicProfileContent,{symbol:'006208',market:'TWSE'})));assert.equal(force,false,'switching symbols must not inherit the manual refresh flag');
 await act(async()=>ui.update(React.createElement(EtfBasicProfileContent,{symbol:'0050',market:'TWSE'})));assert.equal(force,false,'returning to a previously refreshed symbol must use its cache');
 await act(async()=>ui.unmount());
 const {EtfConstituentChangeNotice}=load('src/components/EtfConstituentChangeNotice.tsx');
 const old={symbol:'0050',asOf:'2026-10-09',source:'元大投信',sourceUrl:'https://www.yuantaetfs.com/product/detail/0050/ratio',complete:true,fetchedAt:1,rows:[{symbol:'2330',name:'測試舊成分',weight:20}]};
 const snapshot={...old,asOf:'2026-10-12',previous:old,rows:[{symbol:'2454',name:'測試新成分',weight:10}]};
 await act(async()=>{ui=create(React.createElement(EtfConstituentChangeNotice,{snapshot}));});
 assert.match(text(),/新增 1 檔/);assert.match(text(),/移除 1 檔/);assert.match(text(),/替換配對與生效日期尚待官方公告確認/);
 await act(async()=>ui.update(React.createElement(EtfConstituentChangeNotice,{snapshot:{...snapshot,complete:false}})));
 assert.match(text(),/部分揭露/);assert.doesNotMatch(text(),/新增 1 檔/);await act(async()=>ui.unmount());
 console.log('Actual ETF UI fields / manual refresh / late-symbol guard / addition-removal notices / partial-data guard PASS');
})().catch(e=>{console.error(e);process.exitCode=1});
