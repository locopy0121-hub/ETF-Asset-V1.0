const assert=require('node:assert/strict');
const fs=require('node:fs'),ts=require('typescript'),React=require('react');
const original=fs.readFileSync('src/components/CardContentPreviewSelector.tsx','utf8');
const compiled=ts.transpileModule(original,{compilerOptions:{
  module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022,
}}).outputText;
const mocks={Text:'EditableText',Input:'EditableInput',Button:'EditablePressable',
  NativeText:'NativeText',NativeInput:'NativeInput',NativeButton:'NativePressable',Tile:'MetricTile'};
const mockRequire=id=>{
  if(id==='react'||id==='react/jsx-runtime')return require(id);
  if(id==='react-native')return {View:'View',Pressable:mocks.NativeButton,Text:mocks.NativeText,TextInput:mocks.NativeInput};
  if(id==='./EditableNative')return {Text:mocks.Text,TextInput:mocks.Input,Pressable:mocks.Button,
    plainText:value=>typeof value==='string'?value:''};
  if(id==='./MetricTile')return {MetricTile:mocks.Tile};
  if(id==='./AiQuestionBox')return {AiQuestionBox:'AiQuestionBox'};
  throw Error('unexpected '+id);
};
const moduleObj={exports:{}};
new Function('require','module','exports',compiled)(mockRequire,moduleObj,moduleObj.exports);
const {listCardContentItems,readCardStaticText,applyCardContentAppearance,selectCardContentPreview}=moduleObj.exports;
const h=(type,props,...children)=>React.createElement(type,props,...children);
let called=0;
const button=h(mocks.Button,{editorId:'native:action:1',accessibilityLabel:'查看成分',onPress:()=>{called++;}},
  h(mocks.Text,{editorId:'native:action-label:2',editorReadOnly:false},'查看成分說明'));
const protectedCaption=h(mocks.Text,{editorReadOnly:false},'即時 ',
  h(mocks.NativeText,{editorReadOnly:true},'12,345'),' 點');
const pureCaption=h(mocks.Text,{editorReadOnly:false},'資料 ',
  h(mocks.NativeText,{editorReadOnly:false},'日期'));
const root=h('View',null,button,protectedCaption,pureCaption);
const list=listCardContentItems(root,'root/market');
const action=list.find(x=>x.kind==='button');
const buttonText=list.find(x=>x.label.includes('查看成分說明'));
const protectedText=list.find(x=>x.label.includes('即時'));
const plainText=list.find(x=>x.label.includes('資料 日期'));
assert.ok(action&&buttonText&&protectedText&&plainText,'container and captions must all be listed');
assert.notEqual(action.id,buttonText.id,'caption must have its own saved appearance key');
assert.equal(buttonText.kind,'text');
assert.equal(protectedText.kind,'value','nested readonly number protects entire parent copy');
assert.equal(readCardStaticText(root,protectedText.id,'root/market'),null);
assert.equal(readCardStaticText(root,buttonText.id,'root/market'),'查看成分說明');
const overrides={
  [buttonText.id]:{labelText:'更新後按鈕文字',fontSize:19},
  [protectedText.id]:{labelText:'錯誤覆寫報價'},
  [plainText.id]:{labelText:'已編輯資料日期'},
};
const nodes=node=>Array.isArray(node)?node.flatMap(nodes):
  node&&typeof node==='object'?[node,...React.Children.toArray(node.props?.children).flatMap(nodes)]:[];
const actual=nodes(applyCardContentAppearance(root,overrides,'root/market'));
assert.ok(actual.some(x=>x.type===mocks.Text&&x.props.children==='更新後按鈕文字'));
assert.ok(actual.some(x=>x.type===mocks.Text&&x.props.children==='已編輯資料日期'));
const liveParent=actual.find(x=>x.type===mocks.Text&&Array.isArray(x.props.children)&&x.props.children.includes('即時 '));
assert.ok(liveParent&&nodes(liveParent).some(x=>x.props?.children==='12,345'),'nested readonly price must remain original');
assert.equal(actual.find(x=>x.type===mocks.Button).props.onPress,button.props.onPress,
  'original production action must remain intact');
let selected=[];
const preview=nodes(selectCardContentPreview(root,x=>selected.push(x),null,overrides,'root/market'));
assert.ok(preview.some(x=>x.type===mocks.Text&&x.props.children==='更新後按鈕文字'));
assert.ok(!preview.some(x=>x.type===mocks.Text&&x.props.children==='錯誤覆寫報價'));
const inert=preview.find(x=>x.type===mocks.Button);
assert.equal(inert.props.disabled,true);assert.equal(inert.props.onPress,undefined);
assert.equal(called,0);
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
const app=JSON.parse(fs.readFileSync('app.json','utf8')).expo;
assert.match(pkg.version,/^5\.0\.\d+$/);assert.ok(Number(pkg.version.split('.')[2])>=13);
assert.equal(app.version,pkg.version);
assert.equal(app.android.versionCode,50000+Number(pkg.version.split('.')[2]));
assert.equal(app.ios.buildNumber,String(app.android.versionCode));
console.log('V5.0.13 nested button captions and readonly quote copy isolation PASS');
