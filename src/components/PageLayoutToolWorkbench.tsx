import {useEffect,useMemo,useState} from 'react';
import {Pressable,ScrollView,StyleSheet,Switch,Text,View} from 'react-native';

import type {PageFrameDefinition} from '../domain/frameRegistry';
import type {MainPageKey} from '../domain/pageRegistry';
import {DEFAULT_HOLDING_WALL_CONFIG,type HoldingQuote,type HoldingWallConfig,type HoldingWallFieldKey} from '../domain/uiModels';
import type {FrameEditorConfig,PageDisplayConfig} from '../editor/editorModel';
import {layoutKindLabel,layoutToolProfile,type LayoutToolTargetKind} from '../editor/layoutToolModel';
import {colors,radius,spacing} from '../theme/tokens';
import {ColorPalettePicker} from './ColorPalettePicker';
import {HoldingQuoteModule} from './HoldingQuoteModule';

type Selection={id:string;kind:LayoutToolTargetKind;label:string;field?:HoldingWallFieldKey};

const numericFields:readonly HoldingWallFieldKey[]=['price','change','changePercent','pnl','roi','marketValue'];
const textFields:readonly HoldingWallFieldKey[]=['name','symbol','etfType','dividendType'];

export function PageLayoutToolWorkbench({
  pageKey,frames,draft,displayDraft,onPatchFrame,onChangeDisplay,previewQuote,
}:{
  pageKey:MainPageKey;
  frames:readonly PageFrameDefinition[];
  draft:Record<string,FrameEditorConfig>;
  displayDraft:PageDisplayConfig;
  onPatchFrame:(key:string,next:Partial<FrameEditorConfig>)=>void;
  onChangeDisplay:(next:PageDisplayConfig)=>void;
  previewQuote?:HoldingQuote|undefined;
}){
  const initial=useMemo(()=>pageKey==='home'&&frames.some(f=>f.key==='holding-quotes')?'holding-quotes':
    pageKey==='portfolio'&&frames.some(f=>f.key==='holding-view')?'holding-view':
    frames.find(f=>!f.key.includes('header'))?.key??frames[0]?.key??'page-header',[pageKey,frames]);
  const [frameKey,setFrameKey]=useState(initial);
  const [selection,setSelection]=useState<Selection>({id:'frame',kind:'frame',label:'框架'});
  const [openGroup,setOpenGroup]=useState<string|null>('size');
  useEffect(()=>{setFrameKey(initial);setSelection({id:'frame',kind:'frame',label:'框架'});setOpenGroup('size');},[initial]);
  const frame=frames.find(item=>item.key===frameKey)??frames[0];
  const frameConfig=frame?draft[frame.key]:undefined;
  if(!frame||!frameConfig)return null;
  const profile=layoutToolProfile(pageKey,frame.key);
  const holding=(pageKey==='home'&&frame.key==='holding-quotes')||(pageKey==='portfolio'&&frame.key==='holding-view');
  const wall=displayDraft.holdingWall??DEFAULT_HOLDING_WALL_CONFIG;
  const patchWall=(next:HoldingWallConfig)=>onChangeDisplay({...displayDraft,holdingWall:next});
  const patchWallStyle=(next:Partial<HoldingWallConfig['style']>)=>patchWall({...wall,style:{...wall.style,...next}});
  const selectedField=selection.field?wall.fields.find(x=>x.field===selection.field):undefined;
  const patchField=(field:HoldingWallFieldKey,next:Partial<(typeof wall.fields)[number]>)=>
    patchWall({...wall,fields:wall.fields.map(item=>item.field===field?{...item,...next}:item)});
  const chooseKind=(kind:LayoutToolTargetKind)=>{
    if(kind==='frame')setSelection({id:'frame',kind,label:'框架'});
    else if(holding&&kind==='card')setSelection({id:'card',kind,label:'行情卡片'});
    else if(holding&&kind==='text')setSelection({id:'field:name',kind,label:'名稱',field:'name'});
    else if(holding&&kind==='value')setSelection({id:'field:price',kind,label:'即時價格',field:'price'});
    else if(holding&&kind==='chart')setSelection({id:'chart',kind,label:'Mini 圖表'});
    else setSelection({id:kind,kind,label:layoutKindLabel(kind)});
    setOpenGroup(kind==='frame'?'size':kind==='card'?'card-style':kind==='text'||kind==='value'?'typography':'state');
  };
  const selectHolding=(id:string,label:string)=>{
    if(id==='card'){setSelection({id,kind:'card',label});setOpenGroup('card-style');return;}
    if(id==='chart'){setSelection({id,kind:'chart',label});setOpenGroup('state');return;}
    if(id.startsWith('field:')){
      const field=id.slice(6) as HoldingWallFieldKey;
      setSelection({id,kind:numericFields.includes(field)?'value':'text',label,field});
      setOpenGroup('typography');
    }
  };
  const toggle=(key:string)=>setOpenGroup(current=>current===key?null:key);
  return <View style={styles.root}>
    <View style={styles.head}>
      <View style={{flex:1}}><Text style={styles.title}>排版工具</Text><Text style={styles.hint}>預覽直接點選；虛線框就是目前編輯範圍。點框架只改框架，點卡片只改卡片，點文字／數值只改該內容。</Text></View>
    </View>

    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.moduleRow}>
      {frames.filter(x=>!x.key.includes('holding-detail')||pageKey==='portfolio').map(item=><Pressable key={item.key} onPress={()=>{setFrameKey(item.key);setSelection({id:'frame',kind:'frame',label:'框架'});setOpenGroup('size');}}
        style={[styles.moduleChip,item.key===frame.key&&styles.moduleChipActive]}><Text style={[styles.moduleText,item.key===frame.key&&styles.moduleTextActive]}>{item.title}</Text></Pressable>)}
    </ScrollView>

    <View style={styles.previewShell}>
      <View style={styles.previewTop}><Text style={styles.previewTitle}>{profile.label}｜真實設定預覽</Text><Text style={styles.path}>{frame.title} › {selection.label}</Text></View>
      <Pressable onPress={()=>chooseKind('frame')} style={[styles.framePreview,selection.kind==='frame'&&styles.selected]}>
        <Text style={styles.pickLabel}>框架｜{frame.title}</Text>
        {holding&&previewQuote?<HoldingQuoteModule item={previewQuote} wallConfig={wall}
          style={(displayDraft.quoteStyle??'quote') as any}
          layout="narrow" layoutEditMode layoutSelectionId={selection.id} onLayoutSelect={selectHolding}/>:<GenericPreview selection={selection} onSelect={chooseKind} kinds={profile.kinds}/>}
      </Pressable>
    </View>

    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.kindRow}>
      {profile.kinds.map(kind=><Pressable key={kind} onPress={()=>chooseKind(kind)} style={[styles.kindChip,selection.kind===kind&&styles.kindChipActive]}>
        <Text style={[styles.kindText,selection.kind===kind&&styles.kindTextActive]}>{layoutKindLabel(kind)}</Text>
      </Pressable>)}
    </ScrollView>

    {selection.kind==='frame'?<View>
      <Accordion title="尺寸" subtitle="框架第一層就是寬度與高度" open={openGroup==='size'} onPress={()=>toggle('size')}>
        <ModeStep label="寬度" value={frameConfig.width} fallback={320} min={160} max={1600} step={10}
          onAuto={()=>onPatchFrame(frame.key,{width:undefined})} onChange={width=>onPatchFrame(frame.key,{width})}/>
        <ModeStep label="高度" value={frameConfig.height} fallback={260} min={80} max={2400} step={10}
          onAuto={()=>onPatchFrame(frame.key,{height:undefined})} onChange={height=>onPatchFrame(frame.key,{height})}/>
        <NumberStep label="最小高度" value={frameConfig.minHeight??0} min={0} max={600} step={10} suffix=" px" onChange={minHeight=>onPatchFrame(frame.key,{minHeight})}/>
      </Accordion>
      <Accordion title="內距／空間" subtitle="父框架的內容安全空間" open={openGroup==='spacing'} onPress={()=>toggle('spacing')}>
        <NumberStep label="Padding" value={frameConfig.padding??16} min={0} max={32} step={1} suffix=" px" onChange={padding=>onPatchFrame(frame.key,{padding})}/>
      </Accordion>
      <Accordion title="背景／邊框" subtitle="只改目前框架" open={openGroup==='frame-look'} onPress={()=>toggle('frame-look')}>
        <ColorPalettePicker label="框架背景" value={frameConfig.backgroundColor} onChange={backgroundColor=>onPatchFrame(frame.key,{backgroundColor})}/>
        <NumberStep label="背景透明度" value={Math.round(frameConfig.backgroundOpacity*100)} min={0} max={100} step={5} suffix="%" onChange={v=>onPatchFrame(frame.key,{backgroundOpacity:v/100})}/>
        <ColorPalettePicker label="邊框" value={frameConfig.borderColor} onChange={borderColor=>onPatchFrame(frame.key,{borderColor})}/>
        <NumberStep label="邊框粗細" value={frameConfig.borderWidth} min={0} max={8} step={1} suffix=" px" onChange={borderWidth=>onPatchFrame(frame.key,{borderWidth})}/>
        <NumberStep label="圓角" value={frameConfig.borderRadius} min={0} max={48} step={2} suffix=" px" onChange={borderRadius=>onPatchFrame(frame.key,{borderRadius})}/>
      </Accordion>
    </View>:null}

    {selection.kind==='card'&&holding?<View>
      <Accordion title="卡片外觀" subtitle="行情卡片本體，不修改框架" open={openGroup==='card-style'} onPress={()=>toggle('card-style')}>
        <ColorPalettePicker label="卡片背景" value={wall.style.backgroundColor} onChange={backgroundColor=>patchWallStyle({backgroundColor})}/>
        <NumberStep label="卡片內距" value={wall.style.padding} min={0} max={32} step={1} suffix=" px" onChange={padding=>patchWallStyle({padding})}/>
        <NumberStep label="內容行距" value={wall.style.rowGap} min={0} max={32} step={1} suffix=" px" onChange={rowGap=>patchWallStyle({rowGap})}/>
        <NumberStep label="圓角" value={wall.style.cornerRadius} min={0} max={40} step={2} suffix=" px" onChange={cornerRadius=>patchWallStyle({cornerRadius})}/>
        <ColorPalettePicker label="邊框" value={wall.style.borderColor} onChange={borderColor=>patchWallStyle({borderColor})}/>
        <NumberStep label="邊框粗細" value={wall.style.borderWidth} min={0} max={6} step={1} suffix=" px" onChange={borderWidth=>patchWallStyle({borderWidth})}/>
      </Accordion>
    </View>:null}

    {(selection.kind==='text'||selection.kind==='value')&&holding&&selectedField?<View>
      <Accordion title={selection.kind==='value'?'數值排版':'文字排版'} subtitle="只修改預覽中虛線框選到的內容" open={openGroup==='typography'} onPress={()=>toggle('typography')}>
        <NumberStep label="字體大小" value={Math.round(selectedField.fontScale*100)} min={70} max={200} step={5} suffix="%" onChange={v=>patchField(selectedField.field,{fontScale:v/100})}/>
        <AlignRow value={selectedField.align} onChange={align=>patchField(selectedField.field,{align})}/>
        <SwitchRow label="套用損益色" value={selectedField.useProfitColor} onChange={useProfitColor=>patchField(selectedField.field,{useProfitColor})}/>
        <SwitchRow label="顯示此欄位" value={selectedField.enabled} onChange={enabled=>patchField(selectedField.field,{enabled})}/>
        <NumberStep label="上下內距" value={selectedField.paddingY} min={0} max={16} step={1} suffix=" px" onChange={paddingY=>patchField(selectedField.field,{paddingY})}/>
        <NumberStep label="行距" value={selectedField.lineGap??0} min={0} max={32} step={1} suffix=" px" onChange={lineGap=>patchField(selectedField.field,{lineGap})}/>
        <ColorPalettePicker label="自訂文字色" value={selectedField.textColor??wall.style.textColor} onChange={textColor=>patchField(selectedField.field,{textColor})}/>
      </Accordion>
    </View>:null}

    {selection.kind==='data'&&holding?<Accordion title="資料顯示" subtitle="只控制顯示與順序，不改行情或帳務原始資料" open={openGroup==='state'} onPress={()=>toggle('state')}>
      {wall.fields.map(field=><SwitchRow key={field.field} label={field.label} value={field.enabled} onChange={enabled=>patchField(field.field,{enabled})}/>)}
    </Accordion>:null}

    {!holding&&!['frame'].includes(selection.kind)?<Accordion title={layoutKindLabel(selection.kind)+'工具'} subtitle={'已依 '+profile.label+' 分流；後續工具只掛到此類物件，不與其他類型混用。'} open={openGroup==='state'} onPress={()=>toggle('state')}>
      <Text style={styles.note}>V3.2.1 已建立物件分流與直接選取核心；本模組將沿用同一排版引擎接入自己的專屬工具，不再顯示不相關的行情工具。</Text>
    </Accordion>:null}
  </View>;
}

