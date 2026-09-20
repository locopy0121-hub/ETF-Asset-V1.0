import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { FrameCard } from '../components/FrameCard';
import { HoldingQuoteModule } from '../components/HoldingQuoteModule';
import { MetricTile } from '../components/MetricTile';
import { PageFrameSettingsModal } from '../components/PageFrameSettingsModal';
import { PageGearButton } from '../components/PageGearButton';
import { SegmentedControl } from '../components/SegmentedControl';
import { PageShell } from '../components/PageShell';
import { DEMO_HOLDINGS } from '../data/demoData';
import { PAGE_FRAMES } from '../domain/frameRegistry';
import { sortHoldingQuotes } from '../domain/holdingSort';
import type { HoldingQuote, HoldingSortKey, QuoteModuleStyle } from '../domain/uiModels';
import { colors, radius, spacing } from '../theme/tokens';

type ViewMode='list'|'wall';
const money=(v:number)=>Math.round(v).toLocaleString('zh-TW');

export function PortfolioScreen({onOpenHolding}:{onOpenHolding:(holding:HoldingQuote)=>void}) {
  const [settingsOpen,setSettingsOpen]=useState(false);
  const [calculatorOpen,setCalculatorOpen]=useState(false);
  const [viewMode,setViewMode]=useState<ViewMode>('list');
  const [quoteStyle,setQuoteStyle]=useState<QuoteModuleStyle>('chart');
  const [sortKey,setSortKey]=useState<HoldingSortKey>('manual');
  const sorted=useMemo(()=>sortHoldingQuotes(DEMO_HOLDINGS,sortKey,true),[sortKey]);
  const totalMarket=DEMO_HOLDINGS.reduce((s,x)=>s+x.marketValue,0);
  const totalCost=DEMO_HOLDINGS.reduce((s,x)=>s+x.avgCost*x.shares,0);
  const totalPnl=DEMO_HOLDINGS.reduce((s,x)=>s+x.pnl,0);
  return <>
    <PageShell
      title="持股分析"
      subtitle="清單與行情牆雙模式"
      actions={<><PageGearButton label="🧮" onPress={()=>setCalculatorOpen(true)}/><PageGearButton onPress={()=>setSettingsOpen(true)}/></>}
    >
      <FrameCard title="持股分析儀表板">
        <View style={styles.metrics}>
          <MetricTile label="總市值" value={money(totalMarket)} caption="NT$"/>
          <MetricTile label="總成本" value={money(totalCost)} caption="NT$"/>
          <MetricTile label="總損益" value={money(totalPnl)} caption="持股" tone={totalPnl>=0?'gain':'loss'}/>
          <MetricTile label="含息報酬" value="+16.82%" caption="示意" tone="gain"/>
        </View>
      </FrameCard>

      <FrameCard title="資產配置">
        {sorted.map(item=><View key={item.symbol} style={styles.allocationRow}>
          <View style={styles.allocationLabel}><Text style={styles.allocationSymbol}>{item.symbol}</Text><Text style={styles.allocationPct}>{item.weight.toFixed(1)}%</Text></View>
          <View style={styles.track}><View style={[styles.fill,{width:`${Math.min(100,item.weight*2)}%`}]}/></View>
        </View>)}
      </FrameCard>

      <FrameCard title="持股檢視">
        <SegmentedControl items={[{key:'list',label:'清單模式'},{key:'wall',label:'行情牆模式'}] as const} value={viewMode} onChange={setViewMode}/>
        <View style={styles.sortRow}>
          <Text style={styles.sortTitle}>排序</Text>
          {([{key:'manual',label:'手動'},{key:'pnl',label:'損益'},{key:'roi',label:'報酬率'},{key:'marketValue',label:'市值'}] as const).map(x=>
            <Pressable key={x.key} onPress={()=>setSortKey(x.key)} style={[styles.chip,sortKey===x.key&&styles.chipActive]}>
              <Text style={[styles.chipText,sortKey===x.key&&styles.chipTextActive]}>{x.label}</Text>
            </Pressable>
          )}
        </View>

        {viewMode==='list'?<HoldingTable rows={sorted} onOpenHolding={onOpenHolding}/>:<>
          <SegmentedControl
            items={[{key:'quote',label:'純行情'},{key:'chart',label:'＋圖表'},{key:'compact',label:'精簡'},{key:'advanced',label:'進階'}] as const}
            value={quoteStyle}
            onChange={setQuoteStyle}
          />
          <View style={styles.quoteList}>{sorted.map(item=><HoldingQuoteModule key={item.symbol} item={item} style={quoteStyle} onPress={()=>onOpenHolding(item)}/>)}</View>
        </>}
      </FrameCard>
    </PageShell>

    <PageFrameSettingsModal visible={settingsOpen} title="庫存" frames={PAGE_FRAMES.portfolio} onClose={()=>setSettingsOpen(false)}/>
    <CalculatorModal visible={calculatorOpen} onClose={()=>setCalculatorOpen(false)}/>
  </>;
}

