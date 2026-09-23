import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import {
  ITEM_EFFECT_INTENSITIES,
  ITEM_EFFECT_KINDS,
  ITEM_EFFECT_SPEEDS,
  ITEM_EFFECT_TRIGGERS,
  type ItemEffectConfig,
  type ItemEffectIntensity,
  type ItemEffectKind,
  type ItemEffectSpeed,
  type ItemEffectTrigger,
} from '../domain/displayItemContract';
import {
  DEFAULT_HOLDING_WALL_CONFIG,
  type HoldingWallAlign,
  type HoldingWallConfig,
  type HoldingWallFieldConfig,
  type HoldingWallFieldKey,
} from '../domain/uiModels';
import { colors, radius, spacing } from '../theme/tokens';
import { ColorPalettePicker } from './ColorPalettePicker';

const FIELD_GROUPS:readonly {title:string;fields:readonly HoldingWallFieldKey[]}[]=[
  {title:'標題區',fields:['name','symbol','etfType','dividendType']},
  {title:'行情區',fields:['price','change','changePercent']},
  {title:'損益區',fields:['pnl','roi','marketValue']},
];
const effectLabels:Record<ItemEffectKind,string>={none:'無',fade:'淡入',pulse:'脈衝','flash-on-change':'變動閃爍',bounce:'跳動'};
const triggerLabels:Record<ItemEffectTrigger,string>={always:'常駐',refresh:'刷新',change:'數值變動',gain:'上漲',loss:'下跌',alert:'警報'};
const WALL_EFFECT_TRIGGERS=ITEM_EFFECT_TRIGGERS.filter(trigger=>trigger!=='alert');
const speedLabels:Record<ItemEffectSpeed,string>={slow:'慢',normal:'正常',fast:'快'};
const intensityLabels:Record<ItemEffectIntensity,string>={soft:'弱',medium:'中',strong:'強'};

