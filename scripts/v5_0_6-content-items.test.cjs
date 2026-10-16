const assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript'),React=require('react'),path=require('node:path');
const names={Text:'EditableText',TextInput:'EditableInput',Pressable:'EditablePressable',NativeText:'NativeText',NativeInput:'NativeInput',NativePressable:'NativePressable',MetricTile:'MetricTile'};
const file='src/components/CardContentPreviewSelector.tsx';
const source=fs.readFileSync(file,'utf8');
const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText;
const mod={exports:{}};
const requireMock=id=>{
  if(id==='react'||id==='react/jsx-runtime')return require(id);
  if(id==='react-native')return {View:'View',Pressable:names.NativePressable,Text:names.NativeText,TextInput:names.NativeInput};
  if(id==='./EditableNative')return {Text:names.Text,TextInput:names.TextInput,Pressable:names.Pressable,
    plainText:value=>typeof value==='string'?value:React.Children.toArray(value).filter(x=>typeof x==='string').join('')};
  if(id==='./MetricTile')return {MetricTile:names.MetricTile};
  if(id==='./AiQuestionBox')return {AiQuestionBox:'AiQuestionBox'};
  throw Error('unexpected dependency '+id);
};
new Function('require','module','exports',compiled)(requireMock,mod,mod.exports);
const {listCardContentItems,selectCardContentPreview}=mod.exports;
const create=(type,props,...children)=>React.createElement(type,props,...children);
const originalAction=()=>{throw Error('original financial action must never fire');};
const card=create('View',null,
  create(names.Text,{editorId:'native:Ledger:label:1',editorReadOnly:false,style:{fontSize:12}},'成交股數'),
  create(names.Text,{editorId:'native:Ledger:value:2',editorReadOnly:true},'12345'),
  create(names.Pressable,{editorId:'native:Ledger:submit:3',onPress:originalAction,accessibilityLabel:'正式入帳'},
    create(names.Text,{editorId:'native:Ledger:button:4',editorReadOnly:false},'確認')),
  create(names.TextInput,{editorId:'native:Ledger:input:5',value:'123',onChangeText:originalAction}),
  create(names.MetricTile,{label:'總市值',value:'999999'}),
  create('AiQuestionBox',{onAsk:originalAction}));
const items=listCardContentItems(card);
assert.ok(items.length>=5,'must discover actual text/value/button/input/metric components');
const byLabel=s=>items.find(x=>x.label.includes(s));
assert.ok(byLabel('成交股數')&&byLabel('12345')&&byLabel('正式入帳')&&byLabel('總市值'));
const selected=[];
const preview=selectCardContentPreview(card,target=>selected.push(target),null,{
  [byLabel('成交股數').id]:{fontSize:23,textColor:'#123456'},
});
const nodes=tree=>Array.isArray(tree)?tree.flatMap(nodes):tree&&typeof tree==='object'?[tree,...React.Children.toArray(tree.props?.children).flatMap(nodes)]:[];
const all=nodes(preview);
for(const item of items){
  const selector=all.find(x=>x.props?.accessibilityLabel==='編輯'+item.label);
  assert.ok(selector,'missing tap selector '+item.label);
  selector.props.onPress();
  assert.equal(selected.at(-1).id,item.id);
}
const button=all.find(x=>x.type===names.Pressable);
assert.equal(button?.props.onPress,undefined,'original transaction action must not run');
assert.equal(button?.props.disabled,true,'underlying action must remain inert');
const input=all.find(x=>x.type===names.TextInput);
assert.equal(input?.props.editable,false,'input must not edit the ledger in preview');
const label=all.find(x=>x.type===names.Text&&x.props.children==='成交股數');
assert.equal(label.props.editorSkip,true);
assert.ok(Array.isArray(label.props.style));
assert.equal(label.props.style[1].fontSize,23,'saved font-size must affect preview');
assert.equal(label.props.style[1].color,'#123456','saved text-color must affect preview');
const pkg=JSON.parse(fs.readFileSync('package.json','utf8')),app=JSON.parse(fs.readFileSync('app.json','utf8')).expo;
assert.equal(pkg.version,'5.0.6');assert.equal(app.version,pkg.version);assert.equal(app.android.versionCode,50006);
const workbench=fs.readFileSync('src/components/PageLayoutToolWorkbench.tsx','utf8');
assert.match(workbench,/listCardContentItems/);assert.match(workbench,/selectCardContentPreview/);
assert.match(workbench,/contentItems\.map\(item=>/);
assert.match(workbench,/contentItems\.some\(item=>item\.id===selection\.id\)/);
const frame=fs.readFileSync('src/components/FrameContentEditTarget.tsx','utf8');
assert.doesNotMatch(frame,/pointerEvents="none">\{content\}/,'content must remain selectable');
assert.match(frame,/編輯整張內容卡片/);
console.log('V5.0.6 real-card nested selection / saved visual override / action isolation PASS');
