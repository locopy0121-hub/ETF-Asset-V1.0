import {useEffect,useRef,useState} from 'react';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Alert,Pressable,ScrollView,StyleSheet,Switch,Text,TextInput,View} from 'react-native';
import {ColorPalettePicker} from '../components/ColorPalettePicker';
import {colorWithAlpha} from './frameEffects';
import {FrameDimensionsToolDetails} from './FrameDimensionsToolDetails';
import type {FrameEditorConfig} from '../editor/pageEditor';
import {useThemeRuntime} from '../theme/ThemeRuntime';
import {CENTRAL_COMPONENT_LIBRARY,isEngineerOwnedInstance,type MaintenanceInstance} from './componentLibrary';
import {skillCounts,skillMatches,type SkillTool} from './skillTree';
import {COMPLETE_ENGINEER_SKILLS,FULL_SKILL_SECTIONS,completeCatalogAudit} from './fullSkillCatalog';
import {resolveSkillAdapter,type AdapterContext} from './skillAdapters';
import {mergeTargetAppearance,targetToolSupported,TARGET_VISUAL_PRESETS,type TargetKind,type TargetOverride} from './inspectionModel';
import type {MaintenanceSession} from './MaintenanceRuntime';
import {DEFAULT_HOLDING_WALL_CONFIG} from '../domain/uiModels';
import {DEFAULT_ETF_BADGES} from '../domain/etfBadges';
import {DEFAULT_PORTFOLIO_LIST} from '../domain/portfolioList';
import {HoldingMarketWallEditor} from '../components/HoldingMarketWallEditor';
import {EtfBadgeEditor} from '../components/EtfBadgeEditor';
import {PortfolioListEditor} from '../components/PortfolioListEditor';
import {useMaintenance} from './MaintenanceRuntime';
import {SpatialToolDetails} from './SpatialEditor';
import {FrameEffectsToolDetails} from './FrameEffectsToolDetails';
import {InspectableTarget} from './InspectableTarget';
import {TARGET_APPEARANCE,type FrameMaintenanceContext,type InspectedTarget} from './inspectionModel';