function HoldingTable({rows,onOpenHolding}:{rows:HoldingQuote[];onOpenHolding:(row:HoldingQuote)=>void}){
  return <View style={styles.tableOuter}>
    <View style={styles.tableHeader}>
      <Text style={[styles.tableHeadText,{width:128}]}>ETF代號｜名稱</Text>
      <Text style={[styles.tableHeadText,{width:62,textAlign:'right'}]}>股數</Text>
      <Text style={[styles.tableHeadText,{width:72,textAlign:'right'}]}>即時</Text>
      <Text style={[styles.tableHeadText,{width:72,textAlign:'right'}]}>均價</Text>
      <Text style={[styles.tableHeadText,{width:92,textAlign:'right'}]}>損益</Text>
      <Text style={[styles.tableHeadText,{width:68,textAlign:'right'}]}>報酬率</Text>
    </View>
    <ScrollView horizontal showsHorizontalScrollIndicator>
      <View>
        {rows.map(row=><Pressable key={row.symbol} onPress={()=>onOpenHolding(row)} style={styles.tableRow}>
          <View style={{width:128}}><Text style={styles.symbolStrong}>{row.symbol}</Text><Text numberOfLines={1} style={styles.nameSmall}>{row.name}</Text></View>
          <Text style={[styles.numberCell,{width:62}]}>{money(row.shares)}</Text>
          <Text style={[styles.numberCell,{width:72,color:row.price>=row.previousClose?colors.gain:colors.loss}]}>{row.price.toFixed(2)}</Text>
          <Text style={[styles.numberCell,{width:72}]}>{row.avgCost.toFixed(2)}</Text>
          <Text style={[styles.numberCell,{width:92,color:row.pnl>=0?colors.gain:colors.loss}]}>NT$ {money(row.pnl)}</Text>
          <Text style={[styles.numberCell,{width:68,color:row.roi>=0?colors.gain:colors.loss}]}>{row.roi>=0?'+':''}{row.roi.toFixed(2)}%</Text>
        </Pressable>)}
      </View>
    </ScrollView>
    <Text style={styles.tableRule}>骨架固定：第一欄代號＋名稱、表頭與互動固定；資料欄位可顯示／隱藏、排序與調整寬度。</Text>
  </View>;
}

function CalculatorModal({visible,onClose}:{visible:boolean;onClose:()=>void}){
  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <View style={styles.modalBackdrop}><View style={styles.calculator}>
      <View style={styles.modalTop}><View><Text style={styles.modalKicker}>庫存工具</Text><Text style={styles.modalTitle}>持股試算</Text></View><Pressable onPress={onClose}><Text style={styles.done}>完成</Text></Pressable></View>
      <Text style={styles.modalHint}>試算資料與正式帳務隔離；只有明確建立紀錄才寫入 Ledger。</Text>
      <View style={styles.calcGrid}><CalcField label="標的" placeholder="0050"/><CalcField label="目前股數" placeholder="3,000"/><CalcField label="加碼價格" placeholder="109.85"/><CalcField label="加碼股數" placeholder="1,000"/></View>
      <View style={styles.result}><Text style={styles.resultLabel}>試算後均價</Text><Text style={styles.resultValue}>—</Text></View>
    </View></View>
  </Modal>;
}
function CalcField({label,placeholder}:{label:string;placeholder:string}){return <View style={{width:'48%'}}><Text style={styles.fieldLabel}>{label}</Text><TextInput style={styles.input} placeholder={placeholder} placeholderTextColor="#98A5B8"/></View>}

