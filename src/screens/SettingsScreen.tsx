import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { PageShell } from '../components/PageShell';
import { PAGE_FRAMES } from '../domain/frameRegistry';
import { colors, radius, spacing } from '../theme/tokens';

const children:Record<string,readonly string[]>={
  general:['顯示與主題','通知與提醒','數字格式'],
  accounting:['券商與費率參數','交易預設值','股息帳務'],
  plugins:['Widget（mobile 桌面）','Floating Monitor（浮動即時視窗）'],
  system:['行情與更新','背景執行與權限','效能與診斷'],
  backup:['建立備份','還原資料','匯入 / 匯出'],
  disclaimer:['免責聲明','隱私資訊','版本資訊'],
};

export function SettingsScreen() {
  const [open,setOpen]=useState<string|null>('plugins');
  return <PageShell title="控制中心" subtitle="主設定負責全局；各頁齒輪負責該頁框架">
    <View style={styles.ruleCard}>
      <Text style={styles.ruleTitle}>A-B 關係層定律</Text>
      <Text style={styles.ruleText}>每個實際框架就是設定大項 A；展開後才顯示直接 B 層。B 可成為下一層新的 A，禁止跨層直接控制。</Text>
    </View>
    {PAGE_FRAMES.settings.map(frame=>{
      const expanded=open===frame.key;
      return <View key={frame.key} style={styles.section}>
        <Pressable onPress={()=>setOpen(expanded?null:frame.key)} style={styles.header}>
          <View style={{flex:1}}><Text style={styles.title}>{frame.title}</Text><Text style={styles.description}>{frame.description}</Text></View>
          <Text style={styles.toggle}>{expanded?'−':'+'}</Text>
        </Pressable>
        {expanded?<View style={styles.body}>
          {(children[frame.key]??[]).map((item,index)=><Pressable key={item} style={styles.row}>
            <View style={styles.index}><Text style={styles.indexText}>{index+1}</Text></View>
            <Text style={styles.rowLabel}>{item}</Text>
            <Text style={styles.arrow}>›</Text>
          </Pressable>)}
          {frame.key==='plugins'?<View style={styles.pluginRule}><Text style={styles.pluginRuleTitle}>外掛分離原則</Text><Text style={styles.pluginRuleText}>Widget 只存在 mobile 桌面；Floating Monitor 是跨 App 浮動即時視窗。共用資料，不共用產品邏輯與控制 UI。</Text></View>:null}
        </View>:null}
      </View>;
    })}
  </PageShell>;
}

const styles=StyleSheet.create({
  ruleCard:{backgroundColor:colors.surfaceMuted,borderRadius:radius.lg,padding:spacing.lg,borderWidth:1,borderColor:colors.border},
  ruleTitle:{fontSize:14,fontWeight:'900',color:colors.primary},
  ruleText:{fontSize:11,lineHeight:18,color:colors.textSecondary,marginTop:6},
  section:{backgroundColor:colors.surface,borderRadius:radius.lg,borderWidth:1,borderColor:colors.border,overflow:'hidden'},
  header:{padding:spacing.lg,flexDirection:'row',alignItems:'center',gap:spacing.md},
  title:{fontSize:17,fontWeight:'900',color:colors.text},
  description:{fontSize:11,color:colors.textSecondary,marginTop:3},
  toggle:{fontSize:25,fontWeight:'700',color:colors.primary},
  body:{paddingHorizontal:spacing.lg,paddingBottom:spacing.lg,borderTopWidth:StyleSheet.hairlineWidth,borderTopColor:colors.border},
  row:{paddingVertical:13,flexDirection:'row',alignItems:'center',gap:10,borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:colors.border},
  index:{width:24,height:24,borderRadius:12,backgroundColor:colors.surfaceMuted,alignItems:'center',justifyContent:'center'},
  indexText:{fontSize:10,fontWeight:'900',color:colors.primary},
  rowLabel:{flex:1,fontSize:13,fontWeight:'800',color:colors.text},
  arrow:{fontSize:22,color:colors.textSecondary},
  pluginRule:{marginTop:12,padding:12,borderRadius:radius.md,backgroundColor:colors.surfaceMuted},
  pluginRuleTitle:{fontSize:11,fontWeight:'900',color:colors.primary},
  pluginRuleText:{fontSize:10,lineHeight:16,color:colors.textSecondary,marginTop:4},
});
