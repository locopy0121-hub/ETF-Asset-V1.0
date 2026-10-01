import {useEffect,useMemo,useState} from 'react';
import {Pressable,ScrollView,StyleSheet,Text,TextInput,View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';

import {OfficialCandleChart,type HoldingChartContext} from '../components/OfficialCandleChart';
import {
  DEFAULT_HOLDING_CHART,HOLDING_CHART_DATA_OPTIONS,HOLDING_CHART_RANGES,MARKET_CHART_DATA_OPTIONS,NATIVE_CHART_STYLES,
  type ChartDataKey,type HoldingChartRange,type NativeChartStyle,
} from '../domain/chartEditor';
import type {HoldingQuote} from '../domain/uiModels';
import {useFinance} from '../finance/FinanceRuntime';
import {fetchOfficialDailyHistory,isValidHistorySymbol,type DailyCandle} from '../market/twseDailyHistory';
import {colors,radius,spacing} from '../theme/tokens';

const monthsByRange:Record<HoldingChartRange,number>={'1月':1,'3月':3,'6月':6,'1年':12};

export function StockChartScreen({holding:initialHolding,onBack}:{holding:HoldingQuote;onBack:()=>void}){
  const finance=useFinance();
  const [symbol,setSymbol]=useState(initialHolding.symbol);
  const [query,setQuery]=useState(initialHolding.symbol);
  const [style,setStyle]=useState<NativeChartStyle>(DEFAULT_HOLDING_CHART.style);
  const [range,setRange]=useState<HoldingChartRange>('3月');
  const [dataKeys,setDataKeys]=useState<readonly ChartDataKey[]>(['open','high','low','close','volume','cost']);
  const [candles,setCandles]=useState<readonly DailyCandle[]>([]);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState<string|null>(null);
  const [inputError,setInputError]=useState<string|null>(null);
  const currentHolding=useMemo(()=>finance.holdings.find(item=>item.symbol===symbol)??(initialHolding.symbol===symbol?initialHolding:undefined),[finance.holdings,initialHolding,symbol]);
  const holdingContext:HoldingChartContext|undefined=currentHolding?{
    shares:currentHolding.shares,
    costAvg:currentHolding.costAvg,
    cumulativeDividend:currentHolding.cumulativeDividend,
    canonicalPnl:currentHolding.pnl,
    canonicalComprehensivePnl:currentHolding.comprehensivePnl,
    canonicalRoi:currentHolding.roi,
  }:undefined;

  useEffect(()=>{
    const controller=new AbortController();
    setLoading(true);setError(null);setCandles([]);
    void fetchOfficialDailyHistory(symbol,monthsByRange[range],new Date(),controller.signal)
      .then(rows=>setCandles(rows))
      .catch(reason=>{if(!controller.signal.aborted)setError(reason instanceof Error?reason.message:String(reason));})
      .finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    return()=>controller.abort();
  },[symbol,range]);

  const selectSymbol=(next:string)=>{
    const normalized=next.trim().toUpperCase();
    if(!isValidHistorySymbol(normalized)){setInputError('請輸入 4–8 碼有效 ETF／股票代號');return;}
    setInputError(null);setSymbol(normalized);setQuery(normalized);
  };
  const toggleData=(key:ChartDataKey)=>{
    if(HOLDING_CHART_DATA_OPTIONS.some(item=>item.key===key)&&!currentHolding)return;
    setDataKeys(current=>{
      if(current.includes(key))return current.length===1?current:current.filter(item=>item!==key);
      return [...current,key];
    });
  };

  return <SafeAreaView edges={['top','bottom']} style={styles.safe}>
    <View style={styles.topbar}>
      <Pressable accessibilityRole="button" onPress={onBack} style={styles.back}><Text style={styles.backText}>‹</Text></Pressable>
      <View style={styles.titleWrap}><Text style={styles.kicker}>專業圖表</Text><Text style={styles.title}>{symbol}{currentHolding?' · '+currentHolding.name:''}</Text></View>
      <View style={styles.topSpacer}/>
    </View>
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.searchRow}>
        <TextInput value={query} onChangeText={setQuery} autoCapitalize="characters" autoCorrect={false}
          placeholder="輸入 ETF／股票代號" placeholderTextColor={colors.textSecondary} style={styles.input}
          onSubmitEditing={()=>selectSymbol(query)}/>
        <Pressable onPress={()=>selectSymbol(query)} style={styles.searchButton}><Text style={styles.searchButtonText}>查詢</Text></Pressable>
      </View>
      {inputError?<Text style={styles.errorText}>{inputError}</Text>:null}

      {finance.holdings.length?<View style={styles.section}>
        <Text style={styles.sectionTitle}>我的持股</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalChips}>
          {finance.holdings.map(item=><Chip key={item.symbol} label={item.symbol} active={item.symbol===symbol} onPress={()=>selectSymbol(item.symbol)}/>)}
        </ScrollView>
      </View>:null}

      <View style={styles.chartCard}>
        <OfficialCandleChart candles={candles} loading={loading} error={error} rangeLabel={range}
          dataKeys={dataKeys} chartStyle={style} {...(holdingContext?{holding:holdingContext}:{})} crosshairDefault costLineEnabled/>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>圖表樣式</Text>
        <View style={styles.wrap}>{NATIVE_CHART_STYLES.map(item=><Chip key={item.id} label={item.label} active={style===item.id} onPress={()=>setStyle(item.id)}/>)}</View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>時間區間</Text>
        <View style={styles.wrap}>{HOLDING_CHART_RANGES.map(item=><Chip key={item} label={item} active={range===item} onPress={()=>setRange(item)}/>)}</View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>資料來源</Text>
        <View style={styles.sourceGrid}>
          <View style={styles.sourceCard}>
            <Text style={styles.sourceTitle}>市場數據</Text>
            <Text style={styles.sourceHint}>交易所行情與歷史資料</Text>
            <View style={styles.wrap}>{MARKET_CHART_DATA_OPTIONS.map(item=><Chip key={item.key} label={item.label} active={dataKeys.includes(item.key)} onPress={()=>toggleData(item.key)}/>)}</View>
          </View>
          <View style={[styles.sourceCard,!currentHolding&&styles.sourceDisabled]}>
            <Text style={styles.sourceTitle}>持股相關數據</Text>
            <Text style={styles.sourceHint}>{currentHolding?'目前持股、成本、損益與股息':'非持股標的：此區僅在有持股時啟用'}</Text>
            <View style={styles.wrap}>{HOLDING_CHART_DATA_OPTIONS.map(item=><Chip key={item.key} label={item.label} active={dataKeys.includes(item.key)} disabled={!currentHolding} onPress={()=>toggleData(item.key)}/>)}</View>
          </View>
        </View>
      </View>

      <Text style={styles.footnote}>首頁與庫存只使用 Mini 圖表；此頁集中完整查詢、K 線、十字線、時間區間與持股／市場資料疊加。歷史持股數值為顯示估值，不改寫 Canonical 帳務核心。</Text>
    </ScrollView>
  </SafeAreaView>;
}

