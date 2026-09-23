import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { FrameCard } from '../components/FrameCard';
import { HoldingQuoteCollection, type HoldingLayoutMode } from '../components/HoldingQuoteCollection';
import { MetricTile } from '../components/MetricTile';
import { PageEditorStack } from '../components/PageEditorStack';
import { PageFrameSettingsModal } from '../components/PageFrameSettingsModal';
import { PageGearButton } from '../components/PageGearButton';
import { SegmentedControl } from '../components/SegmentedControl';
import { PageShell } from '../components/PageShell';
import { PAGE_FRAMES } from '../domain/frameRegistry';
import { usePageEditor } from '../editor/pageEditor';
import { sortHoldingQuotes } from '../domain/holdingSort';
import type { HoldingQuote, HoldingSortKey, QuoteModuleStyle } from '../domain/uiModels';
import { calculateBuyScenario } from '../finance/canonicalLedger';
import { useFinance } from '../finance/FinanceRuntime';
import { useMarketRuntime } from '../market/MarketRuntime';
import { colors, radius, spacing } from '../theme/tokens';

type ViewMode='list'|'wall';
const money=(v:number)=>Math.round(v).toLocaleString('zh-TW');
const number=(v:string)=>{const n=Number(v.replace(/,/g,''));return Number.isFinite(n)?n:0;};

export function PortfolioScreen({onOpenHolding}:{onOpenHolding:(holding:HoldingQuote)=>void}) {
  const finance=useFinance();
  const market=useMarketRuntime();
  const [settingsOpen,setSettingsOpen]=useState(false);
  const [calculatorOpen,setCalculatorOpen]=useState(false);
  const editor=usePageEditor('portfolio');
  const viewMode=(editor.displayConfig.portfolioViewMode??'list') as ViewMode;
  const quoteStyle=(editor.displayConfig.quoteStyle??'chart') as QuoteModuleStyle;
  const sortKey=(editor.displayConfig.sortKey??'manual') as HoldingSortKey;
  const holdingLayoutMode=(editor.displayConfig.holdingLayoutMode??'list') as HoldingLayoutMode;
  const setViewMode=(value:ViewMode)=>editor.updateDisplayConfig({portfolioViewMode:value});
  const setQuoteStyle=(value:QuoteModuleStyle)=>editor.updateDisplayConfig({quoteStyle:value});
  const setSortKey=(value:HoldingSortKey)=>editor.updateDisplayConfig({sortKey:value});
  const setHoldingLayoutMode=(value:HoldingLayoutMode)=>editor.updateDisplayConfig({holdingLayoutMode:value});
  const sorted=useMemo(()=>{
    const tags=new Map(market.catalog.map(item=>[item.symbol,item]));
    return sortHoldingQuotes(finance.holdings,sortKey,true).map(item=>({
      ...item,etfType:tags.get(item.symbol)?.etfType??null,
      dividendType:tags.get(item.symbol)?.dividendType??null,
    }));
  },[finance.holdings,sortKey,market.catalog]);
  const portfolio=finance.snapshot.portfolio;

  return <>
    <PageShell
      pageKey="portfolio"
      title="持股分析"
      subtitle="正式 Canonical Portfolio"
      actions={<><PageGearButton label="🧮" onPress={()=>setCalculatorOpen(true)}/><PageGearButton onPress={()=>setSettingsOpen(true)}/></>}
    >
      <PageEditorStack pageKey="portfolio" frames={[
        {key:'holding-dashboard',element:
          <FrameCard title="持股分析儀表板">
            <View style={styles.metrics}>
              <MetricTile label="總市值" value={money(portfolio.totalMarketValue)} caption="NT$"/>
              <MetricTile label="純成交成本" value={money(portfolio.totalTradeCost)} caption="不含費"/>
              <MetricTile label="含費成本" value={money(portfolio.totalInvestmentCost)} caption="Canonical"/>
              <MetricTile label="含息總損益" value={money(portfolio.totalPnl)} caption="已實現＋未實現＋股息" tone={portfolio.totalPnl>=0?'gain':'loss'}/>
            </View>
          </FrameCard>
        },
        {key:'allocation',element:
          <FrameCard title="資產配置">
            {sorted.map(item=><View key={item.symbol} style={styles.allocationRow}>
              <View style={styles.allocationLabel}><Text style={styles.allocationSymbol}>{item.symbol}</Text><Text style={styles.allocationPct}>{item.weight.toFixed(1)}%</Text></View>
              <View style={styles.track}><View style={[styles.fill,{width:`${Math.min(100,Math.max(0,item.weight))}%`}]}/></View>
            </View>)}
          </FrameCard>
        },
        {key:'holding-view',element:
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
              <View style={styles.sortRow}>
                <Text style={styles.sortTitle}>排列</Text>
                {([
                  {key:'list',label:'單欄'},
                  {key:'grid2',label:'雙欄'},
                  {key:'grid3',label:'三欄'},
                  {key:'horizontal',label:'橫滑'},
                  {key:'paged2',label:'雙欄滑動'},
                ] as const).map(x=>
                  <Pressable key={x.key} onPress={()=>setHoldingLayoutMode(x.key)} style={[styles.chip,holdingLayoutMode===x.key&&styles.chipActive]}>
                    <Text style={[styles.chipText,holdingLayoutMode===x.key&&styles.chipTextActive]}>{x.label}</Text>
                  </Pressable>
                )}
              </View>
              <HoldingQuoteCollection rows={sorted} style={quoteStyle} layoutMode={holdingLayoutMode} {...(editor.displayConfig.holdingWall?{wallConfig:editor.displayConfig.holdingWall}:{})} refreshToken={finance.sharedSnapshot.generatedAt} onOpenHolding={onOpenHolding}/>
              <Text style={styles.tableRule}>共 {sorted.length} 筆持股；排列模式不限制資料筆數。</Text>
            </>}
          </FrameCard>
        },
      ]}/>
    </PageShell>

    <PageFrameSettingsModal visible={settingsOpen} pageKey="portfolio" title="庫存" frames={PAGE_FRAMES.portfolio} previewQuote={sorted[0]} onClose={()=>setSettingsOpen(false)}/>
    <CalculatorModal visible={calculatorOpen} onClose={()=>setCalculatorOpen(false)}/>
  </>;
}

