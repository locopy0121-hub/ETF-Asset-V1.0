import AsyncStorage from '@react-native-async-storage/async-storage';
import {Alert,Pressable,ScrollView,StyleSheet,Text,TextInput,View} from 'react-native';
import {useEffect,useMemo,useState} from 'react';

import type {HoldingQuote} from '../domain/uiModels';
import type {RuntimeQuote} from '../finance/financeSeed';
import {
  diagnoseMarketComparison,
  marketComparisonDiagnosisLabel,
  marketSourceField,
  priceDifference,
} from '../market/marketComparison';
import {colors,radius,spacing} from '../theme/tokens';

const STORAGE_KEY='@tf-asset/market-comparison-v1';

type ComparisonLog=Readonly<{
  id:string;
  createdAt:number;
  symbol:string;
  appPrice:number|null;
  brokerPrice:number|null;
  centerPrice:number|null;
  source:string|null;
  quality:string|null;
  sourceQuoteAt:number|null;
  checkedAt:number|null;
  marketDataVersion:number;
  diagnosis:string;
}>;

type PersistedComparison=Readonly<{
  schema:1;
  symbol:string;
  brokerBySymbol:Record<string,string>;
  logs:ComparisonLog[];
}>;

export function MarketComparisonPanel({
  quotes,holdings,marketDataVersion,refreshing,onRefresh,
}:{
  quotes:readonly RuntimeQuote[];
  holdings:readonly HoldingQuote[];
  marketDataVersion:number;
  refreshing:boolean;
  onRefresh:()=>void;
}){
  const [symbol,setSymbol]=useState('');
  const [brokerBySymbol,setBrokerBySymbol]=useState<Record<string,string>>({});
  const [logs,setLogs]=useState<ComparisonLog[]>([]);
  const [hydrated,setHydrated]=useState(false);

  useEffect(()=>{
    let alive=true;
    AsyncStorage.getItem(STORAGE_KEY).then(raw=>{
      if(!alive||!raw)return;
      try{
        const parsed=JSON.parse(raw) as Partial<PersistedComparison>;
        if(parsed.schema!==1)return;
        if(typeof parsed.symbol==='string')setSymbol(parsed.symbol.trim().toUpperCase());
        if(parsed.brokerBySymbol&&typeof parsed.brokerBySymbol==='object')setBrokerBySymbol(parsed.brokerBySymbol);
        if(Array.isArray(parsed.logs))setLogs(parsed.logs.slice(0,50));
      }catch{}
    }).finally(()=>{if(alive)setHydrated(true);});
    return()=>{alive=false;};
  },[]);

  const symbols=useMemo(()=>Array.from(new Set([
    ...holdings.map(row=>row.symbol),
    ...quotes.map(row=>row.symbol),
  ])).filter(Boolean).slice(0,30),[holdings,quotes]);

  useEffect(()=>{
    if(!hydrated||symbol)return;
    setSymbol(symbols[0]??'');
  },[hydrated,symbol,symbols]);

  const normalized=symbol.trim().toUpperCase();
  const appRow=holdings.find(row=>row.symbol===normalized);
  const centerRow=quotes.find(row=>row.symbol===normalized);
  const brokerText=brokerBySymbol[normalized]??'';
  const brokerValue=positiveNumber(brokerText);
  const appPrice=appRow?.price??null;
  const centerPrice=centerRow?.currentPrice??null;
  const diagnosis=diagnoseMarketComparison({appPrice,brokerPrice:brokerValue,centerPrice});

  const persist=async(nextLogs=logs,nextBroker=brokerBySymbol,nextSymbol=normalized)=>{
    const payload:PersistedComparison={schema:1,symbol:nextSymbol,brokerBySymbol:nextBroker,logs:nextLogs.slice(0,50)};
    await AsyncStorage.setItem(STORAGE_KEY,JSON.stringify(payload));
  };

  const saveBenchmark=()=>{
    if(!normalized){Alert.alert('請輸入代號','例如 0056、0050、00919。');return;}
    if(brokerValue===null){Alert.alert('證券中心基準值無效','請輸入大於 0 的行情價格。');return;}
    void persist();
  };

  const addLog=()=>{
    if(!normalized){Alert.alert('請輸入代號','請先指定要比對的 ETF／股票代號。');return;}
    const next:ComparisonLog={
      id:normalized+'-'+Date.now(),
      createdAt:Date.now(),
      symbol:normalized,
      appPrice,
      brokerPrice:brokerValue,
      centerPrice,
      source:centerRow?.source??null,
      quality:centerRow?.quality??null,
      sourceQuoteAt:centerRow?.sourceQuoteAt??null,
      checkedAt:centerRow?.checkedAt??null,
      marketDataVersion,
      diagnosis:marketComparisonDiagnosisLabel(diagnosis),
    };
    const nextLogs=[next,...logs].slice(0,50);
    setLogs(nextLogs);
    void persist(nextLogs);
  };

  return <View style={styles.root}>
    <View style={styles.head}>
      <View style={{flex:1}}>
        <Text style={styles.title}>行情比對／診斷</Text>
        <Text style={styles.note}>只做比對與留存診斷證據；不回寫行情、不修改市值、損益或 Ledger。</Text>
      </View>
      <Text style={styles.version}>v{marketDataVersion}</Text>
    </View>

    <Text style={styles.label}>代號行情</Text>
    <TextInput accessibilityLabel="行情比對代號" value={symbol}
      onChangeText={value=>setSymbol(value.toUpperCase().replace(/[^0-9A-Z]/g,'').slice(0,8))}
      autoCapitalize="characters" autoCorrect={false} placeholder="0056" style={styles.input}/>
    {symbols.length?<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
      {symbols.slice(0,12).map(code=><Pressable key={code} onPress={()=>setSymbol(code)}
        style={[styles.chip,normalized===code&&styles.chipActive]}>
        <Text style={[styles.chipText,normalized===code&&styles.chipTextActive]}>{code}</Text>
      </Pressable>)}
    </ScrollView>:null}

    <CompareRow label="App／首頁行情" value={formatPrice(appPrice)} note={appRow?appRow.name:'目前持股沒有此代號'}/>

    <View>
      <Text style={styles.label}>證券中心基準值</Text>
      <View style={styles.brokerRow}>
        <TextInput accessibilityLabel="證券中心基準行情" value={brokerText}
          onChangeText={value=>setBrokerBySymbol(current=>({...current,[normalized]:sanitizePriceText(value)}))}
          keyboardType="decimal-pad" placeholder="自行輸入券商看到的行情" style={[styles.input,{flex:1}]}/>
        <Pressable onPress={saveBenchmark} style={styles.miniAction}><Text style={styles.miniActionText}>儲存</Text></Pressable>
      </View>
    </View>

    <CompareRow label="行情中心" value={formatPrice(centerPrice)}
      note={centerRow?(centerRow.source??'未知來源')+' · '+marketSourceField(centerRow):'尚無中央行情'}/>

    <View style={styles.diffBox}>
      <CompareRow label="App ↔ 證券中心" value={formatDiff(priceDifference(appPrice,brokerValue))}/>
      <CompareRow label="行情中心 ↔ 證券中心" value={formatDiff(priceDifference(centerPrice,brokerValue))}/>
      <CompareRow label="App ↔ 行情中心" value={formatDiff(priceDifference(appPrice,centerPrice))}/>
      <Text style={styles.diagnosis}>判定：{marketComparisonDiagnosisLabel(diagnosis)}</Text>
    </View>

    <View style={styles.metaBox}>
      <CompareRow label="行情來源" value={centerRow?.source??'尚無'}/>
      <CompareRow label="採用欄位" value={marketSourceField(centerRow)}/>
      <CompareRow label="行情品質" value={centerRow?.quality??'尚無'}/>
      <CompareRow label="交易所來源時間" value={formatTime(centerRow?.sourceQuoteAt)}/>
      <CompareRow label="中心檢查時間" value={formatTime(centerRow?.checkedAt)}/>
      <CompareRow label="資料版本" value={'#'+marketDataVersion}/>
    </View>

    <View style={styles.actions}>
      <Pressable disabled={refreshing} onPress={onRefresh} style={[styles.action,refreshing&&styles.disabled]}>
        <Text style={styles.actionText}>{refreshing?'更新中…':'更新行情後比對'}</Text>
      </Pressable>
      <Pressable onPress={addLog} style={styles.action}><Text style={styles.actionText}>加入比對紀錄</Text></Pressable>
    </View>

    {logs.length?<View style={styles.logs}>
      <View style={styles.logHead}>
        <Text style={styles.logTitle}>最近比對紀錄（{logs.length}/50）</Text>
        <Pressable onPress={()=>Alert.alert('清除行情比對紀錄','只會刪除診斷紀錄，不影響行情或帳務。',[
          {text:'取消',style:'cancel'},
          {text:'清除',style:'destructive',onPress:()=>{setLogs([]);void persist([]);}},
        ])}><Text style={styles.clear}>清除</Text></Pressable>
      </View>
      {logs.slice(0,10).map(log=><View key={log.id} style={styles.logRow}>
        <Text style={styles.logMain}>{log.symbol}｜券 {formatPrice(log.brokerPrice)}｜中心 {formatPrice(log.centerPrice)}｜App {formatPrice(log.appPrice)}</Text>
        <Text style={styles.logMeta}>{formatTime(log.createdAt)}｜{log.source??'無來源'}｜#{log.marketDataVersion}｜{log.diagnosis}</Text>
      </View>)}
    </View>:null}
  </View>;
}

