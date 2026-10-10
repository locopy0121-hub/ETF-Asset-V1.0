import {acceptsEditorSession} from './src/domain/editorSessionScope';
import {EditorSurface} from './src/components/EditorSurface';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {ActivityIndicator,AppState,BackHandler,InteractionManager,Linking,StatusBar,StyleSheet,useWindowDimensions,View} from 'react-native';
import {Pressable,Text} from './src/components/EditableNative';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { AiNewsRuntimeProvider, useAiNewsRuntime } from './src/ai/AiNewsRuntime';
import { MAIN_PAGES, type MainPageKey } from './src/domain/pageRegistry';
import {resolveBackNavigation,resolvePageSwipeDirection} from './src/domain/navigationGestures';
import type { HoldingQuote } from './src/domain/uiModels';
import type { SharedSnapshot } from './src/domain/snapshot';
import { PageEditorProvider, usePageEditor } from './src/editor/pageEditor';
import {MaintenanceProvider,useMaintenance} from './src/maintenance/MaintenanceRuntime';
import {MaintenanceWorkbench} from './src/maintenance/MaintenanceWorkbench';
import { BrokerSettingsRuntimeProvider, useBrokerSettingsRuntime } from './src/finance/BrokerSettingsRuntime';
import { FinanceProvider, useFinance } from './src/finance/FinanceRuntime';
import { MarketRuntimeProvider, useMarketRuntime } from './src/market/MarketRuntime';
import { MonitorSettingsRuntimeProvider, useMonitorSettingsRuntime } from './src/monitor/MonitorSettingsRuntime';
import type {MonitorConfig} from './src/monitor/monitorDomain';
import { WidgetSettingsRuntimeProvider, useWidgetSettingsRuntime } from './src/widget/WidgetSettingsRuntime';
import type {WidgetConfig} from './src/widget/widgetDomain';
import { GlobalFloatingAi } from './src/components/GlobalFloatingAi';
import { AiScreen } from './src/screens/AiScreen';
import { DividendScreen } from './src/screens/DividendScreen';
import { HoldingDetailScreen } from './src/screens/HoldingDetailScreen';
import { StockChartScreen } from './src/screens/StockChartScreen';
import {HoldingDetailBoundary} from './src/components/HoldingDetailBoundary';
import {DiagnosticsProvider,recordDiagnosticEvent} from './src/diagnostics/DiagnosticRuntime';
import { HomeScreen } from './src/screens/HomeScreen';
import {MarketResearchScreen} from './src/screens/MarketResearchScreen';
import { LedgerScreen } from './src/screens/LedgerScreen';
import { PortfolioScreen } from './src/screens/PortfolioScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { SettingsRuntimeProvider, useSettingsRuntime } from './src/settings/SettingsRuntime';
import { deriveAiUiState, shouldRefreshAiNews } from './src/settings/settingsControlBehavior';
import { colors, spacing } from './src/theme/tokens';
import { ThemeRuntimeProvider, useThemeRuntime } from './src/theme/ThemeRuntime';
import { ThemeBackgroundLayer } from './src/theme/ThemeBackgroundLayer';
import {EtfConstituentsSync} from './src/market/EtfConstituentsRuntime';
import { consumeNativeMarketForceRefreshRequests, subscribeNativeMarketRefreshRequests, syncNativeMonitor, syncNativeWidget } from './src/native/TfAssetNativeBridge';

type NativeSurfaceSyncJob<TConfig>=Readonly<{config:TConfig;snapshot:SharedSnapshot}>;

