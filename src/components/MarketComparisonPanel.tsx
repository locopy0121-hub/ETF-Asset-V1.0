import AsyncStorage from '@react-native-async-storage/async-storage';
import {Alert,Pressable,ScrollView,StyleSheet,Text,TextInput,View} from 'react-native';
import {useCallback,useEffect,useMemo,useRef,useState} from 'react';

import type {HoldingQuote} from '../domain/uiModels';
import type {RuntimeQuote} from '../finance/financeSeed';
import {
  diagnoseMarketComparison,
  marketComparisonDiagnosisLabel,
  marketSourceField,
  priceDifference,
} from '../market/marketComparison';
import {fetchOfficialMarketProbe,type OfficialMarketProbe} from '../market/officialMarketProbe';
import {colors,radius} from '../theme/tokens';

const STORAGE_KEY='@tf-asset/market-comparison-v2';

type ComparisonLog=Readonly<{
  id:string;
  createdAt:number;
  symbol:string;
  appPrice:number|null;
  officialPrice:number|null;
  centerPrice:number|null;
  officialSourceAt:number|null;
  officialCheckedAt:number|null;
  centerSource:string|null;
  centerQuality:string|null;
  centerSourceQuoteAt:number|null;
  centerCheckedAt:number|null;
  marketDataVersion:number;
  diagnosis:string;
}>;

type PersistedComparison=Readonly<{
  schema:2;
  symbol:string;
  logs:ComparisonLog[];
}>;

