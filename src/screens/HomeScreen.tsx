import { StyleSheet, Text, View } from 'react-native';

import { FrameCard } from '../components/FrameCard';
import { PageShell } from '../components/PageShell';
import { colors, spacing } from '../theme/tokens';

export function HomeScreen() {
  return (
    <PageShell title="資產儀表板" subtitle="快速掌握資產、行情與損益">
      <FrameCard title="資產儀表板">
        <Text style={styles.heroLabel}>總資產</Text>
        <Text style={styles.heroValue}>NT$ 0</Text>
        <View style={styles.row}>
          <Metric label="今日損益" value="—" />
          <Metric label="本月股息" value="—" />
          <Metric label="年度股息" value="—" />
        </View>
      </FrameCard>
      <FrameCard title="市場新聞"><Text style={styles.muted}>新聞資料源將於資料層接入。</Text></FrameCard>
      <FrameCard title="持股行情模塊"><Text style={styles.muted}>共用行情模塊將在主 UI 階段接入。</Text></FrameCard>
      <FrameCard title="損益明細"><Text style={styles.muted}>由 Canonical Finance Core 提供唯一真值。</Text></FrameCard>
    </PageShell>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <View style={styles.metric}><Text style={styles.metricLabel}>{label}</Text><Text style={styles.metricValue}>{value}</Text></View>;
}

const styles = StyleSheet.create({
  heroLabel: { color: colors.textSecondary, fontSize: 13 },
  heroValue: { color: colors.text, fontSize: 32, fontWeight: '900' },
  row: { flexDirection: 'row', gap: spacing.sm },
  metric: { flex: 1, backgroundColor: colors.surfaceMuted, borderRadius: 12, padding: spacing.md },
  metricLabel: { color: colors.textSecondary, fontSize: 11, fontWeight: '700' },
  metricValue: { color: colors.text, marginTop: 6, fontSize: 15, fontWeight: '800' },
  muted: { color: colors.textSecondary, lineHeight: 20 },
});
