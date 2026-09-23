import type { PropsWithChildren, ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, spacing } from '../theme/tokens';
import type { MainPageKey } from '../domain/pageRegistry';
import { useSettingsRuntime } from '../settings/SettingsRuntime';
import { resolvePageTitle } from '../settings/settingsControlBehavior';
import { useThemeRuntime } from '../theme/ThemeRuntime';

type Props = PropsWithChildren<{
  title: string;
  pageKey?: MainPageKey;
  subtitle?: string;
  actions?: ReactNode;
}>;

export function PageShell({ title, pageKey, subtitle, actions, children }: Props) {
  const theme=useThemeRuntime();
  const settings=useSettingsRuntime();
  const displayedTitle=pageKey?resolvePageTitle(pageKey,title,settings.prefs.pageTitles):title;
  return (
    <SafeAreaView style={[styles.safe,{backgroundColor:'transparent'}]} edges={['top']}>
      <View style={[styles.header,{backgroundColor:theme.palette.surface,borderBottomColor:theme.palette.border}]}>
        <View style={styles.titleWrap}>
          <Text style={[styles.brand,{color:theme.palette.primary}]}>TF Asset</Text>
          <Text style={[styles.title,{color:theme.palette.text}]}>{displayedTitle}</Text>
          {subtitle ? <Text style={[styles.subtitle,{color:theme.palette.textSecondary}]}>{subtitle}</Text> : null}
        </View>
        {actions ? <View style={styles.actions}>{actions}</View> : null}
      </View>
      <KeyboardAvoidingView style={styles.keyboard} behavior={Platform.OS==='ios'?'padding':undefined}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
  },
  titleWrap: { flex: 1 },
  brand: { color: colors.primary, fontSize: 13, fontWeight: '800', letterSpacing: 0.4 },
  title: { color: colors.text, fontSize: 28, fontWeight: '800', marginTop: 2 },
  subtitle: { color: colors.textSecondary, fontSize: 13, marginTop: 4 },
  actions: { marginLeft: spacing.md, flexDirection: 'row', gap: spacing.sm },
  keyboard: { flex: 1 },
  scroll: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: 110, gap: spacing.lg },
});