function Chip({label,active,onPress,disabled=false}:{label:string;active:boolean;onPress:()=>void;disabled?:boolean}){
  return <Pressable accessibilityRole="button" accessibilityState={{selected:active,disabled}} disabled={disabled} onPress={onPress}
    style={[styles.chip,active&&styles.chipOn,disabled&&styles.chipDisabled]}>
    <Text style={[styles.chipText,active&&styles.chipTextOn]}>{label}</Text>
  </Pressable>;
}

const styles=StyleSheet.create({
  safe:{flex:1,backgroundColor:colors.background,paddingTop:spacing.xs},
  topbar:{minHeight:62,flexDirection:'row',alignItems:'center',paddingHorizontal:spacing.md,borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:colors.border,backgroundColor:colors.surface},
  back:{width:42,height:42,alignItems:'center',justifyContent:'center'},backText:{fontSize:34,lineHeight:36,fontWeight:'400',color:colors.primary},
  titleWrap:{flex:1,alignItems:'center'},kicker:{fontSize:9,fontWeight:'900',color:colors.primary},title:{fontSize:15,fontWeight:'900',color:colors.text},
  topSpacer:{width:42},content:{padding:spacing.md,gap:spacing.md,paddingBottom:40},
  searchRow:{flexDirection:'row',gap:8},input:{flex:1,minHeight:42,borderWidth:1,borderColor:colors.border,borderRadius:radius.md,backgroundColor:colors.surface,paddingHorizontal:12,color:colors.text,fontWeight:'800'},
  searchButton:{minWidth:68,alignItems:'center',justifyContent:'center',borderRadius:radius.md,backgroundColor:colors.primary,paddingHorizontal:14},
  searchButtonText:{color:'#FFFFFF',fontWeight:'900',fontSize:12},errorText:{fontSize:10,color:colors.loss,fontWeight:'800'},
  chartCard:{backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border,borderRadius:radius.lg,padding:12},
  section:{gap:8},sectionTitle:{fontSize:12,fontWeight:'900',color:colors.text},horizontalChips:{gap:6,paddingRight:12},
  wrap:{flexDirection:'row',flexWrap:'wrap',gap:6},chip:{paddingHorizontal:10,paddingVertical:7,borderRadius:radius.pill,borderWidth:1,borderColor:colors.border,backgroundColor:colors.surface},
  chipOn:{backgroundColor:colors.primary,borderColor:colors.primary},chipDisabled:{opacity:.35},chipText:{fontSize:10,fontWeight:'800',color:colors.textSecondary},chipTextOn:{color:'#FFFFFF'},
  sourceGrid:{gap:8},sourceCard:{gap:6,padding:10,borderWidth:1,borderColor:colors.border,borderRadius:radius.md,backgroundColor:colors.surfaceMuted},
  sourceDisabled:{opacity:.72},sourceTitle:{fontSize:11,fontWeight:'900',color:colors.text},sourceHint:{fontSize:9,lineHeight:14,color:colors.textSecondary},
  footnote:{fontSize:9,lineHeight:15,color:colors.textSecondary},
});
