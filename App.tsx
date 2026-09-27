import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, AppState, BackHandler, Pressable, StatusBar, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { AiNewsRuntimeProvider, useAiNewsRuntime } from './src/ai/AiNewsRuntime';
import { MAIN_PAGES, type MainPageKey } from './src/domain/pageRegistry';
import {resolveBackNavigation,resolvePageSwipeDirection} from './src/domain/navigationGestures';
import type { HoldingQuote } from './src/domain/uiModels';
import { PageEditorProvider, usePageEditor } from './src/editor/pageEditor';
import {MaintenanceProvider,useMaintenance} from './src/maintenance/MaintenanceRuntime';
import {MaintenanceWorkbench} from './src/maintenance/MaintenanceWorkbench';
import { BrokerSettingsRuntimeProvider, useBrokerSettingsRuntime } from './src/finance/BrokerSettingsRuntime';
import { FinanceProvider, useFinance } from './src/finance/FinanceRuntime';
import { MarketRuntimeProvider, useMarketRuntime } from './src/market/MarketRuntime';
import { MonitorSettingsRuntimeProvider, useMonitorSettingsRuntime } from './src/monitor/MonitorSettingsRuntime';
import { WidgetSettingsRuntimeProvider, useWidgetSettingsRuntime } from './src/widget/WidgetSettingsRuntime';
import { GlobalFloatingAi } from './src/components/GlobalFloatingAi';
import { AiScreen } from './src/screens/AiScreen';
import { DividendScreen } from './src/screens/DividendScreen';
import { HoldingDetailScreen } from './src/screens/HoldingDetailScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { LedgerScreen } from './src/screens/LedgerScreen';
import { PortfolioScreen } from './src/screens/PortfolioScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { SettingsRuntimeProvider, useSettingsRuntime } from './src/settings/SettingsRuntime';
import { deriveAiUiState, shouldRefreshAiNews } from './src/settings/settingsControlBehavior';
import { colors, spacing } from './src/theme/tokens';
import { ThemeRuntimeProvider, useThemeRuntime } from './src/theme/ThemeRuntime';
import { ThemeBackgroundLayer } from './src/theme/ThemeBackgroundLayer';
import { consumeNativeMonitorForceRefreshRequest, consumeNativeWidgetForceRefreshRequest, syncNativeMonitor, syncNativeWidget } from './src/native/TfAssetNativeBridge';

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
        <MaintenanceProvider><AppBody/></MaintenanceProvider>
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
  const {width:screenWidth}=useWindowDimensions();
  const [floatingAiOpen,setFloatingAiOpen]=useState(false);
  const [aiCollapseSignal,setAiCollapseSignal]=useState(0);
  const [active,setActive]=useState<MainPageKey>('home');
  const [detail,setDetail]=useState<HoldingQuote|null>(null);
  const pageHistory=useRef<MainPageKey[]>([]);
  const swipeStart=useRef<{x:number;y:number}|null>(null);
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
    if(!start||detail||maintenance.session||!settings.prefs.navigation.swipeEnabled)return;
    const dx=event.nativeEvent.pageX-start.x,dy=event.nativeEvent.pageY-start.y;
    if(Math.abs(dx)<settings.prefs.navigation.swipeThreshold)return;
    const direction=resolvePageSwipeDirection({startX:start.x,startY:start.y,endX:event.nativeEvent.pageX,endY:event.nativeEvent.pageY,screenWidth,enabled:settings.prefs.navigation.swipeEnabled,threshold:settings.prefs.navigation.swipeThreshold,edgeOnly:settings.prefs.navigation.swipeEdgeOnly,locked:detail!==null});
    if(direction===null)return;
    swipeToAdjacent(dx<0?1:-1);
  };
  useEffect(()=>{if(aiUi.nextActivePage!==active)setActive(aiUi.nextActivePage);},[aiUi.nextActivePage,active]);
  useEffect(()=>{
    const subscription=BackHandler.addEventListener('hardwareBackPress',()=>{
      // Native Modal.onRequestClose handles visible native dialogs first.
      if(maintenance.session){maintenance.cancel();return true;}
      const decision=resolveBackNavigation({active,history:pageHistory.current,hasDetail:detail!==null,floatingExpanded:aiUi.showFloatingAi&&floatingAiOpen,showAiTab:aiUi.showAiTab});
      pageHistory.current=decision.history;
      if(decision.kind==='collapse-ai'){setAiCollapseSignal(value=>value+1);return true;}
      if(decision.kind==='close-detail'){setDetail(null);return true;}
      if(decision.kind==='navigate'&&decision.page){setActive(decision.page);return true;}
      return false; // Leave only from root with no back stack.
    });
    return()=>subscription.remove();
  },[active,detail,aiUi.showAiTab,aiUi.showFloatingAi,floatingAiOpen,maintenance.session]);
  useEffect(()=>{
    if(maintenance.session&&(maintenance.session.page!==active||detail))maintenance.cancel();
  },[active,detail,maintenance.session]);

  const aiHoldingKey=useMemo(()=>finance.holdings.map(x=>`${x.symbol}|${x.name}`).sort().join('||'),[finance.holdings]);
  useEffect(()=>{
    if(!shouldRefreshAiNews(finance.hydrated,settings.hydrated,settings.prefs.ai))return;
    aiNews.setTrackedHoldings(finance.holdings.map(x=>({symbol:x.symbol,name:x.name})));
    void aiNews.refresh();
  },[finance.hydrated,settings.hydrated,settings.prefs.ai.enabled,aiHoldingKey]);

  useEffect(()=>{
    if(!finance.hydrated||!widgetSettings.hydrated)return;
    void syncNativeWidget(widgetSettings.config,finance.sharedSnapshot);
  },[finance.hydrated,finance.sharedSnapshot,widgetSettings.hydrated,widgetSettings.config]);

  useEffect(()=>{
    if(!market.hydrated)return;
    // The Android widget receiver can deliver a new tap without remounting React.
    // Consume requests while the app is foregrounded, and once upon resuming.
    let alive=true;
    let inFlight=false;
    const poll=async()=>{
      if(!alive||inFlight)return;
      inFlight=true;
      try{
        const requestedAt=await consumeNativeWidgetForceRefreshRequest();
        if(alive&&requestedAt>0)await market.refresh({force:true});
      }catch(error){
        console.warn('Widget forced quote refresh failed',error);
      }finally{inFlight=false;}
    };
    void poll();
    const widgetTimer=setInterval(()=>{if(AppState.currentState==='active')void poll();},1000);
    const foreground=AppState.addEventListener('change',state=>{
      if(state==='active')void poll();
    });
    return()=>{alive=false;clearInterval(widgetTimer);foreground.remove();};
  },[market.hydrated,market.refresh]);

  useEffect(()=>{
    if(!market.hydrated||!monitorSettings.config.enabled)return;
    const poll=()=>void consumeNativeMonitorForceRefreshRequest().then(requestedAt=>{if(requestedAt>0)void market.refresh({force:true});});
    poll();
    const timer=setInterval(poll,1000);
    return()=>clearInterval(timer);
  },[market.hydrated,market.refresh,monitorSettings.config.enabled]);

  useEffect(()=>{
    if(!finance.hydrated||!monitorSettings.hydrated)return;
    void syncNativeMonitor(monitorSettings.config,finance.sharedSnapshot);
  },[finance.hydrated,finance.sharedSnapshot,monitorSettings.hydrated,monitorSettings.config]);

  const openHolding=(holding:HoldingQuote)=>setDetail(holding);
  const screen=useMemo(()=>{
    if(detail) return <HoldingDetailScreen holding={detail} onBack={()=>setDetail(null)}/>;
    switch(active){
      case 'ledger': return <LedgerScreen/>;
      case 'portfolio': return <PortfolioScreen onOpenHolding={openHolding}/>;
      case 'dividend': return <DividendScreen/>;
      case 'ai': return <AiScreen/>;
      case 'settings': return <SettingsScreen/>;
      case 'home':
      default: return <HomeScreen onOpenHolding={openHolding}/>;
    }
  },[active,detail]);

  if(!finance.hydrated||!market.hydrated||!brokerSettings.hydrated||!settings.hydrated||!theme.hydrated||!monitorSettings.hydrated||!widgetSettings.hydrated||!editor.hydrated||!maintenance.hydrated){
    return <View style={[styles.loading,{backgroundColor:theme.palette.background}]}>
      <StatusBar barStyle={theme.palette.dark?'light-content':'dark-content'}/>
      <ActivityIndicator size="large" color={theme.palette.primary}/>
      <Text style={[styles.loadingTitle,{color:theme.palette.text}]}>TF Asset</Text>
      <Text style={[styles.loadingText,{color:theme.palette.textSecondary}]}>正在載入帳務、行情、主題與版面設定…</Text>
    </View>;
  }

  return <View style={[styles.root,{backgroundColor:theme.palette.background}]}>
    <StatusBar barStyle={theme.palette.dark?'light-content':'dark-content'}/>
    <ThemeBackgroundLayer/>
    <View style={styles.screen}>
      <View style={{flex:1}} onTouchStart={onSwipeStart} onTouchEnd={onSwipeEnd} onTouchCancel={()=>{swipeStart.current=null;}}>{screen}</View>
      {maintenance.session?<MaintenanceWorkbench/>:null}
    </View>
    {aiUi.showFloatingAi&&!maintenance.session?<GlobalFloatingAi collapseSignal={aiCollapseSignal} onExpandedChange={setFloatingAiOpen}/>:null}
    {!detail&&!maintenance.session?<SafeAreaView edges={['bottom']} style={[styles.navSafe,{backgroundColor:theme.palette.surface,borderTopColor:theme.palette.border}]}>
      <View style={styles.nav}>
        {MAIN_PAGES.filter(page=>page.key!=='ai'||aiUi.showAiTab).map(page=>{
          const selected=page.key===active;
          return <Pressable
            key={page.key}
            accessibilityRole="tab"
            accessibilityState={{selected}}
            onPress={()=>navigatePage(page.key)}
            style={styles.navItem}
          >
            <View style={[styles.navIcon,selected&&{backgroundColor:theme.palette.surfaceMuted}]}><Text style={[styles.navGlyph,{color:selected?theme.palette.primary:theme.palette.textSecondary}]}>{glyph(page.key)}</Text></View>
            <Text style={[styles.navText,{color:selected?theme.palette.primary:theme.palette.textSecondary}]}>{page.label}</Text>
          </Pressable>;
        })}
      </View>
    </SafeAreaView>:null}
  </View>;
}

function glyph(key:MainPageKey){
  switch(key){
    case 'home': return '⌂';
    case 'ledger': return '▤';
    case 'portfolio': return '◇';
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
