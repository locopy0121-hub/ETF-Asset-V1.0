import type { PropsWithChildren, ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { spacing } from '../theme/tokens';
import { useThemeRuntime } from '../theme/ThemeRuntime';
import { ThemeBackdrop } from './ThemeBackdrop';

type Props = PropsWithChildren<{
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}>;

export function PageShell({ title, subtitle, actions, children }: Props) {
  const theme=useThemeRuntime();
  const c=theme.state.palette;
  return (
    <ThemeBackdrop><SafeAreaView style={styles.safe} edges={['top']}>
      <View style={[styles.header,{backgroundColor:c.surface,borderBottomColor:c.border}]}>
        <View style={styles.titleWrap}>
          <Text style={[styles.brand,{color:c.primary}]}>TF Asset</Text>
          <Text style={[styles.title,{color:c.text}]}>{title}</Text>
          {subtitle ? <Text style={[styles.subtitle,{color:c.textSecondary}]}>{subtitle}</Text> : null}
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
    </SafeAreaView></ThemeBackdrop>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'transparent' },
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
  },
  titleWrap: { flex: 1 },
  brand: { fontSize: 13, fontWeight: '800', letterSpacing: 0.4 },
  title: { fontSize: 28, fontWeight: '800', marginTop: 2 },
  subtitle: { fontSize: 13, marginTop: 4 },
  actions: { marginLeft: spacing.md, flexDirection: 'row', gap: spacing.sm },
  keyboard: { flex: 1 },
  scroll: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: 110, gap: spacing.lg },
});
