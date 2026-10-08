import {useEffect,useState} from 'react';
import {Linking,StyleSheet,View} from 'react-native';
import {Pressable,Text} from './EditableNative';
import {cachedEtfConstituents,subscribeEtfConstituents,type EtfConstituentSnapshot} from '../market/etfConstituents';
import {refreshEtfConstituentSnapshot} from '../market/EtfConstituentsRuntime';
import {useSystemColors} from '../theme/useSystemColors';

export function EtfConstituentsContent({symbol,name}:{symbol:string;name:string}){
  const colors=useSystemColors();
  const [snapshot,setSnapshot]=useState<EtfConstituentSnapshot|null>(()=>cachedEtfConstituents(symbol));
  const [loading,setLoading]=useState(false),[error,setError]=useState<string|null>(null);
  const [expanded,setExpanded]=useState(false),[reload,setReload]=useState(0);
  useEffect(()=>subscribeEtfConstituents(()=>setSnapshot(cachedEtfConstituents(symbol))),[symbol]);
  useEffect(()=>{
    let active=true;const abort=new AbortController();
    const cached=cachedEtfConstituents(symbol);
    setSnapshot(cached);setExpanded(false);setError(null);
    if(reload===0&&cached&&Date.now()-cached.fetchedAt<6*60*60*1000){setLoading(false);return;}
    setLoading(true);
    refreshEtfConstituentSnapshot(symbol,name,reload>0)
      .then(data=>{if(active)setSnapshot(data);})
      .catch(reason=>{if(active)setError(reason instanceof Error?reason.message:'尚未取得成分股資料');})
      .finally(()=>{if(active)setLoading(false);});
    return()=>{active=false;abort.abort();};
  },[symbol,name,reload]);
  const data=snapshot?.symbol===symbol?snapshot:null;
  const rows=expanded?data?.rows:data?.rows.slice(0,10);
  return <View style={styles.content}>
    <Pressable editorId="native:EtfConstituentsContent:button:1" accessibilityRole="button" accessibilityLabel="更新 ETF 成分股" disabled={loading}
      onPress={()=>setReload(value=>value+1)} style={[styles.button,{backgroundColor:colors.surfaceMuted}]}>
      <Text editorId="native:EtfConstituentsContent:text:2" editorReadOnly={true} style={{color:colors.primary,fontWeight:'800'}}>{loading?'更新中…':'更新成分股'}</Text>
    </Pressable>
    {data?<>
      <Text editorId="native:EtfConstituentsContent:meta:3" editorReadOnly={true} style={[styles.meta,{color:colors.textSecondary}]}>資料日期 {data.asOf} · {data.source}</Text>
      {data.basis==='pcf_estimated'?<Text editorId="native:EtfConstituentsContent:meta:4" editorReadOnly={false} style={[styles.meta,{color:colors.textSecondary}]}>PCF 申購組合估算權重，非基金實際持股權重。</Text>:null}
      <Text editorId="native:EtfConstituentsContent:meta:5" editorReadOnly={true} style={[styles.meta,{color:colors.textSecondary}]}>已取得 {data.rows.length} 檔 · 依權重由高至低排列{data.complete?'':' · 僅部分揭露資料'}</Text>
      <View style={[styles.row,{borderColor:colors.border}]}><Text editorId="native:EtfConstituentsContent:stock:6" editorReadOnly={false} style={[styles.stock,{color:colors.textSecondary}]}>成分股／代號</Text><Text editorId="native:EtfConstituentsContent:text:7" editorReadOnly={false} style={{color:colors.textSecondary}}>權重</Text></View>
      {rows?.map((row,index)=><View key={row.symbol} style={[styles.row,{borderColor:colors.border}]}>
        <Text editorId="native:EtfConstituentsContent:rank:8" editorReadOnly={true} style={[styles.rank,{color:colors.textSecondary}]}>{index+1}</Text>
        <View style={styles.stock}><Text editorId="native:EtfConstituentsContent:name:9" editorReadOnly={true} style={[styles.name,{color:colors.text}]}>{row.name}</Text><Text editorId="native:EtfConstituentsContent:meta:10" editorReadOnly={true} style={[styles.meta,{color:colors.textSecondary}]}>{row.symbol}</Text>
          <View style={[styles.track,{backgroundColor:colors.surfaceMuted}]}><View style={{height:4,width:`${row.weight}%`,backgroundColor:colors.primary,borderRadius:2}}/></View></View>
        <Text editorId="native:EtfConstituentsContent:weight:11" editorReadOnly={true} style={[styles.weight,{color:colors.text}]}>{row.weight.toFixed(2)}%</Text>
      </View>)}
      {data.rows.length>10?<Pressable editorId="native:EtfConstituentsContent:button:12" accessibilityRole="button" onPress={()=>setExpanded(value=>!value)} style={styles.button}>
        <Text editorId="native:EtfConstituentsContent:text:13" editorReadOnly={true} style={{color:colors.primary,fontWeight:'800'}}>{expanded?'收合為前十大':`展開已取得的全部 ${data.rows.length} 檔`}</Text></Pressable>:null}
      <Text editorId="native:EtfConstituentsContent:meta:14" editorReadOnly={false} style={[styles.meta,{color:colors.textSecondary}]}>權重為資料日期的股票部位占比，未必合計 100%；不代表盤中即時權重。</Text>
      <Pressable editorId="native:EtfConstituentsContent:pressable:15" accessibilityRole="link" onPress={()=>void Linking.openURL(data.sourceUrl).catch(()=>setError('暫時無法開啟資料來源'))}>
        <Text editorId="native:EtfConstituentsContent:text:16" editorReadOnly={false} style={{color:colors.primary}}>查看資料來源</Text></Pressable>
    </>:!loading?<Text editorId="native:EtfConstituentsContent:text:17" editorReadOnly={false} style={{color:colors.textSecondary}}>尚未取得成分股資料</Text>:<Text editorId="native:EtfConstituentsContent:text:18" editorReadOnly={false} style={{color:colors.textSecondary}}>正在取得成分股…</Text>}
    {error?<Text editorId="native:EtfConstituentsContent:meta:19" editorReadOnly={true} accessibilityLiveRegion="polite" style={[styles.meta,{color:colors.textSecondary}]}>{data?'更新失敗，保留上次資料：':''}{error}</Text>:null}
  </View>;
}
const styles=StyleSheet.create({
  content:{gap:10},button:{alignSelf:'flex-start',paddingHorizontal:12,paddingVertical:10,borderRadius:12,minHeight:44},
  meta:{fontSize:12,lineHeight:18},row:{flexDirection:'row',alignItems:'center',gap:10,paddingVertical:10,borderBottomWidth:StyleSheet.hairlineWidth},
  rank:{width:24,fontSize:12},stock:{flex:1},name:{fontSize:14,fontWeight:'700'},
  weight:{fontSize:14,fontWeight:'800',fontVariant:['tabular-nums'],minWidth:64,textAlign:'right'},
  track:{height:4,borderRadius:2,marginTop:5},
});