export function HoldingMarketWallEditor({
  value,
  onChange,
}:{
  value:HoldingWallConfig;
  onChange:(next:HoldingWallConfig)=>void;
}){
  const [editingField,setEditingField]=useState<HoldingWallFieldKey|null>(null);
  const patchHeader=(patch:Partial<HoldingWallConfig['header']>)=>onChange({...value,header:{...value.header,...patch}});
  const patchHeaderEffect=(patch:Partial<ItemEffectConfig>)=>patchHeader({effect:{...value.header.effect,...patch}});
  const patchStyle=(patch:Partial<HoldingWallConfig['style']>)=>onChange({...value,style:{...value.style,...patch}});
  const patchField=(field:HoldingWallFieldKey,patch:Partial<HoldingWallFieldConfig>)=>onChange({...value,fields:value.fields.map(item=>item.field===field?{...item,...patch}:item)});
  const patchFieldEffect=(field:HoldingWallFieldKey,patch:Partial<ItemEffectConfig>)=>{
    const current=value.fields.find(item=>item.field===field);
    if(current)patchField(field,{effect:{...current.effect,...patch}});
  };
  const moveField=(field:HoldingWallFieldKey,delta:-1|1)=>{
    const group=FIELD_GROUPS.find(item=>item.fields.includes(field));
    if(!group)return;
    const fields=[...value.fields];
    const activeOrder=group.fields.map(key=>fields.findIndex(item=>item.field===key)).filter(index=>index>=0);
    const index=fields.findIndex(item=>item.field===field);
    const within=activeOrder.indexOf(index);
    const targetWithin=within+delta;
    if(index<0||within<0||targetWithin<0||targetWithin>=activeOrder.length)return;
    const target=activeOrder[targetWithin]!;
    const current=fields[index]!;
    fields[index]=fields[target]!;
    fields[target]=current;
    onChange({...value,fields});
  };
  const createMainWallTool=()=>onChange({
    header:{...DEFAULT_HOLDING_WALL_CONFIG.header,effect:{...DEFAULT_HOLDING_WALL_CONFIG.header.effect}},
    fields:DEFAULT_HOLDING_WALL_CONFIG.fields.map(field=>({...field,effect:{...field.effect}})),
    style:{...DEFAULT_HOLDING_WALL_CONFIG.style},
  });

  return <View style={styles.root}>
    <View style={styles.notice}>
      <Text style={styles.noticeTitle}>主體行情牆編輯模式</Text>
      <Text style={styles.noticeText}>主體行情牆是獨立工具。A 控制母層；選取 A 項目後只展開該項目的 B 細部，不讀取、不複製、不覆寫 Mini。</Text>
      <Pressable onPress={createMainWallTool} style={styles.copyButton}><Text style={styles.copyText}>新建主體行情牆工具</Text></Pressable>
    </View>

    <View style={styles.block}>
      <Text style={styles.blockTitle}>A 標題列（母）</Text>
      <Toggle label="顯示標題列" value={value.header.visible} onChange={visible=>patchHeader({visible})}/>
      <Step label="標題字體" value={Math.round(value.header.fontScale*100)} min={70} max={180} step={5} suffix="%" onChange={fontScale=>patchHeader({fontScale:fontScale/100})}/>
      <ColorPalettePicker label="標題背景" value={value.header.backgroundColor} onChange={backgroundColor=>patchHeader({backgroundColor})}/>
      <ColorPalettePicker label="標題文字" value={value.header.textColor} onChange={textColor=>patchHeader({textColor})}/>
      <ColorPalettePicker label="標題分隔線" value={value.header.borderColor} onChange={borderColor=>patchHeader({borderColor})}/>
      <Step label="標題分隔線" value={value.header.borderWidth} min={0} max={4} step={1} suffix=" px" onChange={borderWidth=>patchHeader({borderWidth})}/>
      <EffectControls value={value.header.effect} onChange={patchHeaderEffect}/>
    </View>

    <View style={styles.block}>
      <Text style={styles.blockTitle}>A 項目 → B 欄位（子）單項細部</Text>
      <Text style={styles.note}>每張持股卡共用同一份欄位配置；一次只展開一個 B，避免設定全部攤平。</Text>
      {FIELD_GROUPS.map(group=><View key={group.title} style={styles.group}>
        <Text style={styles.groupTitle}>{group.title}</Text>
        {value.fields.filter(field=>group.fields.includes(field.field)).map((field,index)=>{
          const selected=editingField===field.field;
          return <View key={field.field} style={styles.fieldCard}>
            <View style={styles.fieldTop}>
              <Pressable onPress={()=>setEditingField(selected?null:field.field)} style={[styles.choice,selected&&styles.choiceActive]}>
                <Text style={[styles.choiceText,selected&&styles.choiceTextActive]}>{field.label}</Text>
              </Pressable>
              <Pressable onPress={()=>patchField(field.field,{enabled:!field.enabled})} style={[styles.visibility,field.enabled&&styles.visibilityOn]}><Text style={[styles.visibilityText,field.enabled&&styles.visibilityTextOn]}>{field.enabled?'顯示':'隱藏'}</Text></Pressable>
              <Mini label="↑" onPress={()=>moveField(field.field,-1)}/>
              <Mini label="↓" onPress={()=>moveField(field.field,1)}/>
            </View>
            <Text style={styles.position}>第 {index+1} 項 · {field.align==='left'?'靠左':field.align==='center'?'置中':'靠右'}</Text>
            {selected?<View style={styles.controls}>
              <Text style={styles.bTitle}>B 單項細部</Text>
              <TextInput value={field.label} onChangeText={label=>patchField(field.field,{label:label.slice(0,12)})} style={styles.input}/>
              <Step label="字體" value={Math.round(field.fontScale*100)} min={70} max={200} step={5} suffix="%" onChange={fontScale=>patchField(field.field,{fontScale:fontScale/100})}/>
              <Choice value={field.align} onChange={align=>patchField(field.field,{align})}/>
              <Toggle label="套用損益色" value={field.useProfitColor} onChange={useProfitColor=>patchField(field.field,{useProfitColor})}/>
              <Toggle label="背景隨損益自動變色" value={field.useProfitBackground===true} onChange={useProfitBackground=>patchField(field.field,{useProfitBackground})}/>
              <Text style={styles.note}>開啟後背景按目前欄位損益狀態，沿用系統獲利／虧損／持平配色；關閉則恢復固定調色盤設定。</Text>
              <Toggle label="自訂文字顏色" value={field.textColor!=null} onChange={enabled=>patchField(field.field,{textColor:enabled?value.style.textColor:null})}/>
              {field.textColor?<ColorPalettePicker label="單項文字顏色" value={field.textColor} onChange={textColor=>patchField(field.field,{textColor})}/>:null}
              <Toggle label="自訂單項背景" value={field.backgroundColor!=null} onChange={enabled=>patchField(field.field,{backgroundColor:enabled?value.style.backgroundColor:null})}/>
              {field.backgroundColor?<ColorPalettePicker label="單項背景" value={field.backgroundColor} onChange={backgroundColor=>patchField(field.field,{backgroundColor})}/>:null}
              <Toggle label="自訂行距" value={field.lineGap!=null} onChange={enabled=>patchField(field.field,{lineGap:enabled?value.style.rowGap:null})}/>
              {field.lineGap!=null?<Step label="單項行距" value={field.lineGap} min={0} max={32} step={1} suffix=" px" onChange={lineGap=>patchField(field.field,{lineGap})}/>:null}
              <Step label="上下內距" value={field.paddingY} min={0} max={16} step={1} suffix=" px" onChange={paddingY=>patchField(field.field,{paddingY})}/>
              <EffectControls value={field.effect} onChange={patch=>patchFieldEffect(field.field,patch)}/>
            </View>:null}
          </View>;
        })}
      </View>)}
    </View>

    <View style={styles.block}>
      <Text style={styles.blockTitle}>卡片外觀（B 未覆寫時繼承）</Text>
      <ColorPalettePicker label="背景" value={value.style.backgroundColor} onChange={backgroundColor=>patchStyle({backgroundColor})}/>
      <ColorPalettePicker label="文字" value={value.style.textColor} onChange={textColor=>patchStyle({textColor})}/>
      <ColorPalettePicker label="次要文字" value={value.style.secondaryTextColor} onChange={secondaryTextColor=>patchStyle({secondaryTextColor})}/>
      <ColorPalettePicker label="上漲 / 獲利" value={value.style.gainColor} onChange={gainColor=>patchStyle({gainColor})}/>
      <ColorPalettePicker label="下跌 / 虧損" value={value.style.lossColor} onChange={lossColor=>patchStyle({lossColor})}/>
      <ColorPalettePicker label="邊框" value={value.style.borderColor} onChange={borderColor=>patchStyle({borderColor})}/>
      <Step label="邊框" value={value.style.borderWidth} min={0} max={6} step={1} suffix=" px" onChange={borderWidth=>patchStyle({borderWidth})}/>
      <Step label="圓角" value={value.style.cornerRadius} min={0} max={40} step={2} suffix=" px" onChange={cornerRadius=>patchStyle({cornerRadius})}/>
      <Step label="內距" value={value.style.padding} min={0} max={32} step={2} suffix=" px" onChange={padding=>patchStyle({padding})}/>
      <Step label="全域行距" value={value.style.rowGap} min={0} max={32} step={1} suffix=" px" onChange={rowGap=>patchStyle({rowGap})}/>
    </View>
  </View>;
}