type LauncherShortcutRoute='buy'|'monitor'|'today-pnl'|'dividend'|'ai';
const LAUNCHER_SHORTCUT_PREFIX='tfasset://shortcut/';
const LAUNCHER_SHORTCUT_ROUTES:readonly LauncherShortcutRoute[]=['buy','monitor','today-pnl','dividend','ai'];
export function resolveLauncherShortcutUrl(url:string|null|undefined):LauncherShortcutRoute|null{
  if(typeof url!=='string'||!url.startsWith(LAUNCHER_SHORTCUT_PREFIX))return null;
  const route=url.slice(LAUNCHER_SHORTCUT_PREFIX.length).split(/[?#]/,1)[0] as LauncherShortcutRoute;
  return LAUNCHER_SHORTCUT_ROUTES.includes(route)?route:null;
}

function useLatestAsyncJob<T>(runner:(value:T)=>Promise<unknown>,label:string){
  const runnerRef=useRef(runner);
  const stateRef=useRef<{running:boolean;pending:T|null}>({running:false,pending:null});
  useEffect(()=>{runnerRef.current=runner;},[runner]);
  return useCallback((value:T)=>{
    const state=stateRef.current;
    state.pending=value;
    if(state.running)return;
    state.running=true;
    void (async()=>{
      try{
        while(state.pending!==null){
          const next=state.pending;
          state.pending=null;
          try{await runnerRef.current(next);}
          catch(error){console.warn(label+' sync failed',error);}
        }
      }finally{
        state.running=false;
      }
    })();
  },[label]);
}

export default function App() {
  return <SafeAreaProvider>
    <MarketRuntimeProvider>
      <AiNewsRuntimeProvider>
      <SettingsRuntimeProvider>
      <ThemeRuntimeProvider>
      <MonitorSettingsRuntimeProvider>
      <WidgetSettingsRuntimeProvider>
      <BrokerSettingsRuntimeProvider>
      <FinanceProvider>
      <PageEditorProvider>
        <DiagnosticsProvider><EtfConstituentsSync/><MaintenanceProvider><AppBody/></MaintenanceProvider></DiagnosticsProvider>
      </PageEditorProvider>
      </FinanceProvider>
      </BrokerSettingsRuntimeProvider>
      </WidgetSettingsRuntimeProvider>
      </MonitorSettingsRuntimeProvider>
      </ThemeRuntimeProvider>
      </SettingsRuntimeProvider>
      </AiNewsRuntimeProvider>
    </MarketRuntimeProvider>
  </SafeAreaProvider>;
}

function AppBody(){
  const finance=useFinance();
  const market=useMarketRuntime();
  const aiNews=useAiNewsRuntime();
  const brokerSettings=useBrokerSettingsRuntime();
  const settings=useSettingsRuntime();
  const theme=useThemeRuntime();
  const monitorSettings=useMonitorSettingsRuntime();
  const widgetSettings=useWidgetSettingsRuntime();
  const editor=usePageEditor('home');
  const maintenance=useMaintenance();
  const queueWidgetSync=useLatestAsyncJob<NativeSurfaceSyncJob<WidgetConfig>>(
    job=>syncNativeWidget(job.config,job.snapshot),
    'Widget',
  );
  const queueMonitorSync=useLatestAsyncJob<NativeSurfaceSyncJob<MonitorConfig>>(
    job=>syncNativeMonitor(job.config,job.snapshot),
    'Monitor',
  );
  const {width:screenWidth}=useWindowDimensions();
  const [floatingAiOpen,setFloatingAiOpen]=useState(false);
  const [aiCollapseSignal,setAiCollapseSignal]=useState(0);
  const [active,setActive]=useState<MainPageKey>('home');
  const [detail,setDetail]=useState<HoldingQuote|null>(null);
  const [chartHolding,setChartHolding]=useState<HoldingQuote|null>(null);
  const pageHistory=useRef<MainPageKey[]>([]);
  const swipeStart=useRef<{x:number;y:number}|null>(null);
  const applyLauncherShortcut=useCallback((url:string|null|undefined)=>{
    const route=resolveLauncherShortcutUrl(url);
    if(!route)return false;
    pageHistory.current=[];
    setDetail(null);
    setChartHolding(null);
    switch(route){
      case 'buy': setActive('ledger'); break;
      case 'monitor': setActive('settings'); break;
      case 'today-pnl': setActive('home'); break;
      case 'dividend': setActive('dividend'); break;
      case 'ai': setActive('ai'); break;
    }
    return true;
  },[]);
  const navigatePage=(next:MainPageKey)=>{if(next===active)return;pageHistory.current.push(active);setActive(next);};
  const aiUi=deriveAiUiState(settings.prefs.ai,active);
  const swipeToAdjacent=(direction:-1|1)=>{
    const pages=MAIN_PAGES.filter(page=>page.key!=='ai'||aiUi.showAiTab);
    const index=pages.findIndex(page=>page.key===active);
    const target=pages[index+direction];
    if(target)navigatePage(target.key);
  };
  const onSwipeStart=(event:{nativeEvent:{pageX:number;pageY:number}})=>{
    swipeStart.current={x:event.nativeEvent.pageX,y:event.nativeEvent.pageY};
  };
  const onSwipeEnd=(event:{nativeEvent:{pageX:number;pageY:number}})=>{
    const start=swipeStart.current;swipeStart.current=null;
    if(!start||detail||chartHolding||maintenance.session||!settings.prefs.navigation.swipeEnabled)return;
    const dx=event.nativeEvent.pageX-start.x,dy=event.nativeEvent.pageY-start.y;
    if(Math.abs(dx)<settings.prefs.navigation.swipeThreshold)return;
    const direction=resolvePageSwipeDirection({startX:start.x,startY:start.y,endX:event.nativeEvent.pageX,endY:event.nativeEvent.pageY,screenWidth,enabled:settings.prefs.navigation.swipeEnabled,threshold:settings.prefs.navigation.swipeThreshold,edgeOnly:settings.prefs.navigation.swipeEdgeOnly,locked:detail!==null});
    if(direction===null)return;
    swipeToAdjacent(dx<0?1:-1);
  };
  useEffect(()=>{if(aiUi.nextActivePage!==active)setActive(aiUi.nextActivePage);},[aiUi.nextActivePage,active]);
  useEffect(()=>{
    let alive=true;
    void Linking.getInitialURL().then(url=>{if(alive)applyLauncherShortcut(url);}).catch(error=>console.warn('Launcher shortcut initial URL failed',error));
    const subscription=Linking.addEventListener('url',event=>{applyLauncherShortcut(event.url);});
    return()=>{alive=false;subscription.remove();};
  },[applyLauncherShortcut]);
  useEffect(()=>{
    const subscription=BackHandler.addEventListener('hardwareBackPress',()=>{
      // Native Modal.onRequestClose handles visible native dialogs first.
      if(maintenance.session){maintenance.cancel();return true;}
      if(chartHolding){setChartHolding(null);return true;}
      const decision=resolveBackNavigation({active,history:pageHistory.current,hasDetail:detail!==null,floatingExpanded:aiUi.showFloatingAi&&floatingAiOpen,showAiTab:aiUi.showAiTab});
      pageHistory.current=decision.history;
      if(decision.kind==='collapse-ai'){setAiCollapseSignal(value=>value+1);return true;}
      if(decision.kind==='close-detail'){setDetail(null);return true;}
      if(decision.kind==='navigate'&&decision.page){setActive(decision.page);return true;}
      return false; // Leave only from root with no back stack.
    });
    return()=>subscription.remove();
  },[active,detail,chartHolding,aiUi.showAiTab,aiUi.showFloatingAi,floatingAiOpen,maintenance.session]);
  useEffect(()=>{
    if(!maintenance.session)return;
    if(!acceptsEditorSession(maintenance.session,active,Boolean(detail),Boolean(chartHolding)))maintenance.cancel();
  },[active,detail,chartHolding,maintenance.session]);

  const aiHoldingKey=useMemo(()=>finance.holdings.map(x=>`${x.symbol}|${x.name}`).sort().join('||'),[finance.holdings]);
  useEffect(()=>{
    if(!shouldRefreshAiNews(finance.hydrated,settings.hydrated,settings.prefs.ai))return;
    aiNews.setTrackedHoldings(finance.holdings.map(x=>({symbol:x.symbol,name:x.name})));
    // Article discovery/enrichment can parse sizeable payloads. Defer it until
    // the first screen and navigation interactions have settled.
    const task=InteractionManager.runAfterInteractions(()=>{void aiNews.refresh();});
    return()=>task.cancel();
  },[finance.hydrated,settings.hydrated,settings.prefs.ai.enabled,aiHoldingKey]);

  useEffect(()=>{
    if(!finance.hydrated||!widgetSettings.hydrated)return;
    // Last-write-wins queue: a slow native/widget write can never pile up one
    // Promise per 1-second market tick. Intermediate snapshots are coalesced.
    queueWidgetSync({config:widgetSettings.config,snapshot:finance.sharedSnapshot});
  },[finance.hydrated,finance.sharedSnapshot,widgetSettings.hydrated,widgetSettings.config,queueWidgetSync]);

  useEffect(()=>{
    if(!market.hydrated)return;
    // Native buttons emit an event; foreground recovery consumes requests that
    // arrived while the JS runtime was unavailable.
    let alive=true;
    let inFlight=false;
    const poll=async()=>{
      if(!alive||inFlight||AppState.currentState!=='active')return;
      inFlight=true;
      try{
        const request=await consumeNativeMarketForceRefreshRequests();
        const requested=request.widgetAt>0||(monitorSettings.config.enabled&&request.monitorAt>0);
        if(alive&&requested)await market.refresh({force:true});
      }catch(error){
        console.warn('Native forced quote refresh poll failed',error);
      }finally{inFlight=false;}
    };
    void poll();
    const unsubscribe=subscribeNativeMarketRefreshRequests(()=>{void poll();});
    const foreground=AppState.addEventListener('change',state=>{if(state==='active')void poll();});
    return()=>{alive=false;unsubscribe();foreground.remove();};
  },[market.hydrated,market.refresh,monitorSettings.config.enabled]);

  useEffect(()=>{
    if(!finance.hydrated||!monitorSettings.hydrated||monitorSettings.config.enabled)return;
    // Disabled monitor only needs config/state transitions, not every market tick.
    queueMonitorSync({config:monitorSettings.config,snapshot:finance.sharedSnapshot});
  },[finance.hydrated,monitorSettings.hydrated,monitorSettings.config,queueMonitorSync]);

  useEffect(()=>{
    if(!finance.hydrated||!monitorSettings.hydrated||!monitorSettings.config.enabled)return;
    queueMonitorSync({config:monitorSettings.config,snapshot:finance.sharedSnapshot});
  },[finance.hydrated,finance.sharedSnapshot,monitorSettings.hydrated,monitorSettings.config,queueMonitorSync]);

  const openHolding=(holding:HoldingQuote)=>{
    recordDiagnosticEvent({level:'info',code:'HOLDING_TAP',screen:active,message:'點擊 ETF 卡片，準備開啟詳情'});
    if(!holding||typeof holding.symbol!=='string'||!holding.symbol.trim()){
      recordDiagnosticEvent({level:'error',code:'HOLDING_INVALID',screen:active,message:'持股卡片缺少有效代號，已阻止不安全的詳情切換'});
      return;
    }
    setDetail(holding);
  };
  const openChart=(holding:HoldingQuote)=>{
    recordDiagnosticEvent({level:'info',code:'HOLDING_CHART_TAP',screen:active,message:'點擊 Mini 圖表，準備開啟完整圖表頁'});
    if(!holding||typeof holding.symbol!=='string'||!holding.symbol.trim())return;
    setChartHolding(holding);
  };
  const screen=useMemo(()=>{
    if(chartHolding)return <StockChartScreen holding={chartHolding} onBack={()=>setChartHolding(null)}/>;
    if(detail) return <HoldingDetailBoundary key={detail.symbol} symbol={detail.symbol} onBack={()=>setDetail(null)}>
      <HoldingDetailScreen holding={detail} onBack={()=>setDetail(null)}/>
    </HoldingDetailBoundary>;
    switch(active){
      case 'ledger': return <LedgerScreen/>;
      case 'portfolio': return <PortfolioScreen onOpenHolding={openHolding} onOpenChart={openChart}/>;
      case 'market': return <MarketResearchScreen/>;
      case 'dividend': return <DividendScreen/>;
      case 'ai': return <AiScreen/>;
      case 'settings': return <SettingsScreen/>;
      case 'home':
      default: return <HomeScreen onOpenHolding={openHolding} onOpenChart={openChart} onNavigate={navigatePage}/>;
    }
  },[active,detail,chartHolding]);

  if(!finance.hydrated||!market.hydrated||!brokerSettings.hydrated||!settings.hydrated||!theme.hydrated||!monitorSettings.hydrated||!widgetSettings.hydrated||!editor.hydrated||!maintenance.hydrated){
    return <View style={[styles.loading,{backgroundColor:theme.palette.background}]}>
      <StatusBar barStyle={theme.palette.dark?'light-content':'dark-content'}/>
      <ActivityIndicator size="large" color={theme.palette.primary}/>
      <Text editorId="native:App:loadingTitle:1" editorReadOnly={false} style={[styles.loadingTitle,{color:theme.palette.text}]}>TF Asset</Text>
      <Text editorId="native:App:loadingText:2" editorReadOnly={false} style={[styles.loadingText,{color:theme.palette.textSecondary}]}>正在載入帳務、行情、主題與版面設定…</Text>
    </View>;
  }

  return <View style={[styles.root,{backgroundColor:theme.palette.background}]}>
    <StatusBar barStyle={theme.palette.dark?'light-content':'dark-content'}/>
    <ThemeBackgroundLayer/>
    <View style={styles.screen}>
      <View style={{flex:1}} onTouchStart={onSwipeStart} onTouchEnd={onSwipeEnd} onTouchCancel={()=>{swipeStart.current=null;}}>{screen}</View>
      {maintenance.session?<MaintenanceWorkbench/>:null}
    </View>
    {aiUi.showFloatingAi&&(!maintenance.session||maintenance.session.frameKey==='floating-ai')&&!chartHolding?<GlobalFloatingAi collapseSignal={aiCollapseSignal} onExpandedChange={setFloatingAiOpen}/>:null}
    {!detail&&!chartHolding&&(!maintenance.session||maintenance.session.frameKey==='app-navigation')?<SafeAreaView edges={['bottom']} style={[styles.navSafe,{backgroundColor:theme.palette.surface,borderTopColor:theme.palette.border}]}>
      <EditorSurface pageKey="home" frameKey="app-navigation" title="底部導覽列" fill={false} inlineWorkbench={false}>
      <View style={styles.nav}>
        {MAIN_PAGES.filter(page=>page.key!=='ai'||aiUi.showAiTab).map(page=>{
          const selected=page.key===active;
          return <Pressable editorId="native:App:navItem:5"
            key={page.key}
            accessibilityRole="tab"
            accessibilityState={{selected}}
            onPress={()=>navigatePage(page.key)}
            style={styles.navItem}
          >
            <View style={[styles.navIcon,selected&&{backgroundColor:theme.palette.surfaceMuted}]}><Text editorId="native:App:navGlyph:6" editorReadOnly={true} style={[styles.navGlyph,{color:selected?theme.palette.primary:theme.palette.textSecondary}]}>{glyph(page.key)}</Text></View>
            <Text editorId="native:App:navText:7" editorReadOnly={false} style={[styles.navText,{color:selected?theme.palette.primary:theme.palette.textSecondary}]}>{page.label}</Text>
          </Pressable>;
        })}
      </View>
      </EditorSurface>
    </SafeAreaView>:null}
  </View>;
}

function glyph(key:MainPageKey){
  switch(key){
    case 'home': return '⌂';
    case 'ledger': return '▤';
    case 'portfolio': return '◇';
    case 'market': return '⌕';
    case 'dividend': return '$';
    case 'ai': return 'AI';
    case 'settings': return '⚙';
  }
}

const styles=StyleSheet.create({
  root:{flex:1,backgroundColor:colors.background},
  screen:{flex:1},
  loading:{flex:1,alignItems:'center',justifyContent:'center',gap:8,backgroundColor:colors.background},
  loadingTitle:{fontSize:24,fontWeight:'900',color:colors.text,marginTop:8},
  loadingText:{fontSize:12,color:colors.textSecondary},
  navSafe:{backgroundColor:colors.surface,borderTopWidth:StyleSheet.hairlineWidth,borderTopColor:colors.border},
  nav:{flexDirection:'row',paddingTop:spacing.sm,paddingHorizontal:spacing.sm},
  navItem:{flex:1,alignItems:'center',gap:4,paddingVertical:4,minHeight:48},
  navIcon:{width:30,height:25,borderRadius:9,alignItems:'center',justifyContent:'center'},
  navIconActive:{backgroundColor:colors.surfaceMuted},
  navGlyph:{fontSize:15,fontWeight:'900',color:colors.textSecondary},
  navGlyphActive:{color:colors.primary},
  navText:{color:colors.textSecondary,fontSize:11,fontWeight:'700'},
  navTextSelected:{color:colors.primary},
});
