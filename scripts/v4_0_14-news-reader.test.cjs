// Native surfaces are replaced at the renderer boundary; the reader and React hooks are real.
// Catches loss of inline rendering, error overwritten by loadEnd, unsafe URL launches,
// wrong Android-back dispatch, and a retained WebView after dismissal.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const ts=require('typescript');
const React=require('react');
const {create,act}=require('react-test-renderer');
global.IS_REACT_ACT_ENVIRONMENT=true;
let nativeBack=0,nativeStop=0,nativeReload=0,nativeMounts=0,injected=[],external=[];
const WebView=React.forwardRef((props,ref)=>{
  React.useEffect(()=>{nativeMounts++;},[]);
  React.useImperativeHandle(ref,()=>({goBack(){nativeBack++;},stopLoading(){nativeStop++;},reload(){nativeReload++;},injectJavaScript(script){injected.push(script);}}));
  return React.createElement('NativeWebView',props);
});
const rn={View:'View',Text:'Text',Pressable:'Pressable',ScrollView:'ScrollView',Modal:'Modal',ActivityIndicator:'ActivityIndicator',Linking:{openURL:async url=>{external.push(url);}},StyleSheet:{create:v=>v,hairlineWidth:1,absoluteFill:{position:'absolute'}}};
const palette={background:'#fff',surface:'#fff',surfaceMuted:'#eee',border:'#ddd',primary:'#080',text:'#000',textSecondary:'#555'};
function load(file){const m={exports:{}};const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText;
const req=id=>id.endsWith('/EditableNative')?{Text:rn.Text,TextInput:rn.TextInput,Pressable:rn.Pressable}:id.endsWith('/EditorSurface')?{EditorSurface:({children})=>children}:id==='react-native'?rn:id==='react-native-webview'?{WebView}:id==='react-native-safe-area-context'?{SafeAreaProvider:'SafeAreaProvider',SafeAreaView:'SafeAreaView'}:id.endsWith('/ThemeRuntime')?{useThemeRuntime:()=>({palette})}:id.endsWith('/tokens')?{colors:palette,radius:{lg:16,pill:99},spacing:{sm:8,md:12,lg:16}}:require(id);
new Function('require','module','exports',code)(req,m,m.exports);return m.exports;}
const {NewsReaderModal}=load('src/components/NewsReaderModal.tsx');
const item={id:'one',symbol:'00406A',name:'主動中信台灣收益',title:'新聞標題',source:'鉅亨網',publishedAt:'2026-10-07T12:20:33Z',url:'https://news.cnyes.com/news/id/123',summary:'',summaryStatus:'unavailable'};
let renderer,closed=0;
function mount(value=item){act(()=>{renderer=create(React.createElement(NewsReaderModal,{item:value,onClose:()=>closed++}));});}
function browser(){return renderer.root.findByType('NativeWebView');}
function text(){return JSON.stringify(renderer.toJSON());}
function click(label){const button=renderer.root.findAllByType('Pressable').find(n=>n.props.accessibilityLabel===label);assert.ok(button,'button '+label);act(()=>button.props.onPress());}
mount();
try{
 assert.equal(renderer.root.findAllByType('NativeWebView').length,1,'news opens the actual article inline even without a summary');
 assert.equal(browser().props.source.uri,'https://news.cnyes.com/news/id/123');
 assert.equal(external.length,0,'opening a news card must not launch another app');
 act(()=>browser().props.onLoadStart());
 act(()=>browser().props.onError({nativeEvent:{description:'offline'}}));
 act(()=>browser().props.onLoadEnd());
 assert.ok(text().includes('載入失敗'),'onLoadEnd must not erase a preceding network error');
 click('重試載入新聞');
 assert.ok(!text().includes('載入失敗'),'retry resets error');
 assert.equal(nativeReload,1,'retry reloads the failed native page');
 assert.equal(nativeMounts,1,'retry preserves the same browser and history');
 act(()=>browser().props.onNavigationStateChange({url:'https://news.cnyes.com/news/id/456',canGoBack:true,loading:false}));
 click('重新整理新聞');
 assert.equal(nativeReload,2,'refresh uses native current page rather than original source');
 assert.equal(nativeMounts,1,'refresh must preserve history');
 act(()=>renderer.root.findByType('Modal').props.onRequestClose());
 assert.equal(nativeBack,1,'Android back must navigate webpage history first');assert.equal(closed,0);
 act(()=>browser().props.onNavigationStateChange({url:item.url,canGoBack:false,loading:false}));
 act(()=>renderer.root.findByType('Modal').props.onRequestClose());assert.equal(closed,1);
 assert.equal(browser().props.onShouldStartLoadWithRequest({url:'intent://some-app',isTopFrame:true}),false);
 assert.equal(browser().props.onShouldStartLoadWithRequest({url:'https://news.cnyes.com/news/id/456',isTopFrame:true}),true);
 assert.equal(external.length,0,'webpage navigation must not automatically launch apps');
 act(()=>browser().props.onOpenWindow({nativeEvent:{targetUrl:'https://news.cnyes.com/news/id/789'}}));
 assert.equal(renderer.root.findAllByType('NativeWebView').length,1,'target=_blank remains a single reader');
 assert.equal(injected.at(-1),'window.location.assign("https://news.cnyes.com/news/id/789"); true;','new-window target navigates in existing page history');
 assert.equal(nativeMounts,1,'new-window link must not remount the browser');
 act(()=>browser().props.onNavigationStateChange({url:'https://news.cnyes.com/news/id/789',canGoBack:true,loading:false}));
 act(()=>renderer.root.findByType('Modal').props.onRequestClose());
 assert.equal(nativeBack,2,'back from new-window link returns to originating page');
 assert.equal(closed,1);
 const stopsBeforeCrash=nativeStop;
 act(()=>browser().props.onRenderProcessGone());
 assert.equal(nativeStop,stopsBeforeCrash,'renderer termination must not send commands to a dead WebView');
 assert.equal(renderer.root.findAllByType('NativeWebView').length,0,'terminated renderer is removed');
 click('重試載入新聞');
 assert.equal(nativeMounts,2,'renderer recovery must create a fresh native browser');
 assert.equal(browser().props.source.uri,'https://news.cnyes.com/news/id/789','renderer recovery restores current article');
 click('關閉新聞');assert.equal(closed,2,'close button exits regardless of page history');
 act(()=>renderer.update(React.createElement(NewsReaderModal,{item:null,onClose:()=>closed++})));
 assert.equal(renderer.root.findAllByType('NativeWebView').length,0,'dismissal releases the browser');
}finally{act(()=>renderer.unmount());}
for(const url of ['', 'javascript:alert(1)','file:///sdcard/data','https://user:password@example.com/','https://']){
 mount({...item,url});try{assert.equal(renderer.root.findAllByType('NativeWebView').length,0,'invalid URL must not reach native browser: '+url);assert.ok(text().includes('連結'));}finally{act(()=>renderer.unmount());}
}
console.log('News inline rendering / failure-retry / back / single window / URL validation / unmount: PASS');
