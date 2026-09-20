import { type ReactNode, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { CalendarDatePicker } from '../components/CalendarDatePicker';
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
import { searchInstruments, type Instrument } from '../market/instrumentRegistry';
import { useMarket } from '../market/MarketRuntime';
import { colors, radius, spacing } from '../theme/tokens';

type EntryKind=LedgerKind;
const money=(v:number)=>Math.round(v).toLocaleString('zh-TW');
const parseNumber=(v:string)=>{const n=Number(v.replace(/,/g,''));return Number.isFinite(n)?n:0;};
const today=()=>new Date().toISOString().slice(0,10);
const DatePickerModal=CalendarDatePicker;

export function LedgerScreen(){
  const finance=useFinance();
  const market=useMarket();
  const [settingsOpen,setSettingsOpen]=useState(false);
  const [kind,setKind]=useState<EntryKind>('buy');
  const [symbol,setSymbol]=useState('');
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
  const [searchFocused,setSearchFocused]=useState(false);

  const normalized=symbol.trim().toUpperCase();
  const selected=market.instruments.find(x=>x.symbol===normalized)
    ??(finance.quotes.find(x=>x.symbol===normalized)?{symbol:normalized,name:finance.quotes.find(x=>x.symbol===normalized)!.name,market:'TWSE',type:'ETF'} as Instrument:undefined);
  const results=useMemo(()=>searchFocused&&normalized?searchInstruments(market.instruments,normalized,12):[],[market.instruments,normalized,searchFocused]);
  const recentSymbols=useMemo(()=>{
    const seen=new Set<string>(),rows:string[]=[];
    [...finance.entries].sort((a,b)=>b.date.localeCompare(a.date)||b.id.localeCompare(a.id)).forEach(e=>{
      if('symbol' in e&&!seen.has(e.symbol)){seen.add(e.symbol);rows.push(e.symbol);}
    });
    return rows.slice(0,12);
  },[finance.entries]);
  const choose=(item:Instrument)=>{setSymbol(item.symbol);setSearchFocused(false);market.trackSymbol(item.symbol);};

  const tradePreview=useMemo(()=>{
    if((kind!=='buy'&&kind!=='sell')||!selected)return null;
    const p=parseNumber(price),s=parseNumber(shares);if(!(p>0&&s>0))return null;
    return freezeTradeEntry({id:'preview',date,kind,symbol:selected.symbol,name:selected.name,tradeMode,shares:s,price:p,
      ...(fee.trim()?{actualFee:parseNumber(fee)}:{}),
      ...(kind==='sell'&&tax.trim()?{actualTax:parseNumber(tax)}:{}),
    });
  },[kind,selected,date,tradeMode,price,shares,fee,tax]);

  const dividendPreview=useMemo(()=>{
    if(kind!=='dividend'||!selected)return null;
    const perShare=parseNumber(dividendPerShare),held=parseNumber(dividendShares);if(!(perShare>0&&held>0))return null;
    const entry:DividendLedgerEntry={id:'preview-dividend',date,kind:'dividend',symbol:selected.symbol,name:selected.name,perShareAmount:perShare,sharesHeld:held,...(note.trim()?{note:note.trim()}:{})};
    return {entry,net:calculateLedgerCashFlow(entry)};
  },[kind,selected,date,dividendPerShare,dividendShares,note]);

  const otherPreview=kind==='other'&&parseNumber(otherAmount)!==0?parseNumber(otherAmount):null;
  const currentHolding=finance.holdings.find(item=>item.symbol===normalized);
  const sellExceedsHolding=kind==='sell'&&parseNumber(shares)>(currentHolding?.shares??0);
  const canSubmit=kind==='buy'||kind==='sell'?!!tradePreview&&!sellExceedsHolding:kind==='dividend'?!!dividendPreview:otherPreview!==null;

  const commitEntry=()=>{
    if(kind!=='other'&&!selected)return;
    const id=`${kind}-${Date.now()}`;
    if(kind==='buy'||kind==='sell'){
      if(!tradePreview||!selected)return;
      market.trackSymbol(selected.symbol);
      finance.addTrade({id,date,kind,symbol:selected.symbol,name:selected.name,tradeMode,shares:parseNumber(shares),price:parseNumber(price),
        ...(fee.trim()?{actualFee:parseNumber(fee)}:{}),...(kind==='sell'&&tax.trim()?{actualTax:parseNumber(tax)}:{}),...(note.trim()?{note:note.trim()}:{})});
    }else if(kind==='dividend'){
      if(!dividendPreview)return;finance.addDividend({...dividendPreview.entry,id});
    }else{
      const amount=parseNumber(otherAmount);if(amount===0)return;finance.addOther({id,date,kind:'other',label:note.trim()||'其他現金調整',amount});
    }
    setConfirmOpen(false);setPrice('');setShares('');setFee('');setTax('');setDividendPerShare('');setDividendShares('');setOtherAmount('');setNote('');
  };

  const month=date.slice(0,7),monthEntries=finance.entries.filter(entry=>entry.date.startsWith(month));
  const monthBuy=monthEntries.filter(e=>e.kind==='buy').reduce((s,e)=>s+Math.abs(calculateLedgerCashFlow(e)),0);
  const monthSell=monthEntries.filter(e=>e.kind==='sell').reduce((s,e)=>s+calculateLedgerCashFlow(e),0);
  const monthDividend=monthEntries.filter(e=>e.kind==='dividend').reduce((s,e)=>s+calculateLedgerCashFlow(e),0);
  const monthNet=monthEntries.reduce((s,e)=>s+calculateLedgerCashFlow(e),0);
  const ordered=[...finance.entries].sort((a,b)=>b.date.localeCompare(a.date)||b.id.localeCompare(a.id));

  return <>
    <PageShell title="帳務中心" subtitle="交易、股息與現金紀錄" actions={<PageGearButton onPress={()=>setSettingsOpen(true)}/>}>
      <PageEditorStack pageKey="ledger" frames={[
        {key:'quick-entry',element:<FrameCard title="快速建檔">
          <SegmentedControl items={[{key:'buy',label:'買進'},{key:'sell',label:'賣出'},{key:'dividend',label:'股息'},{key:'other',label:'其他'}] as const} value={kind} onChange={setKind}/>
          <View style={styles.form}>
            {kind!=='other'?<View style={styles.instrumentBlock}>
              <Text style={styles.fieldLabel}>ETF代號</Text>
              <TextInput value={symbol} onChangeText={v=>{setSymbol(v.toUpperCase());setSearchFocused(true);}} onFocus={()=>setSearchFocused(true)}
                style={styles.input} placeholder="輸入代號或名稱關鍵字" placeholderTextColor="#98A5B8" autoCapitalize="characters"/>
              {results.length?<View style={styles.searchList}>{results.map(item=><Pressable key={item.symbol} onPress={()=>choose(item)} style={styles.searchRow}>
                <View style={styles.searchCode}><Text style={styles.searchCodeText}>{item.symbol}</Text></View>
                <View style={{flex:1}}><Text style={styles.searchName}>{item.name}</Text><Text style={styles.searchMeta}>{item.market} ETF</Text></View>
              </Pressable>)}</View>:null}
              {recentSymbols.length?<><Text style={styles.quickLabel}>最近使用</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.symbolRow}>
                {recentSymbols.map(code=><Pressable key={code} onPress={()=>{const item=market.instruments.find(x=>x.symbol===code);if(item)choose(item);else{setSymbol(code);market.trackSymbol(code);}}} style={styles.symbolChip}><Text style={styles.symbolChipText}>{code}</Text></Pressable>)}
              </ScrollView></>:null}
              <Text style={styles.fieldLabel}>ETF名稱</Text>
              <View style={[styles.input,styles.readonly]}><Text style={selected?styles.inputText:styles.placeholder}>{selected?.name??'輸入或選擇 ETF 代號後自動帶入'}</Text></View>
            </View>:null}

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
              {sellExceedsHolding?<Text style={styles.validationError}>賣出股數不可大於目前持有股數 {money(currentHolding?.shares??0)} 股。</Text>:null}
              {tradePreview?<View style={styles.previewCard}><Text style={styles.previewTitle}>入帳預覽</Text>
                <PreviewRow label="成交金額" value={money(tradePreview.amount)}/><PreviewRow label="公式手續費" value={money(tradePreview.calculatedFee)}/>
                <PreviewRow label={fee.trim()?'實際手續費（已覆寫）':'實際手續費（自動估算）'} value={money(tradePreview.actualFee)} strong/>
                {kind==='sell'?<><PreviewRow label="公式證交稅" value={money(tradePreview.calculatedTax)}/><PreviewRow label={tax.trim()?'實際證交稅（已覆寫）':'實際證交稅（自動估算）'} value={money(tradePreview.actualTax)} strong/></>:null}
                <PreviewRow label={kind==='buy'?'現金支出':'現金流入'} value={money(Math.abs(calculateLedgerCashFlow(tradePreview)))} strong/>
              </View>:null}
            </>:null}

            {kind==='dividend'?<><NumericField label="符合配息股數" value={dividendShares} onChange={setDividendShares} placeholder="0"/>{dividendPreview?<View style={styles.previewCard}><Text style={styles.previewTitle}>股息預覽</Text><PreviewRow label="淨入帳股息" value={money(dividendPreview.net)} strong/></View>:null}</>:null}
            <View><Text style={styles.fieldLabel}>備註</Text><TextInput style={styles.input} value={note} onChangeText={setNote} placeholder={kind==='other'?'例如：現金校正':'選填'} placeholderTextColor="#98A5B8"/></View>
            <Pressable disabled={!canSubmit} style={[styles.primary,!canSubmit&&styles.disabled]} onPress={()=>setConfirmOpen(true)}><Text style={styles.primaryText}>確認{kindLabel(kind)}紀錄</Text></Pressable>
            <Text style={styles.coreNote}>正式入帳後，實際手續費與實際證交稅會保留為該筆交易紀錄。</Text>
          </View>
        </FrameCard>},
        {key:'ledger-list',element:<FrameCard title="交易紀錄">{ordered.slice(0,20).map(row=><View key={row.id} style={styles.tableRow}>
          <View style={{width:66}}><Text style={styles.cell}>{row.date.slice(5)}</Text><Text style={styles.fee}>{row.date.slice(0,4)}</Text></View>
          <Text style={[styles.kindCell,{color:kindTone(row)}]}>{kindLabel(row.kind)}</Text>
          <View style={{flex:1}}><Text style={styles.symbolStrong}>{'symbol' in row?row.symbol:row.label}</Text>{row.kind==='buy'||row.kind==='sell'?<Text style={styles.fee}>費/稅 {row.actualFee}/{row.actualTax}</Text>:null}</View>
          <View style={styles.rowRight}><Text style={styles.amount}>NT$ {money(ledgerDisplayAmount(row))}</Text><Pressable onPress={()=>finance.deleteEntry(row.id)}><Text style={styles.delete}>刪除</Text></Pressable></View>
        </View>)}</FrameCard>},
        {key:'monthly-summary',element:<FrameCard title="月度摘要"><Text style={styles.monthLabel}>{month}</Text><View style={styles.metrics}>
          <MetricTile label="本月買進" value={money(monthBuy)} caption="現金支出"/><MetricTile label="本月賣出" value={money(monthSell)} caption="淨流入"/>
          <MetricTile label="本月股息" value={money(monthDividend)} caption="淨入帳" tone="gain"/><MetricTile label="淨現金流" value={money(monthNet)} caption="交易＋股息＋其他" tone={monthNet>=0?'gain':'loss'}/>
        </View></FrameCard>},
      ]}/>
    </PageShell>
    <PageFrameSettingsModal visible={settingsOpen} pageKey="ledger" title="紀錄" frames={PAGE_FRAMES.ledger} onClose={()=>setSettingsOpen(false)}/>
    <DatePickerModal visible={dateOpen} value={date} onChange={setDate} onClose={()=>setDateOpen(false)}/>
    <ConfirmModal visible={confirmOpen} title={`確認${kindLabel(kind)}入帳`} onCancel={()=>setConfirmOpen(false)} onConfirm={commitEntry}>
      <Text style={styles.confirmText}>日期　{date}</Text>{selected?<Text style={styles.confirmText}>ETF　{selected.symbol} {selected.name}</Text>:null}
      {tradePreview?<Text style={styles.confirmStrong}>{kind==='buy'?'現金支出':'現金流入'} NT$ {money(Math.abs(calculateLedgerCashFlow(tradePreview)))}</Text>:null}
    </ConfirmModal>
  </>;
}
function NumericField({label,value,onChange,placeholder,signed=false}:{label:string;value:string;onChange:(v:string)=>void;placeholder:string;signed?:boolean}){return <View style={{flex:1,minWidth:130}}><Text style={styles.fieldLabel}>{label}</Text><TextInput style={styles.input} value={value} onChangeText={onChange} keyboardType={signed?'numbers-and-punctuation':'decimal-pad'} placeholder={placeholder} placeholderTextColor="#98A5B8"/></View>;}
function PreviewRow({label,value,strong=false}:{label:string;value:string;strong?:boolean}){return <View style={styles.previewRow}><Text style={styles.previewLabel}>{label}</Text><Text style={[styles.previewValue,strong&&{color:colors.primary}]}>{value}</Text></View>;}
function ConfirmModal({visible,title,onCancel,onConfirm,children}:{visible:boolean;title:string;onCancel:()=>void;onConfirm:()=>void;children:ReactNode}){return <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}><View style={styles.backdrop}><View style={styles.confirmModal}><Text style={styles.modalTitle}>{title}</Text>{children}<View style={styles.confirmButtons}><Pressable style={styles.secondaryButton} onPress={onCancel}><Text style={styles.secondaryText}>返回修改</Text></Pressable><Pressable style={styles.primaryButton} onPress={onConfirm}><Text style={styles.primaryText}>正式入帳</Text></Pressable></View></View></View></Modal>;}
function kindLabel(kind:EntryKind){return kind==='buy'?'買進':kind==='sell'?'賣出':kind==='dividend'?'股息':'其他';}
function kindTone(row:CanonicalLedgerEntry){return row.kind==='buy'?colors.primary:row.kind==='sell'?colors.warning:row.kind==='dividend'?colors.gain:colors.textSecondary;}

