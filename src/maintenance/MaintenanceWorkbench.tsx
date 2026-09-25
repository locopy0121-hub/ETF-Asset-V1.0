import {useEffect,useState} from 'react';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Alert,Pressable,ScrollView,StyleSheet,Switch,Text,TextInput,View} from 'react-native';
import {ColorPalettePicker} from '../components/ColorPalettePicker';
import type {FrameEditorConfig} from '../editor/pageEditor';
import {useThemeRuntime} from '../theme/ThemeRuntime';
import {CENTRAL_COMPONENT_LIBRARY,type MaintenanceInstance} from './componentLibrary';
import {ENGINEER_SKILLS,type SkillTool} from './skillTree';
import {mergeTargetAppearance,targetToolSupported,type TargetKind,type TargetOverride} from './inspectionModel';
import type {MaintenanceSession} from './MaintenanceRuntime';
import {DEFAULT_HOLDING_WALL_CONFIG} from '../domain/uiModels';
import {DEFAULT_ETF_BADGES} from '../domain/etfBadges';
import {DEFAULT_PORTFOLIO_LIST} from '../domain/portfolioList';
import {HoldingMarketWallEditor} from '../components/HoldingMarketWallEditor';
import {EtfBadgeEditor} from '../components/EtfBadgeEditor';
import {PortfolioListEditor} from '../components/PortfolioListEditor';
import {useMaintenance} from './MaintenanceRuntime';
import {SpatialToolDetails} from './SpatialEditor';

