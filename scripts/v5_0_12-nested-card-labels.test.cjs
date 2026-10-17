const assert=require('node:assert/strict');
const fs=require('node:fs'),ts=require('typescript'),React=require('react');
const file='src/components/CardContentPreviewSelector.tsx';
const source=fs.readFileSync(file,'utf8');
const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText;
const mock={Text:'EditableText',TextInput:'EditableInput',Pressable:'EditablePressable',
  NativeText:'NativeText',NativeInput:'NativeInput',NativePressable:'NativePressable',MetricTile:'MetricTile'};
const load=id=>{
  if(id==='react'||id==='react/jsx-runtime')return require(id);
  if(id==='react-native')return {View:'View',Pressable:mock.NativePressable,Text:mock.NativeText,TextInput:mock.NativeInput};
  if(id==='./EditableNative')return {Text:mock.Text,TextInput:mock.TextInput,Pressable:mock.Pressable,
    plainText:value=>typeof value==='string'?value:''};
  if(id==='./MetricTile')return {MetricTile:mock.MetricTile};
  if(id==='./AiQuestionBox')return {AiQuestionBox:'AiQuestionBox'};
  throw Error('Unexpected '+id);
};
const mod={exports:{}};
new Function('require','module','exports',code)(load,mod,mod.exports);
const {listCardContentItems,readCardStaticText,applyCardContentAppearance,selectCardContentPreview}=mod.exports;
const el=(type,props,...children)=>React.createElement(type,props,...children);
const note=el(mock.Text,{editorReadOnly:false},'ETF ',el(mock.NativeText,{style:{fontWeight:'700'}},'成分說明'));
const live=el(mock.Text,{editorReadOnly:false},'持股數量：',5000,' 股');
const readOnly=el(mock.Text,{editorReadOnly:true},'99.5%');
const card=el('View',null,note,live,readOnly);
const items=listCardContentItems(card,'root/etf-card');
assert.equal(items.length,3,'nested explanation and two value targets are discovered');
const explanation=items.find(i=>i.label.includes('ETF'));
assert.equal(explanation.kind,'text');
assert.equal(readCardStaticText(card,explanation.id,'root/etf-card'),'ETF 成分說明');
const liveId=items.find(i=>i.label.includes('持股數量'));
assert.equal(liveId.kind,'value','dynamic numeric child must not be exposed as editable copy');
const values={[explanation.id]:{labelText:'新的 ETF 成分說明',fontSize:21},
  [liveId.id]:{labelText:'不可更改的假數值'}};
const flatten=node=>Array.isArray(node)?node.flatMap(flatten):
  node&&typeof node==='object'?[node,...React.Children.toArray(node.props?.children).flatMap(flatten)]:[];
const actual=flatten(applyCardContentAppearance(card,values,'root/etf-card'));
assert.ok(actual.find(n=>n.type===mock.Text&&n.props.children==='新的 ETF 成分說明'),
  'saved rich static explanation must be displayed in actual page');
assert.ok(actual.find(n=>n.type===mock.Text&&Array.isArray(n.props.children)&&
  n.props.children.includes(5000)), 'dynamic holding count must remain original');
const picked=[];const preview=flatten(selectCardContentPreview(card,i=>picked.push(i),null,values,'root/etf-card'));
const edited=preview.find(n=>n.type===mock.Text&&n.props.children==='新的 ETF 成分說明');
assert.ok(edited,'editor preview must show exact unsaved rich text replacement');
const selector=preview.find(n=>n.props?.accessibilityLabel==='編輯'+explanation.label);
assert.ok(selector);selector.props.onPress();assert.equal(picked[0].id,explanation.id);
assert.ok(!preview.some(n=>n.type===mock.Text&&n.props.children==='不可更改的假數值'),
  'preview cannot edit dynamic holding values');
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
const app=JSON.parse(fs.readFileSync('app.json','utf8')).expo;
assert.match(pkg.version,/^5\.0\.\d+$/);assert.ok(Number(pkg.version.split('.')[2])>=12);
assert.equal(app.version,pkg.version);
assert.equal(app.android.versionCode,50000+Number(pkg.version.split('.')[2]));
console.log('V5.0.12 nested static copy / dynamic value protection / actual-preview parity PASS');
