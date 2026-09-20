import { StyleSheet, Text, View } from 'react-native';

import { FrameCard } from '../components/FrameCard';
import { PageShell } from '../components/PageShell';
import { colors, radius, spacing } from '../theme/tokens';

export function LedgerScreen() {
  return (
    <PageShell title="帳務中心" subtitle="紀錄是帳務真值來源">
      <FrameCard title="快速建檔">
        <View style={styles.pills}>{['買進', '賣出', '股息', '其他'].map((v, i) => <View key={v} style={[styles.pill, i === 0 && styles.pillActive]}><Text style={[styles.pillText, i === 0 && styles.pillTextActive]}>{v}</Text></View>)}</View>
      </FrameCard>
      <FrameCard title="交易紀錄"><Text style={styles.muted}>正式 Ledger schema 將由 Finance Core migration 定義。</Text></FrameCard>
      <FrameCard title="月度摘要"><Text style={styles.muted}>買進、賣出、股息與現金流摘要。</Text></FrameCard>
    </PageShell>
  );
}

const styles = StyleSheet.create({
  pills: { flexDirection: 'row', gap: spacing.sm },
  pill: { flex: 1, borderRadius: radius.pill, paddingVertical: 10, alignItems: 'center', backgroundColor: colors.surfaceMuted },
  pillActive: { backgroundColor: colors.primary },
  pillText: { color: colors.textSecondary, fontWeight: '800' },
  pillTextActive: { color: '#FFFFFF' },
  muted: { color: colors.textSecondary, lineHeight: 20 },
});
