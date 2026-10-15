import {useMemo} from 'react';
import {View,Text,Pressable} from 'react-native';
import {useWatchlist} from '../market/WatchlistRuntime';
import {useMarketRuntime} from '../market/MarketRuntime';
import {watchlistSnapshot} from '../market/watchlistModel';
import {useThemeRuntime} from '../theme/ThemeRuntime';
import {useSystemColors} from '../theme/useSystemColors';
export function WatchlistPanel({onSelect,heldSymbols=[]}:{onSelect?:(symbol:string,name:string)=>void;heldSymbols?:readonly string[]}){
 const list=useWatchlist(),market=useMarketRuntime(),theme=useThemeRuntime(),colors=useSystemColors();
 const rows=useMemo(()=>watchlistSnapshot(list.items,market.quotes),[list.items,market.quotes]);
 return <View style={{gap:8}}>
  {list.error?<Text style={{color:colors.loss}}>{list.error}</Text>:!list.hydrated?<Text style={{color:theme.palette.textSecondary}}>載入自選清單…</Text>:!rows.length?<Text style={{color:theme.palette.textSecondary}}>尚無自選標的，請在市場搜尋後點「加入自選」。</Text>:null}
  {rows.map(row=><View key={row.symbol} style={{padding:12,gap:5,borderWidth:1,borderColor:theme.palette.border,borderRadius:10}}>
   <View style={{flexDirection:'row',alignItems:'center',gap:8}}><Pressable disabled={!onSelect} onPress={()=>onSelect?.(row.symbol,row.name)} style={{flex:1}}><Text style={{color:theme.palette.text,fontWeight:'700'}}>{row.symbol} {row.name}</Text></Pressable><Text style={{color:theme.palette.primary,fontSize:12}}>{heldSymbols.includes(row.symbol)?'持股＋自選':'自選'}</Text><Pressable accessibilityLabel={'移除自選 '+row.symbol} onPress={()=>list.remove(row.symbol)}><Text style={{color:theme.palette.textSecondary}}>移除</Text></Pressable></View>
   <Text style={{fontSize:21,fontWeight:'700',color:(row.change??0)>0?colors.gain:(row.change??0)<0?colors.loss:colors.flat}}>{row.price?.toFixed(2)??'—'}　{row.change===null?'—':(row.change>0?'+':'')+row.change.toFixed(2)}　{row.changePercent?.toFixed(2)??'—'}%</Text>
   <Text style={{fontSize:12,color:theme.palette.textSecondary}}>昨收 {row.previousClose?.toFixed(2)??'—'}｜成交量 {row.volume?.toLocaleString('zh-TW')??'—'}｜{row.updatedAt?new Date(row.updatedAt).toLocaleTimeString('en-GB',{timeZone:'Asia/Taipei',hour12:false}):'尚無行情時間'}</Text>
  </View>)}
 </View>;
}