const styles=StyleSheet.create({
  form:{gap:12},instrumentBlock:{gap:7},fieldLabel:{fontSize:11,fontWeight:'800',color:colors.textSecondary},
  input:{minHeight:46,backgroundColor:colors.surfaceMuted,borderRadius:radius.md,borderWidth:1,borderColor:colors.border,paddingHorizontal:13,paddingVertical:11,color:colors.text,fontSize:14},
  readonly:{justifyContent:'center'},inputText:{color:colors.text,fontWeight:'700'},placeholder:{color:'#98A5B8'},
  searchList:{borderWidth:1,borderColor:colors.border,borderRadius:radius.md,overflow:'hidden',backgroundColor:colors.surface,maxHeight:310},
  searchRow:{minHeight:62,flexDirection:'row',alignItems:'center',gap:12,padding:10,borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:colors.border},
  searchCode:{minWidth:78,paddingHorizontal:10,paddingVertical:10,borderRadius:12,backgroundColor:colors.primary,alignItems:'center'},searchCodeText:{color:'#fff',fontWeight:'900'},
  searchName:{fontSize:13,fontWeight:'900',color:colors.text},searchMeta:{fontSize:10,color:colors.textSecondary,marginTop:2},
  quickLabel:{fontSize:10,fontWeight:'800',color:colors.textSecondary,marginTop:2},symbolRow:{gap:7,paddingVertical:2},symbolChip:{paddingHorizontal:12,paddingVertical:8,borderRadius:radius.pill,backgroundColor:colors.surfaceMuted},symbolChipText:{fontSize:11,fontWeight:'900',color:colors.primary},
  two:{flexDirection:'row',gap:10,flexWrap:'wrap'},validationError:{fontSize:11,lineHeight:17,color:colors.loss,fontWeight:'900'},
  previewCard:{backgroundColor:colors.surfaceMuted,borderRadius:radius.md,padding:12,gap:7},previewTitle:{fontSize:11,fontWeight:'900',color:colors.primary,marginBottom:2},
  previewRow:{flexDirection:'row',justifyContent:'space-between',gap:12},previewLabel:{fontSize:10,color:colors.textSecondary},previewValue:{fontSize:11,fontWeight:'900',color:colors.text},
  primary:{paddingVertical:14,borderRadius:radius.md,backgroundColor:colors.primary,alignItems:'center'},primaryText:{color:'#fff',fontWeight:'900'},disabled:{opacity:.35},coreNote:{fontSize:10,lineHeight:16,color:colors.textSecondary},
  tableRow:{flexDirection:'row',alignItems:'center',gap:8,paddingVertical:10,borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:colors.border},cell:{fontSize:11,fontWeight:'800',color:colors.text},fee:{fontSize:9,color:colors.textSecondary},kindCell:{width:34,fontSize:10,fontWeight:'900'},symbolStrong:{fontSize:11,fontWeight:'900',color:colors.text},rowRight:{alignItems:'flex-end'},amount:{fontSize:11,fontWeight:'900',color:colors.text},delete:{fontSize:9,color:colors.loss,marginTop:3},monthLabel:{fontSize:12,fontWeight:'900',color:colors.primary},metrics:{flexDirection:'row',gap:spacing.sm,flexWrap:'wrap'},
  backdrop:{flex:1,backgroundColor:'rgba(12,18,27,.38)',alignItems:'center',justifyContent:'center',padding:20},confirmModal:{width:'100%',maxWidth:420,backgroundColor:colors.surface,borderRadius:22,padding:20,gap:16},modalTitle:{fontSize:20,fontWeight:'900',color:colors.text},
  confirmText:{fontSize:12,color:colors.textSecondary},confirmStrong:{fontSize:14,fontWeight:'900',color:colors.primary},confirmButtons:{flexDirection:'row',gap:10},secondaryButton:{flex:1,paddingVertical:12,borderRadius:radius.md,backgroundColor:colors.surfaceMuted,alignItems:'center'},secondaryText:{fontWeight:'900',color:colors.textSecondary},primaryButton:{flex:1,paddingVertical:12,borderRadius:radius.md,backgroundColor:colors.primary,alignItems:'center'},
});
