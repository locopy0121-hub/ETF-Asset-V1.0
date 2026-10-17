const assert=require('node:assert/strict');
const fs=require('node:fs'),ts=require('typescript'),React=require('react');
const original=fs.readFileSync('src/components/CardContentPreviewSelector.tsx','utf8');
const compiled=ts.transpileModule(original,{compilerOptions:{
  module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022,
}}).outputText;
const mock={Text:'EditableText',Input:'EditableInput',Button:'EditablePressable',
  NativeText:'NativeText',NativeInput:'NativeInput',NativeButton:'NativePressable',Tile:'MetricTile'};
const load=id=>{
  if(id==='react'||id==='react/jsx-runtime')return require(id);
  if(id==='react-native')return {View:'View',Pressable:mock.NativeButton,Text:mock.NativeText,TextInput:mock.NativeInput};
  if(id==='./EditableNative')return {Text:mock.Text,TextInput:mock.Input,Pressable:mock.Button,
    plainText:value=>typeof value==='string'?value:''};
  if(id==='./MetricTile')return {MetricTile:mock.Tile};
  if(id==='./AiQuestionBox')return {AiQuestionBox:'AiQuestionBox'};
  throw Error('Unexpected import '+id);
};
const obj={exports:{}};
new Function('require','module','exports',compiled)(load,obj,obj.exports);
const {listCardContentItems,readCardStaticText,applyCardContentAppearance,selectCardContentPreview}=obj.exports;
const el=(type,props,...children)=>React.createElement(type,props,...children);
const buy=el(mock.Text,{editorReadOnly:false},'買');
const sellButton=el(mock.Button,{editorId:'order:sell',onPress:()=>{throw Error('Preview must not trade');}},
  el(mock.Text,{editorReadOnly:false},'賣'));
const number=el(mock.Text,{editorReadOnly:false},'7');
const protectedUnit=el(mock.Text,{editorReadOnly:true},'元');
const root=el('View',null,buy,sellButton,number,protectedUnit);
const list=listCardContentItems(root,'root/actions');
assert.equal(list.length,5,'single-char buy and sell, button, numeric data and readonly caption must be listed');
const buyItem=list.find(x=>x.label==='文字 · 買');
const sellItem=list.find(x=>x.label==='文字 · 賣');
const numericItem=list.find(x=>x.label==='數值 · 7');
const unitItem=list.find(x=>x.label==='數值 · 元');
const buttonItem=list.find(x=>x.id==='order:sell');
assert.ok(buyItem&&sellItem&&numericItem&&unitItem&&buttonItem);
assert.equal(buttonItem.kind,'button');assert.equal(buyItem.kind,'text');assert.equal(sellItem.kind,'text');
assert.equal(numericItem.kind,'value','one digit is financial data, not static editable copy');
assert.equal(unitItem.kind,'value','readOnly single-character label must remain protected');
assert.equal(readCardStaticText(root,buyItem.id,'root/actions'),'買');
assert.equal(readCardStaticText(root,sellItem.id,'root/actions'),'賣');
assert.equal(readCardStaticText(root,numericItem.id,'root/actions'),null);
assert.equal(readCardStaticText(root,unitItem.id,'root/actions'),null);
const overrides={
  [buyItem.id]:{labelText:''},
  [sellItem.id]:{labelText:'售'},
  [numericItem.id]:{labelText:'999'},
  [unitItem.id]:{labelText:'X'},
};
const flatten=node=>Array.isArray(node)?node.flatMap(flatten):
  node&&typeof node==='object'?[node,...React.Children.toArray(node.props?.children).flatMap(flatten)]:[];
const actual=flatten(applyCardContentAppearance(root,overrides,'root/actions'));
assert.ok(actual.some(x=>x.type===mock.Text&&x.props.children===''),'cleared one-char copy must render empty');
assert.ok(actual.some(x=>x.type===mock.Text&&x.props.children==='售'));
assert.ok(actual.some(x=>x.type===mock.Text&&x.props.children==='7'),'live numeric value unchanged');
assert.ok(actual.some(x=>x.type===mock.Text&&x.props.children==='元'),'protected unit unchanged');
assert.equal(actual.find(x=>x.type===mock.Button).props.onPress,sellButton.props.onPress,
  'editing button caption must preserve original production action');
let selected=null;
const preview=flatten(selectCardContentPreview(root,x=>selected=x,null,overrides,'root/actions'));
assert.ok(preview.some(x=>x.type===mock.Text&&x.props.children===''),'editor preview must reflect cleared content');
assert.ok(preview.some(x=>x.type===mock.Text&&x.props.children==='售'));
assert.ok(!preview.some(x=>x.type===mock.Text&&x.props.children==='999'));
assert.ok(preview.some(x=>x.type===mock.Text&&x.props.children==='7'));
const inert=preview.find(x=>x.type===mock.Button);
assert.equal(inert.props.disabled,true);assert.equal(inert.props.onPress,undefined);
const picker=preview.find(x=>x.props?.accessibilityLabel==='編輯'+buyItem.label);
assert.ok(picker);picker.props.onPress();assert.equal(selected.id,buyItem.id);
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
const app=JSON.parse(fs.readFileSync('app.json','utf8')).expo;
assert.match(pkg.version,/^5\.0\.\d+$/);assert.ok(Number(pkg.version.split('.')[2])>=14);
assert.equal(app.version,pkg.version);
assert.equal(app.android.versionCode,50000+Number(pkg.version.split('.')[2]));
assert.equal(app.ios.buildNumber,String(app.android.versionCode));
console.log('V5.0.14 single-char caption and intentional empty label parity PASS');
