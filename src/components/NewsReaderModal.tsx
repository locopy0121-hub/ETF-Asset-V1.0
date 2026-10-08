import {EditorSurface} from './EditorSurface';
import {useCallback,useEffect,useRef,useState} from 'react';
import {ActivityIndicator,Linking,Modal,StyleSheet,View} from 'react-native';
import {Pressable,Text} from './EditableNative';
import {SafeAreaProvider,SafeAreaView} from 'react-native-safe-area-context';
import {WebView} from 'react-native-webview';

import type {AiNewsItem} from '../ai/AiNewsRuntime';
import {spacing} from '../theme/tokens';
import {useThemeRuntime} from '../theme/ThemeRuntime';

function articleUrl(value:string):string|null{
  try{
    const url=new URL(value.trim());
    return url.protocol==='https:'&&url.hostname&&!url.username&&!url.password?url.href:null;
  }catch{return null;}
}

export function NewsReaderModal({item,onClose}:{item:AiNewsItem|null;onClose:()=>void}){
  // A closed modal has no mounted WebView. A different article starts a fresh session.
  if(!item)return null;
  return <NewsBrowser key={item.id+'|'+item.url} item={item} onClose={onClose}/>;
}

function NewsBrowser({item,onClose}:{item:AiNewsItem;onClose:()=>void}){
  const {palette}=useThemeRuntime();
  const initialUrl=articleUrl(item.url);
  const [uri,setUri]=useState(initialUrl);
  const [generation,setGeneration]=useState(0);
  const [terminated,setTerminated]=useState(false);
  const [progress,setProgress]=useState(0);
  const [loading,setLoading]=useState(Boolean(initialUrl));
  const [error,setError]=useState(initialUrl?'':'新聞連結無效或尚未提供。');
  const [externalError,setExternalError]=useState('');
  const web=useRef<WebView>(null);
  const canGoBack=useRef(false);
  const currentUrl=useRef(initialUrl);
  const failed=useRef(!initialUrl);
  const timer=useRef<ReturnType<typeof setTimeout>|null>(null);
  const clearTimer=useCallback(()=>{if(timer.current!==null){clearTimeout(timer.current);timer.current=null;}},[]);
  const fail=useCallback((message:string,stop=true)=>{
    failed.current=true;
    clearTimer();
    setError(message);
    setLoading(false);
    if(stop)web.current?.stopLoading();
  },[clearTimer]);
  const start=useCallback(()=>{
    clearTimer();
    failed.current=false;
    setError('');
    setProgress(0);
    setLoading(true);
    timer.current=setTimeout(()=>fail('新聞載入逾時，請重試或檢查網路連線。'),25000);
  },[clearTimer,fail]);
  useEffect(()=>{
    if(uri)start();
    return clearTimer;
  },[uri,generation,start,clearTimer]);
  const retry=()=>{
    setExternalError('');
    if(terminated){
      // Android forbids reusing a WebView whose renderer died. Restore the current article.
      canGoBack.current=false;
      setUri(articleUrl(currentUrl.current??'')??initialUrl);
      setGeneration(value=>value+1);
      setTerminated(false);
      start();
      return;
    }
    start();
    // Native reload retains the actual current page and its history, including failures.
    web.current?.reload();
  };
  const navigateInPlace=(value:string)=>{
    const next=articleUrl(value);
    if(!next)return;
    // location.assign keeps target=_blank links inside this WebView's back history.
    web.current?.injectJavaScript(`window.location.assign(${JSON.stringify(next)}); true;`);
  };
  const rendererTerminated=()=>{
    fail('新聞閱讀器已中斷，請重新載入。',false);
    setTerminated(true);
  };
  const back=()=>{
    if(canGoBack.current&&web.current)web.current.goBack();
    else onClose();
  };
  const openExternal=async()=>{
    const url=articleUrl(currentUrl.current??uri??'');
    if(!url)return;
    try{await Linking.openURL(url);}
    catch{setExternalError('無法開啟外部瀏覽器，請稍後重試。');}
  };
  return <Modal visible animationType="slide" onRequestClose={back}><EditorSurface pageKey="home" frameKey="news-reader" title="新聞閱讀器" visible={true}>
    <SafeAreaProvider>
      <SafeAreaView edges={['top','bottom','left','right']} style={[styles.root,{backgroundColor:palette.background}]}>
        <View style={[styles.header,{backgroundColor:palette.surface,borderBottomColor:palette.border}]}>
          <View style={styles.heading}>
            <Text editorId="native:NewsReaderModal:kicker:1" editorReadOnly={false} style={[styles.kicker,{color:palette.primary}]}>App 內新聞閱讀</Text>
            <Text editorId="native:NewsReaderModal:symbol:2" editorReadOnly={true} numberOfLines={1} style={[styles.symbol,{color:palette.text}]}>{item.symbol} {item.name}</Text>
            <Text editorId="native:NewsReaderModal:source:3" editorReadOnly={true} numberOfLines={1} style={[styles.source,{color:palette.textSecondary}]}>{item.source}</Text>
          </View>
          <Pressable editorId="native:NewsReaderModal:close:4" accessibilityRole="button" accessibilityLabel="關閉新聞" onPress={onClose} style={[styles.close,{backgroundColor:palette.surfaceMuted}]}>
            <Text editorId="native:NewsReaderModal:closeText:5" editorReadOnly={false} style={[styles.closeText,{color:palette.textSecondary}]}>×</Text>
          </Pressable>
        </View>
        <View style={[styles.toolbar,{backgroundColor:palette.surface,borderBottomColor:palette.border}]}>
          <Pressable editorId="native:NewsReaderModal:tool:6" accessibilityRole="button" accessibilityLabel="返回上一頁" onPress={back} style={styles.tool}><Text editorId="native:NewsReaderModal:text:7" editorReadOnly={false} style={{color:palette.primary}}>‹ 返回</Text></Pressable>
          {uri?<Pressable editorId="native:NewsReaderModal:tool:8" accessibilityRole="button" accessibilityLabel="重新整理新聞" onPress={retry} style={styles.tool}><Text editorId="native:NewsReaderModal:text:9" editorReadOnly={false} style={{color:palette.primary}}>重新整理</Text></Pressable>:null}
          {uri?<Pressable editorId="native:NewsReaderModal:tool:10" accessibilityRole="button" accessibilityLabel="使用外部瀏覽器查看完整原文" onPress={()=>void openExternal()} style={styles.tool}><Text editorId="native:NewsReaderModal:text:11" editorReadOnly={false} style={{color:palette.textSecondary}}>外部開啟 ↗</Text></Pressable>:null}
        </View>
        {externalError?<Text editorId="native:NewsReaderModal:notice:12" editorReadOnly={true} accessibilityRole="alert" style={[styles.notice,{color:palette.textSecondary}]}>{externalError}</Text>:null}
        {loading?<View accessibilityRole="progressbar" accessibilityValue={{min:0,max:100,now:Math.round(progress*100)}} style={[styles.progressTrack,{backgroundColor:palette.border}]}><View style={{height:3,width:`${Math.max(3,progress*100)}%`,backgroundColor:palette.primary}}/></View>:null}
        <View style={styles.browserArea}>
          {uri&&!terminated?<WebView
            key={generation}
            ref={web}
            source={{uri}}
            style={[styles.browser,{backgroundColor:palette.background},error?styles.hidden:null]}
            // Catch every scheme here so WebView never auto-launches another app.
            originWhitelist={['*']}
            onShouldStartLoadWithRequest={request=>Boolean(articleUrl(request.url))}
            onOpenWindow={event=>navigateInPlace(event.nativeEvent.targetUrl)}
            setSupportMultipleWindows
            javaScriptEnabled
            domStorageEnabled
            mixedContentMode="never"
            allowFileAccess={false}
            allowsBackForwardNavigationGestures
            onLoadStart={start}
            onLoadProgress={event=>setProgress(event.nativeEvent.progress)}
            onLoadEnd={()=>{
              clearTimer();
              setLoading(false);
              if(!failed.current)setProgress(1);
            }}
            onNavigationStateChange={navigation=>{
              canGoBack.current=navigation.canGoBack;
              if(articleUrl(navigation.url))currentUrl.current=navigation.url;
            }}
            onError={()=>fail('新聞載入失敗，請檢查網路連線後重試。')}
            onHttpError={event=>{
              // Android also reports failed subresources; those must not hide a readable article.
              if(event.nativeEvent.url===currentUrl.current||event.nativeEvent.url===uri)
                fail(`新聞載入失敗（HTTP ${event.nativeEvent.statusCode}），請稍後重試。`);
            }}
            onRenderProcessGone={rendererTerminated}
            onContentProcessDidTerminate={rendererTerminated}
            renderError={()=> <View/>}
          />:null}
          {loading?<View pointerEvents="none" style={[styles.loading,{backgroundColor:palette.surface}]}><ActivityIndicator color={palette.primary}/><Text editorId="native:NewsReaderModal:text:13" editorReadOnly={false} style={{color:palette.textSecondary}}>正在載入新聞原文…</Text></View>:null}
          {error?<View style={[styles.error,{backgroundColor:palette.background}]}>
            <Text editorId="native:NewsReaderModal:articleTitle:14" editorReadOnly={true} style={[styles.articleTitle,{color:palette.text}]}>{item.title}</Text>
            <Text editorId="native:NewsReaderModal:errorText:15" editorReadOnly={true} accessibilityRole="alert" style={[styles.errorText,{color:palette.textSecondary}]}>{error}</Text>
            {uri?<Pressable editorId="native:NewsReaderModal:retry:16" accessibilityRole="button" accessibilityLabel="重試載入新聞" onPress={retry} style={[styles.retry,{backgroundColor:palette.surfaceMuted}]}><Text editorId="native:NewsReaderModal:text:17" editorReadOnly={false} style={{color:palette.primary}}>重試</Text></Pressable>:null}
          </View>:null}
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  </EditorSurface></Modal>;
}

