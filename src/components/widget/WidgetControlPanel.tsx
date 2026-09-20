import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { WidgetConfig, WidgetSize, WidgetTemplate } from '../../widget/widgetDomain';
import { colors, radius, spacing } from '../../theme/tokens';

type Props = {
  value: WidgetConfig;
  onChange: (value: WidgetConfig) => void;
};

const sizes: readonly WidgetSize[] = ['small', 'medium', 'large'];
const templates: readonly WidgetTemplate[] = ['asset-summary', 'quote-summary', 'compact'];

export function WidgetControlPanel({ value, onChange }: Props) {
  return <View style={styles.card}>
    <View style={styles.header}>
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>Widget 控制</Text>
        <Text style={styles.sub}>Android mobile 桌面元件；只讀 Shared Snapshot。</Text>
      </View>
      <Pressable
        onPress={() => onChange({ ...value, enabled: !value.enabled })}
        style={[styles.pill, value.enabled && styles.pillActive]}
      >
        <Text style={[styles.pillText, value.enabled && styles.pillTextActive]}>{value.enabled ? '已啟用' : '未啟用'}</Text>
      </Pressable>
    </View>
    <Text style={styles.label}>尺寸</Text>
    <View style={styles.row}>
      {sizes.map(size => <Pressable key={size} onPress={() => onChange({ ...value, size })} style={[styles.choice, value.size === size && styles.choiceActive]}>
        <Text style={[styles.choiceText, value.size === size && styles.choiceTextActive]}>{size}</Text>
      </Pressable>)}
    </View>
    <Text style={styles.label}>模板</Text>
    <View style={styles.row}>
      {templates.map(template => <Pressable key={template} onPress={() => onChange({ ...value, template })} style={[styles.choice, value.template === template && styles.choiceActive]}>
        <Text style={[styles.choiceText, value.template === template && styles.choiceTextActive]}>{template}</Text>
      </Pressable>)}
    </View>
    <Text style={styles.note}>Widget 與 Floating Monitor 共用資料契約，但不共用產品狀態與控制 UI。</Text>
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
  row:{flexDirection:'row',flexWrap:'wrap',gap:6},
  choice:{paddingHorizontal:9,paddingVertical:7,borderRadius:radius.md,backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border},
  choiceActive:{borderColor:colors.primary},
  choiceText:{fontSize:10,fontWeight:'800',color:colors.textSecondary},
  choiceTextActive:{color:colors.primary},
  note:{fontSize:9,lineHeight:14,color:colors.textSecondary,marginTop:2},
});
