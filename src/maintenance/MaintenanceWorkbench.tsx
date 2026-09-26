import {useEffect,useRef,useState} from 'react';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Alert,Pressable,ScrollView,StyleSheet,Switch,Text,TextInput,View} from 'react-native';
import {ColorPalettePicker} from '../components/ColorPalettePicker';
import {colorWithAlpha,normalizeFrameEffects} from './frameEffects';
import {FrameDimensionsToolDetails} from './FrameDimensionsToolDetails';
import type {FrameEditorConfig} from '../editor/pageEditor';
import {useThemeRuntime} from '../theme/ThemeRuntime';
import {CENTRAL_COMPONENT_LIBRARY,isEngineerOwnedInstance,type MaintenanceInstance} from './componentLibrary';
import type {SkillTool} from './skillTree';
import {COMPLETE_ENGINEER_SKILLS} from './fullSkillCatalog';
import {searchAbProperties,findAbProperty,AB_PROPERTY_GROUPS} from './abPropertyModel';
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
import {BatchVisualToolDetails,LocalVisualDiffToolDetails,FrameHealthToolDetails,DesignTokenToolDetails,FavoriteToolDetails} from './AdvancedEngineerTools';
import {FrameEffectsToolDetails} from './FrameEffectsToolDetails';
import {InspectableTarget} from './InspectableTarget';
import {TARGET_APPEARANCE,type FrameMaintenanceContext,type InspectedTarget} from './inspectionModel';

