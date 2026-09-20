import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  activeMonitorFields,
  activeMonitorLayout,
  restoreNormalMonitor,
  setMonitorMode,
  updateMonitorFields,
  type MonitorConfig,
  type MonitorField,
  type MonitorMode,
} from '../../monitor/monitorDomain';
import { colors, radius, spacing } from '../../theme/tokens';

type Props = {
  value: MonitorConfig;
  onChange: (value: MonitorConfig) => void;
};

const modes: readonly MonitorMode[] = ['normal', 'mini'];
const fields: readonly MonitorField[] = ['symbol','price','changePercent','marketValue','pnl'];
const labels:Record<MonitorField,string>={symbol:'代號',price:'價格',changePercent:'漲跌%',marketValue:'市值',pnl:'損益'};

export function MonitorControlPanel({ value, onChange }: Props) {
  const activeLayout = activeMonitorLayout(value);
  const activeFields = activeMonitorFields(value);
  const toggleField=(field:MonitorField)=>{
    const next=activeFields.includes(field)?activeFields.filter(x=>x!==field):[...activeFields,field];
    onChange(updateMonitorFields(value,next));
  };
  return <View style={styles.card}>
    <View style={styles.header}>
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>Floating Monitor 控制</Text>
        <Text style={styles.sub}>跨 App 浮動視窗；Normal / Mini 版面與顯示欄位物理隔離。</Text>
      </View>
      <Pressable onPress={() => onChange({ ...value, enabled: !value.enabled })} style={[styles.pill, value.enabled && styles.pillActive]}>
        <Text style={[styles.pillText, value.enabled && styles.pillTextActive]}>{value.enabled ? '已啟用' : '未啟用'}</Text>
      </Pressable>
    </View>

    <Text style={styles.label}>顯示模式</Text>
    <View style={styles.row}>
      {modes.map(mode => <Pressable key={mode} onPress={() => onChange(setMonitorMode(value, mode))} style={[styles.choice, value.mode === mode && styles.choiceActive]}>
        <Text style={[styles.choiceText, value.mode === mode && styles.choiceTextActive]}>{mode === 'normal' ? 'Normal' : 'Mini'}</Text>
      </Pressable>)}
      {value.mode==='mini'?<Pressable onPress={()=>onChange(restoreNormalMonitor(value))} style={styles.choice}><Text style={styles.choiceText}>雙擊還原語意</Text></Pressable>:null}
    </View>

    <Text style={styles.label}>{value.mode==='normal'?'Normal':'Mini'} 顯示欄位</Text>
    <View style={styles.row}>{fields.map(field=><Pressable key={field} onPress={()=>toggleField(field)} style={[styles.choice,activeFields.includes(field)&&styles.choiceActive]}><Text style={[styles.choiceText,activeFields.includes(field)&&styles.choiceTextActive]}>{labels[field]}</Text></Pressable>)}</View>

    <View style={styles.layoutCard}>
      <Text style={styles.layoutTitle}>目前模式版面</Text>
      <Text style={styles.layoutText}>x {activeLayout.x} · y {activeLayout.y} · {activeLayout.width} × {activeLayout.height}</Text>
    </View>

    <Pressable onPress={()=>onChange({...value,showBreathingLight:!value.showBreathingLight})} style={[styles.choice,value.showBreathingLight&&styles.choiceActive]}>
      <Text style={[styles.choiceText,value.showBreathingLight&&styles.choiceTextActive]}>呼吸燈 {value.showBreathingLight?'開':'關'}</Text>
    </Pressable>
    <Text style={styles.note}>Monitor 只讀 Shared Snapshot；呼吸燈只反映刷新狀態，警報只比較 Snapshot 漲跌幅，不重算任何帳務資料。</Text>
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
  row:{flexDirection:'row',gap:6,flexWrap:'wrap'},
  choice:{paddingHorizontal:12,paddingVertical:7,borderRadius:radius.md,backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border},
  choiceActive:{borderColor:colors.primary},
  choiceText:{fontSize:10,fontWeight:'800',color:colors.textSecondary},
  choiceTextActive:{color:colors.primary},
  layoutCard:{padding:10,borderRadius:radius.md,backgroundColor:colors.surface},
  layoutTitle:{fontSize:9,fontWeight:'900',color:colors.textSecondary},
  layoutText:{fontSize:11,fontWeight:'900',color:colors.text,marginTop:3},
  note:{fontSize:9,lineHeight:14,color:colors.textSecondary},
});
