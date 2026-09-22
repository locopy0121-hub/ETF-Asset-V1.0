import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StatusBar, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { AiNewsRuntimeProvider, useAiNewsRuntime } from './src/ai/AiNewsRuntime';
import { MAIN_PAGES, type MainPageKey } from './src/domain/pageRegistry';
import type { HoldingQuote } from './src/domain/uiModels';
import { PageEditorProvider, usePageEditor } from './src/editor/pageEditor';
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
        <AppBody/>
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
  const [active,setActive]=useState<MainPageKey>('home');
  const [detail,setDetail]=useState<HoldingQuote|null>(null);
  useEffect(()=>{if(!settings.prefs.ai.enabled&&active==='ai')setActive('home');},[settings.prefs.ai.enabled,active]);

  const aiHoldingKey=useMemo(()=>finance.holdings.map(x=>`${x.symbol}|${x.name}`).sort().join('||'),[finance.holdings]);
  useEffect(()=>{
    if(!finance.hydrated)return;
    aiNews.setTrackedHoldings(finance.holdings.map(x=>({symbol:x.symbol,name:x.name})));
    void aiNews.refresh();
  },[finance.hydrated,aiHoldingKey]);

  useEffect(()=>{
    if(!finance.hydrated||!widgetSettings.hydrated)return;
    void syncNativeWidget(widgetSettings.config,finance.sharedSnapshot);
  },[finance.hydrated,finance.sharedSnapshot,widgetSettings.hydrated,widgetSettings.config]);

  useEffect(()=>{
    if(!market.hydrated)return;
    void consumeNativeWidgetForceRefreshRequest().then(requestedAt=>{
      if(requestedAt>0)void market.refresh({force:true});
    });
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

  if(!finance.hydrated||!market.hydrated||!brokerSettings.hydrated||!settings.hydrated||!theme.hydrated||!monitorSettings.hydrated||!widgetSettings.hydrated||!editor.hydrated){
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
    <View style={styles.screen}>{screen}</View>
    {settings.prefs.ai.enabled&&settings.prefs.ai.floatingButton?<GlobalFloatingAi/>:null}
    {!detail?<SafeAreaView edges={['bottom']} style={[styles.navSafe,{backgroundColor:theme.palette.surface,borderTopColor:theme.palette.border}]}>
      <View style={styles.nav}>
        {MAIN_PAGES.filter(page=>page.key!=='ai'||settings.prefs.ai.enabled).map(page=>{
          const selected=page.key===active;
          return <Pressable
            key={page.key}
            accessibilityRole="tab"
            accessibilityState={{selected}}
            onPress={()=>setActive(page.key)}
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
