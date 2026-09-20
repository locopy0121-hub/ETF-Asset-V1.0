import { Pressable, StyleSheet, Text, View } from 'react-native';

import { activeMonitorLayout, setMonitorMode, type MonitorConfig, type MonitorMode } from '../../monitor/monitorDomain';
import { colors, radius, spacing } from '../../theme/tokens';

type Props = {
  value: MonitorConfig;
  onChange: (value: MonitorConfig) => void;
};

const modes: readonly MonitorMode[] = ['normal', 'mini'];

export function MonitorControlPanel({ value, onChange }: Props) {
  const activeLayout = activeMonitorLayout(value);
  return <View style={styles.card}>
    <View style={styles.header}>
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>Floating Monitor 控制</Text>
        <Text style={styles.sub}>跨 App 浮動視窗；Normal / Mini 版面物理隔離。</Text>
      </View>
      <Pressable
        onPress={() => onChange({ ...value, enabled: !value.enabled })}
        style={[styles.pill, value.enabled && styles.pillActive]}
      >
        <Text style={[styles.pillText, value.enabled && styles.pillTextActive]}>{value.enabled ? '已啟用' : '未啟用'}</Text>
      </Pressable>
    </View>
    <Text style={styles.label}>顯示模式</Text>
    <View style={styles.row}>
      {modes.map(mode => <Pressable key={mode} onPress={() => onChange(setMonitorMode(value, mode))} style={[styles.choice, value.mode === mode && styles.choiceActive]}>
        <Text style={[styles.choiceText, value.mode === mode && styles.choiceTextActive]}>{mode === 'normal' ? 'Normal' : 'Mini'}</Text>
      </Pressable>)}
    </View>
    <View style={styles.layoutCard}>
      <Text style={styles.layoutTitle}>目前模式版面</Text>
      <Text style={styles.layoutText}>x {activeLayout.x} · y {activeLayout.y} · {activeLayout.width} × {activeLayout.height}</Text>
    </View>
    <Text style={styles.note}>切換模式只讀取對應 Layout；調整目前模式不得覆寫另一模式 Layout。</Text>
  </View>;
}

const styles = StyleSheet.create({
  card:{backgroundColor:colors.surfaceMuted,borderRadius:radius.lg,padding:spacing.md,borderWidth:1,borderColor:colors.border,gap:8},
  header:{flexDirection:'row',alignItems:'center',gap:8},
  title:{fontSize:14,fontWeight:'900',color:colors.text},
  sub:{fontSize:10,lineHeight:15,color:colors.textSecondary,marginTop:2},
  pill:{paddingHorizontal:10,paddingVertical:7,borderRadius:999,backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border},
  pillActive:{backgroundColor:colors.primary,borderColor:colors.primary},
  pillText:{fontSize:10,fontWeight:'800',color:colors.textSecondary},
  pillTextActive:{color:'#FFFFFF'},
  label:{fontSize:10,fontWeight:'900',color:colors.textSecondary,marginTop:2},
  row:{flexDirection:'row',gap:6},
  choice:{paddingHorizontal:12,paddingVertical:7,borderRadius:radius.md,backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border},
  choiceActive:{borderColor:colors.primary},
  choiceText:{fontSize:10,fontWeight:'800',color:colors.textSecondary},
  choiceTextActive:{color:colors.primary},
  layoutCard:{padding:10,borderRadius:radius.md,backgroundColor:colors.surface},
  layoutTitle:{fontSize:9,fontWeight:'900',color:colors.textSecondary},
  layoutText:{fontSize:11,fontWeight:'900',color:colors.text,marginTop:3},
  note:{fontSize:9,lineHeight:14,color:colors.textSecondary},
});
