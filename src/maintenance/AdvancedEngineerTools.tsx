import {useEffect,useState} from 'react';
import {Alert,Pressable,Switch,Text,View} from 'react-native';
import {useThemeRuntime} from '../theme/ThemeRuntime';
import {useMaintenance,type RegisteredVisualTarget} from './MaintenanceRuntime';
import {TARGET_APPEARANCE,mergeTargetAppearance,type TargetKind} from './inspectionModel';
import {BATCH_VISUAL_FIELDS,batchPlan,frameHealth,visualChanges,
 type BatchCandidate,type BatchField,type VisualSource} from './advancedSkillEngine';
import {isEngineerOwnedInstance} from './componentLibrary';

const readable=(value:unknown)=>value===undefined?'沿用／自適應':
  typeof value==='boolean'?(value?'開啟':'關閉'):typeof value==='object'?JSON.stringify(value):String(value);
const nativeCandidate=(entry:RegisteredVisualTarget):BatchCandidate=>({...entry});
function useActualCandidates(){
 const maint=useMaintenance(),s=maint.session;
 const live=s?maint.getFrameTargets(s.page,s.frameKey):[];
 const added=s?s.draftInstances.filter(isEngineerOwnedInstance).map(item=>({
   id:'installed:'+item.id,label:item.text||'新增元件',
   kind:(item.templateId==='parent-frame'?'frame':item.templateId==='divider'?'generic':'text') as TargetKind,
   base:{...TARGET_APPEARANCE,fontSize:item.fontSize,textColor:item.color,
     ...(item.templateId==='parent-frame'?{width:item.frameWidth??320,height:item.frameHeight??240}:{})},
 })):[] as BatchCandidate[];
 const merged=new Map<string,BatchCandidate>();
 for(const candidate of live.map(nativeCandidate))merged.set(candidate.id,candidate);
 for(const candidate of added){
   const mounted=merged.get(candidate.id);
   merged.set(candidate.id,mounted?{...mounted,base:{...mounted.base,...candidate.base}}:candidate);
 }
 if(s?.scope==='target'&&s.target&&!merged.has(s.target.id))
   merged.set(s.target.id,{id:s.target.id,label:s.target.label,kind:s.target.kind,
     base:{...s.target.base,...(s.target.geometry?{width:s.target.geometry.width,height:s.target.geometry.height}:{})}});
 return [...merged.values()].slice(0,120);
}
export function BatchVisualToolDetails(){
 const maint=useMaintenance(),theme=useThemeRuntime(),s=maint.session;
 const [ids,setIds]=useState<readonly string[]>([]);
 const [keys,setKeys]=useState<readonly BatchField[]>(['backgroundColor']);
 const owner=s?.scope==='instance'?s.draftInstances.find(item=>item.id===s.instanceId&&isEngineerOwnedInstance(item)):undefined;
 const target=s?.scope==='target'?s.target:undefined;
 const sourceId=target?.id??(owner?'installed:'+owner.id:undefined);
 const actual=useActualCandidates();
 useEffect(()=>{setIds([]);setKeys(['backgroundColor']);},
   [s?.page,s?.frameKey,s?.scope,s?.instanceId,target?.id]);
 const sourceCandidate=actual.find(item=>item.id===sourceId);
 const base=sourceCandidate?.base??TARGET_APPEARANCE;
 const current=sourceCandidate&&s?mergeTargetAppearance(base,maint.getTargetOverride(s.page,s.frameKey,sourceCandidate.id,sourceCandidate.kind)):base;
 const source:VisualSource={...current,...(base.width!==undefined?{width:current.width??base.width}:{}),
   ...(base.height!==undefined?{height:current.height??base.height}:{})};
 const selected=actual.filter(item=>ids.includes(item.id));
 const plans=s?batchPlan(source,keys,selected,
   candidate=>maint.getTargetOverride(s.page,s.frameKey,candidate.id,candidate.kind)):[];
 const changed=plans.reduce((n,plan)=>n+plan.changes.length,0);
 const toggleId=(id:string,checked:boolean)=>setIds(old=>checked?[...new Set([...old,id])]:old.filter(item=>item!==id));
 const toggleKey=(key:BatchField,checked:boolean)=>setKeys(old=>checked?[...new Set([...old,key])]:old.filter(item=>item!==key));
 if(!s||!sourceId||!sourceCandidate)return <Text style={{fontSize:12,color:theme.palette.textSecondary}}>
   先點真實元件右上扳手，選定 A 樣式來源，再開啟 B「批次編輯」。
 </Text>;
 return <View style={{gap:9,marginTop:5}}>
   <Text style={{color:theme.palette.text,fontWeight:'800'}}>C｜選取同框架元件</Text>
   <Text style={{fontSize:11,color:theme.palette.textSecondary}}>
     樣式來源：{sourceCandidate.label}。僅修改明確勾選的視覺欄位，文字內容、資料來源、交易數值、點擊動作及位置不變。
   </Text>
   {actual.length?actual.map(item=><Pressable key={item.id} accessibilityRole="checkbox"
     accessibilityLabel={'批次選取 '+item.label} accessibilityState={{checked:ids.includes(item.id)}}
     onPress={()=>toggleId(item.id,!ids.includes(item.id))}
     style={{flexDirection:'row',alignItems:'center',gap:8,paddingVertical:7,borderBottomWidth:1,borderColor:theme.palette.border}}>
      <Text style={{fontSize:18,color:theme.palette.primary}}>{ids.includes(item.id)?'☑':'☐'}</Text>
      <Text style={{flex:1,color:theme.palette.text,fontSize:12}}>{item.label}</Text>
      {item.id===sourceId?<Text style={{fontSize:10,color:theme.palette.textSecondary}}>來源 A</Text>:null}
   </Pressable>):<Text style={{color:theme.palette.textSecondary}}>目前沒有已掛載、可選取的真實元件。</Text>}
   <Text style={{color:theme.palette.text,fontWeight:'800',marginTop:5}}>C｜選擇要複製的視覺屬性</Text>
   {BATCH_VISUAL_FIELDS.map(([key,label])=><View key={key}
     style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8,minHeight:41}}>
       <Text style={{color:theme.palette.text,fontSize:12,flex:1}}>{label}：{readable(source[key])}</Text>
       <Switch accessibilityLabel={'批次套用'+label} disabled={source[key]===undefined}
         value={keys.includes(key)} onValueChange={checked=>toggleKey(key,checked)}/>
     </View>)}
   <Text style={{color:theme.palette.text,fontWeight:'800',marginTop:6}}>C｜套用前差異預覽</Text>
   <Text style={{fontSize:11,color:theme.palette.textSecondary}}>已選 {selected.length} 個元件；預計 {changed} 個視覺欄位變更。</Text>
   {plans.map(plan=><View key={plan.id} style={{borderWidth:1,borderColor:theme.palette.border,borderRadius:8,padding:8,gap:4}}>
     <Text style={{color:theme.palette.text,fontWeight:'700'}}>{plan.label}</Text>
     {plan.changes.map(change=><Text key={change.field} style={{fontSize:11,color:theme.palette.text}}>
       {change.label}：{readable(change.before)} → {readable(change.after)}
     </Text>)}
     {plan.unsupported.map(field=><Text key={field} style={{fontSize:11,color:theme.palette.textSecondary}}>
       未適配：{BATCH_VISUAL_FIELDS.find(([id])=>id===field)?.[1]??field}（略過，不假裝寫入）
     </Text>)}
     {!plan.changes.length&&!plan.unsupported.length?<Text style={{color:theme.palette.textSecondary,fontSize:11}}>
       與目前樣式相同，不需修改
     </Text>:null}
   </View>)}
   <Pressable disabled={!changed} accessibilityRole="button" accessibilityLabel="暫存批次視覺修改"
     onPress={()=>{
       maint.patchBatchVisual(selected.map(item=>item.id),source,keys);
       Alert.alert('已寫入暫存預覽','目前僅修改工作區草稿。確認上方真實畫面後，按底部「儲存／套用」才正式保存。');
     }}
     style={{backgroundColor:theme.palette.primary,opacity:changed?1:.5,padding:12,borderRadius:9,alignItems:'center'}}>
     <Text style={{color:'#FFFFFF',fontWeight:'800'}}>暫存這 {changed} 項視覺變更</Text>
   </Pressable>
 </View>;
}
export function LocalVisualDiffToolDetails(){
 const maint=useMaintenance(),theme=useThemeRuntime(),s=maint.session;
 if(!s)return null;
 const owner=s.scope==='instance'?s.draftInstances.find(item=>item.id===s.instanceId):undefined;
 const target=s.scope==='target'?s.target:undefined;
 const id=target?.id??(owner?'installed:'+owner.id:undefined);
 const kind=target?.kind??(owner?(owner.templateId==='parent-frame'?'frame':owner.templateId==='divider'?'generic':'text') as TargetKind:undefined);
 const before=s.scope==='frame'?s.originalFrame: id&&kind?{
   ...(target?.base??{...TARGET_APPEARANCE,fontSize:owner?.fontSize??17,textColor:owner?.color??'#0F172A'}),
   ...maint.getSavedTargetOverride(s.page,s.frameKey,id,kind),
 }:{};
 const after=s.scope==='frame'?s.draft:id&&kind?{
   ...(target?.base??{...TARGET_APPEARANCE,fontSize:owner?.fontSize??17,textColor:owner?.color??'#0F172A'}),
   ...maint.getTargetOverride(s.page,s.frameKey,id,kind),
 }:{};
 const changes=visualChanges(before as Record<string,unknown>,after as Record<string,unknown>,s.scope==='frame');
 return <View style={{gap:8,marginTop:7}}>
   <Text style={{color:theme.palette.text,fontWeight:'800'}}>C｜當前 A 的局部差異（{changes.length}）</Text>
   <Text style={{color:theme.palette.textSecondary,fontSize:12}}>只比較已儲存與目前暫存的外觀；帳務資料及其他畫面不列入。</Text>
   {changes.length?changes.map(change=><View key={change.field} style={{paddingVertical:7,borderBottomWidth:1,borderColor:theme.palette.border}}>
     <Text style={{color:theme.palette.text,fontWeight:'700',fontSize:12}}>{change.label}</Text>
     <Text selectable style={{fontSize:11,color:theme.palette.textSecondary}}>原設定：{readable(change.before)}</Text>
     <Text selectable style={{fontSize:11,color:theme.palette.primary}}>暫存：{readable(change.after)}</Text>
   </View>):<Text style={{color:theme.palette.text}}>目前 A 沒有待套用的視覺差異。</Text>}
 </View>;
}
export function FrameHealthToolDetails(){
 const maint=useMaintenance(),theme=useThemeRuntime(),s=maint.session;
 if(!s)return null;
 const bounds=maint.getWorkspaceBounds(s.page,s.frameKey);
 const rects=maint.getFrameRects(s.page,s.frameKey);
 const natives=maint.getFrameTargets(s.page,s.frameKey);
 const targets=natives.filter(item=>rects[item.id]).map(item=>({
   id:item.id,label:item.label,kind:item.kind,rect:rects[item.id]!,
 }));
 const findings=frameHealth(bounds,targets);
 return <View style={{gap:8,marginTop:7}}>
   <Text style={{color:theme.palette.text,fontWeight:'800'}}>C｜目前真實畫面健康檢查</Text>
   <Text style={{color:theme.palette.textSecondary,fontSize:12}}>
     工作區 {bounds.width}×{bounds.height} dp；已量測 {targets.length} 個原生元件。
     疑似重疊只提示，不自動更動父框架或子元件位置。
   </Text>
   {!targets.length?<Text style={{color:theme.palette.textSecondary}}>請先讓目前畫面的元件完成量測，不能以零筆結果宣稱通過。</Text>:
     findings.length?findings.map((finding,i)=><View key={finding.id+finding.type+i}
       style={{padding:9,borderRadius:8,borderColor:theme.palette.border,borderWidth:1}}>
       <Text style={{color:theme.palette.loss,fontWeight:'700'}}>{finding.label}</Text>
       <Text style={{color:theme.palette.text,fontSize:12}}>{finding.message}</Text>
     </View>):<Text style={{color:theme.palette.gain}}>目前已量測範圍未發現越界、同類重疊或過小觸控區；其餘元件仍需實機檢查。</Text>}
 </View>;
}
