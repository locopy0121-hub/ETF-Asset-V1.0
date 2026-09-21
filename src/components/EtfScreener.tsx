import {useMemo,useState} from 'react';
import {Pressable,ScrollView,StyleSheet,Text,TextInput,View} from 'react-native';

import type {EtfCatalogItem} from '../market/MarketRuntime';
import {
  buildEtfScreenItem,
  fetchYahooEtfMetrics,
  filterEtfs,
  type EtfIndustry,
  type EtfKind,
  type EtfMetrics,
} from '../market/etfScreener';
import {colors,radius,spacing} from '../theme/tokens';

const kinds:readonly ('all'|EtfKind)[]=['all','市值','高股息','債券','產業','主題','主動','平衡','其他'];
const industries:readonly ('all'|EtfIndustry)[]=['all','台灣大盤','半導體','科技','金融','ESG','美國','全球','債券','多資產','其他'];
const numberOrUndefined=(value:string)=>{const n=Number(value);return value.trim()&&Number.isFinite(n)?n:undefined;};

export function EtfScreener({catalog}:{catalog:readonly EtfCatalogItem[]}){
  const [query,setQuery]=useState('');
  const [market,setMarket]=useState<'all'|'TWSE'|'TPEx'>('all');
  const [kind,setKind]=useState<'all'|EtfKind>('all');
  const [industry,setIndustry]=useState<'all'|EtfIndustry>('all');
  const [maxExpense,setMaxExpense]=useState('');
  const [minYield,setMinYield]=useState('');
  const [metrics,setMetrics]=useState<Record<string,EtfMetrics>>({});
  const [loading,setLoading]=useState(false);
  const [profileError,setProfileError]=useState<string|null>(null);
  const [visibleCount,setVisibleCount]=useState(24);

  const rows=useMemo(()=>catalog.map(item=>buildEtfScreenItem(item,metrics[item.symbol])),[catalog,metrics]);
  const filtered=useMemo(()=>filterEtfs(rows,{
    query,market,kind,industry,
    ...(numberOrUndefined(maxExpense)==null?{}:{maxExpenseRatioPct:numberOrUndefined(maxExpense)}),
    ...(numberOrUndefined(minYield)==null?{}:{minYieldPct:numberOrUndefined(minYield)}),
  }),[rows,query,market,kind,industry,maxExpense,minYield]);
  const visible=filtered.slice(0,visibleCount);

  const enrich=async()=>{
    if(loading)return;
    setLoading(true);
    setProfileError(null);
    const targets=filtered.filter(item=>metrics[item.symbol]==null).slice(0,12);
    if(!targets.length){setLoading(false);return;}
    const settled=await Promise.allSettled(targets.map(async item=>({symbol:item.symbol,metrics:await fetchYahooEtfMetrics(item)})));
    const next={...metrics};
    let failures=0;
    settled.forEach(result=>{
      if(result.status==='fulfilled')next[result.value.symbol]=result.value.metrics;
      else failures+=1;
    });
    setMetrics(next);
    if(failures)setProfileError(`部分網路基金資料暫時無法取得（${failures}/${targets.length}）`);
    setLoading(false);
  };

  const reset=()=>{
    setQuery('');setMarket('all');setKind('all');setIndustry('all');setMaxExpense('');setMinYield('');setVisibleCount(24);
  };

  return <View style={styles.root}>
    <View style={styles.topRow}>
      <View style={{flex:1}}>
        <Text style={styles.title}>ETF 篩選器</Text>
        <Text style={styles.subtitle}>代號／名稱搜尋 · 市場 · 類型 · 產業 · 費用率 · 殖利率</Text>
      </View>
      <Pressable onPress={reset} style={styles.smallButton}><Text style={styles.smallButtonText}>重設</Text></Pressable>
    </View>

    <TextInput
      value={query}
      onChangeText={text=>{setQuery(text);setVisibleCount(24);}}
      style={styles.input}
      placeholder="輸入 ETF 代號、名稱或關鍵字"
      placeholderTextColor={colors.textSecondary}
      autoCapitalize="characters"
      autoCorrect={false}
    />

    <FilterGroup label="市場">
      {(['all','TWSE','TPEx'] as const).map(value=><Chip key={value} label={value==='all'?'全部':value} active={market===value} onPress={()=>setMarket(value)}/>)}
    </FilterGroup>

    <FilterGroup label="類型">
      {kinds.map(value=><Chip key={value} label={value==='all'?'全部':value} active={kind===value} onPress={()=>setKind(value)}/>)}
    </FilterGroup>

    <FilterGroup label="產業／區域">
      {industries.map(value=><Chip key={value} label={value==='all'?'全部':value} active={industry===value} onPress={()=>setIndustry(value)}/>)}
    </FilterGroup>

    <View style={styles.metricsRow}>
      <View style={{flex:1}}><Text style={styles.fieldLabel}>費用率上限 %</Text><TextInput value={maxExpense} onChangeText={setMaxExpense} keyboardType="decimal-pad" placeholder="不限" placeholderTextColor={colors.textSecondary} style={styles.input}/></View>
      <View style={{flex:1}}><Text style={styles.fieldLabel}>殖利率下限 %</Text><TextInput value={minYield} onChangeText={setMinYield} keyboardType="decimal-pad" placeholder="不限" placeholderTextColor={colors.textSecondary} style={styles.input}/></View>
    </View>
    <View style={styles.networkRow}>
      <Text style={styles.note}>費用率／殖利率缺值不猜測；可從網路基金資料補齊目前篩選結果。</Text>
      <Pressable disabled={loading} onPress={()=>void enrich()} style={[styles.enrich,loading&&styles.disabled]}><Text style={styles.enrichText}>{loading?'取得中':'補齊資料'}</Text></Pressable>
    </View>
    {profileError?<Text style={styles.error}>{profileError}</Text>:null}

    <View style={styles.resultHeader}><Text style={styles.resultTitle}>符合 {filtered.length} 檔</Text><Text style={styles.resultMeta}>顯示 {Math.min(visible.length,filtered.length)} 檔</Text></View>
    <View style={styles.results}>
      {visible.map(item=><View key={item.symbol} style={styles.resultRow}>
        <View style={styles.symbolBlock}><Text style={styles.symbol}>{item.symbol}</Text><Text style={styles.market}>{item.market}</Text></View>
        <View style={{flex:1,minWidth:0}}><Text numberOfLines={1} style={styles.name}>{item.name}</Text><Text style={styles.tags}>{item.kind} · {item.industry}</Text></View>
        <View style={styles.metricBlock}><Text style={styles.metric}>費 {item.expenseRatioPct==null?'—':item.expenseRatioPct.toFixed(2)+'%'}</Text><Text style={styles.metric}>殖 {item.yieldPct==null?'—':item.yieldPct.toFixed(2)+'%'}</Text></View>
      </View>)}
      {!filtered.length?<Text style={styles.empty}>目前條件沒有符合的 ETF；若使用費用率／殖利率條件，請先按「補齊資料」。</Text>:null}
    </View>
    {filtered.length>visibleCount?<Pressable onPress={()=>setVisibleCount(count=>count+24)} style={styles.more}><Text style={styles.moreText}>顯示更多</Text></Pressable>:null}
  </View>;
}

