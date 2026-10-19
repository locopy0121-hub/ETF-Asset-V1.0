const assert=require('node:assert/strict');
const fs=require('node:fs');
const ts=require('typescript');
const ReactNative={};
let appListeners=new Set(),reduceListeners=new Set();
let starts=0,stops=0,loopStarts=0;
ReactNative.AppState={currentState:'active',addEventListener(event,handler){
 assert.equal(event,'change');appListeners.add(handler);return {remove:()=>appListeners.delete(handler)};
}};
ReactNative.AccessibilityInfo={
 isReduceMotionEnabled:()=>Promise.resolve(false),
 addEventListener(event,handler){assert.equal(event,'reduceMotionChanged');reduceListeners.add(handler);return {remove:()=>reduceListeners.delete(handler)};},
};
class Value {
 constructor(initial){this.value=initial;this.listeners=new Map();this.nextId=0;}
 stopAnimation(){stops++;}
 setValue(value){this.value=value;}
 interpolate({outputRange}){return outputRange[outputRange.length-1];}
 addListener(callback){const id=String(++this.nextId);this.listeners.set(id,callback);return id;}
 removeListener(id){this.listeners.delete(id);}
}
ReactNative.Animated={
 Value,ValueXY:class{getTranslateTransform(){return [];}},
 Text:'Animated.Text',View:'Animated.View',
 timing(value,config){return {start(callback){starts++;this.callback=callback;},stop(){stops++;}};},
 spring(){return {start(){} ,stop(){stops++;}};},
 event(){return ()=>{};},
 loop(animation){return {start(){loopStarts++;animation.start();},stop(){stops++;animation.stop();}};},
};
ReactNative.Easing={out:fn=>fn,cubic:val=>val};
ReactNative.PanResponder={create:()=>({panHandlers:{}})};
ReactNative.Pressable='Pressable';
ReactNative.Text='Text';
ReactNative.View='View';

let hooks=[],cursor=0,pending=[];
const useRef=initial=>{const id=cursor++;if(!(id in hooks))hooks[id]={current:initial};return hooks[id];};
const useState=initial=>{const id=cursor++;if(!(id in hooks))hooks[id]=typeof initial==='function'?initial():initial;
 return [hooks[id],next=>{hooks[id]=typeof next==='function'?next(hooks[id]):next;}];};
const useEffect=(fn,deps)=>{
 const id=cursor++,old=hooks[id];
 if(old&&deps.length===old.deps.length&&deps.every((v,i)=>Object.is(v,old.deps[i])))return;
 pending.push(()=>{old?.cleanup?.();hooks[id]={deps,cleanup:fn()};});
};
const jsx=(type,props)=>({type,props});
const imports={react:{useRef,useState,useEffect},'react-native':ReactNative,'react/jsx-runtime':{jsx,jsxs:jsx}};
const source=ts.transpileModule(fs.readFileSync('src/components/ItemMotion.tsx','utf8'),{
 compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}
}).outputText;
const moduleRef={exports:{}};
new Function('require','module','exports',source)((id)=>{assert.ok(id in imports,'Unexpected dependency '+id);return imports[id];},moduleRef,moduleRef.exports);
const {useItemMotionStyle,ItemMotionText}=moduleRef.exports;
const reset=()=>{for(const item of hooks)item?.cleanup?.();hooks=[];pending=[];cursor=0;starts=stops=loopStarts=0;appListeners.clear();reduceListeners.clear();ReactNative.AppState.currentState='active';};
const render=(component,...args)=>{cursor=0;pending=[];const result=component(...args);for(const fx of pending)fx();return result;};
const emitState=state=>{ReactNative.AppState.currentState=state;for(const callback of [...appListeners])callback(state);};
const emitReduce=flag=>{for(const callback of [...reduceListeners])callback(flag);};
const base={kind:'fade',trigger:'mount',speed:'normal',intensity:'medium',loop:false};
render(useItemMotionStyle,base,'unchanged',null);
assert.equal(starts,1,'Mount effect begins while active');
assert.equal(appListeners.size,1,'One-shot animations must subscribe to AppState');
emitState('background');const beforeStop=stops;render(useItemMotionStyle,base,'unchanged',null);
assert.ok(stops>beforeStop,'Background must stop a running one-shot effect');
assert.equal(starts,1,'Background must not replay a mount effect');
emitState('active');render(useItemMotionStyle,base,'unchanged',null);
assert.equal(starts,1,'Returning to foreground must not replay an old mount event');

const change={...base,trigger:'change'};
render(useItemMotionStyle,change,'quote1',100);
const changedStarts=starts;
emitState('inactive');render(useItemMotionStyle,change,'quote1',100);
render(useItemMotionStyle,change,'quote2',101);
assert.equal(starts,changedStarts,'Changed price during background must not animate');
emitState('active');render(useItemMotionStyle,change,'quote2',101);
assert.equal(starts,changedStarts,'Foreground must not replay a stale quote update');
render(useItemMotionStyle,change,'quote3',102);
assert.equal(starts,changedStarts+1,'Live foreground changes still animate');
const runningStops=stops;
emitReduce(true);render(useItemMotionStyle,change,'quote3',102);
assert.ok(stops>runningStops,'Reduce-motion enabled must stop active animation');
render(useItemMotionStyle,change,'quote4',103);
assert.equal(starts,changedStarts+1,'Reduce-motion must suppress new animation');
emitReduce(false);render(useItemMotionStyle,change,'quote4',103);
assert.equal(starts,changedStarts+1,'Turning reduce-motion off must not replay stale updates');
const looping={...base,trigger:'always',loop:true};
render(useItemMotionStyle,looping,'steady',null);
assert.ok(loopStarts>0,'Always effect can loop while visible');
const loops=loopStarts;
emitState('background');render(useItemMotionStyle,looping,'steady',null);
assert.equal(loopStarts,loops,'Background must not start loops');
emitState('active');render(useItemMotionStyle,looping,'steady',null);
assert.equal(loopStarts,loops+1,'Returning to foreground may resume an always loop');
reset();
assert.equal(appListeners.size,0,'Unmount removes AppState handlers');
assert.equal(reduceListeners.size,0,'Unmount removes reduce-motion handlers');

const numeric={...base,kind:'number-roll',trigger:'change'};
const textRender=(text,amount)=>render(ItemMotionText,{text,numeric:amount,effect:numeric,style:{},numberOfLines:1});
const initial=textRender('100.00',100);
assert.equal(initial.props.children,'100.00','Initial numeric content stays authoritative');
const previousStarts=starts;
textRender('101.00',101);
assert.ok(starts>previousStarts,'Foreground numeric transition begins on change');
const numberStops=stops;
emitState('background');textRender('101.00',101);
textRender('101.00',101);
assert.ok(stops>numberStops,'Numeric transition must be stopped when App is hidden');
const hidden=textRender('102.00',102);
assert.equal(hidden.props.children,'101.00','State update becomes visible on next render');
const stable=textRender('102.00',102);
assert.equal(stable.props.children,'102.00','Background numeric text snaps to current value');
reset();
console.log('V5.0.29 motion lifecycle: actual Hook execution, mount/change/always, background, accessibility, numeric value and cleanup PASS');
