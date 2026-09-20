import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { FrameCard } from '../components/FrameCard';
import { MetricTile } from '../components/MetricTile';
import { PageEditorStack } from '../components/PageEditorStack';
import { PageFrameSettingsModal } from '../components/PageFrameSettingsModal';
import { PageGearButton } from '../components/PageGearButton';
import { SegmentedControl } from '../components/SegmentedControl';
import { PageShell } from '../components/PageShell';
import { DEMO_LEDGER } from '../data/demoData';
import { PAGE_FRAMES } from '../domain/frameRegistry';
import { colors, radius, spacing } from '../theme/tokens';

type EntryKind='買進'|'賣出'|'股息'|'其他';
const money=(v:number)=>Math.round(v).toLocaleString('zh-TW');

export function LedgerScreen() {
  const [settingsOpen,setSettingsOpen]=useState(false);
  const [kind,setKind]=useState<EntryKind>('買進');
  return <>
    <PageShell title="帳務中心" subtitle="紀錄是帳務真值來源" actions={<PageGearButton onPress={()=>setSettingsOpen(true)}/>}>
      <PageEditorStack pageKey="ledger" frames={[
        {key:'quick-entry',element:
          <FrameCard title="快速建檔">
            <SegmentedControl items={[{key:'買進',label:'買進'},{key:'賣出',label:'賣出'},{key:'股息',label:'股息'},{key:'其他',label:'其他'}] as const} value={kind} onChange={setKind}/>
            <View style={styles.form}>
              <Field label="標的" placeholder="ETF 代號或名稱"/>
              <View style={styles.two}><Field label="日期" placeholder="2026-09-20"/><Field label={kind==='股息'?'金額':'成交價格'} placeholder="0"/></View>
              {kind!=='股息'&&kind!=='其他'?<View style={styles.two}><Field label="股數" placeholder="0"/><Field label="實際手續費" placeholder="actualFee"/></View>:null}
              {kind==='賣出'?<Field label="實際證交稅" placeholder="actualTax"/>:null}
              <Field label="備註" placeholder="選填"/>
              <Pressable style={styles.primary}><Text style={styles.primaryText}>建立{kind}紀錄</Text></Pressable>
              <Text style={styles.coreNote}>公式預估只供核對；正式入帳後 actualFee / actualTax 為歷史真值，UI 不自行重算。</Text>
            </View>
          </FrameCard>
        },
        {key:'ledger-list',element:
          <FrameCard title="交易紀錄">
            <View style={styles.tableHead}><Text style={[styles.headText,{flex:0.8}]}>日期</Text><Text style={[styles.headText,{flex:0.8}]}>類型</Text><Text style={[styles.headText,{flex:1}]}>標的</Text><Text style={[styles.headText,{flex:1.4,textAlign:'right'}]}>金額</Text></View>
            {DEMO_LEDGER.map(row=><View key={row.id} style={styles.tableRow}>
              <Text style={[styles.cell,{flex:0.8}]}>{row.date}</Text>
              <Text style={[styles.cell,{flex:0.8,color:row.kind==='賣出'?colors.loss:row.kind==='買進'?colors.primary:colors.gain,fontWeight:'800'}]}>{row.kind}</Text>
              <Text style={[styles.cell,{flex:1,fontWeight:'800'}]}>{row.symbol}</Text>
              <View style={{flex:1.4,alignItems:'flex-end'}}><Text style={styles.amount}>NT$ {money(row.amount)}</Text><Text style={styles.fee}>費/稅 {row.fee??0}/{row.tax??0}</Text></View>
            </View>)}
          </FrameCard>
        },
        {key:'monthly-summary',element:
          <FrameCard title="月度摘要">
            <View style={styles.metrics}>
              <MetricTile label="本月買進" value="157,050" caption="2 筆"/>
              <MetricTile label="本月賣出" value="18,420" caption="1 筆"/>
              <MetricTile label="本月股息" value="1,850" caption="1 筆" tone="gain"/>
              <MetricTile label="淨現金流" value="-136,780" caption="交易＋股息"/>
            </View>
          </FrameCard>
        },
      ]}/>
    </PageShell>
    <PageFrameSettingsModal visible={settingsOpen} pageKey="ledger" title="紀錄" frames={PAGE_FRAMES.ledger} onClose={()=>setSettingsOpen(false)}/>
  </>;
}

function Field({label,placeholder}:{label:string;placeholder:string}){
  return <View style={{flex:1}}><Text style={styles.fieldLabel}>{label}</Text><TextInput style={styles.input} placeholder={placeholder} placeholderTextColor="#98A5B8"/></View>;
}
const styles=StyleSheet.create({
  form:{gap:spacing.md},
  two:{flexDirection:'row',gap:spacing.sm},
  fieldLabel:{fontSize:11,fontWeight:'800',color:colors.textSecondary,marginBottom:5},
  input:{backgroundColor:colors.surfaceMuted,borderRadius:radius.md,borderWidth:1,borderColor:colors.border,paddingHorizontal:12,paddingVertical:11,color:colors.text,fontSize:13},
  primary:{backgroundColor:colors.primary,borderRadius:radius.md,paddingVertical:13,alignItems:'center'},
  primaryText:{color:'#FFF',fontWeight:'900'},
  coreNote:{fontSize:10,lineHeight:16,color:colors.textSecondary},
  tableHead:{flexDirection:'row',paddingBottom:8,borderBottomWidth:1,borderBottomColor:colors.border},
  headText:{fontSize:10,fontWeight:'800',color:colors.textSecondary},
  tableRow:{flexDirection:'row',alignItems:'center',paddingVertical:12,borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:colors.border},
  cell:{fontSize:12,color:colors.text},
  amount:{fontSize:12,fontWeight:'900',color:colors.text},
  fee:{fontSize:9,color:colors.textSecondary,marginTop:2},
  metrics:{flexDirection:'row',gap:spacing.sm,flexWrap:'wrap'},
});