// AB law: A = one actual frame/component, B = its property, C = the
// direct control of that property. Never add an extra skill-classification page.
export function MaintenanceWorkbench(){
  const maintenance=useMaintenance(),theme=useThemeRuntime(),insets=useSafeAreaInsets();
  const session=maintenance.session;
  const [openB,setOpenB]=useState<string|null>(null);
  const [openC,setOpenC]=useState<string|null>(null);
  const [moreColor,setMoreColor]=useState(false);
  const [query,setQuery]=useState('');
  const [favoritesOnly,setFavoritesOnly]=useState(false);
  const [saving,setSaving]=useState(false);
  const scroller=useRef<ScrollView>(null);
  useEffect(()=>{
    setOpenB(null);setOpenC(null);setMoreColor(false);setQuery('');setFavoritesOnly(false);
  },[session?.page,session?.frameKey,session?.scope,session?.instanceId,session?.target?.id]);
  if(!session)return null;
  const focused=session.scope==='instance'?session.instanceId:session.focusInstanceId;
  const instance=session.draftInstances.find(item=>item.id===focused);
  const selectedTarget=session.scope==='target'?session.target:undefined;
  const label=selectedTarget?.label??instance?.text??session.title;
  const visibleB=searchAbProperties(query).filter(group=>!favoritesOnly||group.tools.some(tool=>maintenance.assets.favorites.includes(tool.id)));
  const selectedB=openB?findAbProperty(openB):undefined;
  const canDeleteFocused=Boolean(instance&&isEngineerOwnedInstance(instance)&&session.scope==='instance');
  const protectedProperties=selectedTarget?.properties.filter(row=>row.readOnly)??[];
  const lockedDescription=selectedTarget?.kind==='value'||selectedTarget?.kind==='metric'||selectedTarget?.kind==='prefix'?
    '原始交易、金額、公式及資料來源鎖定；文字、框架及顯示特效不會改寫數值。':
    '僅原始數據、來源及帳務計算鎖定；其他文字、框架、外觀及排版都可編輯。內建元件保留，僅工程師新增實例可刪除。';
  const showLock=()=>Alert.alert('A｜資料保護',lockedDescription+
    (protectedProperties.length?'\n\n'+protectedProperties.map(row=>row.name+'：'+row.value+' 🔒').join('\n'):'')+
    (instance?canDeleteFocused?'\n\n這個新增元件可安全移除。':'\n\n內建元件不可刪除。':''));
  const toTop=()=>scroller.current?.scrollTo({y:0,animated:false});
  const chooseB=(id:string)=>{setOpenB(id);setOpenC(null);setMoreColor(false);toTop();};
  const backToB=()=>{setOpenB(null);setOpenC(null);setMoreColor(false);toTop();};
  const navigateToFavorite=(toolId:string)=>{
    const owner=AB_PROPERTY_GROUPS.find(group=>group.tools.some(tool=>tool.id===toolId));
    if(!owner)return;
    setOpenB(owner.id);setOpenC(toolId);setMoreColor(owner.id==='color');toTop();
    maintenance.noteToolUsed(toolId);
  };
  const apply=async()=>{
    if(saving)return;
    setSaving(true);
    const success=await maintenance.apply();
    setSaving(false);
    if(!success)Alert.alert('儲存失敗','設定尚未套用，請檢查儲存空間後重試。');
  };
  const cancel=()=>maintenance.cancel();
  const tools=selectedB?.tools.filter(tool=>
    !(selectedB.id==='layout'&&
      (session.scope==='frame'&&tool.id==='frame-size'||
       session.scope==='instance'&&instance?.templateId==='parent-frame'&&tool.id==='parent-size')))??[];
  return <View style={[styles.dock,{backgroundColor:theme.palette.surface,borderTopColor:theme.palette.primary,paddingBottom:Math.max(12,insets.bottom)}]}>
    <View style={styles.head}>
      <View style={{flex:1}}>
        <Text style={[styles.headline,{color:theme.palette.text}]} numberOfLines={1}>A｜{label}</Text>
        <Text style={[styles.small,{color:theme.palette.textSecondary}]} numberOfLines={1}>
          {selectedB?'B｜'+selectedB.label+' → C｜直接編輯':'B｜選擇要修改的屬性'}
        </Text>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel="查看資料保護" onPress={showLock} style={{padding:8}}>
        <Text style={{color:theme.palette.primary}}>🔒</Text>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="關閉並取消編輯" onPress={cancel} style={{padding:5}}>
        <Text style={{fontWeight:'800',color:theme.palette.textSecondary}}>關閉</Text>
      </Pressable>
    </View>
    <ScrollView ref={scroller} style={styles.scroller} nestedScrollEnabled keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      {selectedB?<View style={{gap:7}}>
        <Pressable accessibilityRole="button" accessibilityLabel="返回 B 屬性" onPress={backToB}
          style={[styles.compactRow,{borderColor:theme.palette.border}]}>
          <Text style={{color:theme.palette.primary,fontSize:13}}>‹ B｜返回屬性</Text>
          <Text style={{flex:1,color:theme.palette.text,fontWeight:'800',textAlign:'right'}}>{selectedB.label}</Text>
        </Pressable>
        {selectedB.id==='length'||selectedB.id==='width'?
          <View style={{paddingTop:3}}>
            <Text style={[styles.label,{color:theme.palette.text}]}>C｜大小</Text>
            <AbDimensionControl axis={selectedB.id==='length'?'height':'width'} instance={instance}/>
          </View>:selectedB.id==='color'?<View>
            <AbColorControls instance={instance}/>
            <Pressable accessibilityRole="button" accessibilityLabel="更多顏色與背景控制"
              onPress={()=>{setMoreColor(x=>!x);setOpenC(null);}}
              style={[styles.compactRow,{borderColor:theme.palette.border,marginTop:10}]}>
              <Text style={{color:theme.palette.text,flex:1}}>C｜更多顏色與背景控制</Text>
              <Text style={{color:theme.palette.primary}}>{moreColor?'收合 ⌃':'展開 ›'}</Text>
            </Pressable>
            {moreColor?<AbToolControls tools={tools} openC={openC} onChangeC={setOpenC} onOpenTool={navigateToFavorite} instance={instance}/>:null}
          </View>:<AbToolControls tools={tools} openC={openC} onChangeC={setOpenC} onOpenTool={navigateToFavorite} instance={instance}/>}
      </View>:<View>
        <TextInput accessibilityLabel="搜尋 B 屬性與 C 控制" value={query} onChangeText={setQuery}
          placeholder="搜尋屬性或功能…" placeholderTextColor={theme.palette.textSecondary}
          style={[styles.input,{borderColor:theme.palette.border,color:theme.palette.text,marginBottom:8}]}/>
        <View style={{flexDirection:'row',alignItems:'center',gap:8,marginBottom:8}}>
          <Pressable accessibilityRole="button" accessibilityState={{selected:favoritesOnly}}
            accessibilityLabel="B 屬性只顯示收藏工具" onPress={()=>setFavoritesOnly(value=>!value)}
            style={{borderColor:theme.palette.border,borderWidth:1,borderRadius:8,padding:6}}>
            <Text style={{color:favoritesOnly?theme.palette.primary:theme.palette.textSecondary,fontSize:12,fontWeight:'700'}}>
              {favoritesOnly?'★ 收藏中':'☆ 僅收藏'}
            </Text>
          </Pressable>
          <Text style={{fontSize:11,color:theme.palette.textSecondary}} numberOfLines={1}>按 C 工具右側星號即可收藏</Text>
        </View>
        <View style={{flexDirection:'row',flexWrap:'wrap',justifyContent:'space-between',rowGap:7}}>
          {visibleB.map(group=><Pressable key={group.id} accessibilityRole="button"
            accessibilityLabel={'B '+group.label} onPress={()=>chooseB(group.id)}
            style={[styles.bSkillCard,{borderColor:theme.palette.border,backgroundColor:theme.palette.surfaceMuted}]}>
            <Text style={{color:theme.palette.text,fontSize:13,fontWeight:'800',textAlign:'center'}}>{group.label}</Text>
          </Pressable>)}
        </View>
        {!visibleB.length?<Text style={[styles.hint,{color:theme.palette.textSecondary}]}>沒有符合的屬性，請調整搜尋內容。</Text>:null}
      </View>}
      <View style={{height:8}}/>
    </ScrollView>
    <View style={[styles.actions,{borderTopColor:theme.palette.border}]}>
      <Pressable onPress={cancel} accessibilityRole="button" accessibilityLabel="取消全部暫存變更"
        style={[styles.action,{borderColor:theme.palette.border,borderWidth:1}]}>
        <Text style={{fontWeight:'800',color:theme.palette.text}}>取消／恢復</Text>
      </Pressable>
      <Pressable onPress={()=>void apply()} disabled={saving} accessibilityRole="button" accessibilityLabel="儲存套用"
        style={[styles.action,{backgroundColor:theme.palette.primary,opacity:saving?.5:1}]}>
        <Text style={{fontWeight:'800',color:'#FFFFFF'}}>{saving?'儲存中…':'儲存／套用'}</Text>
      </Pressable>
    </View>
  </View>;
}

