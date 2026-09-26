import {useEffect,useState} from 'react';
import {Alert,Pressable,Switch,Text,TextInput,View} from 'react-native';
import {COMPLETE_ENGINEER_SKILLS} from './fullSkillCatalog';
import {frameTokenPatch,frameTokenSource,tokenTargetPatch} from './engineerDesignAssets';
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

/** B 主題 -> C 共享設計變數. Token library writes are separate from App visuals:
 * saving a token is explicit; applying it touches ONLY the selected A draft.
 */
export function DesignTokenToolDetails(){
 const maint=useMaintenance(),theme=useThemeRuntime(),session=maint.session;
 const [slot,setSlot]=useState(1),[name,setName]=useState(''),[busy,setBusy]=useState(false);
 const [notice,setNotice]=useState('');
 const token=maint.assets.tokens.find(item=>item.slot===slot);
 const currentTarget=session?.scope==='target'?session.target:undefined;
 const owner=session?.scope==='instance'?
   session.draftInstances.find(item=>item.id===session.instanceId&&isEngineerOwnedInstance(item)):undefined;
 const id=currentTarget?.id??(owner?'installed:'+owner.id:undefined);
 const kind=currentTarget?.kind??(owner?(owner.templateId==='parent-frame'?'frame':owner.templateId==='divider'?'generic':'text') as TargetKind:undefined);
 const base=currentTarget?.base??{...TARGET_APPEARANCE,
   ...(owner?{fontSize:owner.fontSize,textColor:owner.color}:{})};
 const effective=id&&kind&&session?mergeTargetAppearance(base,maint.getTargetOverride(session.page,session.frameKey,id,kind)):base;
 const capture=session?.scope==='frame'?frameTokenSource(session.draft):
   effective as unknown as Record<string,unknown>;
 const supported=Boolean(session?.scope==='frame'||id&&kind);
 const preview=token&&session?(session.scope==='frame'?
   frameTokenPatch(token,session.draft):kind?tokenTargetPatch(token,kind):{}):{};
 const unsupported=token&&session?.scope!=='frame'&&kind?
   Object.keys(token.style).filter(key=>!Object.prototype.hasOwnProperty.call(preview,key)):[];
 const save=async()=>{
   if(!session||!supported||busy)return;
   setBusy(true);setNotice('');
   const ok=await maint.saveDesignToken(slot,name||('設計組合 '+slot),capture);
   setBusy(false);setNotice(ok?'共享設計變數已存入 5 組資料庫，尚未更動目前 A。':'儲存失敗，未改動已存樣式。');
 };
 const confirmSave=()=>{
   if(token)Alert.alert('取代共享設計組合？','槽位 '+slot+' 原有「'+token.name+'」將被當前 A 的視覺設定取代；已套用至其他畫面的樣式不會暗中變動。',[
     {text:'取消',style:'cancel'},{text:'確認取代',onPress:()=>void save()}]);
   else void save();
 };
 const remove=()=>{
   if(!token||busy)return;
   Alert.alert('刪除共享設計組合？','只刪除中央庫這個槽位；已套用過的元件外觀不會被刪除。',[
     {text:'取消',style:'cancel'},{text:'刪除',style:'destructive',onPress:()=>{
       setBusy(true);void maint.removeDesignToken(slot).then(ok=>{
         setBusy(false);setNotice(ok?'槽位已清除，既有元件不受影響。':'刪除失敗，原有槽位仍保留。');
       });
     }}]);
 };
 if(!session)return null;
 return <View style={{gap:9,marginTop:8}}>
   <Text style={{fontSize:12,color:theme.palette.textSecondary}}>
     五組全 App 共用的設計樣式。儲存組合與修改 App 分開；套用組合只改目前 A 的預覽，
     不連動其他頁面、文字內容或帳務數據。
   </Text>
   <View style={{flexDirection:'row',gap:6,flexWrap:'wrap'}}>
     {([1,2,3,4,5] as const).map(n=><Pressable key={n} accessibilityRole="button"
       accessibilityLabel={'選取設計槽位 '+n} onPress={()=>{setSlot(n);setName(maint.assets.tokens.find(t=>t.slot===n)?.name??'');setNotice('');}}
       style={{borderWidth:1,borderRadius:8,borderColor:theme.palette.primary,
         backgroundColor:slot===n?theme.palette.primary:theme.palette.surface,padding:9,minWidth:48,alignItems:'center'}}>
       <Text style={{color:slot===n?'#FFFFFF':theme.palette.text,fontWeight:'800'}}>{n}</Text>
     </Pressable>)}
   </View>
   <Text style={{fontWeight:'700',color:theme.palette.text,fontSize:12}}>
     {token?'目前槽位：'+token.name:'空白槽位（可保存當前 A 的視覺樣式）'}
   </Text>
   <TextInput accessibilityLabel="設計組合名稱" value={name} maxLength={24}
     onChangeText={setName} placeholder={token?.name??'替設計組合命名'} placeholderTextColor={theme.palette.textSecondary}
     style={{borderWidth:1,borderColor:theme.palette.border,borderRadius:8,minHeight:42,
       color:theme.palette.text,paddingHorizontal:9}}/>
   <Pressable accessibilityRole="button" accessibilityLabel="將目前 A 視覺樣式儲存至設計槽位"
     disabled={!maint.assetsLoaded||!supported||busy} onPress={confirmSave}
     style={{padding:11,alignItems:'center',backgroundColor:theme.palette.primary,borderRadius:9,opacity:!maint.assetsLoaded||!supported||busy?.45:1}}>
     <Text style={{color:'#FFFFFF',fontWeight:'800'}}>{busy?'處理中…':'儲存當前 A 至槽位 '+slot}</Text>
   </Pressable>
   {token?<View style={{gap:7,padding:9,borderWidth:1,borderColor:theme.palette.border,borderRadius:9}}>
     <Text style={{color:theme.palette.text,fontWeight:'800'}}>C｜預覽套用「{token.name}」</Text>
     {Object.entries(preview).map(([field,value])=><Text key={field}
       style={{fontSize:11,color:theme.palette.textSecondary}}>{field}：{readable(value)}</Text>)}
     {!!unsupported.length?<Text style={{fontSize:11,color:theme.palette.textSecondary}}>
       目前 A 未適配 {unsupported.length} 項原生屬性，將略過，不假裝寫入。
     </Text>:null}
     <Pressable accessibilityRole="button" accessibilityLabel="將此設計組合套用到目前 A 暫存預覽"
       disabled={!supported||!Object.keys(preview).length||busy}
       onPress={()=>{
         const ok=maint.applyDesignToken(slot);
         setNotice(ok?'已套用至目前 A 草稿；請檢查上方真實畫面，再按工作台底部「儲存／套用」。':'目前 A 沒有可介接的視覺欄位。');
       }}
       style={{padding:11,borderRadius:8,backgroundColor:theme.palette.primary,
         opacity:supported&&Object.keys(preview).length&&!busy?1:.45}}>
       <Text style={{color:'#FFFFFF',fontWeight:'800',textAlign:'center'}}>套用至目前 A（暫存）</Text>
     </Pressable>
     <Pressable accessibilityRole="button" accessibilityLabel="刪除目前共享設計槽位"
       onPress={remove} disabled={busy} style={{padding:8,alignItems:'center'}}>
       <Text style={{color:theme.palette.loss,fontWeight:'700'}}>刪除這組共享樣式</Text>
     </Pressable>
   </View>:null}
   {!supported?<Text style={{fontSize:12,color:theme.palette.textSecondary}}>
     目前 A 尚未接入可套用的視覺渲染器；共享庫與其他 A 的組合仍可使用。
   </Text>:null}
   {!!notice?<Text style={{fontSize:12,color:theme.palette.text}}>{notice}</Text>:null}
 </View>;
}
/** Favorite and recent shortcuts navigate back to an actual B PROPERTY -> C
 * editor; never add a category landing screen or bypass per-target adapters. */
