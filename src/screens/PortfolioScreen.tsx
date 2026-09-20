import { Pressable, StyleSheet, Text, View } from 'react-native';

import { FrameCard } from '../components/FrameCard';
import { PageShell } from '../components/PageShell';
import { colors, radius, spacing } from '../theme/tokens';

export function PortfolioScreen() {
  return (
    <PageShell
      title="持股分析"
      subtitle="清單與行情牆雙模式"
      actions={<><Action label="🧮" /><Action label="⚙" /></>}
    >
      <FrameCard title="持股分析儀表板">
        <View style={styles.row}><Metric label="總市值" /><Metric label="總成本" /><Metric label="總損益" /><Metric label="含息報酬" /></View>
      </FrameCard>
      <FrameCard title="資產配置"><Text style={styles.muted}>分類與圖表資料將由 Snapshot 層提供。</Text></FrameCard>
      <FrameCard title="持股清單"><Text style={styles.muted}>骨架固定、資料欄位可調。第一欄固定為 ETF 代號＋名稱。</Text></FrameCard>
    </PageShell>
  );
}

function Action({ label }: { label: string }) { return <Pressable style={styles.action}><Text style={styles.actionText}>{label}</Text></Pressable>; }
function Metric({ label }: { label: string }) { return <View style={styles.metric}><Text style={styles.metricLabel}>{label}</Text><Text style={styles.metricValue}>—</Text></View>; }

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  metric: { width: '48%', backgroundColor: colors.surfaceMuted, borderRadius: radius.md, padding: spacing.md },
  metricLabel: { color: colors.textSecondary, fontSize: 12, fontWeight: '700' },
  metricValue: { color: colors.text, fontSize: 18, fontWeight: '900', marginTop: 6 },
  action: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  actionText: { fontSize: 20 },
  muted: { color: colors.textSecondary, lineHeight: 20 },
});