function GenericPreview({selection,onSelect,kinds}:{selection:Selection;onSelect:(kind:LayoutToolTargetKind)=>void;kinds:readonly LayoutToolTargetKind[]}){
  const hasChart=kinds.includes('chart');
  return <View style={styles.generic}>
    <Pressable onPress={e=>{e.stopPropagation();onSelect('card');}} style={[styles.genericCard,selection.kind==='card'&&styles.selected]}>
      <Pressable onPress={e=>{e.stopPropagation();onSelect('text');}} style={selection.kind==='text'&&styles.selected}><Text style={styles.genericLabel}>標題／說明文字</Text></Pressable>
      <Pressable onPress={e=>{e.stopPropagation();onSelect('value');}} style={selection.kind==='value'&&styles.selected}><Text style={styles.genericValue}>NT$ 123,456</Text></Pressable>
      {hasChart?<Pressable onPress={e=>{e.stopPropagation();onSelect('chart');}} style={[styles.genericChart,selection.kind==='chart'&&styles.selected]}><Text style={styles.genericChartText}>圖表區</Text></Pressable>:null}
    </Pressable>
  </View>;
}
function Accordion({title,subtitle,open,onPress,children}:{title:string;subtitle:string;open:boolean;onPress:()=>void;children:any}){
  return <View style={styles.accordion}><Pressable onPress={onPress} style={styles.accordionHead}><View style={{flex:1}}><Text style={styles.accordionTitle}>{title}</Text><Text style={styles.rowHint}>{subtitle}</Text></View><Text style={styles.chev}>{open?'−':'＋'}</Text></Pressable>{open?<View style={styles.accordionBody}>{children}</View>:null}</View>;
}
function NumberStep({label,value,min,max,step,suffix,onChange}:{label:string;value:number;min:number;max:number;step:number;suffix:string;onChange:(value:number)=>void}){
  return <View style={styles.row}><Text style={styles.rowLabel}>{label}</Text><Pressable style={styles.step} onPress={()=>onChange(Math.max(min,value-step))}><Text style={styles.stepText}>−</Text></Pressable><Text style={styles.num}>{value}{suffix}</Text><Pressable style={styles.step} onPress={()=>onChange(Math.min(max,value+step))}><Text style={styles.stepText}>＋</Text></Pressable></View>;
}
function ModeStep({label,value,fallback,min,max,step,onAuto,onChange}:{label:string;value:number|undefined;fallback:number;min:number;max:number;step:number;onAuto:()=>void;onChange:(value:number)=>void}){
  const actual=value??fallback;
  return <View style={styles.modeBlock}><View style={styles.row}><Text style={styles.rowLabel}>{label}</Text><Pressable onPress={value===undefined?()=>onChange(fallback):onAuto} style={[styles.autoChip,value===undefined&&styles.autoChipActive]}><Text style={[styles.autoText,value===undefined&&styles.autoTextActive]}>{value===undefined?'自動':'固定'}</Text></Pressable></View>{value!==undefined?<NumberStep label="" value={actual} min={min} max={max} step={step} suffix=" px" onChange={onChange}/>:null}</View>;
}
function SwitchRow({label,value,onChange}:{label:string;value:boolean;onChange:(value:boolean)=>void}){return <View style={styles.row}><Text style={styles.rowLabel}>{label}</Text><Switch value={value} onValueChange={onChange} trackColor={{true:colors.primary}}/></View>;}
function AlignRow({value,onChange}:{value:'left'|'center'|'right';onChange:(value:'left'|'center'|'right')=>void}){return <View style={styles.row}><Text style={styles.rowLabel}>對齊</Text><View style={styles.align}>{(['left','center','right'] as const).map(x=><Pressable key={x} onPress={()=>onChange(x)} style={[styles.alignChip,value===x&&styles.alignActive]}><Text style={[styles.alignText,value===x&&styles.alignTextActive]}>{x==='left'?'靠左':x==='center'?'置中':'靠右'}</Text></Pressable>)}</View></View>;}

