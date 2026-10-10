
import {useEffect,useMemo,useState} from 'react';
import {Linking,ScrollView,StyleSheet,View} from 'react-native';
import Svg,{Line,Polyline} from 'react-native-svg';
import {Pressable,Text,TextInput} from '../components/EditableNative';
import {PageShell} from '../components/PageShell';
import {PageEditorStack} from '../components/PageEditorStack';
import {FrameCard} from '../components/FrameCard';
import {OfficialCandleChart} from '../components/OfficialCandleChart';
import {EtfConstituentsContent} from '../components/EtfConstituentsContent';
import {PageGearButton} from '../components/PageGearButton';
import {PageFrameSettingsModal} from '../components/PageFrameSettingsModal';
import {PAGE_FRAMES} from '../domain/frameRegistry';
import {useFinance} from '../finance/FinanceRuntime';
import {useAiNewsRuntime} from '../ai/AiNewsRuntime';
import {useMarketRuntime} from '../market/MarketRuntime';
import {searchTaiwanSecurities,aggregateMarketCandles,marketIndicators,type ResearchPeriod,type ResearchTab} from '../market/marketResearchModel';
import {fetchOfficialDailyHistory,type DailyCandle} from '../market/twseDailyHistory';
import {isEtfSymbol} from '../market/etfConstituents';
import {useSystemColors} from '../theme/useSystemColors';
import {useThemeRuntime} from '../theme/ThemeRuntime';
import {colors,radius,spacing} from '../theme/tokens';

const tabs:readonly {key:ResearchTab;label:string}[]=[
  {key:'chart',label:'即時／K線'},{key:'profile',label:'基本資料'},{key:'etf',label:'ETF成分'},
  {key:'institution',label:'法人／主力'},{key:'premium',label:'折溢價'},{key:'news',label:'新聞'},
];
const price=(n:number|null|undefined)=>typeof n==='number'&&Number.isFinite(n)&&n>0?n.toFixed(2):'—';
const amount=(n:number|null|undefined)=>typeof n==='number'&&Number.isFinite(n)&&n>=0?n.toLocaleString('zh-TW'):'—';
const time=(n:number|null|undefined)=>typeof n==='number'&&Number.isFinite(n)&&n>0?new Date(n).toLocaleString('zh-TW',{timeZone:'Asia/Taipei'}):'尚無';
const ranges={m1:1,m3:3,m6:6,y1:12} as const;
type Range=keyof typeof ranges;

function Chip({label,active,click}:{label:string;active:boolean;click:()=>void}){
  const t=useThemeRuntime();
  return <Pressable accessibilityRole="button" accessibilityState={{selected:active}} onPress={click}
    style={{borderRadius:50,paddingHorizontal:11,paddingVertical:8,backgroundColor:active?t.palette.primary:t.palette.surfaceMuted}}>
    <Text style={{fontSize:12,fontWeight:'800',color:active?'white':t.palette.text}}>{label}</Text>
  </Pressable>;
}
function Fact({label,value}:{label:string;value:string}){
  const t=useThemeRuntime();
  return <View style={{flexDirection:'row',gap:8,paddingVertical:10,borderBottomWidth:.5,borderBottomColor:t.palette.border}}>
    <Text style={{fontSize:12,color:t.palette.textSecondary,flex:1}}>{label}</Text>
    <Text editorReadOnly style={{fontSize:13,fontWeight:'700',color:t.palette.text,flex:2,textAlign:'right'}}>{value}</Text>
  </View>;
}
function IntradayChart({points}:{points:readonly {at:number;price:number}[]}){
  const t=useThemeRuntime();
  const valid=points.filter(p=>Number.isFinite(p.at)&&Number.isFinite(p.price)&&p.price>0).sort((a,b)=>a.at-b.at).slice(-500);
  if(valid.length<2)return <Text style={{color:t.palette.textSecondary}}>尚無足夠的當日成交紀錄，休市不建立虛假走勢。</Text>;
  const at0=valid[0]!.at,at1=valid[valid.length-1]!.at;
  const prices=valid.map(p=>p.price),min=Math.min(...prices),max=Math.max(...prices);
  const xSpan=Math.max(at1-at0,1),ySpan=Math.max(max-min,.01);
  const poly=valid.map(p=>(4+312*(p.at-at0)/xSpan)+','+(105-93*(p.price-min)/ySpan)).join(' ');
  return <View><Svg width="100%" height={116} viewBox="0 0 320 116">
    {[19,57,101].map(y=><Line key={y} x1={0} y1={y} x2={320} y2={y} stroke={t.palette.border}/>)}
    <Polyline points={poly} stroke={t.palette.primary} strokeWidth={2.2} fill="none"/>
  </Svg><Text style={{color:t.palette.textSecondary,fontSize:11}}>當日來源成交點 {valid.length} 筆；{price(min)}–{price(max)} 元</Text></View>;
}