// The real page above remains the live draft preview. Keep the dock short at rest:
// six navigation entrances, then one section, then one skill and its tools.
export function MaintenanceWorkbench(){
  const maintenance=useMaintenance();
  const theme=useThemeRuntime();
  const insets=useSafeAreaInsets();
  const session=maintenance.session;
  const [activeSection,setActiveSection]=useState<string|null>(null);
  const [openSkill,setOpenSkill]=useState<string|null>(null);
  const [openTool,setOpenTool]=useState<string|null>(null);
  const [showProtection,setShowProtection]=useState(false);
  const [showInspector,setShowInspector]=useState(false);
  const [showStats,setShowStats]=useState(false);
  const [saving,setSaving]=useState(false);
  const [skillQuery,setSkillQuery]=useState('');
  const skillScroller=useRef<ScrollView>(null);
  useEffect(()=>{
    setActiveSection(null);
    setOpenSkill(null);
    setOpenTool(null);
    setShowProtection(false);
    setShowInspector(false);
    setShowStats(false);
    setSkillQuery('');
  },[session?.page,session?.frameKey,session?.instanceId,session?.target?.id]);
  if(!session)return null;
  const focused=session.scope==='instance'?session.instanceId:session.focusInstanceId;
  const instance=session.draftInstances.find(item=>item.id===focused);
  const selectedTarget=session.scope==='target'?session.target:undefined;
  const pendingSelection=maintenance.selection?.page===session.page&&maintenance.selection.frameKey===session.frameKey?maintenance.selection:null;
  const canDeleteFocused=Boolean(instance&&isEngineerOwnedInstance(instance)&&session.scope==='instance');
  const protectedProperties=selectedTarget?.properties.filter(row=>row.readOnly)??[];
  const lockedDescription=selectedTarget?.kind==='value'||selectedTarget?.kind==='metric'||selectedTarget?.kind==='prefix'?
    '原始交易、金額、公式及資料來源鎖定；文字、框架及顯示特效不會改寫數值。':
    '僅原始數據、來源及帳務計算鎖定；其他文字、框架、外觀及排版都可編輯。內建元件保留，僅工程師新增實例可刪除。';
  // Keep ONE unchanged central catalog. Navigation affects presentation, not abilities.
  const displaySkills=COMPLETE_ENGINEER_SKILLS;
  const catalogCount=skillCounts(displaySkills);
  const catalogAudit=completeCatalogAudit();
  const activeCount=displaySkills.flatMap(group=>group.tools).filter(tool=>toolUsable(tool,session)).length;
  const matchingSkills=skillQuery.trim()?
    displaySkills.map(skillItem=>skillMatches(skillItem,skillQuery)?skillItem:null).filter((item):item is (typeof displaySkills)[number]=>item!==null):[];
  const currentSection=FULL_SKILL_SECTIONS.find(section=>section.id===activeSection);
  const selectedSkill=displaySkills.find(item=>item.id===openSkill);
  const goTop=()=>skillScroller.current?.scrollTo({y:0,animated:true});
  const selectSection=(id:string)=>{
    setActiveSection(id===activeSection?null:id);
    setOpenSkill(null);
    setOpenTool(null);
    goTop();
  };
  const selectSkill=(id:string)=>{
    setOpenSkill(id);
    setOpenTool(null);
    goTop();
  };
  const jumpToSkill=(id:string)=>{
    setActiveSection(FULL_SKILL_SECTIONS.find(section=>section.ids.some(category=>category===id))?.id??null);
    selectSkill(id);
  };
  const backToCategories=()=>{setOpenSkill(null);setOpenTool(null);goTop();};
  const apply=async()=>{
    if(saving)return;
    setSaving(true);
    const success=await maintenance.apply();
    setSaving(false);
    if(!success)Alert.alert('儲存失敗','設定尚未套用，請檢查裝置儲存空間並重試。');
  };
  const cancel=()=>maintenance.cancel();
  return <View style={[styles.dock,{backgroundColor:theme.palette.surface,borderTopColor:theme.palette.primary,paddingBottom:Math.max(12,insets.bottom)}]}>
    <View style={styles.head}>
      <View style={{flex:1}}>
        <Text style={[styles.headline,{color:theme.palette.text}]} numberOfLines={1}>🔧 {selectedTarget?.label??session.title}</Text>
        <Text style={{color:theme.palette.textSecondary,fontSize:11}}>真實畫面即時預覽 · 套用後儲存</Text>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel="取消本次編輯" onPress={cancel}><Text style={{fontWeight:'800',color:theme.palette.textSecondary}}>關閉</Text></Pressable>
    </View>
    <ScrollView ref={skillScroller} style={styles.scroller} nestedScrollEnabled keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <Pressable accessibilityRole="button" accessibilityLabel="查看唯讀保護詳情" accessibilityState={{expanded:showProtection}}
        onPress={()=>setShowProtection(current=>!current)}
        style={[styles.compactRow,{borderColor:theme.palette.border,backgroundColor:theme.palette.surfaceMuted}]}>
        <Text style={{flex:1,color:theme.palette.text,fontSize:12,fontWeight:'800'}}>🔒 僅原始數據、來源及帳務計算鎖定</Text>
        <Text style={{color:theme.palette.primary,fontSize:12}}>{showProtection?'收合 ⌃':'說明 ›'}</Text>
      </Pressable>
      {showProtection?<View accessibilityRole="summary" style={[styles.detail,{backgroundColor:theme.palette.surfaceMuted,marginTop:0,marginBottom:8}]}>
        <Text style={[styles.small,{color:theme.palette.textSecondary}]}>{lockedDescription}</Text>
        <Text style={[styles.small,{color:theme.palette.text}]}>目前對象：{selectedTarget?.label??instance?.text??session.title}</Text>
        {protectedProperties.map(row=><View key={row.name} style={{flexDirection:'row',justifyContent:'space-between',gap:8,marginTop:4}}>
          <Text style={[styles.small,{color:theme.palette.textSecondary,flex:1}]}>{row.name}</Text>
          <Text selectable style={[styles.small,{color:theme.palette.text,flex:1,textAlign:'right'}]}>{row.value} 🔒</Text>
        </View>)}
        <Text style={[styles.small,{color:theme.palette.textSecondary}]}>
          {instance?canDeleteFocused?'新增元件可確認後移除':'內建或不明來源元件不可刪除':'內建元件保留，工程師新增實例才可刪除。'}
        </Text>
      </View>:null}
      {pendingSelection&&session.scope!=='target'?<Text style={[styles.hint,{color:theme.palette.primary}]}>已選 {pendingSelection.label}，點上方扳手編輯。</Text>:null}
      {(selectedTarget||session.scope==='instance'&&instance)?<View style={{marginTop:7,marginBottom:7}}>
        <View style={[styles.compactRow,{borderColor:theme.palette.border}]}>
          <Text style={{flex:1,color:theme.palette.text,fontWeight:'700',fontSize:12}}>同類元件外觀同步</Text>
          <Switch accessibilityLabel="同步同類元件外觀" value={session.syncSameKind} onValueChange={maintenance.setSyncSameKind}/>
        </View>
        {session.syncSameKind?<View style={{flexDirection:'row',gap:6,flexWrap:'wrap',paddingTop:6}}>
          {([['frame','同框架'],['page','本頁'],['app','全 App']] as const).map(([scope,label])=><Pressable key={scope}
            accessibilityRole="button" accessibilityLabel={'同步範圍 '+label}
            onPress={()=>maintenance.setSyncScope(scope)}
            style={[styles.choice,{borderColor:theme.palette.primary,
              backgroundColor:session.syncScope===scope?theme.palette.primary:theme.palette.surface}]}>
            <Text style={{color:session.syncScope===scope?'#FFFFFF':theme.palette.text,fontSize:12}}>{label}</Text>
          </Pressable>)}
        </View>:null}
      </View>:null}
      {selectedTarget?<View style={{marginBottom:5}}>
        <Pressable accessibilityRole="button" accessibilityLabel="目前元件詳細屬性" accessibilityState={{expanded:showInspector}}
          onPress={()=>setShowInspector(current=>!current)}
          style={[styles.compactRow,{borderColor:theme.palette.border}]}>
          <Text style={{color:theme.palette.text,fontSize:12,flex:1}}>目前元件：{selectedTarget.label}</Text>
          <Text style={{color:theme.palette.primary,fontSize:12}}>{showInspector?'收合 ⌃':'檢視 ›'}</Text>
        </Pressable>
        {showInspector?<View style={[styles.detail,{backgroundColor:theme.palette.surfaceMuted,marginTop:0}]}>
          {selectedTarget.properties.map(row=><View key={row.name} style={{flexDirection:'row',justifyContent:'space-between',gap:8,marginTop:5}}>
            <Text style={[styles.small,{color:theme.palette.textSecondary,flex:1}]}>{row.name}</Text>
            <Text style={[styles.small,{color:theme.palette.text,textAlign:'right',flex:1}]} numberOfLines={2}>{row.value}{row.readOnly?' 🔒':''}</Text>
          </View>)}
        </View>:null}
      </View>:null}
      <View style={{marginTop:6,marginBottom:8}}>
        <TextInput accessibilityLabel="搜尋維護工程師技能" value={skillQuery}
          onChangeText={value=>{setSkillQuery(value);setOpenSkill(null);setOpenTool(null);goTop();}}
          placeholder="搜尋全部技能，例如：漸層、框架、字型…"
          placeholderTextColor={theme.palette.textSecondary}
          style={[styles.input,{borderColor:theme.palette.border,color:theme.palette.text}]}/>
        <Pressable accessibilityRole="button" accessibilityLabel="展開完整技能統計"
          accessibilityState={{expanded:showStats}} onPress={()=>setShowStats(current=>!current)}
          style={{paddingVertical:5,flexDirection:'row',justifyContent:'space-between'}}>
          <Text style={[styles.small,{color:theme.palette.textSecondary}]}>30 類 · {catalogCount.total} 項技能 · 當前可操作 {activeCount} 項</Text>
          <Text style={[styles.small,{color:theme.palette.primary}]}>{showStats?'收合 ⌃':'統計 ›'}</Text>
        </Pressable>
        {showStats?<Text style={[styles.small,{color:theme.palette.textSecondary}]}>
          {catalogCount.ready} 項已宣告接入（非實機 PASS），{catalogCount.pending} 項待接線；既有 {catalogAudit.existing} 項全部保留。工具的適配狀態會顯示在細節。
        </Text>:null}
      </View>
      {selectedSkill?<View>
        <Pressable accessibilityRole="button" accessibilityLabel="返回技能分類" onPress={backToCategories}
          style={[styles.compactRow,{borderColor:theme.palette.border,marginBottom:8}]}>
          <Text style={{color:theme.palette.primary,fontSize:12}}>‹ 返回分類</Text>
          <Text style={{flex:1,textAlign:'right',color:theme.palette.text,fontWeight:'800'}} numberOfLines={1}>{selectedSkill.label}</Text>
        </Pressable>
        <Text style={[styles.small,{color:theme.palette.textSecondary,marginBottom:6}]}>{selectedSkill.description}</Text>
        {selectedSkill.tools.map(tool=><View key={tool.id} style={{marginBottom:6}}>
          <Pressable accessibilityRole="button" accessibilityState={{expanded:openTool===tool.id}}
            onPress={()=>setOpenTool(current=>current===tool.id?null:tool.id)} style={styles.toolRow}>
            <Text style={{flex:1,color:theme.palette.text,fontSize:13,fontWeight:'600'}}>{tool.label}</Text>
            <Text style={{color:toolUsable(tool,session)?theme.palette.primary:theme.palette.textSecondary,fontSize:11}}>
              {tool.status!=='ready'?'待實作 ›':toolUsable(tool,session)?openTool===tool.id?'收合 ⌃':'編輯 ›':'待適配 ›'}
            </Text>
          </Pressable>
          {openTool===tool.id?<View style={[styles.detail,{backgroundColor:theme.palette.surfaceMuted}]}>
            <Text style={[styles.small,{color:theme.palette.textSecondary}]}>{tool.detail}</Text>
            <ScopedToolDetails tool={tool} instance={instance}/>
          </View>:null}
        </View>)}
      </View>:skillQuery.trim()?<View style={{gap:6}}>
        <Text style={[styles.label,{color:theme.palette.text}]}>搜尋結果 · {matchingSkills.length} 類</Text>
        {matchingSkills.map(skillItem=><Pressable key={skillItem.id} accessibilityRole="button"
          accessibilityLabel={'前往 '+skillItem.label} onPress={()=>jumpToSkill(skillItem.id)}
          style={[styles.compactRow,{borderColor:theme.palette.border}]}>
          <Text style={{color:theme.palette.text,flex:1,fontSize:12}}>{skillItem.label}</Text>
          <Text style={{color:theme.palette.primary,fontSize:12}}>開啟 ›</Text>
        </Pressable>)}
        {!matchingSkills.length?<Text style={[styles.hint,{color:theme.palette.textSecondary}]}>沒有符合的技能，請換個關鍵字。</Text>:null}
      </View>:currentSection?<View style={{gap:7}}>
        <Pressable accessibilityRole="button" accessibilityLabel="返回六大工具分類"
          onPress={()=>selectSection(activeSection!)}
          style={[styles.compactRow,{borderColor:theme.palette.border}]}>
          <Text style={{color:theme.palette.primary,fontSize:12}}>‹ 六大分類</Text>
          <Text style={{color:theme.palette.text,fontWeight:'800',flex:1,textAlign:'right'}} numberOfLines={1}>{currentSection.label}</Text>
        </Pressable>
        {currentSection.ids.map(id=>{
          const skill=displaySkills.find(item=>item.id===id);
          if(!skill)return null;
          const available=skill.tools.filter(tool=>toolUsable(tool,session)).length;
          return <Pressable key={id} accessibilityRole="button" accessibilityLabel={'前往 '+skill.label}
            onPress={()=>jumpToSkill(id)}
            style={[styles.compactRow,{borderColor:theme.palette.border,paddingVertical:12}]}>
            <Text style={{color:theme.palette.text,flex:1,fontWeight:'700'}}>{skill.label}</Text>
            <Text style={[styles.small,{color:theme.palette.textSecondary}]}>{available}/{skill.tools.length} ›</Text>
          </Pressable>;
        })}
      </View>:<View style={{gap:7}}>
        <Text style={[styles.label,{color:theme.palette.text,marginBottom:2}]}>選擇工具分類</Text>
        <View style={{flexDirection:'row',flexWrap:'wrap',justifyContent:'space-between',rowGap:8}}>
          {FULL_SKILL_SECTIONS.map(section=><Pressable key={section.id} accessibilityRole="button"
            accessibilityLabel={'開啟 '+section.label} onPress={()=>selectSection(section.id)}
            style={[styles.sectionCard,{borderColor:theme.palette.border,backgroundColor:theme.palette.surfaceMuted}]}>
            <Text style={{fontWeight:'800',fontSize:13,color:theme.palette.text}}>{section.label}</Text>
            <Text style={{fontSize:11,color:theme.palette.textSecondary,marginTop:5}}>{section.ids.length} 類技能 ›</Text>
          </Pressable>)}
        </View>
      </View>}
      <View style={{height:10}}/>
    </ScrollView>
    <View style={[styles.actions,{borderTopColor:theme.palette.border}]}>
      <Pressable accessibilityRole="button" accessibilityLabel="取消全部暫存修改" onPress={cancel}
        style={[styles.action,{borderColor:theme.palette.border,borderWidth:1}]}>
        <Text style={{fontWeight:'800',color:theme.palette.text}}>取消／恢復</Text>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="套用本次修改" onPress={()=>void apply()} disabled={saving}
        style={[styles.action,{backgroundColor:theme.palette.primary,opacity:saving?.5:1}]}>
        <Text style={{fontWeight:'800',color:'#FFFFFF'}}>{saving?'儲存中…':'儲存／套用'}</Text>
      </Pressable>
    </View>
  </View>;
}