// C never opens a second catalog page. The current tool's native controls appear
// immediately below its C row; only deeper native options need their own dialog.
function AbToolControls({tools,openC,onChangeC,onOpenTool,instance}:{
  tools:readonly SkillTool[];openC:string|null;onChangeC:(id:string|null)=>void;
  onOpenTool:(id:string)=>void;instance?:MaintenanceInstance|undefined;
}){
  const theme=useThemeRuntime(),maintenance=useMaintenance();
  const session=maintenance.session;
  if(!session)return null;
  const ordered=[...tools].sort((a,b)=>Number(maintenance.assets.favorites.includes(b.id))-Number(maintenance.assets.favorites.includes(a.id)));
  return <View style={{gap:6}}>
    {ordered.map(tool=><View key={tool.id}>
      <View style={{flexDirection:'row',alignItems:'center',gap:5}}>
        <Pressable accessibilityRole="button" accessibilityLabel={'C '+tool.label}
          accessibilityState={{expanded:openC===tool.id}}
          onPress={()=>{if(openC!==tool.id)maintenance.noteToolUsed(tool.id);onChangeC(openC===tool.id?null:tool.id);}}
          style={[styles.compactRow,{borderColor:theme.palette.border,minHeight:44,flex:1}]}>
          <Text style={{flex:1,color:theme.palette.text,fontSize:12,fontWeight:'700'}}>{tool.label}</Text>
          <Text style={{fontSize:11,color:toolUsable(tool,session)?theme.palette.primary:theme.palette.textSecondary}}>
            {tool.status!=='ready'?'待實作 ›':toolUsable(tool,session)?openC===tool.id?'收合 ⌃':'設定 ›':'待適配 ›'}
          </Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={(maintenance.assets.favorites.includes(tool.id)?'取消收藏 ':'收藏 ')+tool.label}
          disabled={!maintenance.assetsLoaded} onPress={()=>void maintenance.toggleFavoriteTool(tool.id)}
          style={{padding:9,minWidth:40,alignItems:'center'}}>
          <Text style={{fontSize:20,color:maintenance.assets.favorites.includes(tool.id)?theme.palette.primary:theme.palette.textSecondary}}>
            {maintenance.assets.favorites.includes(tool.id)?'★':'☆'}
          </Text>
        </Pressable>
      </View>
      {openC===tool.id?<View style={[styles.detail,{backgroundColor:theme.palette.surfaceMuted,marginTop:2}]}>
        <ScopedToolDetails tool={tool} instance={instance} onOpenTool={onOpenTool}/>
      </View>:null}
    </View>)}
  </View>;
}