function positiveNumber(value:string){
  const number=Number(value.replace(/,/g,''));
  return Number.isFinite(number)&&number>0?number:null;
}
function sanitizePriceText(value:string){
  const cleaned=value.replace(/[^0-9.]/g,'');
  const [whole,...rest]=cleaned.split('.');
  return rest.length?whole+'.'+rest.join('').slice(0,4):whole;
}
function formatPrice(value:number|null|undefined){
  return typeof value==='number'&&Number.isFinite(value)&&value>0?value.toFixed(2):'—';
}
function formatDiff(value:number|null){
  if(value===null)return '—';
  const fixed=value.toFixed(2);
  return value>0?'+'+fixed:fixed;
}
function formatTime(value:number|null|undefined){
  if(!value)return '—';
  try{return new Date(value).toLocaleString('zh-TW',{timeZone:'Asia/Taipei'});}catch{return String(value);}
}

function CompareRow({label,value,note}:{label:string;value:string;note?:string}){
  return <View style={styles.compareRow}>
    <Text style={styles.compareLabel}>{label}</Text>
    <View style={styles.compareRight}><Text style={styles.compareValue}>{value}</Text>{note?<Text style={styles.compareNote}>{note}</Text>:null}</View>
  </View>;
}

const styles=StyleSheet.create({
  root:{gap:10,padding:11,borderRadius:radius.md,borderWidth:1,borderColor:colors.border,backgroundColor:colors.surface},
  head:{flexDirection:'row',alignItems:'flex-start',gap:10},
  title:{fontSize:13,fontWeight:'900',color:colors.text},
  note:{fontSize:10,lineHeight:15,color:colors.textSecondary,marginTop:2},
  version:{fontSize:10,fontWeight:'900',color:colors.primary},
  label:{fontSize:10,fontWeight:'900',color:colors.textSecondary,marginBottom:5},
  input:{minHeight:40,borderWidth:1,borderColor:colors.border,borderRadius:radius.md,backgroundColor:colors.background,paddingHorizontal:10,paddingVertical:8,fontSize:12,fontWeight:'800',color:colors.text},
  chips:{gap:6,paddingVertical:2},
  chip:{paddingHorizontal:9,paddingVertical:6,borderRadius:radius.pill,borderWidth:1,borderColor:colors.border,backgroundColor:colors.background},
  chipActive:{borderColor:colors.primary,backgroundColor:colors.surfaceMuted},
  chipText:{fontSize:10,fontWeight:'800',color:colors.textSecondary},
  chipTextActive:{color:colors.primary},
  brokerRow:{flexDirection:'row',gap:7,alignItems:'center'},
  miniAction:{minHeight:40,paddingHorizontal:12,borderRadius:radius.md,backgroundColor:colors.primary,alignItems:'center',justifyContent:'center'},
  miniActionText:{fontSize:10,fontWeight:'900',color:'#FFFFFF'},
  compareRow:{flexDirection:'row',alignItems:'flex-start',justifyContent:'space-between',gap:10,paddingVertical:5,borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:colors.border},
  compareLabel:{flex:1,fontSize:10,fontWeight:'700',color:colors.textSecondary},
  compareRight:{flex:1.6,alignItems:'flex-end'},
  compareValue:{fontSize:11,fontWeight:'900',color:colors.text,textAlign:'right'},
  compareNote:{fontSize:9,lineHeight:13,color:colors.textSecondary,textAlign:'right',marginTop:2},
  diffBox:{gap:1,padding:9,borderRadius:radius.md,backgroundColor:colors.surfaceMuted},
  diagnosis:{fontSize:10,fontWeight:'900',color:colors.primary,paddingTop:7,lineHeight:15},
  metaBox:{gap:1},
  actions:{flexDirection:'row',gap:8},
  action:{flex:1,minHeight:40,borderRadius:radius.md,backgroundColor:colors.primary,alignItems:'center',justifyContent:'center',paddingHorizontal:8},
  disabled:{opacity:.45},
  actionText:{fontSize:10,fontWeight:'900',color:'#FFFFFF',textAlign:'center'},
  logs:{gap:5,paddingTop:4},
  logHead:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},
  logTitle:{fontSize:10,fontWeight:'900',color:colors.text},
  clear:{fontSize:10,fontWeight:'900',color:colors.primary},
  logRow:{paddingVertical:7,borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:colors.border},
  logMain:{fontSize:10,fontWeight:'800',color:colors.text},
  logMeta:{fontSize:9,lineHeight:13,color:colors.textSecondary,marginTop:2},
});
