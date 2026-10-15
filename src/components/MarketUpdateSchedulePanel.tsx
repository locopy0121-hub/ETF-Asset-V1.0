import {useEffect,useState} from 'react';
import {View,Text,TextInput,Pressable,Switch,StyleSheet} from 'react-native';
import {DEFAULT_MARKET_SCHEDULE,validateMarketSchedule,type MarketUpdateSchedule} from '../market/marketUpdateSchedule';
import {loadMarketUpdateSchedule,saveMarketUpdateSchedule} from '../native/TfAssetNativeBridge';
import {useThemeRuntime} from '../theme/ThemeRuntime';

export function MarketUpdateSchedulePanel(){
  const {palette}=useThemeRuntime();
  const [value,setValue]=useState<MarketUpdateSchedule>(DEFAULT_MARKET_SCHEDULE);
  const [ready,setReady]=useState(false),[busy,setBusy]=useState(false),[status,setStatus]=useState('');
  useEffect(()=>{let alive=true;void loadMarketUpdateSchedule().then(v=>{if(alive){setValue(v);setReady(true);}}).catch(()=>{if(alive)setStatus('無法讀取排程，請稍後重試');});return()=>{alive=false};},[]);
  const save=async()=>{
    const normalized=validateMarketSchedule(value);
    if(!normalized){setStatus('請選交易星期，時間須介於 09:00–13:30，結束晚於開始');return}
    setBusy(true);
    try{await saveMarketUpdateSchedule(normalized);setValue(normalized);setStatus('已儲存，排程立即生效');}
    catch{setStatus('儲存失敗，原排程保留');}finally{setBusy(false);}
  };
  const field={color:palette.text,borderColor:palette.border};
  return <View style={[styles.panel,{backgroundColor:palette.surfaceMuted}]}>
    <View style={styles.row}><Text style={[styles.title,{color:palette.text}]}>行情更新排程</Text>
      <Switch accessibilityLabel="啟用行情排程" disabled={!ready||busy} value={value.enabled} onValueChange={enabled=>setValue({...value,enabled})}/></View>
    <Text style={{color:palette.textSecondary}}>台北時間；只在交易日及指定盤中時段接收行情。盤後停止更新，保留最後數據。</Text>
    <View style={styles.row}>{['一','二','三','四','五'].map((label,i)=><Pressable key={label} disabled={!ready||busy} accessibilityRole="button" accessibilityLabel={'星期'+label} accessibilityState={{selected:value.weekdays.includes(i+1)}} onPress={()=>setValue({...value,weekdays:value.weekdays.includes(i+1)?value.weekdays.filter(d=>d!==i+1):[...value.weekdays,i+1]})} style={[styles.day,{backgroundColor:value.weekdays.includes(i+1)?palette.primary:palette.surface}]}>
      <Text style={{color:value.weekdays.includes(i+1)?'white':palette.text}}>週{label}</Text></Pressable>)}</View>
    <View style={styles.row}><Text style={{color:palette.text}}>開始</Text><TextInput accessibilityLabel="行情開始時間" editable={ready&&!busy} value={value.start} onChangeText={start=>setValue({...value,start})} placeholder="09:00" maxLength={5} style={[styles.input,field]}/>
      <Text style={{color:palette.text}}>結束</Text><TextInput accessibilityLabel="行情結束時間" editable={ready&&!busy} value={value.end} onChangeText={end=>setValue({...value,end})} placeholder="13:30" maxLength={5} style={[styles.input,field]}/></View>
    <Text style={{color:palette.textSecondary}}>開啟 App 時依排程啟動；盤中連線可延續至背景，休息後下次開啟 App 恢復。</Text>
    <Pressable accessibilityRole="button" disabled={!ready||busy} onPress={()=>void save()} style={[styles.button,{backgroundColor:palette.primary,opacity:ready&&!busy?1:.5}]}><Text style={{color:'white',fontWeight:'700'}}>{busy?'儲存中…':'儲存排程'}</Text></Pressable>
    {status?<Text accessibilityLiveRegion="polite" style={{color:palette.textSecondary}}>{status}</Text>:null}
  </View>;
}
const styles=StyleSheet.create({panel:{padding:14,borderRadius:16,gap:10},row:{flexDirection:'row',alignItems:'center',gap:8,flexWrap:'wrap'},title:{fontSize:16,fontWeight:'800',flex:1},day:{padding:10,borderRadius:10},input:{borderWidth:1,borderRadius:8,padding:8,width:72},button:{padding:12,borderRadius:10,alignItems:'center'}});
