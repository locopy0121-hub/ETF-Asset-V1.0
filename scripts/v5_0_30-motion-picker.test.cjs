const assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
const transpile=p=>ts.transpileModule(fs.readFileSync(p,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText;
const domainModule={exports:{}};
new Function('require','module','exports',transpile('src/domain/displayItemContract.ts'))(x=>{throw Error('unexpected '+x)},domainModule,domainModule.exports);
const domain=domainModule.exports;
let slots=[],cursor=0,effects=[];
const useState=initial=>{
 const key=cursor++;if(!(key in slots))slots[key]=typeof initial==='function'?initial():initial;
 return [slots[key],next=>{slots[key]=typeof next==='function'?next(slots[key]):next;}];
};
const useEffect=(fn,deps)=>{
 const key=cursor++,old=slots[key];
 if(old?.deps?.length===deps.length&&deps.every((v,i)=>Object.is(v,old.deps[i])))return;
 effects.push(()=>{old?.cleanup?.();slots[key]={deps,cleanup:fn()};});
};
const element=(type,props,key)=>({type,props:props??{},key});
const imports={
 react:{useEffect,useState},
 'react-native':{Pressable:'Pressable',Text:'Text',View:'View',StyleSheet:{create:x=>x}},
 'react/jsx-runtime':{jsx:element,jsxs:element,Fragment:'Fragment'},
 '../domain/displayItemContract':domain,
 './ItemMotion':{ItemMotionText:'ItemMotionText'},
};
const mod={exports:{}};
new Function('require','module','exports',transpile('src/components/MotionControls.tsx'))(name=>{assert.ok(imports[name],'unexpected module '+name);return imports[name];},mod,mod.exports);
const {MotionControls}=mod.exports;
let value={...domain.DEFAULT_ITEM_EFFECT,kind:'fade'};
const onChange=delta=>{value={...value,...delta};};
function render(){
 cursor=0;effects=[];
 const node=MotionControls({value,onChange});
 for(const cb of effects)cb();
 return node;
}
const nodes=x=>x==null||typeof x==='boolean'?[]:Array.isArray(x)?x.flatMap(nodes):typeof x!=='object'?[x]:typeof x.type==='function'?nodes(x.type(x.props)):[x,...nodes(x.props.children)];
const buttons=()=>nodes(render()).filter(n=>n?.type==='Pressable').map(n=>{
 const title=nodes(n.props.children).filter(x=>x?.type==='Text').map(x=>nodes(x.props.children).filter(y=>typeof y==='string').join('')).join('');
 return {title,selected:n.props.accessibilityState?.selected,press:n.props.onPress};
});
function option(name){const x=buttons().find(x=>x.title===name);assert.ok(x,'Option not rendered: '+name);return x;}
function press(name){option(name).press();render();}
render();
assert.equal(option('基本').selected,true);
assert.equal(option('淡入').selected,true);
press('視覺');
assert.equal(option('視覺').selected,true);
assert.equal(value.kind,'fade','Browsing categories must not write into selected item');
option('流光掃過');
value={...value,kind:'price-pop'};
render();render();
assert.equal(option('行情').selected,true,'Switching to another item must restore its saved group');
assert.equal(option('價格跳動').selected,true);
press('成交量脈衝');
assert.equal(value.kind,'volume-pulse','Effect selection must save to the provided callback');
value={...value,kind:'number-roll'};
render();render();
assert.equal(option('數值').selected,true);
assert.equal(option('數字滾動').selected,true);
press('強調');
assert.equal(value.kind,'number-roll','Browsing another group cannot overwrite numeric effect');
const preserved=value;
const before=nodes(render()).find(x=>x?.type==='ItemMotionText');
press('▶ 預覽');
const after=nodes(render()).find(x=>x?.type==='ItemMotionText');
assert.ok(before&&after,'Preview must be mounted');
assert.notEqual(after.props.text,before.props.text,'Preview must animate a simulated quote');
assert.strictEqual(value,preserved,'Preview must not persist simulation to card config');
value={...value,kind:'none'};
render();render();
assert.equal(option('基本').selected,true);
assert.equal(option('無').selected,true);
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
const app=JSON.parse(fs.readFileSync('app.json','utf8')).expo;
const notes=fs.readFileSync('src/settings/appReleaseNotes.ts','utf8');
assert.equal(app.version,pkg.version);
assert.ok(notes.includes("version:'"+pkg.version+"',androidVersionCode:"+app.android.versionCode),'release notes must match current app version');
console.log('V5.0.30 motion editor: selected-card group, browsing isolation, effect persistence and preview runtime PASS');