const styles=StyleSheet.create({
  root:{gap:12},
  head:{flexDirection:'row',gap:8,alignItems:'flex-start'},title:{fontSize:18,fontWeight:'900',color:colors.text},hint:{fontSize:11,lineHeight:17,color:colors.textSecondary,marginTop:3},
  moduleRow:{gap:6,paddingVertical:2},moduleChip:{paddingHorizontal:10,paddingVertical:7,borderRadius:radius.pill,borderWidth:1,borderColor:colors.border,backgroundColor:colors.surfaceMuted},moduleChipActive:{backgroundColor:colors.primary,borderColor:colors.primary},moduleText:{fontSize:10,fontWeight:'800',color:colors.textSecondary},moduleTextActive:{color:'#FFFFFF'},
  previewShell:{borderWidth:1,borderColor:'#9AC3F7',borderRadius:radius.lg,padding:10,backgroundColor:'#EFF6FF'},previewTop:{marginBottom:8},previewTitle:{fontSize:12,fontWeight:'900',color:colors.primary},path:{fontSize:10,color:colors.textSecondary,marginTop:2},
  framePreview:{padding:9,borderWidth:1,borderStyle:'dashed',borderColor:'#8FB8E8',borderRadius:radius.md,backgroundColor:'#FFFFFF'},pickLabel:{fontSize:9,fontWeight:'900',color:colors.primary,marginBottom:6},
  selected:{borderWidth:2,borderStyle:'dashed',borderColor:colors.primary,borderRadius:8},
  kindRow:{gap:6,paddingVertical:2},kindChip:{paddingHorizontal:11,paddingVertical:7,borderRadius:radius.pill,backgroundColor:colors.surfaceMuted,borderWidth:1,borderColor:colors.border},kindChipActive:{backgroundColor:colors.primary,borderColor:colors.primary},kindText:{fontSize:10,fontWeight:'900',color:colors.textSecondary},kindTextActive:{color:'#FFFFFF'},
  accordion:{borderTopWidth:StyleSheet.hairlineWidth,borderTopColor:colors.border},accordionHead:{paddingVertical:11,flexDirection:'row',alignItems:'center',gap:8},accordionTitle:{fontSize:13,fontWeight:'900',color:colors.text},rowHint:{fontSize:9,lineHeight:14,color:colors.textSecondary,marginTop:2},chev:{fontSize:18,fontWeight:'900',color:colors.primary},accordionBody:{gap:8,paddingBottom:8},
  row:{minHeight:40,flexDirection:'row',alignItems:'center',gap:8},rowLabel:{flex:1,fontSize:11,fontWeight:'800',color:colors.textSecondary},step:{width:34,height:34,borderRadius:10,backgroundColor:'#EAF2FF',alignItems:'center',justifyContent:'center'},stepText:{fontSize:17,fontWeight:'900',color:colors.primary},num:{minWidth:72,textAlign:'center',fontSize:11,fontWeight:'900',color:colors.text},
  modeBlock:{gap:2},autoChip:{paddingHorizontal:10,paddingVertical:6,borderRadius:999,backgroundColor:colors.surfaceMuted},autoChipActive:{backgroundColor:colors.primary},autoText:{fontSize:10,fontWeight:'900',color:colors.textSecondary},autoTextActive:{color:'#FFFFFF'},
  align:{flexDirection:'row',backgroundColor:colors.surfaceMuted,borderRadius:10,padding:2},alignChip:{paddingHorizontal:9,paddingVertical:6,borderRadius:8},alignActive:{backgroundColor:'#FFFFFF'},alignText:{fontSize:9,fontWeight:'800',color:colors.textSecondary},alignTextActive:{color:colors.primary},
  generic:{padding:4},genericCard:{padding:12,borderWidth:1,borderColor:colors.border,borderRadius:14,backgroundColor:'#F8FAFC',gap:8},genericLabel:{fontSize:12,fontWeight:'800',color:colors.textSecondary},genericValue:{fontSize:24,fontWeight:'900',color:colors.text},genericChart:{height:56,borderRadius:10,backgroundColor:'#EAF2FF',alignItems:'center',justifyContent:'center'},genericChartText:{fontSize:10,fontWeight:'900',color:colors.primary},
  note:{fontSize:10,lineHeight:16,color:colors.textSecondary},
});