export function FavoriteToolDetails({onNavigate}:{onNavigate?:(id:string)=>void}){
 const maint=useMaintenance(),theme=useThemeRuntime();
 const tools=COMPLETE_ENGINEER_SKILLS.flatMap(group=>group.tools);
 const label=(id:string)=>tools.find(tool=>tool.id===id)?.label??id;
 const open=(id:string)=>onNavigate?.(id);
 return <View style={{gap:9,marginTop:8}}>
   <Text style={{fontSize:12,color:theme.palette.textSecondary}}>
     所有 B 屬性中的 C 工具都能點星號收藏，跨頁共用；按收藏捷徑會返回該工具原本的 B 屬性。
   </Text>
   <Text style={{color:theme.palette.text,fontWeight:'800'}}>C｜我的收藏（{maint.assets.favorites.length}）</Text>
   {maint.assets.favorites.map(id=><View key={id}
     style={{flexDirection:'row',alignItems:'center',gap:8,borderWidth:1,
       borderColor:theme.palette.border,borderRadius:8,padding:6}}>
     <Pressable accessibilityRole="button" accessibilityLabel={'開啟收藏工具 '+label(id)}
       onPress={()=>open(id)} style={{flex:1,padding:5}}>
       <Text style={{color:theme.palette.text,fontWeight:'700'}}>{label(id)} ›</Text>
     </Pressable>
     <Pressable accessibilityRole="button" accessibilityLabel={'取消收藏 '+label(id)}
       onPress={()=>void maint.toggleFavoriteTool(id)} style={{padding:8}}>
       <Text style={{color:theme.palette.primary}}>★</Text>
     </Pressable>
   </View>)}
   {!maint.assets.favorites.length?<Text style={{fontSize:12,color:theme.palette.textSecondary}}>尚無收藏；展開任一 B 的工具即可收藏。</Text>:null}
   <Text style={{color:theme.palette.text,fontWeight:'800',marginTop:5}}>C｜最近使用</Text>
   {maint.assets.recent.map(id=><Pressable key={id} accessibilityRole="button"
     accessibilityLabel={'最近使用 '+label(id)} onPress={()=>open(id)}
     style={{padding:8,borderBottomWidth:1,borderColor:theme.palette.border}}>
     <Text style={{color:theme.palette.text,fontSize:12}}>{label(id)} ›</Text>
   </Pressable>)}
   {!maint.assets.recent.length?<Text style={{color:theme.palette.textSecondary,fontSize:12}}>使用 C 工具後，最近十項會出現在這裡。</Text>:null}
 </View>;
}