export function MarketResearchScreen(){
  const market=useMarketRuntime(),finance=useFinance(),news=useAiNewsRuntime();
  const theme=useThemeRuntime(),system=useSystemColors();
  const [query,setQuery]=useState('');
  const [symbol,setSymbol]=useState<string|null>(null);
  const [tab,setTab]=useState<ResearchTab>('chart');
  const [period,setPeriod]=useState<ResearchPeriod>('day');
  const [range,setRange]=useState<Range>('m3');
  const [chartStyle,setChartStyle]=useState<'candlestick'|'line'>('candlestick');
  const [candles,setCandles]=useState<DailyCandle[]>([]);
  const [loading,setLoading]=useState(false),[error,setError]=useState<string|null>(null);
  const [settingsOpen,setSettingsOpen]=useState(false);
  const results=useMemo(()=>searchTaiwanSecurities(market.catalog,query),[market.catalog,query]);
  const info=market.catalog.find(row=>row.symbol===symbol);
  const quote=market.quotes.find(row=>row.symbol===symbol);
  const holding=finance.holdings.find(row=>row.symbol===symbol);
  const relatedNews=news.items.filter(item=>item.symbol===symbol);
  useEffect(()=>{market.setResearchSymbols(symbol?[symbol]:[]);return()=>market.setResearchSymbols([]);},[symbol,market.setResearchSymbols]);
  useEffect(()=>{
    if(!symbol){setCandles([]);return;}
    const abort=new AbortController();let live=true;
    setLoading(true);setError(null);setCandles([]);
    void fetchOfficialDailyHistory(symbol,ranges[range],new Date(),abort.signal)
      .then(rows=>{if(live)setCandles(rows);})
      .catch(e=>{if(live)setError(e instanceof Error?e.message:'官方資料暫不可用');})
      .finally(()=>{if(live)setLoading(false);});
    return()=>{live=false;abort.abort();};
  },[symbol,range]);
  const transformed=useMemo(()=>aggregateMarketCandles(candles,period),[candles,period]);
  const indicators=useMemo(()=>marketIndicators(candles),[candles]);
  const value=quote&&Number.isFinite(quote.currentPrice)&&quote.currentPrice>0?quote.currentPrice:null;
  const prior=quote?.previousClose;
  const diff=value!==null&&typeof prior==='number'&&prior>0?value-prior:null;
  const percent=diff!==null&&typeof prior==='number'&&prior>0?100*diff/prior:null;
  const tone=diff===null?theme.palette.text:diff>0?system.gain:diff<0?system.loss:system.flat;
  const frameData=[
    {key:'market-search',element:<FrameCard title="全市場搜尋">
      <TextInput value={query} onChangeText={setQuery} placeholder="2330、00985A、0050、台積電…" autoCapitalize="characters" autoCorrect={false}
        placeholderTextColor={theme.palette.textSecondary}
        style={[styles.search,{backgroundColor:theme.palette.surfaceMuted,color:theme.palette.text}]}/>
      <Text style={{fontSize:11,color:theme.palette.textSecondary}}>可輸入部分代號或中文名稱；查詢不需要持有股票。{market.catalogRefreshing?'官方目錄同步中':''}</Text>
      {query.trim()!==''&&query.trim()!==(symbol+' '+(info?.name??''))?
        results.length?<View>{results.slice(0,35).map(item=><Pressable key={item.symbol} onPress={()=>{
          setSymbol(item.symbol);setQuery(item.symbol+' '+item.name);setTab('chart');
        }} style={[styles.option,{borderBottomColor:theme.palette.border}]}>
          <Text style={{color:theme.palette.primary,fontWeight:'800',width:78}}>{item.symbol}</Text>
          <Text style={{color:theme.palette.text,flex:1}} numberOfLines={2}>{item.name}</Text>
          <Text style={{color:theme.palette.textSecondary,fontSize:11}}>{item.market==='TWSE'?'上市':'上櫃'}</Text>
        </Pressable>)}</View>:<Text style={{color:theme.palette.textSecondary}}>目錄沒有相符標的；請確認名稱或重新同步證券目錄。</Text>:null}
    </FrameCard>},
    ...(symbol?[{key:'market-summary',element:<FrameCard title="標的行情">
      <Text style={{fontSize:19,fontWeight:'800',color:theme.palette.text}}>{info?.name??symbol}　{symbol}</Text>
      <Text style={{color:theme.palette.textSecondary,fontSize:12}}>{info?.market==='TPEx'?'上櫃':'上市／待核實'}｜{info?.industry??info?.etfType??'股票／ETF'}｜{market.phase==='live'?'盤中':market.phase==='afterHours'?'休市／盤後':'離線'}</Text>
      <View style={styles.row}>
        <Text editorReadOnly style={{fontSize:37,fontWeight:'900',color:tone}}>{price(value)}</Text>
        <Text editorReadOnly style={{fontSize:15,fontWeight:'700',color:tone}}>{diff===null||percent===null?'漲跌待取得':(diff>0?'+':'')+diff.toFixed(2)+' ('+(percent>0?'+':'')+percent.toFixed(2)+'%)'}</Text>
      </View>
      <Text style={{fontSize:11,color:theme.palette.textSecondary}}>{value===null?'此標的尚無可核實報價；不以其他股票或預設值代填。':(quote?.quoteStatus??'快照')+'｜'+(quote?.source??'來源未註記')+'｜'+time(quote?.sourceQuoteAt)}</Text>
      <View style={styles.row}><Text style={{color:theme.palette.textSecondary}}>前收 {price(prior)}</Text><Text style={{color:theme.palette.textSecondary}}>總量 {amount(quote?.volume)}</Text>{holding?<Text style={{color:theme.palette.primary}}>已持有 {amount(holding.shares)} 股</Text>:null}</View>
      <Pressable onPress={()=>void market.refresh({force:true})}><Text style={{fontWeight:'700',color:theme.palette.primary}}>{market.refreshing?'更新中…':'更新行情'}</Text></Pressable>
    </FrameCard>},
    {key:'market-chart',element:<FrameCard title="行情圖表">
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>{tabs.map(x=>
        <Chip key={x.key} label={x.label} active={tab===x.key} click={()=>setTab(x.key)}/>)}</ScrollView>
      {tab==='chart'?<View style={{gap:10}}>
        <Text style={{fontWeight:'800',color:theme.palette.text}}>當日實際成交走勢</Text>
        <IntradayChart points={quote?.intraday??[]}/>
        <View style={styles.row}>{([{key:'day',label:'日K'},{key:'week',label:'週K'},{key:'month',label:'月K'}] as const).map(x=>
          <Chip key={x.key} label={x.label} active={period===x.key} click={()=>setPeriod(x.key)}/>)}</View>
        <View style={styles.row}>{([{key:'m1',label:'1月'},{key:'m3',label:'3月'},{key:'m6',label:'6月'},{key:'y1',label:'1年'}] as const).map(x=>
          <Chip key={x.key} label={x.label} active={range===x.key} click={()=>setRange(x.key)}/>)}</View>
        <View style={styles.row}><Chip label="K線" active={chartStyle==='candlestick'} click={()=>setChartStyle('candlestick')}/><Chip label="折線" active={chartStyle==='line'} click={()=>setChartStyle('line')}/></View>
        <OfficialCandleChart candles={transformed} loading={loading} error={error} rangeLabel={period+'｜'+range}
          chartStyle={chartStyle} dataKeys={['open','high','low','close','volume']} crosshairDefault costLineEnabled={false}/>
        <View style={styles.row}>{[{label:'MA5',value:price(indicators.ma5)},{label:'MA10',value:price(indicators.ma10)},
          {label:'MA20',value:price(indicators.ma20)},{label:'RSI14',value:indicators.rsi14?.toFixed(2)??'—'}].map(item=>
          <View key={item.label} style={{backgroundColor:theme.palette.surfaceMuted,padding:10,borderRadius:10,minWidth:78}}>
            <Text style={{fontSize:11,color:theme.palette.textSecondary}}>{item.label}</Text><Text editorReadOnly style={{color:theme.palette.text,fontWeight:'800'}}>{item.value}</Text>
          </View>)}</View>
        <Text style={{fontSize:11,color:theme.palette.textSecondary}}>週月 K 依取得之官方日線聚合，不用瞬間成交價偽造 OHLC／成交量。</Text>
      </View>:<Text style={{fontSize:12,color:theme.palette.textSecondary}}>目前檢視：{tabs.find(x=>x.key===tab)?.label}</Text>}
    </FrameCard>},
    {key:'market-details',element:<FrameCard title="市場研究">
      {tab==='profile'?<View>
        {[['證券代號',info?.symbol??symbol],['公司全名',info?.companyName??'—'],['市場',info?.market??'—'],
          ['產業',info?.industry??'—'],['上市櫃日期',info?.listingDate??'—'],['資本額',amount(info?.paidInCapitalTwd)],
          ['普通股發行量',amount(info?.issuedCommonShares)],['董事長',info?.chairman??'—'],['來源',info?.source??'—']].map(([label,metric])=>
          <Fact key={label} label={label} value={metric}/>)}</View>:null}
      {tab==='etf'?(isEtfSymbol(symbol)?<EtfConstituentsContent symbol={symbol} name={info?.name??symbol}/>:
        <Text style={{color:theme.palette.textSecondary}}>此標的未辨識為 ETF，不顯示不適用的成分資料。</Text>):null}
      {tab==='institution'?<Text style={{color:theme.palette.textSecondary}}>官方逐日三大法人、分點券商、大戶籌碼尚未接入已驗證的資料源；行情快照只有成交價，不能推算主力買賣超。資料取得前不顯示假數據。</Text>:null}
      {tab==='premium'?<View><Fact label="市場成交價" value={price(value)}/><Fact label="同日公告淨值 NAV" value="尚無核實資料"/><Fact label="折溢價率" value="—"/>
        <Text style={{color:theme.palette.textSecondary,fontSize:12}}>缺少同日同口徑官方 NAV 時不得以盤中價格混算前日 NAV。</Text></View>:null}
      {tab==='news'?(relatedNews.length?relatedNews.map(n=><Pressable key={n.id} onPress={()=>void Linking.openURL(n.url).catch(()=>{})} style={[styles.option,{borderBottomColor:theme.palette.border}]}>
        <View style={{flex:1}}><Text style={{color:theme.palette.text,fontWeight:'700'}}>{n.title}</Text><Text style={{color:theme.palette.textSecondary,fontSize:11}}>{n.source}｜{n.publishedAt}</Text></View>
        </Pressable>):<Text style={{color:theme.palette.textSecondary}}>目前無此標的經核實新聞。既有新聞來源僅追蹤持股，不用其他標的新聞替代。</Text>):null}
      {tab==='chart'?<Text style={{color:theme.palette.textSecondary}}>切換上方頁籤可看基本資料、ETF 成分股、法人、折溢價及新聞。</Text>:null}
    </FrameCard>}]:[]),
  ];
  return <>
    <PageShell pageKey="market" title="市場資訊中心" subtitle="台股／ETF 查詢與研究" actions={<PageGearButton onPress={()=>setSettingsOpen(true)}/>}>
      <PageEditorStack pageKey="market" frames={frameData}/>
    </PageShell>
    <PageFrameSettingsModal visible={settingsOpen} pageKey="market" title="市場資訊中心編輯"
      frames={PAGE_FRAMES.market} onClose={()=>setSettingsOpen(false)}/>
  </>;
}
const styles=StyleSheet.create({
  search:{minHeight:48,borderRadius:radius.md,fontSize:16,padding:12},
  row:{flexDirection:'row',alignItems:'center',flexWrap:'wrap',gap:spacing.sm},
  option:{paddingVertical:11,borderBottomWidth:StyleSheet.hairlineWidth,flexDirection:'row',gap:8,alignItems:'center'},
});