export function MarketComparisonPanel({
  quotes,holdings,marketDataVersion,
}:{
  quotes:readonly RuntimeQuote[];
  holdings:readonly HoldingQuote[];
  marketDataVersion:number;
}){
  const [symbol,setSymbol]=useState('');
  const [official,setOfficial]=useState<OfficialMarketProbe|null>(null);
  const [probeLoading,setProbeLoading]=useState(false);
  const [probeError,setProbeError]=useState<string|null>(null);
  const [logs,setLogs]=useState<ComparisonLog[]>([]);
  const [hydrated,setHydrated]=useState(false);

  useEffect(()=>{
    let alive=true;
    AsyncStorage.getItem(STORAGE_KEY).then(raw=>{
      if(!alive||!raw)return;
      try{
        const parsed=JSON.parse(raw) as Partial<PersistedComparison>;
        if(parsed.schema!==2)return;
        if(typeof parsed.symbol==='string')setSymbol(parsed.symbol.trim().toUpperCase());
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
  const normalizedRef=useRef(normalized);
  normalizedRef.current=normalized;

  const appRow=holdings.find(row=>row.symbol===normalized);
  const centerRow=quotes.find(row=>row.symbol===normalized);
  const appPrice=appRow?.price??null;
  const centerPrice=centerRow?.currentPrice??null;
  const officialPrice=official?.symbol===normalized?official.price:null;
  const diagnosis=diagnoseMarketComparison({appPrice,officialPrice,centerPrice});

  useEffect(()=>{
    if(!hydrated)return;
    const payload:PersistedComparison={schema:2,symbol:normalized,logs:logs.slice(0,50)};
    AsyncStorage.setItem(STORAGE_KEY,JSON.stringify(payload)).catch(()=>{});
  },[hydrated,normalized,logs]);

  const readOfficial=useCallback(async()=>{
    const requestSymbol=normalizedRef.current;
    if(!requestSymbol){
      setOfficial(null);
      setProbeError('請先指定要比對的 ETF／股票代號');
      return;
    }
    setProbeLoading(true);
    setProbeError(null);
    try{
      const next=await fetchOfficialMarketProbe(requestSymbol);
      if(normalizedRef.current!==requestSymbol)return;
      setOfficial(next);
    }catch(error){
      if(normalizedRef.current!==requestSymbol)return;
      setOfficial(null);
      setProbeError(error instanceof Error?error.message:String(error));
    }finally{
      if(normalizedRef.current===requestSymbol)setProbeLoading(false);
    }
  },[]);

  useEffect(()=>{
    setOfficial(null);
    setProbeError(null);
    if(!normalized)return;
    const timer=setTimeout(()=>{void readOfficial();},250);
    return()=>clearTimeout(timer);
  },[normalized,readOfficial]);

  const addLog=()=>{
    if(!normalized){Alert.alert('請輸入代號','請先指定要比對的 ETF／股票代號。');return;}
    const next:ComparisonLog={
      id:normalized+'-'+Date.now(),
      createdAt:Date.now(),
      symbol:normalized,
      appPrice,
      officialPrice,
      centerPrice,
      officialSourceAt:official?.sourceQuoteAt??null,
      officialCheckedAt:official?.checkedAt??null,
      centerSource:centerRow?.source??null,
      centerQuality:centerRow?.quality??null,
      centerSourceQuoteAt:centerRow?.sourceQuoteAt??null,
      centerCheckedAt:centerRow?.checkedAt??null,
      marketDataVersion,
      diagnosis:marketComparisonDiagnosisLabel(diagnosis),
    };
    setLogs(current=>[next,...current].slice(0,50));
  };

  return <View style={styles.root}>
    <View style={styles.head}>
      <View style={{flex:1}}>
        <Text style={styles.title}>行情比對／診斷</Text>
        <Text style={styles.note}>唯讀誤差診斷：只讀三方目前數值，不回寫行情中心、App 行情、SQLite、快取或帳務。</Text>
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

    <CompareRow label="App／首頁行情" value={formatPrice(appPrice)}
      note={appRow?appRow.name:'目前持股沒有此代號'}/>

    <CompareRow label="證券中心／官方行情" value={formatPrice(officialPrice)}
      note={probeLoading?'讀取中…':probeError??(official
        ?official.availability==='trade'
          ?'TWSE_MIS · z｜實際成交價'
          :'TWSE_MIS · z 暫無實際成交價（僅診斷，不以其他欄位替代）'
        :'等待讀取')}/>

    <CompareRow label="行情中心" value={formatPrice(centerPrice)}
      note={centerRow?(centerRow.source??'未知來源')+' · '+marketSourceField(centerRow):'尚無中央行情'}/>

    <View style={styles.diffBox}>
      <CompareRow label="App ↔ 證券中心" value={formatDiff(priceDifference(appPrice,officialPrice))}/>
      <CompareRow label="行情中心 ↔ 證券中心" value={formatDiff(priceDifference(centerPrice,officialPrice))}/>
      <CompareRow label="App ↔ 行情中心" value={formatDiff(priceDifference(appPrice,centerPrice))}/>
      <Text style={styles.diagnosis}>判定：{marketComparisonDiagnosisLabel(diagnosis)}</Text>
    </View>

    <View style={styles.metaBox}>
      <CompareRow label="證券中心來源" value={official?.source??'TWSE_MIS'}/>
      <CompareRow label="證券中心讀取狀態" value={probeLoading?'讀取中':probeError?'失敗｜'+probeError:official?.availability==='trade'?'成功｜取得 z 實際成交價':official?.availability==='z_missing'?'成功回應｜但 z 缺值':'等待讀取'}/>
      <CompareRow label="證券中心採用欄位" value="z｜實際成交價"/>
      <CompareRow label="證券中心來源時間" value={formatTime(official?.sourceQuoteAt)}/>
      <CompareRow label="證券中心讀取時間" value={formatTime(official?.checkedAt)}/>
      <CompareRow label="行情中心來源" value={centerRow?.source??'尚無'}/>
      <CompareRow label="行情中心採用欄位" value={marketSourceField(centerRow)}/>
      <CompareRow label="行情中心品質" value={centerRow?.quality??'尚無'}/>
      <CompareRow label="行情中心價格型態" value={centerRow?.priceType??'尚無'}/>
      <CompareRow label="行情中心 Fallback" value={centerRow?centerRow.isFallback?'是':'否':'—'}/>
      <CompareRow label="行情中心說明" value={centerRow?.statusMessage??'尚無'}/>
      <CompareRow label="行情中心來源時間" value={formatTime(centerRow?.sourceQuoteAt)}/>
      <CompareRow label="行情中心檢查時間" value={formatTime(centerRow?.checkedAt)}/>
      <CompareRow label="資料版本" value={'#'+marketDataVersion}/>
    </View>

    {official?<View style={styles.rawBox}>
      <Text style={styles.rawTitle}>證券中心原始欄位（唯讀）</Text>
      <Text style={styles.rawNote}>z 缺值時僅顯示原始資料供查核；y／o／h／l／v／pz／b／a 不會被拿來替代官方比對價，也不會回寫 App 行情。</Text>
      <CompareRow label="z｜實際成交價" value={formatRaw(official.raw.z)}/>
      <CompareRow label="pz｜最近一筆成交參考" value={formatRaw(official.raw.pz)}/>
      <CompareRow label="y｜昨收" value={formatRaw(official.raw.y)}/>
      <CompareRow label="o｜開盤" value={formatRaw(official.raw.o)}/>
      <CompareRow label="h｜最高" value={formatRaw(official.raw.h)}/>
      <CompareRow label="l｜最低" value={formatRaw(official.raw.l)}/>
      <CompareRow label="v｜成交量" value={formatRaw(official.raw.v)}/>
      <CompareRow label="b｜最佳買價列" value={formatRaw(official.raw.b)}/>
      <CompareRow label="a｜最佳賣價列" value={formatRaw(official.raw.a)}/>
      <CompareRow label="d / t｜證交所原始時間" value={[official.raw.d,official.raw.t].filter(Boolean).join(' ')||'—'}/>
      <CompareRow label="ex / ch｜市場／頻道" value={[official.raw.ex,official.raw.ch].filter(Boolean).join(' / ')||'—'}/>
    </View>:null}

    <View style={styles.actions}>
      <Pressable disabled={probeLoading} onPress={()=>void readOfficial()} style={[styles.action,probeLoading&&styles.disabled]}>
        <Text style={styles.actionText}>{probeLoading?'讀取中…':'重新讀取官方行情'}</Text>
      </Pressable>
      <Pressable onPress={addLog} style={styles.action}><Text style={styles.actionText}>加入比對紀錄</Text></Pressable>
    </View>

    {logs.length?<View style={styles.logs}>
      <View style={styles.logHead}>
        <Text style={styles.logTitle}>最近比對紀錄（{logs.length}/50）</Text>
        <Pressable onPress={()=>Alert.alert('清除行情比對紀錄','只會刪除診斷紀錄，不影響行情或帳務。',[
          {text:'取消',style:'cancel'},
          {text:'清除',style:'destructive',onPress:()=>setLogs([])},
        ])}><Text style={styles.clear}>清除</Text></Pressable>
      </View>
      {logs.slice(0,10).map(log=><View key={log.id} style={styles.logRow}>
        <Text style={styles.logMain}>{log.symbol}｜官方 {formatPrice(log.officialPrice)}｜中心 {formatPrice(log.centerPrice)}｜App {formatPrice(log.appPrice)}</Text>
        <Text style={styles.logMeta}>{formatTime(log.createdAt)}｜官方 {formatTime(log.officialSourceAt)}｜中心 {formatTime(log.centerSourceQuoteAt)}｜#{log.marketDataVersion}｜{log.diagnosis}</Text>
      </View>)}
    </View>:null}
  </View>;
}

function formatPrice(value:number|null|undefined){
  return typeof value==='number'&&Number.isFinite(value)&&value>0?value.toFixed(2):'—';
}
function formatDiff(value:number|null){
  if(value===null)return '—';
  const fixed=value.toFixed(2);
  return value>0?'+'+fixed:fixed;
}
function formatRaw(value:string|null|undefined){
  return typeof value==='string'&&value.trim()?value:'—';
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
  compareRow:{flexDirection:'row',alignItems:'flex-start',justifyContent:'space-between',gap:10,paddingVertical:5,borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:colors.border},
  compareLabel:{flex:1,fontSize:10,fontWeight:'700',color:colors.textSecondary},
  compareRight:{flex:1.6,alignItems:'flex-end'},
  compareValue:{fontSize:11,fontWeight:'900',color:colors.text,textAlign:'right'},
  compareNote:{fontSize:9,lineHeight:13,color:colors.textSecondary,textAlign:'right',marginTop:2},
  diffBox:{gap:1,padding:9,borderRadius:radius.md,backgroundColor:colors.surfaceMuted},
  diagnosis:{fontSize:10,fontWeight:'900',color:colors.primary,paddingTop:7,lineHeight:15},
  metaBox:{gap:1},
  rawBox:{gap:1,padding:9,borderRadius:radius.md,borderWidth:1,borderColor:colors.border,backgroundColor:colors.background},
  rawTitle:{fontSize:10,fontWeight:'900',color:colors.text},
  rawNote:{fontSize:9,lineHeight:13,color:colors.textSecondary,marginBottom:3},
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
