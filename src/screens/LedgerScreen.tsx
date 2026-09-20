import { type ReactNode, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { FrameCard } from '../components/FrameCard';
import { MetricTile } from '../components/MetricTile';
import { PageEditorStack } from '../components/PageEditorStack';
import { PageFrameSettingsModal } from '../components/PageFrameSettingsModal';
import { PageGearButton } from '../components/PageGearButton';
import { SegmentedControl } from '../components/SegmentedControl';
import { PageShell } from '../components/PageShell';
import { PAGE_FRAMES } from '../domain/frameRegistry';
import { freezeTradeEntry, calculateLedgerCashFlow, type CanonicalLedgerEntry, type DividendLedgerEntry, type LedgerKind } from '../finance/canonicalLedger';
import { ledgerDisplayAmount, useFinance } from '../finance/FinanceRuntime';
import { colors, radius, spacing } from '../theme/tokens';

type EntryKind=LedgerKind;
const money=(v:number)=>Math.round(v).toLocaleString('zh-TW');
const parseNumber=(v:string)=>{const n=Number(v.replace(/,/g,''));return Number.isFinite(n)?n:0;};
const today=()=>new Date().toISOString().slice(0,10);

export function LedgerScreen() {
  const finance=useFinance();
  const [settingsOpen,setSettingsOpen]=useState(false);
  const [kind,setKind]=useState<EntryKind>('buy');
  const [symbol,setSymbol]=useState(finance.quotes[0]?.symbol??'0050');
  const [date,setDate]=useState(today());
  const [price,setPrice]=useState('');
  const [shares,setShares]=useState('');
  const [fee,setFee]=useState('');
  const [tax,setTax]=useState('');
  const [tradeMode,setTradeMode]=useState<'ROUND_LOT'|'ODD_LOT'>('ODD_LOT');
  const [dividendPerShare,setDividendPerShare]=useState('');
  const [dividendShares,setDividendShares]=useState('');
  const [otherAmount,setOtherAmount]=useState('');
  const [note,setNote]=useState('');
  const [confirmOpen,setConfirmOpen]=useState(false);
  const [dateOpen,setDateOpen]=useState(false);

  const quote=finance.quotes.find(x=>x.symbol===symbol)??finance.quotes[0];
  const tradePreview=useMemo(()=>{
    if((kind!=='buy'&&kind!=='sell')||!quote)return null;
    const p=parseNumber(price),s=parseNumber(shares);
    if(!(p>0&&s>0))return null;
    return freezeTradeEntry({
      id:'preview',
      date,
      kind,
      symbol:quote.symbol,
      name:quote.name,
      tradeMode,
      shares:s,
      price:p,
      ...(fee.trim()?{actualFee:parseNumber(fee)}:{}),
      ...(kind==='sell'&&tax.trim()?{actualTax:parseNumber(tax)}:{}),
    });
  },[kind,quote,date,tradeMode,price,shares,fee,tax]);

  const dividendPreview=useMemo(()=>{
    if(kind!=='dividend'||!quote)return null;
    const perShare=parseNumber(dividendPerShare);
    const held=parseNumber(dividendShares);
    if(!(perShare>0&&held>0))return null;
    const entry:DividendLedgerEntry={
      id:'preview-dividend',date,kind:'dividend',symbol:quote.symbol,name:quote.name,perShareAmount:perShare,sharesHeld:held,
      ...(note.trim()?{note:note.trim()}:{}),
    };
    return {entry,net:calculateLedgerCashFlow(entry)};
  },[kind,quote,date,dividendPerShare,dividendShares,note]);

  const otherPreview=kind==='other'&&parseNumber(otherAmount)!==0?parseNumber(otherAmount):null;
  const canSubmit=kind==='buy'||kind==='sell'?!!tradePreview:kind==='dividend'?!!dividendPreview:otherPreview!==null;

  const commitEntry=()=>{
    if(!quote)return;
    const id=`${kind}-${Date.now()}`;
    if(kind==='buy'||kind==='sell'){
      if(!tradePreview)return;
      finance.addTrade({
        id,date,kind,symbol:quote.symbol,name:quote.name,tradeMode,
        shares:parseNumber(shares),price:parseNumber(price),
        ...(fee.trim()?{actualFee:parseNumber(fee)}:{}),
        ...(kind==='sell'&&tax.trim()?{actualTax:parseNumber(tax)}:{}),
        ...(note.trim()?{note:note.trim()}:{}),
      });
    }else if(kind==='dividend'){
      if(!dividendPreview)return;
      finance.addDividend({...dividendPreview.entry,id});
    }else{
      const amount=parseNumber(otherAmount);
      if(amount===0)return;
      finance.addOther({id,date,kind:'other',label:note.trim()||'其他現金調整',amount});
    }
    setConfirmOpen(false);
    setPrice('');setShares('');setFee('');setTax('');setDividendPerShare('');setDividendShares('');setOtherAmount('');setNote('');
  };

  const month=date.slice(0,7);
  const monthEntries=finance.entries.filter(entry=>entry.date.startsWith(month));
  const monthBuy=monthEntries.filter(e=>e.kind==='buy').reduce((s,e)=>s+Math.abs(calculateLedgerCashFlow(e)),0);
  const monthSell=monthEntries.filter(e=>e.kind==='sell').reduce((s,e)=>s+calculateLedgerCashFlow(e),0);
  const monthDividend=monthEntries.filter(e=>e.kind==='dividend').reduce((s,e)=>s+calculateLedgerCashFlow(e),0);
  const monthNet=monthEntries.reduce((s,e)=>s+calculateLedgerCashFlow(e),0);

  const ordered=[...finance.entries].sort((a,b)=>b.date.localeCompare(a.date)||b.id.localeCompare(a.id));

  return <>
    <PageShell title="帳務中心" subtitle="V3.7.8 Ledger 是帳務真值來源" actions={<PageGearButton onPress={()=>setSettingsOpen(true)}/>}>
      <PageEditorStack pageKey="ledger" frames={[
        {key:'quick-entry',element:
          <FrameCard title="快速建檔">
            <SegmentedControl
              items={[{key:'buy',label:'買進'},{key:'sell',label:'賣出'},{key:'dividend',label:'股息'},{key:'other',label:'其他'}] as const}
              value={kind}
              onChange={setKind}
            />
            <View style={styles.form}>
              {kind!=='other'?<>
                <Text style={styles.fieldLabel}>標的</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.symbolRow}>
                  {finance.quotes.map(item=><Pressable key={item.symbol} onPress={()=>setSymbol(item.symbol)} style={[styles.symbolChip,symbol===item.symbol&&styles.symbolChipActive]}>
                    <Text style={[styles.symbolChipText,symbol===item.symbol&&styles.symbolChipTextActive]}>{item.symbol}</Text>
                  </Pressable>)}
                </ScrollView>
              </>:null}

              <View style={styles.two}>
                <View style={{flex:1}}><Text style={styles.fieldLabel}>日期</Text><Pressable style={styles.input} onPress={()=>setDateOpen(true)}><Text style={styles.inputText}>{date}</Text></Pressable></View>
                {(kind==='buy'||kind==='sell')?<NumericField label="成交價格" value={price} onChange={setPrice} placeholder="0"/>:null}
                {kind==='dividend'?<NumericField label="每股股息" value={dividendPerShare} onChange={setDividendPerShare} placeholder="0"/>:null}
                {kind==='other'?<NumericField label="現金調整" value={otherAmount} onChange={setOtherAmount} placeholder="正數收入／負數支出" signed/>:null}
              </View>

              {(kind==='buy'||kind==='sell')?<>
                <Text style={styles.fieldLabel}>交易模式</Text>
                <SegmentedControl items={[{key:'ODD_LOT',label:'零股／定期定額'},{key:'ROUND_LOT',label:'整股'}] as const} value={tradeMode} onChange={setTradeMode}/>
                <View style={styles.two}><NumericField label="股數" value={shares} onChange={setShares} placeholder="0"/><NumericField label="實際手續費" value={fee} onChange={setFee} placeholder={tradePreview?String(tradePreview.calculatedFee):'自動估算'}/></View>
                {kind==='sell'?<NumericField label="實際證交稅" value={tax} onChange={setTax} placeholder={tradePreview?String(tradePreview.calculatedTax):'自動估算'}/>:null}
                {tradePreview?<View style={styles.previewCard}>
                  <Text style={styles.previewTitle}>V3.7.8 入帳預覽</Text>
                  <PreviewRow label="成交金額" value={money(tradePreview.amount)}/>
                  <PreviewRow label="公式手續費" value={money(tradePreview.calculatedFee)}/>
                  <PreviewRow label={fee.trim()?'實際手續費（已覆寫）':'實際手續費（公式固化）'} value={money(tradePreview.actualFee)} strong/>
                  {kind==='sell'?<>
                    <PreviewRow label="公式證交稅" value={money(tradePreview.calculatedTax)}/>
                    <PreviewRow label={tax.trim()?'實際證交稅（已覆寫）':'實際證交稅（公式固化）'} value={money(tradePreview.actualTax)} strong/>
                  </>:null}
                  <PreviewRow label={kind==='buy'?'現金支出':'現金流入'} value={money(Math.abs(calculateLedgerCashFlow(tradePreview)))} strong/>
                </View>:null}
              </>:null}

              {kind==='dividend'?<>
                <NumericField label="符合配息股數" value={dividendShares} onChange={setDividendShares} placeholder="0"/>
                {dividendPreview?<View style={styles.previewCard}><Text style={styles.previewTitle}>V3.7.8 股息預覽</Text><PreviewRow label="淨入帳股息" value={money(dividendPreview.net)} strong/></View>:null}
              </>:null}

              <View><Text style={styles.fieldLabel}>備註</Text><TextInput style={styles.input} value={note} onChangeText={setNote} placeholder={kind==='other'?'例如：現金校正':'選填'} placeholderTextColor="#98A5B8"/></View>
              <Pressable disabled={!canSubmit} style={[styles.primary,!canSubmit&&styles.disabled]} onPress={()=>setConfirmOpen(true)}><Text style={styles.primaryText}>確認{kindLabel(kind)}紀錄</Text></Pressable>
              <Text style={styles.coreNote}>公式預估只供核對；正式入帳後 actualFee / actualTax 固化成歷史真值。Portfolio、首頁、詳情只讀 Canonical Finance Core。</Text>
            </View>
          </FrameCard>
        },
        {key:'ledger-list',element:
          <FrameCard title="交易紀錄">
            {ordered.slice(0,20).map(row=><View key={row.id} style={styles.tableRow}>
              <View style={{width:66}}><Text style={styles.cell}>{row.date.slice(5)}</Text><Text style={styles.fee}>{row.date.slice(0,4)}</Text></View>
              <Text style={[styles.kindCell,{color:kindTone(row)}]}>{kindLabel(row.kind)}</Text>
              <View style={{flex:1}}><Text style={styles.symbolStrong}>{'symbol' in row?row.symbol:row.label}</Text>{row.kind==='buy'||row.kind==='sell'?<Text style={styles.fee}>費/稅 {row.actualFee}/{row.actualTax}</Text>:null}</View>
              <View style={styles.rowRight}><Text style={styles.amount}>NT$ {money(ledgerDisplayAmount(row))}</Text><Pressable onPress={()=>finance.deleteEntry(row.id)}><Text style={styles.delete}>刪除</Text></Pressable></View>
            </View>)}
          </FrameCard>
        },
        {key:'monthly-summary',element:
          <FrameCard title="月度摘要">
            <Text style={styles.monthLabel}>{month}</Text>
            <View style={styles.metrics}>
              <MetricTile label="本月買進" value={money(monthBuy)} caption="現金支出"/>
              <MetricTile label="本月賣出" value={money(monthSell)} caption="淨流入"/>
              <MetricTile label="本月股息" value={money(monthDividend)} caption="淨入帳" tone="gain"/>
              <MetricTile label="淨現金流" value={money(monthNet)} caption="交易＋股息＋其他" tone={monthNet>=0?'gain':'loss'}/>
            </View>
          </FrameCard>
        },
      ]}/>
    </PageShell>

    <PageFrameSettingsModal visible={settingsOpen} pageKey="ledger" title="紀錄" frames={PAGE_FRAMES.ledger} onClose={()=>setSettingsOpen(false)}/>
    <DatePickerModal visible={dateOpen} value={date} onChange={setDate} onClose={()=>setDateOpen(false)}/>
    <ConfirmModal visible={confirmOpen} title={`確認${kindLabel(kind)}入帳`} onCancel={()=>setConfirmOpen(false)} onConfirm={commitEntry}>
      <Text style={styles.confirmText}>日期：{date}</Text>
      {kind!=='other'&&quote?<Text style={styles.confirmText}>標的：{quote.symbol} {quote.name}</Text>:null}
      {tradePreview?<>
        <Text style={styles.confirmText}>成交：{money(tradePreview.amount)}</Text>
        <Text style={styles.confirmText}>實際手續費：{money(tradePreview.actualFee)}</Text>
        {kind==='sell'?<Text style={styles.confirmText}>實際證交稅：{money(tradePreview.actualTax)}</Text>:null}
        <Text style={styles.confirmStrong}>{kind==='buy'?'現金支出':'現金流入'}：NT$ {money(Math.abs(calculateLedgerCashFlow(tradePreview)))}</Text>
      </>:null}
      {dividendPreview?<Text style={styles.confirmStrong}>股息淨入帳：NT$ {money(dividendPreview.net)}</Text>:null}
      {otherPreview!==null?<Text style={styles.confirmStrong}>現金調整：NT$ {money(otherPreview)}</Text>:null}
    </ConfirmModal>
  </>;
}