function HoldingTable({rows,onOpenHolding}:{rows:HoldingQuote[];onOpenHolding:(row:HoldingQuote)=>void}){
  const rowHeight=54;
  return <View style={styles.tableOuter}>
    <View style={styles.tableSplit}>
      <View style={styles.fixedColumn}>
        <View style={[styles.fixedHeader,{height:38}]}><Text style={styles.tableHeadText}>ETF代號｜名稱</Text></View>
        {rows.map(row=><Pressable key={row.symbol} onPress={()=>onOpenHolding(row)} style={[styles.fixedRow,{height:rowHeight}]}>
          <Text style={styles.symbolStrong}>{row.symbol}</Text>
          <Text numberOfLines={1} style={styles.nameSmall}>{row.name}</Text>
        </Pressable>)}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={styles.scrollTable}>
        <View>
          <View style={[styles.rightHeader,{height:38}]}>
            <Head width={64} label="股數"/><Head width={70} label="即時"/><Head width={76} label="純均價"/><Head width={76} label="含費均價"/><Head width={92} label="損益"/><Head width={70} label="報酬率"/>
          </View>
          {rows.map(row=><Pressable key={row.symbol} onPress={()=>onOpenHolding(row)} style={[styles.rightRow,{height:rowHeight}]}>
            <Cell width={64} value={money(row.shares)}/>
            <Cell width={70} value={row.price.toFixed(2)} tone={row.price>row.previousClose?'gain':row.price<row.previousClose?'loss':'flat'}/>
            <Cell width={76} value={row.tradeAvg.toFixed(2)}/>
            <Cell width={76} value={row.costAvg.toFixed(2)}/>
            <Cell width={92} value={`NT$ ${money(row.pnl)}`} tone={row.pnl>=0?'gain':'loss'}/>
            <Cell width={70} value={`${row.roi>=0?'+':''}${row.roi.toFixed(2)}%`} tone={row.roi>=0?'gain':'loss'}/>
          </Pressable>)}
        </View>
      </ScrollView>
    </View>
    <Text style={styles.tableRule}>第一欄固定；右側數值欄獨立水平滑動。純成交均價與含費成本均價不可混用。</Text>
  </View>;
}
function Head({width,label}:{width:number;label:string}){return <Text style={[styles.tableHeadText,{width,textAlign:'right'}]}>{label}</Text>}
function Cell({width,value,tone}:{width:number;value:string;tone?:'gain'|'loss'|'flat'}){const color=tone==='gain'?colors.gain:tone==='loss'?colors.loss:tone==='flat'?colors.flat:colors.text;return <Text style={[styles.numberCell,{width,color}]}>{value}</Text>}

