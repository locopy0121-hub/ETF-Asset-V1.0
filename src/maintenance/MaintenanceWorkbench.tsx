import {useEffect,useState} from 'react';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Alert,Pressable,ScrollView,StyleSheet,Switch,Text,TextInput,View} from 'react-native';
import {ColorPalettePicker} from '../components/ColorPalettePicker';
import {colorWithAlpha} from './frameEffects';
import {FrameDimensionsToolDetails} from './FrameDimensionsToolDetails';
import type {FrameEditorConfig} from '../editor/pageEditor';
import {useThemeRuntime} from '../theme/ThemeRuntime';
import {CENTRAL_COMPONENT_LIBRARY,isEngineerOwnedInstance,type MaintenanceInstance} from './componentLibrary';
import {ENGINEER_SKILLS,type SkillTool} from './skillTree';
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

// This is a dock beneath the ACTUAL page, not a simulated preview modal.
export function MaintenanceWorkbench(){
  const maintenance=useMaintenance();
  const theme=useThemeRuntime();
  const insets=useSafeAreaInsets();
  const session=maintenance.session;
  const [openSkill,setOpenSkill]=useState<string|null>(null);
  const [openTool,setOpenTool]=useState<string|null>(null);
  const [saving,setSaving]=useState(false);
  useEffect(()=>{
    setOpenSkill(session?.scope==='target'?session.target?.kind==='quote-card'?'colors':
      session.target?.kind==='portfolio-list'||session.target?.kind==='wall'?'data':
      session.target?.kind==='control'?'conditions':'typography':null);
    setOpenTool(null);
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
    'App 原生功能、既有元件及來源資料禁止刪除；僅維護工程師新增的獨立實例可移除。';
  // Always show ONE complete central skill tree. Unadapted tools explain their adapter state.
  const displaySkills=ENGINEER_SKILLS;
  const selectSkill=(id:string)=>{setOpenSkill(current=>current===id?null:id);setOpenTool(null);};
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
        <Text style={[styles.headline,{color:theme.palette.text}]}>🔧 駐點維護工程師 · {selectedTarget?.label??session.title}</Text>
        <Text style={{color:theme.palette.textSecondary,fontSize:11}}>A 已指定：{selectedTarget?'內部元件':session.scope==='frame'?'框架':'新增元件'}｜B 技能 → C 工具 → D 細節</Text>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel="取消本次編輯" onPress={cancel}><Text style={{fontWeight:'800',color:theme.palette.textSecondary}}>關閉</Text></Pressable>
    </View>
    <ScrollView style={styles.scroller} nestedScrollEnabled keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator>
      <Text style={[styles.hint,{color:theme.palette.textSecondary}]}>中央完整技能樹｜所有技能可查閱；尚未介接的項目明確標示，絕不依元件種類隱藏整類工具。</Text>
      <View accessibilityRole="summary" style={[styles.detail,{
        backgroundColor:theme.palette.surfaceMuted,borderColor:theme.palette.border,borderWidth:1,
        marginTop:0,marginBottom:10,gap:6,
      }]}>
        <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}>
          <Text style={[styles.label,{color:theme.palette.text}]}>🔒 鎖定資訊｜資料唯讀</Text>
          <Text style={{fontSize:11,color:theme.palette.primary,fontWeight:'800'}}>資料不變・顯示可編</Text>
        </View>
        <Text style={{color:theme.palette.textSecondary,fontSize:12}}>{lockedDescription}</Text>
        <Text style={{fontSize:12,color:theme.palette.text}}>目前對象：{selectedTarget?.label??instance?.text??session.title}</Text>
        {protectedProperties.map((row,index)=><View key={row.name+'-'+index} style={{flexDirection:'row',gap:8,justifyContent:'space-between'}}>
          <Text style={{fontSize:11,color:theme.palette.textSecondary,flex:1}}>{row.name}</Text>
          <Text selectable style={{fontSize:11,color:theme.palette.text,fontWeight:'700',flex:1,textAlign:'right'}}>{row.value} 🔒</Text>
        </View>)}
        <Text style={{fontSize:11,color:theme.palette.textSecondary}}>
          {instance?canDeleteFocused?'新增元件（可在確認後移除）':'原生／不明來源：不可移除':
            '內建框架、原生數值、行情、股息、操作元件均保留。'}
        </Text>
      </View>
      {pendingSelection&&session.scope!=='target'?<Text style={[styles.hint,{color:theme.palette.primary}]}>已選取 {pendingSelection.label}，點上方小扳手讀取其目前設定。</Text>:null}
      {(selectedTarget||session.scope==='instance'&&instance)?<View style={{marginBottom:8,padding:10,borderWidth:1,borderRadius:9,borderColor:theme.palette.border,gap:8}}>
        <Text style={{color:theme.palette.text,fontWeight:'700'}}>同類元件外觀同步</Text>
        <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}>
          <Text style={{flex:1,color:theme.palette.textSecondary,fontSize:12}}>套用後同步本次修改的同類外觀；新增元件的字號、文字色及父框架材質亦可同步。文字內容、尺寸、位置及資料不連動。</Text>
          <Switch value={session.syncSameKind} onValueChange={maintenance.setSyncSameKind}/>
        </View>
        {session.syncSameKind?<View style={{flexDirection:'row',gap:6,flexWrap:'wrap'}}>
          {([['frame','同框架'],['page','本頁'],['app','全 App']] as const).map(([scope,label])=><Pressable key={scope}
            accessibilityRole="button" accessibilityLabel={'同步範圍 '+label}
            onPress={()=>maintenance.setSyncScope(scope)}
            style={[styles.choice,{borderColor:theme.palette.primary,
              backgroundColor:session.syncScope===scope?theme.palette.primary:theme.palette.surface}]}>
            <Text style={{color:session.syncScope===scope?'#FFFFFF':theme.palette.text,fontSize:12}}>{label}</Text>
          </Pressable>)}
        </View>:null}
        <Text style={{color:theme.palette.textSecondary,fontSize:11}}>預設僅同步本框架同類元件；跨頁或全 App 需明確選擇。</Text>
      </View>:null}
      {selectedTarget?<View style={[styles.detail,{backgroundColor:theme.palette.surfaceMuted,marginBottom:8}]}>
        <Text style={[styles.label,{color:theme.palette.text}]}>App 即時元件檢視｜{selectedTarget.label}</Text>
        {selectedTarget.properties.map(row=><View key={row.name} style={{flexDirection:'row',justifyContent:'space-between',gap:8,marginTop:6}}>
          <Text style={[styles.small,{color:theme.palette.textSecondary,flex:1}]}>{row.name}</Text>
          <Text style={[styles.small,{color:theme.palette.text,textAlign:'right',flex:1}]} numberOfLines={2}>{row.value}{row.readOnly?' 🔒':''}</Text>
        </View>)}
        <Text style={[styles.small,{color:theme.palette.textSecondary,marginTop:7}]}>資料值唯讀；下方工具修改顯示屬性或本頁設定，不修改來源帳務。</Text>
      </View>:null}
      {displaySkills.map(skillItem=><View key={skillItem.id} style={[styles.group,{borderColor:theme.palette.border}]}>
        <Pressable accessibilityRole="button" onPress={()=>selectSkill(skillItem.id)} style={styles.groupTitle}>
          <Text style={[styles.label,{color:theme.palette.text}]}>{skillItem.label}</Text>
          <Text style={{color:theme.palette.primary}}>{openSkill===skillItem.id?'⌄':'›'}</Text>
        </Pressable>
        {openSkill===skillItem.id?<View style={styles.toolList}>
          <Text style={[styles.small,{color:theme.palette.textSecondary}]}>{skillItem.description}</Text>
          {skillItem.tools.map(tool=><View key={tool.id} style={{marginTop:8}}>
            <Pressable accessibilityRole="button" onPress={()=>setOpenTool(current=>current===tool.id?null:tool.id)} style={styles.toolRow}>
              <Text style={{flex:1,color:theme.palette.text,fontSize:13,fontWeight:'600'}}>{tool.label}</Text>
              <Text style={{color:toolUsable(tool,session)?theme.palette.primary:theme.palette.textSecondary,fontSize:11}}>{tool.status!=='ready'?'待接入 ›':toolUsable(tool,session)?'細節 ›':'目前對象不適用 ›'}</Text>
            </Pressable>
            {openTool===tool.id?<View style={[styles.detail,{backgroundColor:theme.palette.surfaceMuted}]}>
              <Text style={[styles.small,{color:theme.palette.textSecondary}]}>{tool.detail}</Text>
              <ScopedToolDetails tool={tool} instance={instance}/>
            </View>:null}
          </View>)}
        </View>:null}
      </View>)}
      <View style={{height:16}}/>
    </ScrollView>
    <View style={[styles.actions,{borderTopColor:theme.palette.border}]}>
      <Pressable onPress={cancel} style={[styles.action,{borderColor:theme.palette.border,borderWidth:1}]}><Text style={{fontWeight:'800',color:theme.palette.text}}>取消／恢復</Text></Pressable>
      <Pressable onPress={()=>void apply()} disabled={saving} style={[styles.action,{backgroundColor:theme.palette.primary,opacity:saving?.5:1}]}>
        <Text style={{fontWeight:'800',color:'#FFFFFF'}}>{saving?'儲存中…':'儲存／套用'}</Text>
      </Pressable>
    </View>
  </View>;
}

