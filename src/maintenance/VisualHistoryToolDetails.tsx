import {useEffect,useState} from 'react';
import {Alert,Pressable,Text,View} from 'react-native';
import {useThemeRuntime} from '../theme/ThemeRuntime';
import {useMaintenance} from './MaintenanceRuntime';
import {frameVisualSnapshot,targetVisualSnapshot,type VisualHistoryEntry} from './visualHistory';

const printable=(value:unknown)=>value===undefined?'原始／自適應':
 typeof value==='boolean'?(value?'開啟':'關閉'):
 typeof value==='string'?value:JSON.stringify(value);
/** B 版本與診斷 → C 局部視覺歷史, always scoped to the actual A. */
export function VisualHistoryToolDetails(){
 const maintenance=useMaintenance(),theme=useThemeRuntime(),session=maintenance.session;
 const [selected,setSelected]=useState<string|null>(null);
 useEffect(()=>setSelected(null),[session?.scope,session?.page,session?.frameKey,session?.target?.id]);
 if(!session||!['frame','target'].includes(session.scope))return <Text style={{fontSize:12,color:theme.palette.textSecondary}}>
   目前 A 尚未接入可還原的局部視覺版本。請先選取真實框架或原生元件；工程師新增實例待適配。
 </Text>;
 const history=maintenance.getVisualHistory();
 const id=session.scope==='target'?session.target?.id:undefined;
 const current=session.scope==='frame'?frameVisualSnapshot(session.draft):
   targetVisualSnapshot(id?session.draftTargets[id]??{}:{});
 const preview=history.find(item=>item.id===selected);
 const keys=preview?[...new Set([...Object.keys(preview.visual),...Object.keys(current)])].filter(key=>
   JSON.stringify(preview.visual[key])!==JSON.stringify(current[key])):[];
 const restore=(entry:VisualHistoryEntry)=>{
   Alert.alert('還原目前 A 的視覺草稿？',
     '只將選定歷史版載入目前 A 的上方真實預覽；不修改原始數值、文字、其他元件及帳務資料。請另按底部「儲存／套用」才會寫入。',[
     {text:'取消',style:'cancel'},
     {text:'載入至草稿',onPress:()=>{
       if(maintenance.restoreVisualHistory(entry.id))setSelected(null);
       else Alert.alert('還原未生效','目前 A 已改變或歷史紀錄無效；原有草稿保持不變。');
     }},
   ]);
 };
 return <View style={{gap:8,marginTop:8}}>
   <Text style={{fontWeight:'800',fontSize:13,color:theme.palette.text}}>C｜目前 A 的外觀歷史（最多十筆）</Text>
   <Text style={{fontSize:11,color:theme.palette.textSecondary}}>
     只在成功儲存視覺變更時，自動保留修改前版本；與目前 A 一起存入現有備份。
     只還原當前 A 的局部外觀，不動資料來源、金額、內容、顯示權限、座標或其他畫面。
   </Text>
   {!history.length?<Text style={{color:theme.palette.textSecondary,fontSize:12}}>
     目前沒有歷史紀錄；下次成功儲存外觀變更後，原始版本會自動出現在這裡。
   </Text>:null}
   {history.map((entry,i)=><View key={entry.id} style={{padding:8,borderWidth:1,borderRadius:8,
     borderColor:theme.palette.border,gap:7}}>
     <Pressable accessibilityRole="button" accessibilityLabel={'比較歷史外觀 '+(i+1)}
       onPress={()=>setSelected(old=>old===entry.id?null:entry.id)}
       style={{flexDirection:'row',alignItems:'center',gap:8}}>
       <Text style={{color:theme.palette.text,fontSize:12,flex:1,fontWeight:'700'}}>
         {i+1}｜{new Date(entry.at).toLocaleString('zh-TW')}
       </Text>
       <Text style={{color:theme.palette.primary,fontSize:12}}>{selected===entry.id?'收合 ⌃':'比較 ›'}</Text>
     </Pressable>
     {selected===entry.id?<View style={{gap:5}}>
       <Text style={{color:theme.palette.textSecondary,fontSize:11}}>與目前 A 草稿相差 {keys.length} 項視覺屬性</Text>
       {keys.slice(0,32).map(key=><Text key={key} style={{color:theme.palette.text,fontSize:11}}>
         {key}：{printable(current[key])} → {printable(entry.visual[key])}
       </Text>)}
       <Pressable accessibilityRole="button" accessibilityLabel="還原此歷史外觀至目前 A 草稿"
         onPress={()=>restore(entry)} style={{padding:10,borderRadius:8,alignItems:'center',backgroundColor:theme.palette.primary}}>
         <Text style={{color:'#FFFFFF',fontWeight:'800'}}>還原此版本（僅暫存）</Text>
       </Pressable>
     </View>:null}
   </View>)}
 </View>;
}