function FilterGroup({label,children}:{label:string;children:React.ReactNode}){
  return <View style={styles.filterGroup}><Text style={styles.fieldLabel}>{label}</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>{children}</ScrollView></View>;
}
function Chip({label,active,onPress}:{label:string;active:boolean;onPress:()=>void}){
  return <Pressable onPress={onPress} style={[styles.chip,active&&styles.chipActive]}><Text style={[styles.chipText,active&&styles.chipTextActive]}>{label}</Text></Pressable>;
}

const styles=StyleSheet.create({
  root:{gap:spacing.sm},
  topRow:{flexDirection:'row',alignItems:'center',gap:8},
  title:{fontSize:14,fontWeight:'900',color:colors.text},
  subtitle:{fontSize:10,color:colors.textSecondary,marginTop:2},
  smallButton:{paddingHorizontal:10,paddingVertical:7,borderRadius:radius.pill,backgroundColor:colors.surfaceMuted},
  smallButtonText:{fontSize:10,fontWeight:'900',color:colors.primary},
  input:{minHeight:40,borderWidth:1,borderColor:colors.border,borderRadius:radius.md,paddingHorizontal:10,color:colors.text,backgroundColor:colors.surface,fontSize:11},
  filterGroup:{gap:5},
  fieldLabel:{fontSize:10,fontWeight:'900',color:colors.textSecondary},
  chips:{gap:6,paddingRight:8},
  chip:{paddingHorizontal:10,paddingVertical:7,borderRadius:radius.pill,backgroundColor:colors.surfaceMuted},
  chipActive:{backgroundColor:colors.primary},
  chipText:{fontSize:10,fontWeight:'800',color:colors.textSecondary},
  chipTextActive:{color:'#FFFFFF'},
  metricsRow:{flexDirection:'row',gap:8},
  networkRow:{flexDirection:'row',alignItems:'center',gap:8},
  note:{flex:1,fontSize:9,lineHeight:14,color:colors.textSecondary},
  enrich:{paddingHorizontal:10,paddingVertical:8,borderRadius:radius.pill,backgroundColor:colors.primary},
  enrichText:{fontSize:10,fontWeight:'900',color:'#FFFFFF'},
  disabled:{opacity:.4},
  error:{fontSize:9,color:colors.loss,fontWeight:'800'},
  resultHeader:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingTop:4},
  resultTitle:{fontSize:11,fontWeight:'900',color:colors.text},
  resultMeta:{fontSize:9,color:colors.textSecondary},
  results:{borderWidth:1,borderColor:colors.border,borderRadius:radius.md,overflow:'hidden'},
  resultRow:{minHeight:54,paddingHorizontal:10,paddingVertical:8,flexDirection:'row',alignItems:'center',gap:8,borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:colors.border},
  symbolBlock:{width:62},
  symbol:{fontSize:11,fontWeight:'900',color:colors.primary},
  market:{fontSize:8,color:colors.textSecondary,marginTop:2},
  name:{fontSize:11,fontWeight:'800',color:colors.text},
  tags:{fontSize:9,color:colors.textSecondary,marginTop:3},
  metricBlock:{width:72,alignItems:'flex-end'},
  metric:{fontSize:9,fontWeight:'800',color:colors.textSecondary},
  empty:{fontSize:10,lineHeight:16,color:colors.textSecondary,padding:12},
  more:{alignSelf:'center',paddingHorizontal:14,paddingVertical:8,borderRadius:radius.pill,backgroundColor:colors.surfaceMuted},
  moreText:{fontSize:10,fontWeight:'900',color:colors.primary},
});
