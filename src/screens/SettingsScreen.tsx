import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { PageShell } from '../components/PageShell';
import { colors, radius, spacing } from '../theme/tokens';

const SECTIONS = ['一般設定', '帳務設定', '外掛設定', '系統設定', '資料備份', '免責聲明'] as const;

export function SettingsScreen() {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <PageShell title="控制中心" subtitle="所有設定採收合式關係層">
      {SECTIONS.map((section) => {
        const expanded = open === section;
        return (
          <View key={section} style={styles.section}>
            <Pressable style={styles.header} onPress={() => setOpen(expanded ? null : section)}>
              <Text style={styles.title}>{section}</Text><Text style={styles.chevron}>{expanded ? '⌃' : '⌄'}</Text>
            </Pressable>
            {expanded ? <View style={styles.body}><Text style={styles.bodyText}>{section} 的直接 B 層設定將在此呈現；禁止跨框架混合設定。</Text></View> : null}
          </View>
        );
      })}
    </PageShell>
  );
}

const styles = StyleSheet.create({
  section: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  header: { padding: spacing.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { color: colors.text, fontSize: 17, fontWeight: '800' },
  chevron: { color: colors.primary, fontSize: 22, fontWeight: '800' },
  body: { padding: spacing.lg, paddingTop: 0 },
  bodyText: { color: colors.textSecondary, lineHeight: 20 },
});