function AbDimensionControl({axis,instance}:{axis:'width'|'height';instance?:MaintenanceInstance|undefined}){
  const maintenance=useMaintenance(),theme=useThemeRuntime(),s=maintenance.session;
  const selectedTarget=s?.scope==='target'?s.target:undefined;
  const parent=s?.scope==='instance'&&instance?.templateId==='parent-frame'?instance:undefined;
  const override=selectedTarget?maintenance.getTargetOverride(selectedTarget.page,selectedTarget.frameKey,selectedTarget.id,selectedTarget.kind):undefined;
  const current=s?.scope==='frame'?s.draft[axis]:
    parent?(parent[axis==='width'?'frameWidth':'frameHeight']??(axis==='width'?320:240)):
    selectedTarget?(override?.[axis]??selectedTarget.geometry?.[axis]):undefined;
  const [typed,setTyped]=useState('');
  useEffect(()=>setTyped(current===undefined?'':String(current)),[current,axis,s?.frameKey,s?.instanceId,selectedTarget?.id]);
  if(!s)return null;
  if(s.scope==='frame')return <FrameDimensionsToolDetails axis={axis}/>;
  const min=axis==='width'?28:24,max=2400;
  if(!parent&&!selectedTarget||selectedTarget&&!selectedTarget.geometry)
    return <Text style={{color:theme.palette.textSecondary,fontSize:12,marginTop:6}}>
      目前元件缺少可寫入的原生尺寸量測；此控制保留，但不會假裝完成。
    </Text>;
  const change=(value:number)=>{
    const next=Math.round(Math.max(parent?(axis==='width'?160:80):min,Math.min(parent?(axis==='width'?1600:2400):max,value)));
    if(parent)maintenance.patchInstance(parent.id,{[axis==='width'?'frameWidth':'frameHeight']:next});
    else if(selectedTarget)maintenance.patchTarget(selectedTarget.id,{[axis]:next} as TargetOverride);
  };
  const n=current??(axis==='width'?320:240);
  return <View style={{gap:8,marginTop:10}}>
    <Text style={{color:theme.palette.text,fontWeight:'700'}}>C｜大小：{n} dp</Text>
    <View style={{flexDirection:'row',alignItems:'center',gap:7}}>
      <Pressable accessibilityRole="button" accessibilityLabel="減少 1" onPress={()=>change(n-1)} style={styles.step}>
        <Text style={{color:theme.palette.primary,fontWeight:'900'}}>−</Text>
      </Pressable>
      <TextInput keyboardType="number-pad" accessibilityLabel={'輸入'+(axis==='width'?'寬度':'長度')}
        value={typed} onChangeText={setTyped} selectTextOnFocus
        onEndEditing={()=>{if(/^\d{1,4}$/.test(typed))change(Number(typed));else setTyped(String(n));}}
        style={[styles.input,{flex:1,color:theme.palette.text,borderColor:theme.palette.border,textAlign:'center'}]}/>
      <Pressable accessibilityRole="button" accessibilityLabel="增加 1" onPress={()=>change(n+1)} style={styles.step}>
        <Text style={{color:theme.palette.primary,fontWeight:'900'}}>＋</Text>
      </Pressable>
    </View>
    <Text style={[styles.small,{color:theme.palette.textSecondary}]}>直接作用於 A 的實際尺寸；上方為暫存預覽，套用後才儲存。</Text>
  </View>;
}