// Navigation never filters tools. A single pure resolver chooses the rendering adapter.
function adapterContext(s:MaintenanceSession):AdapterContext{
 const instance=s.scope==='instance'?s.draftInstances.find(item=>item.id===s.instanceId):undefined;
 return {scope:s.scope,page:s.page,frameKey:s.frameKey,
   ...(s.scope==='target'&&s.target?{kind:s.target.kind}:{}),
   ...(instance?{kind:(instance.templateId==='parent-frame'?'frame':instance.templateId==='divider'?'generic':'text') as TargetKind,
     instanceOwned:isEngineerOwnedInstance(instance),instanceParent:instance.templateId==='parent-frame'}:{}),
 };
}
const adapterFor=(tool:SkillTool,s:MaintenanceSession)=>resolveSkillAdapter(tool,adapterContext(s));
const resolvedTool=(tool:SkillTool,s:MaintenanceSession)=>adapterFor(tool,s).tool;
const toolUsable=(tool:SkillTool,s:MaintenanceSession)=>adapterFor(tool,s).status==='active';
function ScopedToolDetails({tool,instance}:{tool:SkillTool;instance?:MaintenanceInstance|undefined}){
  const maint=useMaintenance();
  const theme=useThemeRuntime();
  const s=maint.session;
  if(!s)return null;
  const activeTool=resolvedTool(tool,s);
  if(activeTool!==tool)return <ScopedToolDetails tool={activeTool} instance={instance}/>;
  if(tool.field==='instance:sync')return <View style={{gap:8,marginTop:8}}>
    <Text style={{fontSize:12,color:theme.palette.textSecondary}}>共用樣式只更新同類元件外觀，不連動內容、位置、尺寸或帳務資料。</Text>
    <Switch value={s.syncSameKind} onValueChange={maint.setSyncSameKind}/>
    {s.syncSameKind?<View style={{flexDirection:'row',gap:8,flexWrap:'wrap'}}>
      {([['frame','同框架'],['page','本頁'],['app','全 App']] as const).map(([scope,label])=><Pressable key={scope}
        onPress={()=>maint.setSyncScope(scope)} accessibilityRole="button" accessibilityLabel={'同類同步：'+label}
        style={[styles.choice,{borderColor:theme.palette.primary,
          backgroundColor:s.syncScope===scope?theme.palette.primary:theme.palette.surface}]}>
        <Text style={{color:s.syncScope===scope?'#FFFFFF':theme.palette.text}}>{label}</Text>
      </Pressable>)}
    </View>:null}
  </View>;
  if(tool.field==='frame:size')return <FrameDimensionsToolDetails/>;
  if(tool.field?.startsWith('framefx:'))return toolUsable(tool,s)?
    <FrameEffectsToolDetails field={tool.field.slice('framefx:'.length)}/>:
    <Text style={{color:theme.palette.textSecondary}}>框架專屬效果：請點外層框架的大扳手，再選擇專業框架工程。</Text>;
  if(tool.field?.startsWith('workspace:')||['target:xy','target:dimensions','target:anchors'].includes(tool.field??''))
    return <SpatialToolDetails field={tool.field!} />;
  if(!toolUsable(tool,s))return <Text style={{fontSize:12,color:theme.palette.textSecondary,marginTop:8}}>
    {adapterFor(tool,s).reason}
  </Text>;
  if(tool.field?.startsWith('target:')){
    const target=s.target??(s.scope==='instance'&&instance?{
      id:'installed:'+instance.id,page:s.page,frameKey:s.frameKey,frameTitle:s.title,
      kind:(instance.templateId==='parent-frame'?'frame':instance.templateId==='divider'?'generic':'text') as TargetKind,
      label:instance.text||'新增元件',properties:[{name:'文字內容',value:instance.text,readOnly:false}],
      base:{...TARGET_APPEARANCE,fontSize:instance.fontSize,textColor:instance.color,
        backgroundColor:theme.palette.surface,borderColor:theme.palette.border},
    }:null);
    if(!target)return null;
    const fieldName=tool.field.slice(7);
    const key=fieldName as keyof TargetOverride;
    const current=mergeTargetAppearance(target.base,maint.getTargetOverride(target.page,target.frameKey,target.id,target.kind));
    if(fieldName==='inspect')return <View style={{marginTop:8,gap:4}}>{target.properties.map(row=><Text key={row.name}
      style={{fontSize:12,color:theme.palette.text}}>{row.name}：{row.value}{row.readOnly?'（唯讀）':''}</Text>)}</View>;
    const v=current[key];
    const change=(value:unknown)=>maint.patchTarget(target.id,{[key]:value} as TargetOverride);
    if(fieldName==='preset')return <View style={{gap:8,marginTop:8}}>
      <Text style={{color:theme.palette.textSecondary,fontSize:12}}>只更新目前元件外觀；不更動原始數值、文字、隱藏狀態或 XY。</Text>
      {([['soft','柔和漸層'],['focus','聚焦高對比'],['minimal','極簡純色']] as const).map(([id,label])=><Pressable key={id}
        accessibilityRole="button" accessibilityLabel={'套用'+label+'預設'}
        onPress={()=>maint.patchTarget(target.id,TARGET_VISUAL_PRESETS[id])}
        style={[styles.choice,{borderColor:theme.palette.primary}]}>
        <Text style={{color:theme.palette.primary,fontWeight:'800'}}>{label}</Text>
      </Pressable>)}
    </View>;
    if(fieldName==='resetVisual')return <View style={{gap:8,marginTop:8}}>
      <Text style={{color:theme.palette.textSecondary,fontSize:12}}>恢復 App 原始視覺設定；保留目前元件的文字、顯示狀態及定位。按底部套用才持久化。</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="重設目前元件外觀"
        onPress={()=>maint.resetTargetVisual(target.id)} style={[styles.choice,{borderColor:theme.palette.primary}]}>
        <Text style={{color:theme.palette.primary,fontWeight:'800'}}>恢復原生外觀（暫存）</Text>
      </Pressable>
    </View>;
    if(fieldName==='backgroundMode'||fieldName==='gradientDirection'||fieldName==='borderStyle'){
      const options=fieldName==='backgroundMode'?[['solid','純色'],['gradient','漸層']]:
        fieldName==='gradientDirection'?[['horizontal','水平'],['vertical','垂直']]:
        [['solid','實線'],['dashed','虛線'],['dotted','點線']];
      return <View style={{flexDirection:'row',flexWrap:'wrap',gap:7,marginTop:8}}>
        {options.map(([value,label])=><Pressable key={value} accessibilityRole="button"
          accessibilityLabel={label} onPress={()=>change(value)}
          style={[styles.choice,{borderColor:theme.palette.primary,backgroundColor:v===value?theme.palette.primary:theme.palette.surface}]}>
          <Text style={{color:v===value?'#FFFFFF':theme.palette.text}}>{label}</Text>
        </Pressable>)}
      </View>;
    }
    if(typeof v==='boolean')return <View style={{flexDirection:'row',alignItems:'center',gap:12,marginTop:8}}>
      <Text style={{color:theme.palette.text}}>{v?'開啟':'關閉'}</Text><Switch value={v} onValueChange={change}/>
    </View>;
    if(key==='labelText'||key==='captionText'||key==='prefixText')return <TextInput value={String(v)}
      onChangeText={change} maxLength={120} placeholder="留空沿用 App 原始文字"
      style={[styles.input,{borderColor:theme.palette.border,color:theme.palette.text}]}/>;
    if(fieldName==='fontFamily'){
      const options=[['system','裝置預設'],['sans-serif','無襯線'],['sans-serif-condensed','窄體'],['serif','襯線'],['monospace','等寬']] as const;
      return <View style={{flexDirection:'row',flexWrap:'wrap',gap:7,marginTop:8}}>
        {options.map(([value,label])=><Pressable key={value} accessibilityRole="button" accessibilityLabel={'字型 '+label}
          onPress={()=>change(value)} style={[styles.choice,{borderColor:theme.palette.primary,
            backgroundColor:v===value?theme.palette.primary:theme.palette.surface}]}>
          <Text style={{color:v===value?'#FFFFFF':theme.palette.text}}>{label}</Text>
        </Pressable>)}
        <Text style={{color:theme.palette.textSecondary,fontSize:11}}>僅使用裝置內建字型；缺字由 Android／iOS 原生替代，不下載字型。</Text>
      </View>;
    }
    if(['fontWeight','fontStyle','textDecorationLine','labelFontWeight','captionFontWeight','labelFontStyle','captionFontStyle'].includes(fieldName)){
      const optionName=fieldName.endsWith('FontWeight')?'fontWeight':fieldName.endsWith('FontStyle')?'fontStyle':fieldName;
      const options:Record<string,readonly (readonly [string,string])[]>={
        fontWeight:[['normal','正常'],['bold','粗體'],['300','細體'],['500','中等'],['600','半粗'],['700','700'],['800','800'],['900','最粗']],
        fontStyle:[['normal','正常'],['italic','斜體']],
        textDecorationLine:[['none','無'],['underline','底線'],['line-through','刪除線'],['underline line-through','底線＋刪除線']],
      };
      return <View style={{flexDirection:'row',gap:7,flexWrap:'wrap',marginTop:8}}>
        {options[optionName]!.map(([value,label])=><Pressable key={value} accessibilityRole="button" accessibilityLabel={label}
          onPress={()=>change(value)} style={[styles.choice,{borderColor:theme.palette.primary,
          backgroundColor:v===value?theme.palette.primary:theme.palette.surface}]}>
          <Text style={{color:v===value?'#FFFFFF':theme.palette.text}}>{label}</Text>
        </Pressable>)}
      </View>;
    }
    if(key==='align')return <View style={{flexDirection:'row',flexWrap:'wrap',gap:8,marginTop:8}}>
      {(['left','center','right'] as const).map(pos=><Pressable key={pos} onPress={()=>change(pos)}
        style={[styles.choice,{borderColor:theme.palette.primary,backgroundColor:v===pos?theme.palette.primary:theme.palette.surface}]}>
        <Text style={{color:v===pos?'#FFF':theme.palette.text}}>{{left:'靠左',center:'置中',right:'靠右'}[pos]}</Text>
      </Pressable>)}
    </View>;
    if(fieldName==='profitToneOverride')return <View style={{flexDirection:'row',gap:7,flexWrap:'wrap',marginTop:8}}>
      {(['auto','gain','loss','neutral'] as const).map(tone=><Pressable key={tone} onPress={()=>change(tone)}
        style={[styles.choice,{borderColor:theme.palette.primary,backgroundColor:v===tone?theme.palette.primary:theme.palette.surface}]}>
        <Text style={{color:v===tone?'#FFFFFF':theme.palette.text}}>{({auto:'真實來源',gain:'獲利預覽',loss:'虧損預覽',neutral:'中性'} as const)[tone]}</Text>
      </Pressable>)}
    </View>;
    if(typeof v==='string'&&/^#[0-9a-f]{6}$/i.test(v)){
      const toggles:Record<string,'textProfitColor'|'labelProfitColor'|'captionProfitColor'|'backgroundProfitColor'|'borderProfitColor'|'gradientEndProfitColor'|'gradientMidProfitColor'|'shadowProfitColor'|'glowProfitColor'>={
        textColor:'textProfitColor',labelColor:'labelProfitColor',captionColor:'captionProfitColor',
        backgroundColor:'backgroundProfitColor',borderColor:'borderProfitColor',
        gradientEndColor:'gradientEndProfitColor',gradientMidColor:'gradientMidProfitColor',
        shadowColor:'shadowProfitColor',glowColor:'glowProfitColor',
      };
      const profitFlag=toggles[fieldName];
      return <ColorPalettePicker label={tool.label} value={v} onChange={change}
        {...(profitFlag?{profitColorEnabled:Boolean(current[profitFlag]),
          onProfitColorChange:(value:boolean)=>maint.patchTarget(target.id,{[profitFlag]:value})}:{})}/>;
    }
    if(typeof v==='number'){
      const range:Record<string,[number,number,number]>={
        fontSize:[8,48,1],labelFontSize:[8,32,1],captionFontSize:[8,30,1],borderWidth:[0,8,1],
        borderRadius:[0,48,2],padding:[0,32,2],opacity:[0,1,.05],backgroundOpacity:[0,1,.05],
        letterSpacing:[-4,16,.5],lineHeight:[0,96,1],prefixGap:[0,48,1],prefixOffsetX:[-80,80,1],prefixOffsetY:[-80,80,1],
        labelLetterSpacing:[-4,16,.5],captionLetterSpacing:[-4,16,.5],
        labelLineHeight:[0,96,1],captionLineHeight:[0,96,1],
        gradientMidStop:[.1,.9,.05],marginVertical:[0,32,1],marginHorizontal:[0,32,1],
        shadowOpacity:[0,.8,.05],shadowBlur:[0,48,1],shadowOffsetX:[-24,24,1],shadowOffsetY:[-24,24,1],
        glowOpacity:[0,.8,.05],glowWidth:[0,16,1],
      };
      const [min,max,step]=range[key]??[0,100,1];
      return <View style={styles.stepper}>
        <Pressable onPress={()=>change(Math.max(min,Number((v-step).toFixed(2))))} style={styles.step}><Text style={{color:theme.palette.primary,fontWeight:'900'}}>−</Text></Pressable>
        <Text style={{color:theme.palette.text,fontWeight:'800'}}>{['opacity','backgroundOpacity','gradientMidStop','shadowOpacity','glowOpacity'].includes(fieldName)?Math.round(v*100)+'%':String(v)}</Text>
        <Pressable onPress={()=>change(Math.min(max,Number((v+step).toFixed(2))))} style={styles.step}><Text style={{color:theme.palette.primary,fontWeight:'900'}}>＋</Text></Pressable>
      </View>;
    }
    return <Text style={{color:theme.palette.textSecondary}}>此屬性目前為唯讀。</Text>;
  }
  if(tool.field?.startsWith('page:')){
    const key=tool.field.slice(5);
    const d=s.draftDisplay;
    if(key==='wall')return <View style={{marginTop:8}}>
      <Text style={{color:theme.palette.textSecondary,fontSize:12,marginBottom:6}}>本頁所有行情卡片共用這份設定；工作區直接顯示暫存效果。</Text>
      <HoldingMarketWallEditor value={d.holdingWall??DEFAULT_HOLDING_WALL_CONFIG}
        onChange={holdingWall=>maint.patchDisplay({holdingWall})}/>
    </View>;
    if(key==='badges')return <EtfBadgeEditor value={d.etfBadges??DEFAULT_ETF_BADGES}
      onChange={etfBadges=>maint.patchDisplay({etfBadges})}/>;
    if(key==='list')return <PortfolioListEditor value={d.portfolioList??DEFAULT_PORTFOLIO_LIST}
      badges={d.etfBadges??DEFAULT_ETF_BADGES} onChange={portfolioList=>maint.patchDisplay({portfolioList})}/>;
    if(key==='quoteStyle'||key==='holdingLayoutMode'){
      const current=key==='quoteStyle'?d.quoteStyle??'quote':d.holdingLayoutMode??'list';
      const opts=key==='quoteStyle'?[
        ['quote','純行情'],['chart','＋圖表'],['compact','精簡'],['advanced','進階'],
      ]:[
        ['list','單欄'],['grid2','雙欄'],['grid3','三欄'],['horizontal','橫向滑動'],['paged2','雙欄滑動'],
      ];
      return <View style={{flexDirection:'row',flexWrap:'wrap',gap:7,marginTop:8}}>
        {opts.map(([value,label])=><Pressable key={value} onPress={()=>
          key==='quoteStyle'?maint.patchDisplay({quoteStyle:value as NonNullable<typeof d.quoteStyle>}):
          maint.patchDisplay({holdingLayoutMode:value as NonNullable<typeof d.holdingLayoutMode>})}
          style={[styles.choice,{borderColor:theme.palette.primary,backgroundColor:current===value?theme.palette.primary:theme.palette.surface}]}>
          <Text style={{color:current===value?'#FFF':theme.palette.text}}>{label}</Text>
        </Pressable>)}
      </View>;
    }
  }
  return <ToolDetails tool={tool} instance={instance}/>;
}

