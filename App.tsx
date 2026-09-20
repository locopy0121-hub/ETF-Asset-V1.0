import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StatusBar, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { MAIN_PAGES, type MainPageKey } from './src/domain/pageRegistry';
import type { HoldingQuote } from './src/domain/uiModels';
import { PageEditorProvider, usePageEditor } from './src/editor/pageEditor';
import { BrokerSettingsRuntimeProvider, useBrokerSettingsRuntime } from './src/finance/BrokerSettingsRuntime';
import { FinanceProvider, useFinance } from './src/finance/FinanceRuntime';
import { MarketRuntimeProvider, useMarketRuntime } from './src/market/MarketRuntime';
import { MonitorSettingsRuntimeProvider, useMonitorSettingsRuntime } from './src/monitor/MonitorSettingsRuntime';
import { WidgetSettingsRuntimeProvider, useWidgetSettingsRuntime } from './src/widget/WidgetSettingsRuntime';
import { DividendScreen } from './src/screens/DividendScreen';
import { HoldingDetailScreen } from './src/screens/HoldingDetailScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { LedgerScreen } from './src/screens/LedgerScreen';
import { PortfolioScreen } from './src/screens/PortfolioScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { SettingsRuntimeProvider, useSettingsRuntime } from './src/settings/SettingsRuntime';
import { colors, spacing } from './src/theme/tokens';
import { syncNativeMonitor, syncNativeWidget, startNativeMonitor, stopNativeMonitor } from './src/native/TfAssetNativeBridge';

export default function App() {
  return <SafeAreaProvider>
    <MarketRuntimeProvider>
      <SettingsRuntimeProvider>
      <MonitorSettingsRuntimeProvider>
      <WidgetSettingsRuntimeProvider>
      <BrokerSettingsRuntimeProvider>
      <FinanceProvider>
      <PageEditorProvider>
        <StatusBar barStyle="dark-content"/>
        <AppBody/>
      </PageEditorProvider>
      </FinanceProvider>
      </BrokerSettingsRuntimeProvider>
      </WidgetSettingsRuntimeProvider>
      </MonitorSettingsRuntimeProvider>
      </SettingsRuntimeProvider>
    </MarketRuntimeProvider>
  </SafeAreaProvider>;
}

function AppBody(){
  const finance=useFinance();
  const market=useMarketRuntime();
  const brokerSettings=useBrokerSettingsRuntime();
  const settings=useSettingsRuntime();
  const monitorSettings=useMonitorSettingsRuntime();
  const widgetSettings=useWidgetSettingsRuntime();
  const editor=usePageEditor('home');
  const [active,setActive]=useState<MainPageKey>('home');
  const [detail,setDetail]=useState<HoldingQuote|null>(null);

  useEffect(()=>{
    if(!finance.hydrated||!widgetSettings.hydrated)return;
    void syncNativeWidget(widgetSettings.config,finance.sharedSnapshot);
  },[finance.hydrated,finance.sharedSnapshot,widgetSettings.hydrated,widgetSettings.config]);

  useEffect(()=>{
    if(!finance.hydrated||!monitorSettings.hydrated)return;
    void syncNativeMonitor(monitorSettings.config,finance.sharedSnapshot);
    if(monitorSettings.config.enabled)void startNativeMonitor();
    else void stopNativeMonitor();
  },[finance.hydrated,finance.sharedSnapshot,monitorSettings.hydrated,monitorSettings.config]);

  const openHolding=(holding:HoldingQuote)=>setDetail(holding);
  const screen=useMemo(()=>{
    if(detail) return <HoldingDetailScreen holding={detail} onBack={()=>setDetail(null)}/>;
    switch(active){
      case 'ledger': return <LedgerScreen/>;
      case 'portfolio': return <PortfolioScreen onOpenHolding={openHolding}/>;
      case 'dividend': return <DividendScreen/>;
      case 'settings': return <SettingsScreen/>;
      case 'home':
      default: return <HomeScreen onOpenHolding={openHolding}/>;
    }
  },[active,detail]);

  if(!finance.hydrated||!market.hydrated||!brokerSettings.hydrated||!settings.hydrated||!monitorSettings.hydrated||!widgetSettings.hydrated||!editor.hydrated){
    return <View style={styles.loading}>
      <ActivityIndicator size="large" color={colors.primary}/>
      <Text style={styles.loadingTitle}>TF Asset</Text>
      <Text style={styles.loadingText}>正在載入帳務、行情與版面設定…</Text>
    </View>;
  }

  return <View style={styles.root}>
    <View style={styles.screen}>{screen}</View>
    {!detail?<SafeAreaView edges={['bottom']} style={styles.navSafe}>
      <View style={styles.nav}>
        {MAIN_PAGES.map(page=>{
          const selected=page.key===active;
          return <Pressable
            key={page.key}
            accessibilityRole="tab"
            accessibilityState={{selected}}
            onPress={()=>setActive(page.key)}
            style={styles.navItem}
          >
            <View style={[styles.navIcon,selected&&styles.navIconActive]}><Text style={[styles.navGlyph,selected&&styles.navGlyphActive]}>{glyph(page.key)}</Text></View>
            <Text style={[styles.navText,selected&&styles.navTextSelected]}>{page.label}</Text>
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
