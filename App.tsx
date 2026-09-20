import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { MAIN_PAGES, type MainPageKey } from './src/domain/pageRegistry';
import type { HoldingQuote } from './src/domain/uiModels';
import { DividendScreen } from './src/screens/DividendScreen';
import { HoldingDetailScreen } from './src/screens/HoldingDetailScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { LedgerScreen } from './src/screens/LedgerScreen';
import { PortfolioScreen } from './src/screens/PortfolioScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { colors, spacing } from './src/theme/tokens';

export default function App() {
  const [active,setActive]=useState<MainPageKey>('home');
  const [detail,setDetail]=useState<HoldingQuote|null>(null);

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

  return <SafeAreaProvider>
    <StatusBar style="dark"/>
    <View style={styles.root}>
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
    </View>
  </SafeAreaProvider>;
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
  navSafe:{backgroundColor:colors.surface,borderTopWidth:StyleSheet.hairlineWidth,borderTopColor:colors.border},
  nav:{flexDirection:'row',paddingTop:spacing.sm,paddingHorizontal:spacing.sm},
  navItem:{flex:1,alignItems:'center',gap:4,paddingVertical:4},
  navIcon:{width:30,height:25,borderRadius:9,alignItems:'center',justifyContent:'center'},
  navIconActive:{backgroundColor:colors.surfaceMuted},
  navGlyph:{fontSize:15,fontWeight:'900',color:colors.textSecondary},
  navGlyphActive:{color:colors.primary},
  navText:{color:colors.textSecondary,fontSize:11,fontWeight:'700'},
  navTextSelected:{color:colors.primary},
});
