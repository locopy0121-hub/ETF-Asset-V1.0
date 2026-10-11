import {useEffect,useMemo,useState} from 'react';
import {Linking,View} from 'react-native';
import {Pressable,Text} from './EditableNative';
import {fetchStockDividendHistory,stockDividendByFiscalYear,type StockDividendRecord} from '../market/stockDividendHistory';
import {useThemeRuntime} from '../theme/ThemeRuntime';

const format=(x:number|null)=>x===null?'—':x.toLocaleString('zh-TW',{maximumFractionDigits:4});
const shownDate=(x:string|null)=>x??'尚未提供';
export function StockDividendHistoryContent({symbol,isEtf,market}:{symbol:string;isEtf:boolean;market:'TWSE'|'TPEx'|null}){
 const theme=useThemeRuntime();
 const [years,setYears]=useState<3|5|10|20>(10);
 const [rows,setRows]=useState<StockDividendRecord[]>([]);
 const [loading,setLoading]=useState(false);
 const [error,setError]=useState<string|null>(null);
 const [reload,setReload]=useState(0);
 const supported=!isEtf&&/^\d{4}$/.test(symbol)&&Boolean(market);
 useEffect(()=>{
  if(!supported){setRows([]);setError(null);return;}
  const abort=new AbortController();let active=true;
  setLoading(true);setRows([]);setError(null);
  void fetchStockDividendHistory(symbol,years,new Date(),abort.signal)
    .then(data=>{if(active)setRows(data);})
    .catch(e=>{if(active)setError(e instanceof Error?e.message:'資料暫不可用');})
    .finally(()=>{if(active)setLoading(false);});
  return()=>{active=false;abort.abort();};
 },[symbol,years,reload,supported]);
 const summary=useMemo(()=>stockDividendByFiscalYear(rows),[rows]);
 const quiet={fontSize:11,color:theme.palette.textSecondary} as const;
 const label={fontSize:12,color:theme.palette.text,fontWeight:'700' as const};
 if(isEtf)return <View style={{gap:10}}>
   <Text style={quiet}>ETF 收益分配與普通股現金／股票股利的資料定義不同，不會套用個股股利估算。</Text>
   <Pressable onPress={()=>void Linking.openURL(market==='TPEx'?'https://info.tpex.org.tw/ETF/zh/dividend-list.html':'https://www.twse.com.tw/zh/ETFortune/dividendList').catch(()=>{})}>
     <Text style={{color:theme.palette.primary,fontWeight:'800'}}>查看{market==='TPEx'?'櫃買中心':'證交所 e添富'} ETF 歷史配息公告 ↗</Text>
   </Pressable>
   <Text style={quiet}>ETF 歷史配息的 App 內結構化清單待獨立官方介接，不以個股資料代替。</Text>
 </View>;
 if(!supported)return <Text style={quiet}>此標的不是已核實的四碼上市／上櫃個股，歷史股利來源未建立，不顯示推算值。</Text>;
 return <View style={{gap:10}}>
   <Text style={quiet}>歷史個股股利政策（非庫存入帳）｜來源：FinMind TaiwanStockDividend｜金額：每股新臺幣元。年份為股利所屬年度，非必然發放年度。</Text>
   <View style={{flexDirection:'row',flexWrap:'wrap',gap:6,alignItems:'center'}}>
    {([3,5,10,20] as const).map(n=><Pressable key={n} onPress={()=>setYears(n)}
      accessibilityRole="button" accessibilityState={{selected:years===n}}
      style={{padding:8,borderRadius:10,backgroundColor:years===n?theme.palette.primary:theme.palette.surfaceMuted}}>
      <Text style={{color:years===n?'white':theme.palette.text,fontWeight:'700',fontSize:12}}>{n} 年</Text>
    </Pressable>)}
    <Pressable accessibilityRole="button" onPress={()=>setReload(n=>n+1)} style={{padding:8}}>
      <Text style={{color:theme.palette.primary,fontWeight:'800'}}>重新查詢</Text>
    </Pressable>
   </View>
   {loading?<Text style={quiet}>查詢歷史股利公告中…</Text>:
     error?<Text style={{color:theme.palette.text}}>無法核實歷史股利資料：{error}</Text>:
     rows.length===0?<Text style={quiet}>此區間無可核實的股利政策紀錄（不代表確定不配息）。</Text>:
     <View style={{gap:10}}>
       <Text style={{fontSize:14,fontWeight:'800',color:theme.palette.text}}>各股利所屬年度統計</Text>
       <View style={{flexDirection:'row',gap:6}}>
         {['年度','現金／股','股票／股'].map(x=><Text key={x} style={{...label,flex:1,textAlign:'right'}}>{x}</Text>)}
       </View>
       {summary.map(s=><View key={s.year} style={{flexDirection:'row',gap:6,borderBottomWidth:.5,borderColor:theme.palette.border,paddingVertical:6}}>
         <Text style={{...label,flex:1,textAlign:'right'}}>{s.year}</Text>
         <Text editorReadOnly style={{...label,flex:1,textAlign:'right'}}>{format(s.cashTwdPerShare)}</Text>
         <Text editorReadOnly style={{...label,flex:1,textAlign:'right'}}>{format(s.stockTwdPerShare)}</Text>
       </View>)}
       <Text style={quiet}>年度金額僅加總完整可核實的資料列；缺少必要欄位時顯示「—」，不以零補值。股票股利採來源每股股利金額，不直接換算配股數。</Text>
       <Text style={{fontSize:14,fontWeight:'800',color:theme.palette.text}}>歷次股利明細（{rows.length} 筆）</Text>
       {rows.map((x,i)=><View key={[x.referenceDate,x.fiscalLabel,x.cashExDate,x.announcementDate,i].join('|')}
         style={{gap:5,padding:10,borderRadius:9,backgroundColor:theme.palette.surfaceMuted}}>
         <Text style={{fontSize:13,fontWeight:'800',color:theme.palette.text}}>{x.fiscalLabel}｜分派基準日 {x.referenceDate}</Text>
         <Text style={label}>現金股利 {format(x.cashTwdPerShare)} 元／股　股票股利 {format(x.stockTwdPerShare)} 元／股</Text>
         <Text style={quiet}>除息 {shownDate(x.cashExDate)}｜除權 {shownDate(x.stockExDate)}</Text>
         <Text style={quiet}>現金發放 {shownDate(x.paymentDate)}｜公告 {shownDate(x.announcementDate)}</Text>
         {x.paymentDate&&x.paymentDate>new Date().toISOString().slice(0,10)?<Text style={{...quiet,color:theme.palette.primary}}>公告未來發放日（非已入帳現金）</Text>:null}
       </View>)}
     </View>}
   <Text style={quiet}>僅供市場研究，無論是否持有均可查看；不會寫入交易帳、股息入帳或持股數量。資料可能受第三方免費查詢額度限制。</Text>
 </View>;
}