function NumericField({label,value,onChange,placeholder,signed=false}:{label:string;value:string;onChange:(v:string)=>void;placeholder:string;signed?:boolean}){
  return <View style={{flex:1}}><Text style={styles.fieldLabel}>{label}</Text><TextInput style={styles.input} value={value} onChangeText={onChange} keyboardType={signed?'numbers-and-punctuation':'decimal-pad'} placeholder={placeholder} placeholderTextColor="#98A5B8"/></View>;
}
function PreviewRow({label,value,strong=false}:{label:string;value:string;strong?:boolean}){return <View style={styles.previewRow}><Text style={styles.previewLabel}>{label}</Text><Text style={[styles.previewValue,strong&&styles.previewStrong]}>{value}</Text></View>}
function kindLabel(kind:LedgerKind){return kind==='buy'?'買進':kind==='sell'?'賣出':kind==='dividend'?'股息':'其他';}
function kindTone(row:CanonicalLedgerEntry){return row.kind==='sell'?colors.loss:row.kind==='buy'?colors.primary:row.kind==='dividend'?colors.gain:colors.warning;}

function DatePickerModal({visible,value,onChange,onClose}:{visible:boolean;value:string;onChange:(v:string)=>void;onClose:()=>void}){
  const base=new Date(`${value}T12:00:00`);
  const shift=(days:number)=>{const d=new Date(base);d.setDate(d.getDate()+days);onChange(d.toISOString().slice(0,10));};
  const shiftMonth=(months:number)=>{const d=new Date(base);d.setMonth(d.getMonth()+months);onChange(d.toISOString().slice(0,10));};
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}><View style={styles.backdrop}><View style={styles.dateModal}>
    <Text style={styles.modalTitle}>選擇日期</Text><Text style={styles.dateValue}>{value}</Text>
    <View style={styles.dateControls}><Pressable style={styles.dateButton} onPress={()=>shiftMonth(-1)}><Text style={styles.dateButtonText}>上月</Text></Pressable><Pressable style={styles.dateButton} onPress={()=>shift(-1)}><Text style={styles.dateButtonText}>前一天</Text></Pressable><Pressable style={styles.dateButton} onPress={()=>onChange(today())}><Text style={styles.dateButtonText}>今天</Text></Pressable><Pressable style={styles.dateButton} onPress={()=>shift(1)}><Text style={styles.dateButtonText}>後一天</Text></Pressable><Pressable style={styles.dateButton} onPress={()=>shiftMonth(1)}><Text style={styles.dateButtonText}>下月</Text></Pressable></View>
    <Pressable style={styles.primary} onPress={onClose}><Text style={styles.primaryText}>完成</Text></Pressable>
  </View></View></Modal>;
}
function ConfirmModal({visible,title,onCancel,onConfirm,children}:{visible:boolean;title:string;onCancel:()=>void;onConfirm:()=>void;children:ReactNode}){
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}><View style={styles.backdrop}><View style={styles.confirmModal}><Text style={styles.modalTitle}>{title}</Text><View style={{gap:7}}>{children}</View><View style={styles.confirmButtons}><Pressable style={styles.secondaryButton} onPress={onCancel}><Text style={styles.secondaryText}>返回修改</Text></Pressable><Pressable style={styles.primaryButton} onPress={onConfirm}><Text style={styles.primaryText}>正式入帳</Text></Pressable></View></View></View></Modal>;
}