function EffectControls({value,onChange}:{value:ItemEffectConfig;onChange:(patch:Partial<ItemEffectConfig>)=>void}){
  return <View style={styles.effectBox}>
    <Text style={styles.label}>單項特效</Text>
    <StringChoice choices={ITEM_EFFECT_KINDS} value={value.kind} label={x=>effectLabels[x]} onChange={kind=>onChange({kind})}/>
    {value.kind!=='none'?<>
      <Text style={styles.label}>觸發條件</Text>
      <StringChoice choices={WALL_EFFECT_TRIGGERS} value={value.trigger} label={x=>triggerLabels[x]} onChange={trigger=>onChange({trigger})}/>
      <Text style={styles.label}>速度</Text>
      <StringChoice choices={ITEM_EFFECT_SPEEDS} value={value.speed} label={x=>speedLabels[x]} onChange={speed=>onChange({speed})}/>
      <Text style={styles.label}>強度</Text>
      <StringChoice choices={ITEM_EFFECT_INTENSITIES} value={value.intensity} label={x=>intensityLabels[x]} onChange={intensity=>onChange({intensity})}/>
    </>:null}
  </View>;
}
function Toggle({label,value,onChange}:{label:string;value:boolean;onChange:(value:boolean)=>void}){return <Pressable onPress={()=>onChange(!value)} style={styles.toggle}><Text style={styles.label}>{label}</Text><Text style={[styles.state,value&&styles.stateOn]}>{value?'開':'關'}</Text></Pressable>;}
function Step({label,value,min,max,step,suffix,onChange}:{label:string;value:number;min:number;max:number;step:number;suffix:string;onChange:(value:number)=>void}){return <View style={styles.step}><Text style={styles.label}>{label}</Text><Mini label="−" onPress={()=>onChange(Math.max(min,value-step))}/><Text style={styles.stepValue}>{value}{suffix}</Text><Mini label="＋" onPress={()=>onChange(Math.min(max,value+step))}/></View>;}
function Mini({label,onPress}:{label:string;onPress:()=>void}){return <Pressable onPress={onPress} style={styles.mini}><Text style={styles.miniText}>{label}</Text></Pressable>;}
function Choice({value,onChange}:{value:HoldingWallAlign;onChange:(value:HoldingWallAlign)=>void}){return <StringChoice choices={['left','center','right'] as const} value={value} label={item=>item==='left'?'靠左':item==='center'?'置中':'靠右'} onChange={onChange}/>;}
function StringChoice<T extends string>({choices,value,label,onChange}:{choices:readonly T[];value:T;label:(item:T)=>string;onChange:(item:T)=>void}){return <View style={styles.row}>{choices.map(item=><Pressable key={item} onPress={()=>onChange(item)} style={[styles.choice,value===item&&styles.choiceActive]}><Text style={[styles.choiceText,value===item&&styles.choiceTextActive]}>{label(item)}</Text></Pressable>)}</View>;}