function ToolDetails({tool,instance}:{tool:SkillTool;instance?:MaintenanceInstance|undefined}){
  const maint=useMaintenance();
  const theme=useThemeRuntime();
  const s=maint.session;
  if(!s)return null;
  if(tool.status!=='ready')return <Text style={{color:theme.palette.textSecondary,marginTop:8,fontSize:12}}>此技能已列入完整技能樹，尚未完成專屬 Runtime 適配，不會假裝套用。</Text>;
  if(tool.field==='session')return <Text style={{color:theme.palette.text,marginTop:8,fontSize:12}}>所有變更暫存於當前工作區；取消完全恢復，儲存套用才正式寫入。</Text>;
  if(tool.field==='instances'){
    if(s.scope==='instance'&&tool.id==='install'&&instance?.templateId!=='parent-frame')return <Text style={{color:theme.palette.textSecondary}}>請從新增父框架或目前框架的扳手新增元件。</Text>;
    if(tool.id==='install')return <View style={{gap:8,marginTop:8}}>
      {CENTRAL_COMPONENT_LIBRARY.map(template=><Pressable key={template.id} accessibilityRole="button" disabled={template.installation!=='ready'||s.draftInstances.length>=30||(s.scope==='instance'&&template.id==='parent-frame')} onPress={()=>maint.install(template.id)} style={[styles.toolRow,{opacity:template.installation==='ready'?1:.55}]}>
        <View style={{flex:1}}><Text style={{color:theme.palette.text,fontWeight:'700'}}>{template.label}</Text><Text style={{color:theme.palette.textSecondary,fontSize:11}}>{template.description}</Text></View>
        <Text style={{fontSize:12,color:theme.palette.primary}}>{template.installation==='ready'?'新增':'待介接'}</Text>
      </Pressable>)}
    </View>;
    if(tool.id==='remove'){
      const owned=s.draftInstances.filter(item=>isEngineerOwnedInstance(item)&&
        (s.scope!=='instance'||item.id===s.instanceId));
      const askRemove=(item:MaintenanceInstance)=>Alert.alert('移除維護工程師新增元件？',
        '僅移除目前框架中這個新增實例：'+(item.text||item.templateId)+
        '。原有 App 元件、資料與其他畫面不受影響。取消本次編輯可還原；按「儲存／套用」才正式移除。',
        [{text:'取消',style:'cancel'},{text:'確認移除',style:'destructive',onPress:()=>maint.remove(item.id)}]);
      return <View style={{gap:8,marginTop:8}}>
        <Text style={{color:theme.palette.textSecondary,fontSize:12}}>僅列出目前框架內由維護工程師新增的元件。原生元件沒有刪除入口。</Text>
        {owned.length?owned.map(item=><Pressable key={item.id} accessibilityRole="button"
          accessibilityLabel={'刪除工程師新增元件 '+(item.text||item.templateId)}
          onPress={()=>askRemove(item)} style={styles.toolRow}>
          <Text style={{flex:1,color:theme.palette.text}}>{item.text||item.templateId}</Text>
          <Text style={{color:'#D43D4F',fontWeight:'700'}}>刪除 ›</Text>
        </Pressable>):<Text style={{color:theme.palette.textSecondary}}>目前沒有可刪除的工程師新增元件。</Text>}
      </View>;
    }
  }
  if(tool.field==='instance:parent-size'){
    if(!instance||instance.templateId!=='parent-frame')return <Text>請先選取新增的父框架。</Text>;
    const dimension=(axis:'frameWidth'|'frameHeight',label:string,min:number,max:number)=>{
      const value=instance[axis]??(axis==='frameWidth'?320:240);
      const change=(v:number)=>maint.patchInstance(instance.id,{[axis]:Math.max(min,Math.min(max,Math.round(v)))});
      return <View style={{gap:7,marginTop:10}} key={axis}>
        <Text style={{color:theme.palette.text,fontWeight:'700'}}>{label}：{value} dp</Text>
        <View style={{flexDirection:'row',gap:8,alignItems:'center'}}>
          <Pressable accessibilityRole="button" accessibilityLabel={label+'減少 1'} onPress={()=>change(value-1)} style={styles.step}><Text style={{color:theme.palette.primary}}>−</Text></Pressable>
          <TextInput keyboardType="number-pad" accessibilityLabel={label} value={String(value)} onChangeText={text=>{if(/^\\d{1,4}$/.test(text))change(Number(text));}} style={[styles.input,{flex:1,color:theme.palette.text,borderColor:theme.palette.border}]}/>
          <Pressable accessibilityRole="button" accessibilityLabel={label+'增加 1'} onPress={()=>change(value+1)} style={styles.step}><Text style={{color:theme.palette.primary}}>＋</Text></Pressable>
        </View>
      </View>;
    };
    return <View style={{marginTop:8,gap:5}}>
      <Text style={{color:theme.palette.textSecondary,fontSize:12}}>調整父框架尺寸不修改子元件位置或啟用捲動；子元件超出時保留原位。</Text>
      {dimension('frameWidth','父框架寬度',160,1600)}{dimension('frameHeight','父框架高度',80,2400)}
    </View>;
  }
  if(tool.field==='instance-text'){
    if(!instance)return <Text style={{marginTop:8,color:theme.palette.textSecondary}}>先從元件庫新增文字元件，或呼叫現有文字元件的扳手。</Text>;
    if(instance.templateId==='divider')return <Text style={{color:theme.palette.textSecondary}}>分隔線不含文字。</Text>;
    return <TextInput value={instance.text} onChangeText={text=>maint.patchInstance(instance.id,{text})} maxLength={200} multiline placeholder="文字內容" style={[styles.input,{borderColor:theme.palette.border,color:theme.palette.text}]}/>;
  }
  const field=tool.field;
  if(!field)return null;
  const instanceField:Record<string,keyof MaintenanceInstance>={titleFontSize:'fontSize',titleColor:'color',padding:'marginTop',visible:'visible'};
  const instanceKey=s.scope==='instance'?instanceField[field]:undefined;
  if(s.scope==='instance'&&!instanceKey)return <Text style={{color:theme.palette.textSecondary,marginTop:8}}>此工具尚未與這一種元件建立操作介面。</Text>;
  const frame=s.draft as unknown as Record<string,unknown>;
  const numericDefaults:Record<string,number>={padding:16,minHeight:0};
  const raw=(instanceKey&&instance?instance[instanceKey]:frame[field])??numericDefaults[field];
  const change=(value:unknown)=>{
    if(instanceKey&&instance)maint.patchInstance(instance.id,{[instanceKey]:value} as Partial<MaintenanceInstance>);
    else maint.patchFrame({[field]:value} as Partial<FrameEditorConfig>);
  };
  if(typeof raw==='boolean')return <Switch value={raw} onValueChange={change} style={{alignSelf:'flex-start',marginTop:8}}/>;
  const choices:Record<string,readonly string[]>={
    layout:['standard','compact','dense'],appearance:['theme','soft','outline'],titleAlign:['left','center','right'],
  };
  if(choices[field])return <View style={{flexDirection:'row',flexWrap:'wrap',gap:7,marginTop:8}}>
    {choices[field].map(key=><Pressable key={key} onPress={()=>change(key)} style={[styles.choice,{borderColor:theme.palette.primary,backgroundColor:raw===key?theme.palette.primary:theme.palette.surface}]}>
      <Text style={{color:raw===key?'#FFFFFF':theme.palette.text,fontSize:12}}>{({standard:'標準',compact:'緊湊',dense:'密集',theme:'主題',soft:'柔和',outline:'描邊',left:'靠左',center:'置中',right:'靠右'} as Record<string,string>)[key]||key}</Text>
    </Pressable>)}
  </View>;
  if(typeof raw==='string'&&/^#[0-9A-Fa-f]{6}$/.test(raw)){
    if(s.scope==='instance')return <ColorPalettePicker label={tool.label} value={raw} onChange={change}/>;
    const pair:Record<string,'titleProfitColor'|'backgroundProfitColor'|'borderProfitColor'>={
      titleColor:'titleProfitColor',backgroundColor:'backgroundProfitColor',borderColor:'borderProfitColor',
    };
    const toggle=pair[field];
    return <ColorPalettePicker label={tool.label} value={raw} onChange={change}
      {...(toggle?{profitColorEnabled:Boolean(s.draft[toggle]),
        onProfitColorChange:(value:boolean)=>maint.patchFrame({[toggle]:value})}:{})}/>;
  }
  if(typeof raw==='number'){
    const ranges:Record<string,[number,number,number]>={
      titleFontSize:[10,32,1],borderWidth:[0,8,1],borderRadius:[0,48,2],backgroundOpacity:[0,1,.05],
      shadowOpacity:[0,.8,.05],padding:[0,32,2],minHeight:[0,600,10],
    };
    const [min,max,step]=ranges[field]??[0,100,1];
    return <View style={styles.stepper}>
      <Pressable onPress={()=>change(Math.max(min,Number((raw-step).toFixed(2))))} style={styles.step}><Text style={{fontWeight:'900',color:theme.palette.primary}}>−</Text></Pressable>
      <Text style={{color:theme.palette.text,fontWeight:'800'}}>{step<1?Math.round(raw*100)+'%':String(raw)}</Text>
      <Pressable onPress={()=>change(Math.min(max,Number((raw+step).toFixed(2))))} style={styles.step}><Text style={{fontWeight:'900',color:theme.palette.primary}}>＋</Text></Pressable>
    </View>;
  }
  return <Text style={{color:theme.palette.textSecondary,marginTop:8}}>此工具尚未連接當前元件的可寫屬性。</Text>;
}

