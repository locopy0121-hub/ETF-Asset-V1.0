import { StyleSheet, Text, View } from 'react-native';

import { FrameCard } from '../components/FrameCard';
import { PageShell } from '../components/PageShell';
import { colors, spacing } from '../theme/tokens';

export function DividendScreen() {
  return (
    <PageShell title="股息中心" subtitle="股息月曆是必要主框架">
      <FrameCard title="股息摘要">
        <View style={styles.row}><Metric label="本月入金" /><Metric label="年度股息 Total" /><Metric label="月平均股息" /></View>
      </FrameCard>
      <FrameCard title="股息月曆"><Text style={styles.muted}>預估 / 待入帳 / 已入帳將有獨立狀態。</Text></FrameCard>
      <FrameCard title="股息清單"><Text style={styles.muted}>點擊日期展開事件；點擊標的進入相關詳情。</Text></FrameCard>
      <FrameCard title="年度趨勢"><Text style={styles.muted}>1–12 月股息趨勢。</Text></FrameCard>
    </PageShell>
  );
}

function Metric({ label }: { label: string }) { return <View style={styles.metric}><Text style={styles.metricLabel}>{label}</Text><Text style={styles.metricValue}>—</Text></View>; }
const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm },
  metric: { flex: 1 },
  metricLabel: { color: colors.textSecondary, fontSize: 11, fontWeight: '700' },
  metricValue: { color: colors.text, marginTop: 6, fontSize: 16, fontWeight: '900' },
  muted: { color: colors.textSecondary, lineHeight: 20 },
});