const styles=StyleSheet.create({
  root:{gap:spacing.md,marginTop:spacing.md},
  notice:{backgroundColor:'#EFF6FF',borderRadius:radius.md,padding:spacing.md,gap:8},
  noticeTitle:{fontSize:13,fontWeight:'900',color:colors.primary},
  noticeText:{fontSize:10,lineHeight:16,color:colors.textSecondary},
  copyButton:{alignSelf:'flex-start',backgroundColor:colors.primary,borderRadius:radius.pill,paddingHorizontal:12,paddingVertical:8},
  copyText:{fontSize:10,fontWeight:'900',color:'#FFFFFF'},
  block:{gap:10,paddingTop:12,borderTopWidth:StyleSheet.hairlineWidth,borderTopColor:colors.border},
  blockTitle:{fontSize:13,fontWeight:'900',color:colors.text},
  note:{fontSize:10,lineHeight:16,color:colors.textSecondary},
  group:{gap:8},
  groupTitle:{fontSize:11,fontWeight:'900',color:colors.primary},
  fieldCard:{borderWidth:1,borderColor:colors.border,borderRadius:radius.md,padding:10,gap:7},
  fieldTop:{flexDirection:'row',alignItems:'center',gap:6,flexWrap:'wrap'},
  position:{fontSize:9,color:colors.textSecondary},
  controls:{gap:7,paddingTop:7,borderTopWidth:StyleSheet.hairlineWidth,borderTopColor:colors.border},
  bTitle:{fontSize:10,fontWeight:'900',color:colors.primary},
  toggle:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:10},
  state:{fontSize:10,fontWeight:'900',color:colors.textSecondary},
  stateOn:{color:colors.primary},
  step:{flexDirection:'row',alignItems:'center',gap:8},
  label:{flex:1,fontSize:10,fontWeight:'800',color:colors.textSecondary},
  stepValue:{minWidth:58,textAlign:'center',fontSize:10,fontWeight:'900',color:colors.text},
  mini:{width:32,height:30,borderRadius:radius.sm,backgroundColor:colors.surfaceMuted,alignItems:'center',justifyContent:'center'},
  miniText:{fontSize:14,fontWeight:'900',color:colors.primary},
  row:{flexDirection:'row',flexWrap:'wrap',gap:6},
  choice:{paddingHorizontal:10,paddingVertical:7,borderRadius:radius.pill,backgroundColor:colors.surfaceMuted,borderWidth:1,borderColor:colors.border},
  choiceActive:{backgroundColor:colors.primary,borderColor:colors.primary},
  choiceText:{fontSize:10,fontWeight:'800',color:colors.textSecondary},
  choiceTextActive:{color:'#FFFFFF'},
  visibility:{paddingHorizontal:8,paddingVertical:6,borderRadius:999,borderWidth:1,borderColor:colors.border},
  visibilityOn:{borderColor:colors.primary,backgroundColor:'#EFF6FF'},
  visibilityText:{fontSize:9,fontWeight:'900',color:colors.textSecondary},
  visibilityTextOn:{color:colors.primary},
  input:{backgroundColor:colors.surfaceMuted,borderRadius:radius.md,borderWidth:1,borderColor:colors.border,paddingHorizontal:10,paddingVertical:8,color:colors.text,fontSize:11},
  effectBox:{gap:6,paddingTop:6},
});
