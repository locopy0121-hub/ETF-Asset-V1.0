import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { PageFrameDefinition } from '../domain/frameRegistry';
import { colors, radius, spacing } from '../theme/tokens';

export function PageFrameSettingsModal({visible,title,frames,onClose}:{visible:boolean;title:string;frames:readonly PageFrameDefinition[];onClose:()=>void}){
  const [open,setOpen]=useState<string|null>(null);
  return <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
    <View style={styles.root}>
      <View style={styles.top}>
        <View style={{flex:1}}>
          <Text style={styles.kicker}>頁面框架設定</Text>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.hint}>每一個實際框架就是大項 A；展開後才進入 B 層設定。</Text>
        </View>
        <Pressable style={styles.close} onPress={onClose}><Text style={styles.closeText}>完成</Text></Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {frames.map(frame=>{
          const expanded=open===frame.key;
          return <View key={frame.key} style={styles.section}>
            <Pressable style={styles.header} onPress={()=>setOpen(expanded?null:frame.key)}>
              <View style={{flex:1}}>
                <Text style={styles.sectionTitle}>{frame.title}</Text>
                <Text style={styles.description}>{frame.description}</Text>
              </View>
              <Text style={styles.toggle}>{expanded?'−':'+'}</Text>
            </Pressable>
            {expanded?<View style={styles.body}>
              <SettingRow label="顯示內容" value="依框架資料" />
              <SettingRow label="版面" value="標準" />
              <SettingRow label="外觀" value="跟隨頁面主題" />
              <SettingRow label="排序 / 行為" value="依框架能力" />
              <Text style={styles.rule}>B 層只管理「{frame.title}」，不可直接改動其他框架。</Text>
            </View>:null}
          </View>;
        })}
      </ScrollView>
    </View>
  </Modal>;
}

function SettingRow({label,value}:{label:string;value:string}){
  return <View style={styles.row}><Text style={styles.rowLabel}>{label}</Text><Text style={styles.rowValue}>{value}  ›</Text></View>;
}

const styles=StyleSheet.create({
  root:{flex:1,backgroundColor:colors.background},
  top:{paddingTop:56,paddingHorizontal:spacing.lg,paddingBottom:spacing.lg,backgroundColor:colors.surface,borderBottomWidth:1,borderBottomColor:colors.border,flexDirection:'row',gap:spacing.md},
  kicker:{fontSize:12,fontWeight:'800',color:colors.primary},
  title:{fontSize:26,fontWeight:'900',color:colors.text,marginTop:4},
  hint:{fontSize:12,color:colors.textSecondary,lineHeight:18,marginTop:5},
  close:{alignSelf:'flex-start',paddingHorizontal:14,paddingVertical:10,borderRadius:radius.pill,backgroundColor:colors.primary},
  closeText:{color:'#FFFFFF',fontWeight:'800'},
  content:{padding:spacing.lg,gap:spacing.md,paddingBottom:48},
  section:{backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border,borderRadius:radius.lg,overflow:'hidden'},
  header:{padding:spacing.lg,flexDirection:'row',alignItems:'center',gap:spacing.md},
  sectionTitle:{fontSize:17,fontWeight:'900',color:colors.text},
  description:{fontSize:12,color:colors.textSecondary,marginTop:4},
  toggle:{fontSize:25,color:colors.primary,fontWeight:'600'},
  body:{paddingHorizontal:spacing.lg,paddingBottom:spacing.lg,borderTopWidth:StyleSheet.hairlineWidth,borderTopColor:colors.border},
  row:{paddingVertical:13,flexDirection:'row',justifyContent:'space-between',gap:spacing.md,borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:colors.border},
  rowLabel:{fontWeight:'800',color:colors.text},
  rowValue:{color:colors.textSecondary},
  rule:{fontSize:11,lineHeight:17,color:colors.primary,marginTop:12,fontWeight:'700'},
});
