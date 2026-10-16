import {linkedColor} from '../maintenance/workspaceModel';
import {colorWithAlpha} from '../maintenance/frameEffects';
import {financialTone} from '../theme/financialTone';
import {DEFAULT_HOLDING_WALL_CONFIG,type HoldingWallFieldKey} from '../domain/uiModels';
import {useEffect,useMemo,useState} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {View,Text,Pressable,ScrollView} from 'react-native';
import Svg,{Line,Polyline} from 'react-native-svg';
import {useWatchlist} from '../market/WatchlistRuntime';
import {useMarketRuntime} from '../market/MarketRuntime';
import {watchlistSnapshot} from '../market/watchlistModel';
import {DEFAULT_WATCHLIST_PRESENTATION,WATCHLIST_MODES,WATCHLIST_PRESENTATION_KEY,readWatchlistPresentation,createWatchlistPresentationWriter,sortWatchlistRows,watchlistIntraday,type WatchlistSort} from '../market/watchlistPresentation';
import {useThemeRuntime} from '../theme/ThemeRuntime';
import {useSystemColors} from '../theme/useSystemColors';
import {usePageEditor} from '../editor/pageEditor';
import {MarketPreviewActionGuard,MarketEditableText} from './MarketEditableContent';

const SORTS:readonly {key:WatchlistSort;label:string}[]=[{key:'symbol',label:'代號'},{key:'price',label:'現價'},{key:'changePercent',label:'漲跌幅'},{key:'volume',label:'成交量'}];
const number=(value:number|null,sign=false)=>value===null?'—':`${sign&&value>0?'+':''}${value.toFixed(2)}`;
export function WatchlistPanel({onSelect,heldSymbols=[],readOnlyPreview=false}:{onSelect?:(symbol:string,name:string)=>void;heldSymbols?:readonly string[];readOnlyPreview?:boolean}){
 const list=useWatchlist(),market=useMarketRuntime(),theme=useThemeRuntime(),colors=useSystemColors();
 const previewMode=readOnlyPreview;
 // Subscribe to the existing persisted home-wall appearance, without writing it.
 const homeEditor=usePageEditor('home');
 const marketEditor=usePageEditor('market');
 const [presentation,setPresentation]=useState({...DEFAULT_WATCHLIST_PRESENTATION});
 const [prefsReady,setPrefsReady]=useState(false),[prefsError,setPrefsError]=useState<string|null>(null);
 useEffect(()=>{let alive=true;void AsyncStorage.getItem(WATCHLIST_PRESENTATION_KEY).then(raw=>{if(alive)setPresentation(readWatchlistPresentation(raw));}).catch(()=>{if(alive)setPrefsError('顯示偏好讀取失敗，仍可切換檢視。');}).finally(()=>{if(alive)setPrefsReady(true);});return()=>{alive=false;};},[]);
 const persist=useMemo(()=>createWatchlistPresentationWriter(raw=>AsyncStorage.setItem(WATCHLIST_PRESENTATION_KEY,raw)),[]);
 useEffect(()=>{if(prefsReady&&!previewMode)void persist(JSON.stringify(presentation)).catch(()=>setPrefsError('顯示偏好未能儲存，本次檢視仍可使用。'));},[presentation,prefsReady,persist,previewMode]);
 const rows=useMemo(()=>sortWatchlistRows(watchlistSnapshot(list.items,market.quotes),presentation.sort,presentation.direction),[list.items,market.quotes,presentation.sort,presentation.direction]);
 const bySymbol=useMemo(()=>new Map(market.quotes.map(q=>[q.symbol,q])),[market.quotes]);
 const wallConfig=presentation.useWallStyle?(homeEditor.displayConfig.holdingWall??DEFAULT_HOLDING_WALL_CONFIG):undefined;
 const wall=wallConfig?.style,secondary=theme.palette.textSecondary;
 // Feed already-resolved system colors to the same resolver used by holding cards.
 const systemPalette={gainColor:colors.gain,lossColor:colors.loss,neutralColor:colors.flat};
 const linked=(color:string,enabled:boolean|undefined,row:typeof rows[number])=>linkedColor(color,enabled,financialTone(row.change??0,row.change!==null),systemPalette);
 const appearance=(row:typeof rows[number])=>({
  backgroundColor:wall?colorWithAlpha(linked(wall.backgroundColor,wall.backgroundProfitColor,row),wall.backgroundOpacity??1):theme.palette.surface,
  borderColor:wall?colorWithAlpha(linked(wall.borderColor,wall.borderProfitColor,row),wall.borderOpacity??1):presentation.mode==='wall'?tone(row.change):theme.palette.border,
  textColor:wall?colorWithAlpha(linked(wall.textColor,wall.textProfitColor,row),wall.textOpacity??1):theme.palette.text,
  secondaryTextColor:wall?colorWithAlpha(linked(wall.secondaryTextColor,wall.secondaryTextProfitColor,row),wall.secondaryTextOpacity??1):secondary,
 });
 // Apply visual typography for supported quote fields; accounting fields never enter this view.
 const fieldStyle=(row:typeof rows[number],key:HoldingWallFieldKey,size:number)=>{
  const field=wallConfig?.fields?.find(f=>f.field===key),isSymbol=key==='symbol';
  const base=isSymbol?wall?.secondaryTextColor:wall?.textColor;
  const useProfit=field?.useProfitColor||(isSymbol?wall?.secondaryTextProfitColor:wall?.textProfitColor);
  const opacity=field?.textOpacity??(isSymbol?wall?.secondaryTextOpacity:wall?.textOpacity)??1;
  const fieldBackground=field?.useProfitBackground?linked(field.backgroundColor??colors.flat,true,row):field?.backgroundColor;
  return {fontSize:size*(field?.fontScale??1)*((key==='symbol'||key==='name')?(wallConfig?.header?.fontScale??1):1),
   color:wall?colorWithAlpha(linked(field?.textColor??base??theme.palette.text,useProfit,row),opacity):key==='price'||key==='change'||key==='changePercent'?tone(row.change):theme.palette.text,
   ...(fieldBackground?{backgroundColor:colorWithAlpha(fieldBackground,field?.backgroundOpacity??1)}:{}),
   ...(field?.paddingY!==undefined?{paddingVertical:field.paddingY}:{}),
   ...(field?.lineGap!=null?{marginTop:field.lineGap}:{}),
  };
 };
 const tone=(change:number|null)=>change===null?secondary:change>0?colors.gain:change<0?colors.loss:theme.palette.warning;
 const itemVisual=(field:string,row:typeof rows[number])=>{
  const override=marketEditor.displayConfig.layoutTargets?.['market:watchlist:'+field];
  const profit=override?.textProfitColor===true;
  const toneColor=row.change===null?theme.palette.textSecondary:row.change>0?colors.gain:row.change<0?colors.loss:colors.flat;
  return {
    ...(override?.fontSize!==undefined?{fontSize:override.fontSize}:{}),
    ...(override?.fontWeight!==undefined?{fontWeight:override.fontWeight}:{}),
    ...(override?.lineHeight!==undefined&&override.lineHeight>0?{lineHeight:override.lineHeight}:{}),
    ...(override?.letterSpacing!==undefined?{letterSpacing:override.letterSpacing}:{}),
    ...(override?.align!==undefined?{textAlign:override.align}:{}),
    ...(profit?{color:toneColor}:override?.textColor?{color:override.textColor}:{}),
  };
 };
 const chip=(label:string,selected:boolean,action:()=>void,icon?:string)=><Pressable key={label} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{selected,disabled:!prefsReady||previewMode}} disabled={!prefsReady||previewMode} onPress={action} style={{minHeight:40,paddingHorizontal:10,paddingVertical:9,borderWidth:1,borderRadius:8,borderColor:selected?theme.palette.primary:theme.palette.border,backgroundColor:selected?theme.palette.surfaceMuted:theme.palette.surface}}><Text style={{color:selected?theme.palette.primary:theme.palette.text,fontSize:12,fontWeight:selected?'700':'400'}}>{icon?icon+' ':''}{label.replace('自選顯示：','').replace('排序：','')}</Text></Pressable>;
 const identity=(row:typeof rows[number],fixed=false)=><View style={{flexDirection:'row',alignItems:'center',gap:5,flexWrap:'wrap'}}>
  <Pressable accessibilityRole="button" accessibilityLabel={'開啟行情 '+row.symbol+' '+row.name} disabled={!onSelect||previewMode} onPress={()=>onSelect?.(row.symbol,row.name)} style={{flex:1,minHeight:40,justifyContent:'center'}}>
    <MarketEditableText id="market:watchlist:symbol" label="自選代號">
      <Text testID={'watchlist-symbol-'+row.symbol} numberOfLines={fixed?1:undefined}
        style={[{...fieldStyle(row,'symbol',14),fontWeight:'700'},itemVisual('symbol',row)]}>{row.symbol}</Text>
    </MarketEditableText>
    <MarketEditableText id="market:watchlist:name" label="自選名稱">
      <Text testID={'watchlist-name-'+row.symbol} numberOfLines={fixed?1:undefined}
        style={[fieldStyle(row,'name',12),itemVisual('name',row)]}>{row.name}</Text>
    </MarketEditableText>
  </Pressable>
  {heldSymbols.includes(row.symbol)?<Text style={{fontSize:10,color:theme.palette.primary,borderWidth:1,borderColor:theme.palette.primary,padding:3,borderRadius:4}}>持股</Text>:null}
  <Text style={{fontSize:10,color:appearance(row).secondaryTextColor,borderWidth:1,borderColor:theme.palette.border,padding:3,borderRadius:4}}>自選</Text>
 </View>;
 const price=(row:typeof rows[number])=><MarketEditableText id="market:watchlist:price" label="自選即時價格" kind="value">
  <Text testID={'watchlist-price-'+row.symbol}
    style={[{...fieldStyle(row,'price',presentation.mode==='wall'?25:20),fontWeight:'800',fontVariant:['tabular-nums']},itemVisual('price',row)]}>{number(row.price)}</Text>
 </MarketEditableText>;
 const delta=(row:typeof rows[number])=><MarketEditableText id="market:watchlist:change" label="自選漲跌幅" kind="value">
  <Text style={[{...fieldStyle(row,'change',14),fontWeight:'700',fontVariant:['tabular-nums']},itemVisual('change',row)]}>{row.change===null?'漲跌待取得':<>{number(row.change,true)}  <Text style={fieldStyle(row,'changePercent',14)}>({number(row.changePercent,true)}%)</Text></>}</Text>
 </MarketEditableText>;
 const source=(row:typeof rows[number])=>{const quote=bySymbol.get(row.symbol);return <Text testID={'watchlist-source-'+row.symbol} style={{fontSize:10,color:appearance(row).secondaryTextColor}}>來源 {quote?.source??'待取得'}｜{row.updatedAt?new Date(row.updatedAt).toLocaleString('zh-TW',{timeZone:'Asia/Taipei',hour12:false}):'尚無行情時間'}{row.valuationStatus!=='current_session'?' · 參考行情':''}</Text>;};
 const remove=(row:typeof rows[number])=><Pressable accessibilityRole="button" accessibilityLabel={'移除自選 '+row.symbol} disabled={previewMode} onPress={()=>list.remove(row.symbol)} style={{minHeight:40,justifyContent:'center',alignSelf:'flex-end',paddingHorizontal:8}}><Text style={{color:appearance(row).secondaryTextColor,fontSize:11}}>移除</Text></Pressable>;
 const chart=(row:typeof rows[number])=>{
  const quote=bySymbol.get(row.symbol),points=watchlistIntraday(quote),chartSecondary=appearance(row).secondaryTextColor;
  const chartColor=!wall?tone(row.change):row.change===null?chartSecondary:row.change===0?colorWithAlpha(colors.flat,1):colorWithAlpha(row.change>0?wall.gainColor:wall.lossColor,row.change>0?wall.gainOpacity??1:wall.lossOpacity??1);
  const baseline=quote?.intradayPreviousClose&&quote.intradayPreviousClose>0?quote.intradayPreviousClose:row.previousClose;
  const values=points.map(p=>p.price);if(baseline!==null)values.push(baseline);
  const min=Math.min(...values),max=Math.max(...values),range=Math.max(.01,max-min);
  const y=(p:number)=>8+(max-p)/range*76;
  const xy=points.map(p=>{const d=new Date(p.at+8*3600000),minutes=d.getUTCHours()*60+d.getUTCMinutes()+d.getUTCSeconds()/60;return `${8+(minutes-540)/270*304},${y(p.price)}`;}).join(' ');
  return <View style={{gap:4}}>
   <Text style={{fontSize:11,color:chartSecondary}}>當日分時 {quote?.intradayDate??''}｜昨收 {number(baseline)}{baseline===null?'（基準待取得）':'（虛線）'}</Text>
   {points.length>=2?<Svg width="100%" height={100} viewBox="0 0 320 100" accessibilityLabel={`${row.symbol} ${points.length} 個實際分時點，昨收 ${number(baseline)}`}>
    {baseline!==null?<Line x1={8} y1={y(baseline)} x2={312} y2={y(baseline)} stroke={chartSecondary} strokeDasharray="4 4" strokeWidth={1}/>:null}
    <Polyline points={xy} fill="none" stroke={chartColor} strokeWidth={2}/>
   </Svg>:<View style={{height:74,justifyContent:'center',alignItems:'center'}}><Text style={{color:chartSecondary,fontSize:12}}>{points.length===1?'分時資料累積中（1 個實際點）':'分時走勢待取得'}</Text></View>}
   <View style={{flexDirection:'row',justifyContent:'space-between'}}><Text style={{fontSize:10,color:chartSecondary}}>09:00</Text><Text style={{fontSize:10,color:chartSecondary}}>13:30</Text></View>
  </View>;
 };
 // The two panes share fixed header/row heights and one vertical parent scroll.
 // Only the quote columns scroll sideways, so identity never leaves the viewport.
 const content=presentation.mode==='list'?<View style={{flexDirection:'row',width:'100%'}}>
  <View style={{width:142,borderRightWidth:1,borderColor:theme.palette.border}}>
   <View style={{height:34,padding:8,borderBottomWidth:1,borderColor:theme.palette.border}}><Text style={{color:secondary,fontSize:11}}>標的／身分</Text></View>
   {rows.map(row=><View key={row.symbol} testID={'watchlist-identity-row-'+row.symbol} style={{height:112,padding:8,borderBottomWidth:wall?.borderWidth??1,borderColor:appearance(row).borderColor,backgroundColor:appearance(row).backgroundColor,justifyContent:'center'}}>{identity(row,true)}{remove(row)}</View>)}
  </View>
  <ScrollView horizontal showsHorizontalScrollIndicator style={{flex:1,minWidth:0}}>
   <View style={{width:560}}>
    <View style={{height:34,flexDirection:'row',padding:8,borderBottomWidth:1,borderColor:theme.palette.border}}>{['現價／昨收','漲跌／幅度','成交量','行情來源／時間'].map((label,index)=><Text key={label} style={{width:[90,145,100,209][index],color:secondary,fontSize:11}}>{label}</Text>)}</View>
    {rows.map(row=><View key={row.symbol} testID={'watchlist-quote-row-'+row.symbol} style={{height:112,padding:8,borderBottomWidth:wall?.borderWidth??1,borderColor:appearance(row).borderColor,backgroundColor:appearance(row).backgroundColor,flexDirection:'row',alignItems:'center'}}>
     <View style={{width:90}}>{price(row)}<Text style={{fontSize:10,color:appearance(row).secondaryTextColor}}>昨收 {number(row.previousClose)}</Text></View><View style={{width:145}}>{delta(row)}</View><Text style={{width:100,color:appearance(row).textColor,fontVariant:['tabular-nums']}}>{row.volume?.toLocaleString('zh-TW')??'—'}</Text><View style={{width:209}}>{source(row)}</View>
    </View>)}
   </View>
  </ScrollView>
 </View>:<View style={{flexDirection:presentation.mode==='wall'?'row':'column',flexWrap:presentation.mode==='wall'?'wrap':'nowrap',gap:8}}>{rows.map(row=><View key={row.symbol} testID={'watchlist-card-'+row.symbol} style={{...(presentation.mode==='wall'?{width:'48.5%' as const}:{}),padding:wall?.padding??(presentation.mode==='compact'?8:12),gap:wall?.rowGap??5,borderWidth:wall?.borderWidth??1,borderColor:appearance(row).borderColor,borderRadius:wall?.cornerRadius??10,backgroundColor:appearance(row).backgroundColor,overflow:'hidden'}}>
  {presentation.mode==='wall'&&!wall?<View pointerEvents="none" style={{position:'absolute',top:0,right:0,bottom:0,left:0,backgroundColor:tone(row.change),opacity:.1}}/>:null}
  {identity(row)}<View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:6,flexWrap:'wrap'}}>{price(row)}{delta(row)}</View>
  <Text style={{fontSize:11,color:appearance(row).secondaryTextColor}}>成交量 {row.volume?.toLocaleString('zh-TW')??'—'}｜昨收 {number(row.previousClose)}</Text>
  {presentation.mode==='chart'?chart(row):null}{source(row)}{row.price===null?<Text style={{color:appearance(row).secondaryTextColor,fontSize:12}}>行情尚未取得</Text>:null}{remove(row)}
 </View>)}</View>;
 const panel=<View style={{gap:8}}>
  <View accessibilityLabel="自選顯示模式" style={{flexDirection:'row',gap:6,flexWrap:'wrap'}}>{WATCHLIST_MODES.map(mode=>chip('自選顯示：'+mode.label,presentation.mode===mode.key,()=>setPresentation(p=>({...p,mode:mode.key})),mode.icon))}</View>
  <View style={{flexDirection:'row',gap:5,flexWrap:'wrap',alignItems:'center'}}>{SORTS.map(sort=>chip('排序：'+sort.label,presentation.sort===sort.key,()=>setPresentation(p=>({...p,sort:sort.key}))))}{chip(presentation.direction==='asc'?'排序方向：升冪':'排序方向：降冪',false,()=>setPresentation(p=>({...p,direction:p.direction==='asc'?'desc':'asc'})))}</View>
  <View style={{flexDirection:'row',gap:6,flexWrap:'wrap'}}>{chip('套用目前行情牆樣式',presentation.useWallStyle,()=>setPresentation(p=>({...p,useWallStyle:true})))}{presentation.useWallStyle?chip('使用預設樣式',false,()=>setPresentation(p=>({...p,useWallStyle:false}))):null}</View>
  {prefsError?<Text style={{color:theme.palette.textSecondary,fontSize:11}}>{prefsError}</Text>:null}
  {list.error?<Text style={{color:colors.loss}}>{list.error}</Text>:null}
  {!list.hydrated?<Text style={{color:theme.palette.textSecondary}}>載入自選清單…</Text>:!rows.length?<Text style={{color:theme.palette.textSecondary}}>尚無自選標的，請在市場搜尋後點「加入自選」。</Text>:content}
 </View>;
 return previewMode?panel:<MarketPreviewActionGuard>{panel}</MarketPreviewActionGuard>;
}