const styles=StyleSheet.create({
  form:{gap:spacing.md},
  two:{flexDirection:'row',gap:spacing.sm},
  fieldLabel:{fontSize:11,fontWeight:'800',color:colors.textSecondary,marginBottom:5},
  input:{minHeight:44,backgroundColor:colors.surfaceMuted,borderRadius:radius.md,borderWidth:1,borderColor:colors.border,paddingHorizontal:12,paddingVertical:11,color:colors.text,fontSize:13,justifyContent:'center'},
  inputText:{color:colors.text,fontSize:13},
  symbolRow:{gap:6},
  symbolChip:{paddingHorizontal:12,paddingVertical:8,borderRadius:radius.pill,backgroundColor:colors.surfaceMuted},
  symbolChipActive:{backgroundColor:colors.primary},
  symbolChipText:{fontSize:11,fontWeight:'900',color:colors.textSecondary},
  symbolChipTextActive:{color:'#FFF'},
  primary:{backgroundColor:colors.primary,borderRadius:radius.md,paddingVertical:13,alignItems:'center'},
  primaryText:{color:'#FFF',fontWeight:'900'},
  disabled:{opacity:.35},
  coreNote:{fontSize:10,lineHeight:16,color:colors.textSecondary},
  previewCard:{backgroundColor:colors.surfaceMuted,borderRadius:radius.md,padding:12,gap:7},
  previewTitle:{fontSize:11,fontWeight:'900',color:colors.primary,marginBottom:2},
  previewRow:{flexDirection:'row',justifyContent:'space-between',gap:12},
  previewLabel:{fontSize:10,color:colors.textSecondary},
  previewValue:{fontSize:11,fontWeight:'800',color:colors.text},
  previewStrong:{color:colors.primary,fontWeight:'900'},
  tableRow:{flexDirection:'row',alignItems:'center',gap:8,paddingVertical:11,borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:colors.border},
  cell:{fontSize:11,color:colors.text},
  kindCell:{width:38,fontSize:11,fontWeight:'900'},
  symbolStrong:{fontSize:12,fontWeight:'900',color:colors.text},
  rowRight:{alignItems:'flex-end'},
  amount:{fontSize:11,fontWeight:'900',color:colors.text},
  fee:{fontSize:9,color:colors.textSecondary,marginTop:2},
  delete:{fontSize:9,color:colors.loss,fontWeight:'800',marginTop:4},
  metrics:{flexDirection:'row',gap:spacing.sm,flexWrap:'wrap'},
  monthLabel:{fontSize:11,fontWeight:'900',color:colors.textSecondary},
  backdrop:{flex:1,backgroundColor:'rgba(12,18,27,.45)',alignItems:'center',justifyContent:'center',padding:24},
  dateModal:{width:'100%',maxWidth:420,backgroundColor:colors.surface,borderRadius:22,padding:20,gap:14},
  confirmModal:{width:'100%',maxWidth:420,backgroundColor:colors.surface,borderRadius:22,padding:20,gap:16},
  modalTitle:{fontSize:20,fontWeight:'900',color:colors.text},
  dateValue:{fontSize:28,fontWeight:'900',color:colors.primary,textAlign:'center'},
  dateControls:{flexDirection:'row',flexWrap:'wrap',gap:7,justifyContent:'center'},
  dateButton:{paddingHorizontal:10,paddingVertical:8,borderRadius:radius.md,backgroundColor:colors.surfaceMuted},
  dateButtonText:{fontSize:10,fontWeight:'900',color:colors.primary},
  confirmText:{fontSize:12,color:colors.textSecondary},
  confirmStrong:{fontSize:14,fontWeight:'900',color:colors.primary},
  confirmButtons:{flexDirection:'row',gap:10},
  secondaryButton:{flex:1,paddingVertical:12,borderRadius:radius.md,backgroundColor:colors.surfaceMuted,alignItems:'center'},
  secondaryText:{fontWeight:'900',color:colors.textSecondary},
  primaryButton:{flex:1,paddingVertical:12,borderRadius:radius.md,backgroundColor:colors.primary,alignItems:'center'},
});