const styles=StyleSheet.create({
  metrics:{flexDirection:'row',gap:spacing.sm,flexWrap:'wrap'},
  allocationRow:{gap:6},
  allocationLabel:{flexDirection:'row',justifyContent:'space-between'},
  allocationSymbol:{fontSize:11,fontWeight:'800',color:colors.text},
  allocationPct:{fontSize:10,fontWeight:'800',color:colors.textSecondary},
  track:{height:7,borderRadius:4,backgroundColor:colors.surfaceMuted,overflow:'hidden'},
  fill:{height:'100%',backgroundColor:colors.primary,borderRadius:4},
  sortRow:{flexDirection:'row',gap:6,alignItems:'center',flexWrap:'wrap'},
  sortTitle:{fontSize:11,fontWeight:'800',color:colors.textSecondary},
  chip:{paddingHorizontal:10,paddingVertical:6,borderRadius:radius.pill,backgroundColor:colors.surfaceMuted},
  chipActive:{backgroundColor:colors.primary},
  chipText:{fontSize:10,fontWeight:'800',color:colors.textSecondary},
  chipTextActive:{color:'#FFF'},
  quoteList:{gap:spacing.sm},
  tableOuter:{gap:8},
  tableHeader:{flexDirection:'row',backgroundColor:colors.surfaceMuted,borderRadius:radius.md,paddingHorizontal:8,paddingVertical:9},
  tableHeadText:{fontSize:9,fontWeight:'900',color:colors.textSecondary},
  tableRow:{flexDirection:'row',alignItems:'center',paddingHorizontal:8,paddingVertical:11,minWidth:494,borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:colors.border},
  symbolStrong:{fontSize:12,fontWeight:'900',color:colors.text},
  nameSmall:{fontSize:9,color:colors.textSecondary,marginTop:2},
  numberCell:{fontSize:11,fontWeight:'800',color:colors.text,textAlign:'right',fontVariant:['tabular-nums']},
  tableRule:{fontSize:10,color:colors.textSecondary,lineHeight:16},
  modalBackdrop:{flex:1,justifyContent:'flex-end',backgroundColor:'rgba(12,18,27,0.35)'},
  calculator:{backgroundColor:colors.surface,borderTopLeftRadius:24,borderTopRightRadius:24,padding:spacing.xl,paddingBottom:44,gap:spacing.lg},
  modalTop:{flexDirection:'row',justifyContent:'space-between',alignItems:'flex-start'},
  modalKicker:{fontSize:11,fontWeight:'800',color:colors.primary},
  modalTitle:{fontSize:25,fontWeight:'900',color:colors.text},
  done:{fontSize:14,fontWeight:'900',color:colors.primary},
  modalHint:{fontSize:11,lineHeight:17,color:colors.textSecondary},
  calcGrid:{flexDirection:'row',flexWrap:'wrap',gap:spacing.sm},
  fieldLabel:{fontSize:10,fontWeight:'800',color:colors.textSecondary,marginBottom:5},
  input:{backgroundColor:colors.surfaceMuted,borderRadius:radius.md,borderWidth:1,borderColor:colors.border,padding:11,color:colors.text},
  result:{backgroundColor:colors.surfaceMuted,borderRadius:radius.lg,padding:spacing.lg,flexDirection:'row',justifyContent:'space-between'},
  resultLabel:{fontWeight:'800',color:colors.textSecondary},
  resultValue:{fontSize:20,fontWeight:'900',color:colors.primary},
});
