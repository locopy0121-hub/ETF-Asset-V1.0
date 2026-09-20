import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { MAIN_PAGES, type MainPageKey } from './src/domain/pageRegistry';
import { HomeScreen } from './src/screens/HomeScreen';
import { LedgerScreen } from './src/screens/LedgerScreen';
import { PortfolioScreen } from './src/screens/PortfolioScreen';
import { DividendScreen } from './src/screens/DividendScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { colors, spacing } from './src/theme/tokens';

export default function App() {
  const [active, setActive] = useState<MainPageKey>('home');

  const screen = useMemo(() => {
    switch (active) {
      case 'ledger': return <LedgerScreen />;
      case 'portfolio': return <PortfolioScreen />;
      case 'dividend': return <DividendScreen />;
      case 'settings': return <SettingsScreen />;
      case 'home':
      default: return <HomeScreen />;
    }
  }, [active]);

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <View style={styles.root}>
        <View style={styles.screen}>{screen}</View>
        <SafeAreaView edges={['bottom']} style={styles.navSafe}>
          <View style={styles.nav}>
            {MAIN_PAGES.map((page) => {
              const selected = page.key === active;
              return (
                <Pressable
                  key={page.key}
                  accessibilityRole="tab"
                  accessibilityState={{ selected }}
                  onPress={() => setActive(page.key)}
                  style={styles.navItem}
                >
                  <View style={[styles.navDot, selected && styles.navDotSelected]} />
                  <Text style={[styles.navText, selected && styles.navTextSelected]}>{page.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </SafeAreaView>
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  screen: { flex: 1 },
  navSafe: {
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  nav: { flexDirection: 'row', paddingTop: spacing.sm, paddingHorizontal: spacing.sm },
  navItem: { flex: 1, alignItems: 'center', gap: 5, paddingVertical: 6 },
  navDot: { width: 22, height: 4, borderRadius: 999, backgroundColor: colors.border },
  navDotSelected: { backgroundColor: colors.primary },
  navText: { color: colors.textSecondary, fontSize: 12, fontWeight: '700' },
  navTextSelected: { color: colors.primary },
});