function CalculatorModal({visible,onClose}:{visible:boolean;onClose:()=>void}){
  const finance=useFinance();
  const [symbol,setSymbol]=useState(finance.holdings[0]?.symbol??'');
  const [price,setPrice]=useState('');
  const [shares,setShares]=useState('');
  const [mode,setMode]=useState<'ODD_LOT'|'ROUND_LOT'>('ODD_LOT');
  const holding=finance.snapshot.holdings.find(x=>x.etfCode===symbol)??finance.snapshot.holdings[0];
  const quote=finance.quotes.find(x=>x.symbol===holding?.etfCode);
  const scenario=holding&&number(price)>0&&number(shares)>0?calculateBuyScenario({
    holding,currentPrice:quote?.currentPrice??holding.currentPrice,addPrice:number(price),addShares:number(shares),tradeMode:mode,
  }):null;

  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <View style={styles.modalBackdrop}><View style={styles.calculator}>
      <View style={styles.modalTop}><View><Text style={styles.modalKicker}>庫存工具</Text><Text style={styles.modalTitle}>持股試算</Text></View><Pressable onPress={onClose}><Text style={styles.done}>完成</Text></Pressable></View>
      <Text style={styles.modalHint}>試算直接呼叫正式 Canonical Core；不寫入 Ledger。</Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.symbolChoices}>
        {finance.holdings.map(item=><Pressable key={item.symbol} onPress={()=>setSymbol(item.symbol)} style={[styles.chip,symbol===item.symbol&&styles.chipActive]}><Text style={[styles.chipText,symbol===item.symbol&&styles.chipTextActive]}>{item.symbol}</Text></Pressable>)}
      </ScrollView>
      <SegmentedControl items={[{key:'ODD_LOT',label:'零股／定期定額'},{key:'ROUND_LOT',label:'整股'}] as const} value={mode} onChange={setMode}/>
      <View style={styles.calcGrid}><CalcField label="加碼價格" value={price} onChange={setPrice} placeholder={quote?.currentPrice.toFixed(2)??'0'}/><CalcField label="加碼股數" value={shares} onChange={setShares} placeholder="0"/></View>

      {holding?<View style={styles.currentInfo}><Text style={styles.infoTitle}>目前持股</Text><Text style={styles.infoText}>{money(holding.totalShares)} 股 · 純均價 {holding.averageTradePrice.toFixed(2)} · 含費均價 {holding.averageCostPerShare.toFixed(2)}</Text></View>:null}

      {scenario?<View style={styles.scenario}>
        <ResultRow label="本次成交金額" value={money(scenario.addTradeAmount)}/>
        <ResultRow label="本次預估手續費" value={money(scenario.addCommission)}/>
        <ResultRow label="本次現金支出" value={money(scenario.addCashOutflow)} strong/>
        <ResultRow label="試算後股數" value={money(scenario.newShares)}/>
        <ResultRow label="試算後純成交均價" value={scenario.averageTradePrice.toFixed(2)} strong/>
        <ResultRow label="試算後含費成本均價" value={scenario.averageCostPerShare.toFixed(2)} strong/>
        <ResultRow label="以目前市價純價差損益" value={money(scenario.priceUnrealizedProfit)} tone={scenario.priceUnrealizedProfit>=0?'gain':'loss'}/>
        <ResultRow label="以淨清算口徑未實現損益" value={money(scenario.cashUnrealizedProfit)} tone={scenario.cashUnrealizedProfit>=0?'gain':'loss'}/>
      </View>:<View style={styles.result}><Text style={styles.resultLabel}>輸入加碼價格與股數後即時計算</Text><Text style={styles.resultValue}>—</Text></View>}
    </View></View>
  </Modal>;
}
function CalcField({label,value,onChange,placeholder}:{label:string;value:string;onChange:(v:string)=>void;placeholder:string}){return <View style={{width:'48%'}}><Text style={styles.fieldLabel}>{label}</Text><TextInput style={styles.input} value={value} onChangeText={onChange} keyboardType="decimal-pad" placeholder={placeholder} placeholderTextColor="#98A5B8"/></View>}
function ResultRow({label,value,strong=false,tone}:{label:string;value:string;strong?:boolean;tone?:'gain'|'loss'}){return <View style={styles.resultRow}><Text style={styles.resultRowLabel}>{label}</Text><Text style={[styles.resultRowValue,strong&&styles.resultStrong,tone==='gain'&&{color:colors.gain},tone==='loss'&&{color:colors.loss}]}>{value}</Text></View>}

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
  tableSplit:{flexDirection:'row',borderWidth:1,borderColor:colors.border,borderRadius:radius.md,overflow:'hidden'},
  fixedColumn:{width:128,backgroundColor:colors.surface,zIndex:2,borderRightWidth:1,borderRightColor:colors.border},
  fixedHeader:{justifyContent:'center',paddingHorizontal:8,backgroundColor:colors.surfaceMuted},
  fixedRow:{justifyContent:'center',paddingHorizontal:8,borderTopWidth:StyleSheet.hairlineWidth,borderTopColor:colors.border},
  scrollTable:{minWidth:448},
  rightHeader:{flexDirection:'row',alignItems:'center',paddingHorizontal:8,backgroundColor:colors.surfaceMuted},
  rightRow:{flexDirection:'row',alignItems:'center',paddingHorizontal:8,borderTopWidth:StyleSheet.hairlineWidth,borderTopColor:colors.border},
  tableHeadText:{fontSize:9,fontWeight:'900',color:colors.textSecondary},
  symbolStrong:{fontSize:12,fontWeight:'900',color:colors.text},
  nameSmall:{fontSize:9,color:colors.textSecondary,marginTop:2},
  numberCell:{fontSize:11,fontWeight:'800',textAlign:'right',fontVariant:['tabular-nums']},
  tableRule:{fontSize:10,color:colors.textSecondary,lineHeight:16},
  modalBackdrop:{flex:1,justifyContent:'flex-end',backgroundColor:'rgba(12,18,27,0.35)'},
  calculator:{backgroundColor:colors.surface,borderTopLeftRadius:24,borderTopRightRadius:24,padding:spacing.xl,paddingBottom:44,gap:spacing.lg,maxHeight:'92%'},
  modalTop:{flexDirection:'row',justifyContent:'space-between',alignItems:'flex-start'},
  modalKicker:{fontSize:11,fontWeight:'800',color:colors.primary},
  modalTitle:{fontSize:25,fontWeight:'900',color:colors.text},
  done:{fontSize:14,fontWeight:'900',color:colors.primary},
  modalHint:{fontSize:11,lineHeight:17,color:colors.textSecondary},
  symbolChoices:{gap:6},
  calcGrid:{flexDirection:'row',flexWrap:'wrap',gap:spacing.sm},
  fieldLabel:{fontSize:10,fontWeight:'800',color:colors.textSecondary,marginBottom:5},
  input:{backgroundColor:colors.surfaceMuted,borderRadius:radius.md,borderWidth:1,borderColor:colors.border,padding:11,color:colors.text},
  currentInfo:{backgroundColor:colors.surfaceMuted,borderRadius:radius.md,padding:12},
  infoTitle:{fontSize:10,fontWeight:'900',color:colors.primary},
  infoText:{fontSize:11,color:colors.text,marginTop:4},
  scenario:{backgroundColor:colors.surfaceMuted,borderRadius:radius.lg,padding:14,gap:8},
  resultRow:{flexDirection:'row',justifyContent:'space-between',gap:12},
  resultRowLabel:{fontSize:10,color:colors.textSecondary},
  resultRowValue:{fontSize:11,fontWeight:'900',color:colors.text},
  resultStrong:{color:colors.primary},
  result:{backgroundColor:colors.surfaceMuted,borderRadius:radius.lg,padding:spacing.lg,flexDirection:'row',justifyContent:'space-between'},
  resultLabel:{fontWeight:'800',color:colors.textSecondary},
  resultValue:{fontSize:20,fontWeight:'900',color:colors.primary},
});