// This is a dock beneath the ACTUAL page, not a simulated preview modal.
export function MaintenanceWorkbench(){
  const maintenance=useMaintenance();
  const theme=useThemeRuntime();
  const insets=useSafeAreaInsets();
  const session=maintenance.session;
  const [openSkill,setOpenSkill]=useState<string|null>(null);
  const [openTool,setOpenTool]=useState<string|null>(null);
  const [showAllSkills,setShowAllSkills]=useState(true); // all 16 B groups are always discoverable by default
  const [saving,setSaving]=useState(false);
  useEffect(()=>{
    setOpenSkill(session?.scope==='target'?session.target?.kind==='quote-card'?'colors':
      session.target?.kind==='portfolio-list'||session.target?.kind==='wall'?'data':
      session.target?.kind==='control'?'conditions':'typography':null);
    setOpenTool(null);setShowAllSkills(true);
  },[session?.page,session?.frameKey,session?.instanceId,session?.target?.id]);
  if(!session)return null;
  const focused=session.scope==='instance'?session.instanceId:session.focusInstanceId;
  const instance=session.draftInstances.find(item=>item.id===focused);
  const selectedTarget=session.scope==='target'?session.target:undefined;
  const pendingSelection=maintenance.selection?.page===session.page&&maintenance.selection.frameKey===session.frameKey?maintenance.selection:null;
  // The engineer retains every skill. Present applicable tools first for THIS selected A-layer.
  const displaySkills=ENGINEER_SKILLS.map(group=>({...group,
    tools:showAllSkills?group.tools:group.tools.filter(tool=>toolUsable(tool,session)),
  })).filter(group=>showAllSkills||group.tools.length>0);
  const applicableCount=ENGINEER_SKILLS.flatMap(group=>group.tools).filter(tool=>toolUsable(tool,session)).length;
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
      <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:10,marginBottom:7}}>
        <Text style={[styles.hint,{color:theme.palette.textSecondary,flex:1,marginBottom:0}]}>
          {showAllSkills?'全部技能樹（未適配工具清楚標示）':`目前可用 ${applicableCount} 種工具；與當前元件無關的工具先收起。`}
        </Text>
        <Pressable accessibilityRole="button" accessibilityLabel={showAllSkills?'只顯示適用技能':'查看全部維護技能'}
          onPress={()=>{setShowAllSkills(value=>!value);setOpenTool(null);}}
          style={[styles.choice,{borderColor:theme.palette.primary}]}>
          <Text style={{color:theme.palette.primary,fontWeight:'800',fontSize:12}}>{showAllSkills?'適用技能':'全部技能'}</Text>
        </Pressable>
      </View>
      {pendingSelection&&session.scope!=='target'?<Text style={[styles.hint,{color:theme.palette.primary}]}>已選取 {pendingSelection.label}，點上方小扳手讀取其目前設定。</Text>:null}
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
  if(f.startsWith('target:'))return s.scope==='target'&&!!s.target&&targetToolSupported(s.target.kind,f);
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
  if(tool.field?.startsWith('workspace:')||['target:xy','target:dimensions','target:anchors'].includes(tool.field??''))
    return <SpatialToolDetails field={tool.field!} />;
  if(!toolUsable(tool,s))return <Text style={{fontSize:12,color:theme.palette.textSecondary,marginTop:8}}>
    {tool.status!=='ready'?'完整技能已登記，但此工具尚未介接 Runtime。':
      tool.field?.startsWith('page:')&&s.target?.kind==='quote-card'?'這是本頁共用設定。請點外層行情框架大扳手後使用，避免意外改動其他卡片。':
      tool.field?.startsWith('target:')?'請先輕點工作區的內部元件，再點小扳手進入專屬編輯。':'這是其他工作層級的工具，請使用對應扳手呼叫。'}
  </Text>;
  if(tool.field?.startsWith('target:')){
    const target=s.target;
    if(!target)return null;
    const fieldName=tool.field.slice(7);
    const key=fieldName as keyof TargetOverride;
    const current=mergeTargetAppearance(target.base,maint.getTargetOverride(target.page,target.frameKey,target.id));
    if(fieldName==='inspect')return <View style={{marginTop:8,gap:4}}>{target.properties.map(row=><Text key={row.name}
      style={{fontSize:12,color:theme.palette.text}}>{row.name}：{row.value}{row.readOnly?'（唯讀）':''}</Text>)}</View>;
    const v=current[key];
    const change=(value:unknown)=>maint.patchTarget(target.id,{[key]:value} as TargetOverride);
    if(typeof v==='boolean')return <View style={{flexDirection:'row',alignItems:'center',gap:12,marginTop:8}}>
      <Text style={{color:theme.palette.text}}>{v?'開啟':'關閉'}</Text><Switch value={v} onValueChange={change}/>
    </View>;
    if(key==='labelText'||key==='captionText')return <TextInput value={String(v)}
      onChangeText={change} maxLength={120} placeholder="留空沿用 App 原始文字"
      style={[styles.input,{borderColor:theme.palette.border,color:theme.palette.text}]}/>;
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
      const toggles:Record<string,'textProfitColor'|'labelProfitColor'|'captionProfitColor'|'backgroundProfitColor'|'borderProfitColor'>={
        textColor:'textProfitColor',labelColor:'labelProfitColor',captionColor:'captionProfitColor',
        backgroundColor:'backgroundProfitColor',borderColor:'borderProfitColor',
      };
      const profitFlag=toggles[fieldName];
      return <ColorPalettePicker label={tool.label} value={v} onChange={change}
        profitColorEnabled={profitFlag?Boolean(current[profitFlag]):undefined}
        onProfitColorChange={profitFlag?value=>maint.patchTarget(target.id,{[profitFlag]:value}):undefined}/>;
    }
    if(typeof v==='number'){
      const range:Record<string,[number,number,number]>={
        fontSize:[8,48,1],labelFontSize:[8,32,1],captionFontSize:[8,30,1],borderWidth:[0,8,1],
        borderRadius:[0,48,2],padding:[0,32,2],opacity:[0,1,.05],
      };
      const [min,max,step]=range[key]??[0,100,1];
      return <View style={styles.stepper}>
        <Pressable onPress={()=>change(Math.max(min,Number((v-step).toFixed(2))))} style={styles.step}><Text style={{color:theme.palette.primary,fontWeight:'900'}}>−</Text></Pressable>
        <Text style={{color:theme.palette.text,fontWeight:'800'}}>{step<1?Math.round(v*100)+'%':String(v)}</Text>
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
    if(s.scope==='instance')return <Text style={{color:theme.palette.textSecondary}}>請從外層框架的扳手新增元件。</Text>;
    if(tool.id==='install')return <View style={{gap:8,marginTop:8}}>
      {CENTRAL_COMPONENT_LIBRARY.map(template=><Pressable key={template.id} accessibilityRole="button" disabled={template.installation!=='ready'||s.draftInstances.length>=30} onPress={()=>maint.install(template.id)} style={[styles.toolRow,{opacity:template.installation==='ready'?1:.55}]}>
        <View style={{flex:1}}><Text style={{color:theme.palette.text,fontWeight:'700'}}>{template.label}</Text><Text style={{color:theme.palette.textSecondary,fontSize:11}}>{template.description}</Text></View>
        <Text style={{fontSize:12,color:theme.palette.primary}}>{template.installation==='ready'?'新增':'待介接'}</Text>
      </Pressable>)}
    </View>;
    if(tool.id==='remove')return <View style={{gap:8,marginTop:8}}>{s.draftInstances.map(item=><Pressable key={item.id} onPress={()=>maint.remove(item.id)} style={styles.toolRow}><Text style={{flex:1,color:theme.palette.text}}>{item.text||item.templateId}</Text><Text style={{color:'#D43D4F'}}>移除</Text></Pressable>)}</View>;
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
      profitColorEnabled={toggle?Boolean(s.draft[toggle]):undefined}
      onProfitColorChange={toggle?value=>maint.patchFrame({[toggle]:value}):undefined}/>;
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

export function InstalledFrameComponents({instances,onWrench,enabled,activeId}:{
  instances:readonly MaintenanceInstance[];onWrench:(id:string)=>void;enabled:boolean;activeId?:string|undefined;
}){
  const theme=useThemeRuntime();
  return <>{instances.filter(item=>item.visible||item.id===activeId).map(item=><View key={item.id} style={{marginTop:item.marginTop,borderWidth:item.id===activeId?2:0,borderStyle:'dashed',borderColor:theme.palette.primary,padding:item.id===activeId?4:0}}>
    <View style={{flexDirection:'row',alignItems:'center',gap:6}}>
      <View style={{flex:1}}>
        {item.templateId==='divider'?<View style={{height:1,backgroundColor:theme.palette.border,marginVertical:7}}/>:
        <Text style={{fontSize:item.fontSize,color:item.color,fontWeight:item.templateId==='section-label'?'800':'400'}}>{item.text}</Text>}
      </View>
      {enabled?<Pressable accessibilityLabel="呼叫此元件維護工程師" accessibilityRole="button" onPress={()=>onWrench(item.id)} style={styles.miniWrench}><Text style={{fontSize:15}}>🔧</Text></Pressable>:null}
    </View>
  </View>)}</>;
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
