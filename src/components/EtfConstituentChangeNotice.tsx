import {Linking,View} from 'react-native';
import {Pressable,Text} from './EditableNative';
import {useSystemColors} from '../theme/useSystemColors';
import type {EtfConstituentSnapshot} from '../market/etfConstituents';
import {compareConstituents} from '../market/etfConstituentChanges';
export function EtfConstituentChangeNotice({snapshot}:{snapshot:EtfConstituentSnapshot}){
  const colors=useSystemColors(),report=useMemo(()=>compareConstituents(snapshot.previous,snapshot),[snapshot]);
  const [expanded,setExpanded]=useState(false);
  useEffect(()=>setExpanded(false),[snapshot.symbol,snapshot.asOf]);
  const status=report.status==='baseline'?'首次取得資料，已建立成分比對基準。':report.status==='partial'?'資料僅部分揭露或完整性尚未核實，暫不判定新增／移除。':report.status==='source_changed'?'資料來源或權重基準變更，本次重新建立比對基準。':report.status==='older'?'資料日期較舊，暫不判定異動。':report.changes.length?'新增 '+report.changes.filter(c=>c.kind==='added').length+' 檔 · 移除 '+report.changes.filter(c=>c.kind==='removed').length+' 檔 · 權重調整 '+report.changes.filter(c=>c.kind==='weight').length+' 檔':'與上次資料相比，成分及權重無變動。';
  return <View style={{gap:7,padding:12,borderRadius:12,backgroundColor:colors.surfaceMuted}}>
    <Text accessibilityLiveRegion="polite" style={{fontWeight:'800',color:colors.text}}>成分異動提示</Text>
    <Text style={{fontSize:12,lineHeight:18,color:colors.text}}>{status}</Text>
    {report.status==='compared'?<>
      <Text style={{fontSize:11,color:colors.textSecondary}}>資料比對 {report.from} → {report.to} · {snapshot.source}</Text>
      {report.replacements.map(item=><View key={item.from+'-'+item.to} style={{gap:4}}><Text style={{fontSize:12,color:colors.text}}>公告替換：{item.from} → {item.to} · 生效 {item.effectiveDate}</Text>
        <Pressable accessibilityRole="link" onPress={()=>void Linking.openURL(item.sourceUrl).catch(()=>{})}><Text style={{fontSize:11,color:colors.primary}}>查看替換公告</Text></Pressable></View>)}
      {(expanded?report.changes:report.changes.slice(0,10)).map(item=><Text key={item.kind+item.symbol} editorId={'market:etf-change:'+item.kind+':'+item.symbol} editorReadOnly={true} style={{fontSize:12,lineHeight:18,color:colors.text}}>
        {item.kind==='added'?'新增':item.kind==='removed'?'移除':'權重調整'} {item.name}（{item.symbol}） · {item.before===null?'新增':item.before.toFixed(2)+'%'} → {item.after===null?'移除':item.after.toFixed(2)+'%'}
      </Text>)}
      {report.changes.length>10?<Pressable accessibilityRole="button" accessibilityLabel="展開成分異動明細" onPress={()=>setExpanded(v=>!v)} style={{paddingVertical:10,minHeight:44}}><Text style={{color:colors.primary}}>{expanded?'收合異動明細':'展開全部 '+report.changes.length+' 筆異動'}</Text></Pressable>:null}
      {report.changes.some(c=>c.kind==='added'||c.kind==='removed')&&!report.replacements.length?<Text style={{fontSize:11,lineHeight:18,color:colors.textSecondary}}>以上為已揭露持股清單差異；替換配對與生效日期尚待官方公告確認。</Text>:null}
    </>:null}
  </View>;
}
import {useEffect,useMemo,useState} from 'react';