const isQuoteFrame=(s:MaintenanceSession)=>s.frameKey==='holding-quotes'||s.frameKey==='holding-view';
function toolUsable(tool:SkillTool,s:MaintenanceSession):boolean {
  if(tool.status!=='ready')return false;
  const f=tool.field??'';
  if(f.startsWith('workspace:'))return true;
  if(f==='frame:size')return s.scope==='frame';
  if(f.startsWith('framefx:'))return s.scope==='frame';
  if(f==='instance:sync')return s.scope==='instance'&&s.draftInstances.some(item=>item.id===s.instanceId&&isEngineerOwnedInstance(item));
  if(f==='instance:parent-size')return s.scope==='instance'&&s.draftInstances.some(item=>item.id===s.instanceId&&item.templateId==='parent-frame'&&isEngineerOwnedInstance(item));
  if(f==='instances')return s.scope==='frame'||s.scope==='instance'&&
    s.draftInstances.some(item=>item.id===s.instanceId&&isEngineerOwnedInstance(item)&&
      (tool.id==='remove'||tool.id==='install'&&item.templateId==='parent-frame'));
  if(f.startsWith('target:')){
    if(s.scope==='target')return !!s.target&&targetToolSupported(s.target.kind,f);
    const instance=s.scope==='instance'?s.draftInstances.find(item=>item.id===s.instanceId&&isEngineerOwnedInstance(item)):undefined;
    if(!instance)return false;
    if(['target:xy','target:dimensions','target:anchors','target:offsetX','target:offsetY',
      'target:anchorX','target:anchorY','target:width','target:height'].includes(f))return false;
    const kind:TargetKind=instance.templateId==='parent-frame'?'frame':instance.templateId==='divider'?'generic':'text';
    return targetToolSupported(kind,f);
  }
  if(f.startsWith('page:')){
    if(s.scope==='target')return !!s.target&&targetToolSupported(s.target.kind,f);
    if(s.scope!=='frame')return false;
    if(f==='page:list')return s.page==='portfolio'&&s.frameKey==='holding-view';
    return isQuoteFrame(s);
  }
  if(s.scope==='target')return f==='session';
  if(s.scope==='instance')return f==='session'||['instance-text','visible','titleFontSize','titleColor','padding'].includes(f);
  return true;
}
function ScopedToolDetails({tool,instance}:{tool:SkillTool;instance?:MaintenanceInstance|undefined}){
  const maint=useMaintenance();
  const theme=useThemeRuntime();
  const s=maint.session;
  if(!s)return null;
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
    {tool.status!=='ready'?'完整技能已登記，但此工具尚未介接 Runtime。':
      tool.field?.startsWith('page:')&&s.target?.kind==='quote-card'?'這是本頁共用設定。請點外層行情框架大扳手後使用，避免意外改動其他卡片。':
      tool.field?.startsWith('target:')?'請先輕點工作區的內部元件，再點小扳手進入專屬編輯。':'這是其他工作層級的工具，請使用對應扳手呼叫。'}
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
  input:{borderWidth:1,borderRadius:7,marginTop:8,minHeight:46,paddingHorizontal:8},
  choice:{borderWidth:1,paddingVertical:7,paddingHorizontal:10,borderRadius:8},
  stepper:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginTop:8},
  step:{width:40,height:38,alignItems:'center',justifyContent:'center',borderRadius:8,backgroundColor:'#DFEAFE'},
  miniWrench:{padding:5,minWidth:35,minHeight:35,alignItems:'center',justifyContent:'center'},
});