export function InstalledFrameComponents({instances,frame,onWrench,enabled,activeId}:{
  instances:readonly MaintenanceInstance[];frame:FrameMaintenanceContext;
  onWrench:(id:string)=>void;enabled:boolean;activeId?:string|undefined;
}){
  const theme=useThemeRuntime();
  return <>{instances.filter(item=>!item.parentId&&(item.visible||item.id===activeId)).map(item=>{
    if(item.templateId==='parent-frame'){
      const children=instances.filter(child=>child.parentId===item.id).map(({parentId,...child})=>child);
      const target:InspectedTarget={
        id:'installed:'+item.id,page:frame.page,frameKey:frame.frameKey,frameTitle:frame.frameTitle,
        kind:'frame',label:item.text||'新增父框架',
        properties:[{name:'工程師新增父框架',value:item.text,readOnly:false},
          {name:'寬度',value:String(item.frameWidth??320)+' dp',readOnly:false},
          {name:'高度',value:String(item.frameHeight??240)+' dp',readOnly:false}],
        base:{...TARGET_APPEARANCE,fontSize:item.fontSize,textColor:item.color,
          labelText:item.text,backgroundColor:theme.palette.surface,
          borderColor:theme.palette.border,borderWidth:1,borderRadius:14,padding:10},
      };
      return <View key={item.id} style={{marginTop:item.marginTop,width:item.frameWidth??320,
        maxWidth:'100%',position:'relative'}}>
        <InspectableTarget frame={frame} target={target}>{(appearance,customized,override)=><View style={{
          width:'100%',height:item.frameHeight??240,
          borderWidth:customized?appearance.borderWidth:1,
          borderStyle:customized?appearance.borderStyle:'solid',
          borderRadius:customized?appearance.borderRadius:14,
          borderColor:customized?appearance.borderColor:theme.palette.border,
          backgroundColor:customized&&appearance.backgroundMode==='gradient'?'transparent':
            customized?colorWithAlpha(appearance.backgroundColor,appearance.backgroundOpacity):theme.palette.surface,
          padding:customized?appearance.padding:10,overflow:'visible',position:'relative',
        }}>
          <View style={{flexDirection:'row',alignItems:'center',gap:8,marginBottom:5}}>
            <Text style={{flex:1,fontSize:customized?appearance.fontSize:item.fontSize,
              color:customized?appearance.textColor:item.color,
              fontWeight:override.fontWeight??'800',
              ...(override.fontFamily&&appearance.fontFamily!=='system'?{fontFamily:appearance.fontFamily}:{}),
              ...(override.fontStyle?{fontStyle:appearance.fontStyle}:{}),
              ...(override.letterSpacing!==undefined?{letterSpacing:appearance.letterSpacing}:{}),
            }}>{override.labelText!==undefined?appearance.labelText:item.text}</Text>
            {enabled?<Pressable accessibilityLabel="編輯新增父框架及新增子元件" accessibilityRole="button"
              onPress={()=>onWrench(item.id)} style={styles.miniWrench}><Text style={{fontSize:15}}>🔧</Text></Pressable>:null}
          </View>
          <InstalledFrameComponents instances={children} frame={frame} onWrench={onWrench} enabled={enabled} activeId={activeId}/>
          {children.length===0?<Text style={{fontSize:12,color:theme.palette.textSecondary}}>空白父框架｜點選扳手可新增內部元件</Text>:null}
        </View>}</InspectableTarget>
      </View>;
    }
    const target:InspectedTarget={
      id:'installed:'+item.id,page:frame.page,frameKey:frame.frameKey,frameTitle:frame.frameTitle,
      kind:item.templateId==='divider'?'generic':'text',label:item.text||'分隔線',
      properties:[{name:'原始文字（新增元件）',value:item.text||'無',readOnly:false},
        {name:'既有字號',value:item.fontSize+' dp',readOnly:true}],
      base:{...TARGET_APPEARANCE,fontSize:item.fontSize,textColor:item.color,labelText:item.text,
        backgroundColor:theme.palette.surface,padding:0,borderWidth:0},
    };
    return <View key={item.id} style={{marginTop:item.marginTop,position:'relative'}}>
      <View pointerEvents="none" style={[StyleSheet.absoluteFill,{borderStyle:'dashed',
        borderWidth:item.id===activeId?2:0,borderColor:theme.palette.primary}]}/>
      <View style={{flexDirection:'row',alignItems:'center',gap:6}}>
        <View style={{flex:1}}>
          <InspectableTarget frame={frame} target={target}>{(appearance,customized,override)=>
            item.templateId==='divider'?<View style={{height:1,backgroundColor:theme.palette.border,marginVertical:7}}/>:
              <Text style={{fontSize:customized?appearance.fontSize:item.fontSize,
                color:customized?appearance.textColor:item.color,
                backgroundColor:customized?(appearance.backgroundMode==='gradient'?'transparent':
                   colorWithAlpha(appearance.backgroundColor,appearance.backgroundOpacity)):undefined,
                fontWeight:override.fontWeight??(item.templateId==='section-label'?'800':'400'),
                ...(override.fontFamily&&appearance.fontFamily!=='system'?{fontFamily:appearance.fontFamily}:{}),
                ...(override.fontStyle?{fontStyle:appearance.fontStyle}:{}),
                ...(override.textDecorationLine?{textDecorationLine:appearance.textDecorationLine}:{}),
                ...(override.letterSpacing!==undefined?{letterSpacing:appearance.letterSpacing}:{}),
                ...(override.lineHeight&&appearance.lineHeight>0?{lineHeight:appearance.lineHeight}:{}),
                textAlign:customized?appearance.align:'left'}}>
                {customized&&appearance.labelText?appearance.labelText:item.text}
              </Text>
          }</InspectableTarget>
        </View>
        {enabled?<Pressable accessibilityLabel="編輯新增元件文字內容" accessibilityRole="button"
          onPress={()=>onWrench(item.id)} style={styles.miniWrench}><Text style={{fontSize:15}}>✎</Text></Pressable>:null}
      </View>
    </View>;
  })}</>;
}
const styles=StyleSheet.create({
  dock:{height:'47%',minHeight:245,borderTopWidth:2,paddingHorizontal:12,paddingTop:8},
  compactRow:{borderWidth:1,borderRadius:9,paddingHorizontal:10,paddingVertical:8,flexDirection:'row',alignItems:'center',gap:8},
  sectionCard:{width:'48%',minHeight:76,borderWidth:1,borderRadius:10,padding:11,justifyContent:'center'},
  head:{flexDirection:'row',alignItems:'center',gap:12,paddingBottom:8},
  headline:{fontSize:14,fontWeight:'900'},hint:{fontSize:11,lineHeight:17,marginBottom:8},
  scroller:{flex:1},group:{borderWidth:1,borderRadius:9,marginBottom:6,overflow:'hidden'},
  groupTitle:{paddingVertical:10,paddingHorizontal:12,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},
  label:{fontWeight:'800',fontSize:13},toolList:{padding:10,paddingTop:2},
  small:{fontSize:11,lineHeight:16},
  toolRow:{borderWidth:1,borderColor:'#94A3B8',borderRadius:8,padding:9,flexDirection:'row',alignItems:'center',gap:8},
  detail:{padding:10,marginTop:8,borderRadius:8},
  actions:{flexDirection:'row',gap:10,paddingVertical:9,borderTopWidth:1},
  action:{flex:1,minHeight:43,alignItems:'center',justifyContent:'center',borderRadius:9},
  input:{borderWidth:1,borderRadius:7,minHeight:43,paddingHorizontal:10},
  choice:{borderWidth:1,paddingVertical:7,paddingHorizontal:10,borderRadius:8},
  stepper:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginTop:8},
  step:{width:40,height:38,alignItems:'center',justifyContent:'center',borderRadius:8,backgroundColor:'#DFEAFE'},
  miniWrench:{padding:5,minWidth:35,minHeight:35,alignItems:'center',justifyContent:'center'},
});