const styles=StyleSheet.create({
  root:{flex:1},
  header:{paddingHorizontal:spacing.lg,paddingVertical:spacing.md,borderBottomWidth:StyleSheet.hairlineWidth,flexDirection:'row',alignItems:'center',gap:12},
  heading:{flex:1},kicker:{fontSize:11,fontWeight:'900'},symbol:{fontSize:15,fontWeight:'900',marginTop:3},source:{fontSize:11,marginTop:3},
  close:{width:44,height:44,borderRadius:22,alignItems:'center',justifyContent:'center'},closeText:{fontSize:25,fontWeight:'900'},
  toolbar:{flexDirection:'row',justifyContent:'space-between',paddingHorizontal:spacing.sm,borderBottomWidth:StyleSheet.hairlineWidth},tool:{minHeight:44,paddingHorizontal:8,justifyContent:'center'},
  progressTrack:{height:3},browserArea:{flex:1},browser:{flex:1},hidden:{opacity:0},
  loading:{position:'absolute',top:12,alignSelf:'center',flexDirection:'row',gap:8,alignItems:'center',padding:12,borderRadius:16},
  error:{...StyleSheet.absoluteFill,padding:spacing.lg,justifyContent:'center',gap:16},articleTitle:{fontSize:20,lineHeight:29,fontWeight:'800'},errorText:{fontSize:15,lineHeight:24},retry:{alignSelf:'flex-start',padding:14,borderRadius:20},notice:{paddingHorizontal:spacing.lg,paddingVertical:8,fontSize:12},
});
