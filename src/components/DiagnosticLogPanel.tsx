import {useState} from 'react';
import {Alert,Pressable,Share,StyleSheet,Text,View} from 'react-native';
import {backupDocumentPickerAvailable,saveExternalBackup} from '../native/TfAssetNativeBridge';
import {useDiagnostics} from '../diagnostics/DiagnosticRuntime';
import {exportDiagnosticEntries,type DiagnosticEntry,type DiagnosticLevel} from '../diagnostics/diagnosticModel';
import {colors,radius,spacing} from '../theme/tokens';
type Filter='all'|DiagnosticLevel;
const filters:readonly {key:Filter;label:string}[]=[
  {key:'all',label:'全部'},{key:'fatal',label:'閃退'},{key:'error',label:'錯誤'},
  {key:'warning',label:'警告'},{key:'info',label:'操作'},
];
const label=(level:DiagnosticLevel)=>level==='fatal'?'閃退':level==='error'?'錯誤':level==='warning'?'警告':'操作';
function LogRow({entry}:{entry:DiagnosticEntry}){
  const [expanded,setExpanded]=useState(false);
  return <View style={styles.log}>
    <Pressable accessibilityRole="button" accessibilityLabel={'查閱'+label(entry.level)+entry.code}
      onPress={()=>setExpanded(v=>!v)} style={styles.logButton}>
      <Text style={[styles.level,entry.level==='fatal'&&styles.fatal,
        entry.level==='error'&&styles.error]}>{label(entry.level)} · {entry.code}</Text>
      <Text style={styles.date}>{new Date(entry.at).toLocaleString('zh-TW')}</Text>
      <Text style={styles.message}>{entry.message}</Text>
      <Text style={styles.date}>位置：{entry.screen}　{expanded?'收合 −':'詳細 +'}</Text>
    </Pressable>
    {expanded?<Text selectable style={styles.detail}>{entry.detail||'無其他技術資訊'}</Text>:null}
  </View>;
}
export function DiagnosticLogPanel(){
  const {entries,reload,clear}=useDiagnostics();
  const [filter,setFilter]=useState<Filter>('all');
  const [limit,setLimit]=useState(8);
  const [busy,setBusy]=useState(false);
  const selected=entries.filter(entry=>filter==='all'||entry.level===filter);
  const exportLogs=async()=>{
    if(busy||entries.length===0)return;
    setBusy(true);
    try{
      const content=exportDiagnosticEntries(entries);
      if(backupDocumentPickerAvailable){
        const day=new Date().toISOString().slice(0,10).replace(/-/g,'');
        const receipt=await saveExternalBackup(content,'TF-Asset-V3.1.3-Diagnostics-'+day+'.json');
        if(receipt)Alert.alert('匯出成功','診斷紀錄已寫入選定的手機資料夾。');
      }else await Share.share({message:content,title:'TF Asset 診斷紀錄'});
    }catch{Alert.alert('匯出失敗','無法匯出診斷紀錄；原始紀錄仍保留在 App 內。');}
    finally{setBusy(false);}
  };
  return <View style={styles.root}>
    <Text style={styles.note}>本機保存最近 14 天、最多 80 筆。記錄模式切換、詳情進入、JS 錯誤及可攔截的 Android 原生崩潰；重啟後仍可查看。</Text>
    <View style={styles.actions}>
      <Pressable style={styles.action} onPress={()=>void reload()}><Text style={styles.actionText}>重新整理</Text></Pressable>
      <Pressable style={styles.action} disabled={busy||entries.length===0} onPress={()=>void exportLogs()}><Text style={styles.actionText}>{busy?'處理中…':'選擇資料夾匯出'}</Text></Pressable>
      <Pressable style={styles.action} disabled={busy||entries.length===0}
        onPress={()=>Alert.alert('清除診斷紀錄？','只清除錯誤 Log，不清除帳務、設定或備份。',[
          {text:'取消',style:'cancel'},{text:'清除',style:'destructive',onPress:()=>void clear()},
        ])}><Text style={styles.delete}>清除 Log</Text></Pressable>
    </View>
    <Text style={styles.count}>目前 {entries.length} 筆 · 篩選 {selected.length} 筆</Text>
    <View style={styles.filters}>{filters.map(item=><Pressable key={item.key}
      onPress={()=>{setFilter(item.key);setLimit(8);}} style={[styles.filter,filter===item.key&&styles.filterOn]}>
      <Text style={[styles.filterText,filter===item.key&&styles.filterTextOn]}>{item.label}</Text>
    </Pressable>)}</View>
    {selected.length===0?<Text style={styles.note}>此分類暫無紀錄。舊版發生的閃退不會自動補回。</Text>:null}
    {selected.slice(0,limit).map(entry=><LogRow key={entry.id} entry={entry}/>)}
    {limit<selected.length?<Pressable style={styles.action} onPress={()=>setLimit(v=>v+12)}>
      <Text style={styles.actionText}>顯示更多（剩餘 {selected.length-limit} 筆）</Text>
    </Pressable>:null}
    <Text style={styles.note}>為保護隱私，不收集交易紀錄、持股金額或帳密。Android ANR、系統強制終止及 native signal 不保證可由 App 自行捕捉，必要時仍需裝置 logcat。</Text>
  </View>;
}
const styles=StyleSheet.create({
  root:{gap:spacing.sm},note:{fontSize:11,lineHeight:18,color:colors.textSecondary},
  actions:{flexDirection:'row',flexWrap:'wrap',gap:7},
  action:{paddingVertical:8,paddingHorizontal:11,borderRadius:radius.md,backgroundColor:colors.surfaceMuted},
  actionText:{fontSize:11,fontWeight:'800',color:colors.primary},
  delete:{fontSize:11,fontWeight:'800',color:colors.loss},
  count:{fontSize:11,fontWeight:'800',color:colors.text},
  filters:{flexDirection:'row',flexWrap:'wrap',gap:5},
  filter:{paddingHorizontal:9,paddingVertical:7,borderRadius:radius.pill,backgroundColor:colors.surfaceMuted},
  filterOn:{backgroundColor:colors.primary},
  filterText:{fontSize:11,fontWeight:'700',color:colors.textSecondary},
  filterTextOn:{color:'#FFFFFF'},
  log:{borderWidth:1,borderColor:colors.border,borderRadius:radius.md,padding:9,gap:6},
  logButton:{gap:4},level:{fontSize:12,fontWeight:'900',color:colors.primary},
  fatal:{color:'#B91C1C'},error:{color:colors.loss},
  date:{fontSize:10,color:colors.textSecondary},message:{fontSize:12,color:colors.text},
  detail:{fontSize:10,lineHeight:17,color:colors.text,backgroundColor:colors.surfaceMuted,padding:8},
});