function AbColorControls({instance}:{instance?:MaintenanceInstance|undefined}){
  const maintenance=useMaintenance(),theme=useThemeRuntime(),s=maintenance.session;
  if(!s)return null;
  const frame=s.scope==='frame';
  const target=s.scope==='target'?s.target:undefined;
  const kind=target?.kind??(instance?.templateId==='parent-frame'?'frame':instance?'text':undefined);
  const id=target?.id??(instance?'installed:'+instance.id:undefined);
  const base=target?.base??{...TARGET_APPEARANCE,backgroundColor:theme.palette.surface};
  const appearance=id&&kind?mergeTargetAppearance(base,
    maintenance.getTargetOverride(s.page,s.frameKey,id,kind)):base;
  const supported=frame||Boolean(kind&&targetToolSupported(kind,'target:backgroundMode'));
  const fx=normalizeFrameEffects(s.draft.effects);
  const currentColor=frame?s.draft.backgroundColor:appearance.backgroundColor;
  const profit=frame?Boolean(s.draft.backgroundProfitColor):Boolean(appearance.backgroundProfitColor);
  const gradient=frame?fx.backgroundMode==='gradient':appearance.backgroundMode==='gradient';
  const setColor=(next:string)=>{
    if(frame)maintenance.patchFrame({backgroundColor:next});
    else if(id&&supported)maintenance.patchTarget(id,{backgroundColor:next});
  };
  const setProfit=(next:boolean)=>{
    if(frame)maintenance.patchFrame({backgroundProfitColor:next});
    else if(id&&supported)maintenance.patchTarget(id,{backgroundProfitColor:next});
  };
  const setGradient=(next:boolean)=>{
    if(frame)maintenance.patchFrame({effects:normalizeFrameEffects({...fx,backgroundMode:next?'gradient':'solid'})});
    else if(id&&supported)maintenance.patchTarget(id,{backgroundMode:next?'gradient':'solid'});
  };
  return <View style={{gap:9,marginTop:4}}>
    <View style={[styles.compactRow,{borderColor:theme.palette.border}]}>
      <Text style={{flex:1,fontSize:13,fontWeight:'700',color:theme.palette.text}}>C｜開啟損益色</Text>
      <Switch accessibilityLabel="背景損益色" value={profit} disabled={!supported} onValueChange={setProfit}/>
    </View>
    <View style={[styles.compactRow,{borderColor:theme.palette.border}]}>
      <Text style={{flex:1,fontSize:13,fontWeight:'700',color:theme.palette.text}}>C｜開啟漸層</Text>
      <Switch accessibilityLabel="背景漸層" value={gradient} disabled={!supported} onValueChange={setGradient}/>
    </View>
    <ColorPalettePicker label="C｜背景顏色" value={currentColor} onChange={setColor}
      profitColorEnabled={profit} onProfitColorChange={setProfit}/>
    {!supported?<Text style={[styles.small,{color:theme.palette.textSecondary}]}>
      此元件的原生背景材質尚待適配，不會假裝修改成功。
    </Text>:gradient?<View style={{gap:8}}>
      <Text style={[styles.label,{color:theme.palette.text}]}>C｜漸層細節</Text>
      {frame?<View style={{gap:6}}>
        <Text style={[styles.small,{color:theme.palette.textSecondary}]}>第二漸層色</Text>
        <FrameEffectsToolDetails field="gradientEndColor"/>
        <Text style={[styles.small,{color:theme.palette.textSecondary}]}>方向</Text>
        <FrameEffectsToolDetails field="gradientDirection"/>
        <Text style={[styles.small,{color:theme.palette.textSecondary}]}>開啟第三色</Text>
        <FrameEffectsToolDetails field="gradientMidEnabled"/>
        {fx.gradientMidEnabled?<FrameEffectsToolDetails field="gradientMidColor"/>:null}
      </View>:<View style={{gap:6}}>
        {['material-end','material-direction','material-mid-enable',...(appearance.gradientMidEnabled?['material-mid']:[])].map(toolId=>{
          const tool=COMPLETE_ENGINEER_SKILLS.flatMap(group=>group.tools).find(item=>item.id===toolId);
          return tool?<View key={tool.id}><Text style={[styles.small,{color:theme.palette.textSecondary}]}>{tool.label}</Text>
            <ScopedToolDetails tool={tool} instance={instance}/></View>:null;
        })}
      </View>}
    </View>:null}
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
function ScopedToolDetails({tool,instance,onOpenTool}:{tool:SkillTool;instance?:MaintenanceInstance|undefined;onOpenTool?:((id:string)=>void)|undefined}){
  const maint=useMaintenance();
  const theme=useThemeRuntime();
  const s=maint.session;
  if(!s)return null;
  const activeTool=resolvedTool(tool,s);
  if(activeTool!==tool)return <ScopedToolDetails tool={activeTool} instance={instance} onOpenTool={onOpenTool}/>;
  if(tool.field==='maintenance:tokens')return <DesignTokenToolDetails/>;
  if(tool.field==='maintenance:favorites')return <FavoriteToolDetails onNavigate={onOpenTool}/>;
  if(tool.field==='maintenance:batch')return <BatchVisualToolDetails/>;
  if(tool.field==='maintenance:local-diff')return <LocalVisualDiffToolDetails/>;
  if(tool.field==='maintenance:health')return <FrameHealthToolDetails/>;
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
  bSkillCard:{width:'32%',minHeight:50,borderWidth:1,borderRadius:9,paddingVertical:8,paddingHorizontal:4,justifyContent:'center',alignItems:'center'},
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
