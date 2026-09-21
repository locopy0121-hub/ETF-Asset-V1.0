import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import type { MonitorConfig } from '../monitor/monitorDomain';
import {
  DEFAULT_HOLDING_WALL_CONFIG,
  type HoldingWallAlign,
  type HoldingWallConfig,
  type HoldingWallFieldConfig,
  type HoldingWallFieldKey,
} from '../domain/uiModels';
import { colors, radius, spacing } from '../theme/tokens';

const FIELD_GROUPS:readonly {title:string;fields:readonly HoldingWallFieldKey[]}[]=[
  {title:'標題區',fields:['name','symbol']},
  {title:'行情區',fields:['price','change','changePercent']},
  {title:'損益區',fields:['pnl','roi','marketValue']},
];
const palette=['#0C121B','#111827','#FFFFFF','#F8FAFC','#0066FF','#EF4444','#10B981','#64748B','#F59E0B'];

export function HoldingMarketWallEditor({
  value,
  onChange,
  miniSource,
}:{
  value:HoldingWallConfig;
  onChange:(next:HoldingWallConfig)=>void;
  miniSource:MonitorConfig;
}){
  const patchHeader=(patch:Partial<HoldingWallConfig['header']>)=>onChange({...value,header:{...value.header,...patch}});
  const patchStyle=(patch:Partial<HoldingWallConfig['style']>)=>onChange({...value,style:{...value.style,...patch}});
  const patchField=(field:HoldingWallFieldKey,patch:Partial<HoldingWallFieldConfig>)=>onChange({...value,fields:value.fields.map(item=>item.field===field?{...item,...patch}:item)});
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
  const copyMini=()=>{
    const allowed=new Set<HoldingWallFieldKey>(['name','symbol','price','change','changePercent','pnl','roi','marketValue']);
    const mapped=miniSource.miniColumns
      .filter(column=>allowed.has(column.field as HoldingWallFieldKey))
      .map(column=>({
        field:column.field as HoldingWallFieldKey,
        enabled:column.enabled,
        label:column.label,
        fontScale:column.fontScale,
        align:column.align,
        useProfitColor:column.useProfitColor,
      }));
    const missing=DEFAULT_HOLDING_WALL_CONFIG.fields.filter(item=>!mapped.some(mappedField=>mappedField.field===item.field));
    onChange({
      header:{
        visible:miniSource.miniHeader.visible,
        fontScale:miniSource.miniHeader.fontScale,
        backgroundColor:miniSource.miniHeader.backgroundColor,
        textColor:miniSource.miniHeader.textColor,
        borderColor:miniSource.miniHeader.borderColor,
        borderWidth:miniSource.miniHeader.borderWidth,
      },
      fields:[...mapped,...missing],
      style:{
        backgroundColor:miniSource.miniStyle.backgroundColor,
        textColor:miniSource.miniStyle.textColor,
        secondaryTextColor:miniSource.miniStyle.secondaryTextColor,
        gainColor:miniSource.miniStyle.gainColor,
        lossColor:miniSource.miniStyle.lossColor,
        borderColor:miniSource.miniStyle.borderColor,
        borderWidth:miniSource.miniStyle.borderWidth,
        cornerRadius:miniSource.miniStyle.cornerRadius,
        padding:miniSource.miniStyle.padding,
        rowGap:miniSource.miniStyle.rowGap,
      },
    });
  };

  return <View style={styles.root}>
    <View style={styles.notice}>
      <Text style={styles.noticeTitle}>主體行情牆編輯模式</Text>
      <Text style={styles.noticeText}>主體行情牆＝首頁大型持股卡片區。編輯方式比照 Mini：A 標題區控制母層，B 欄位只控制自己的顯示與樣式；不改 Mini 本身。</Text>
      <Pressable onPress={copyMini} style={styles.copyButton}><Text style={styles.copyText}>複製 Mini 設定至主體行情牆</Text></Pressable>
    </View>

    <View style={styles.block}>
      <Text style={styles.blockTitle}>A 標題列（母）</Text>
      <Toggle label="顯示標題列" value={value.header.visible} onChange={visible=>patchHeader({visible})}/>
      <Step label="標題字體" value={Math.round(value.header.fontScale*100)} min={70} max={180} step={5} suffix="%" onChange={fontScale=>patchHeader({fontScale:fontScale/100})}/>
      <Color label="標題背景" value={value.header.backgroundColor} onChange={backgroundColor=>patchHeader({backgroundColor})}/>
      <Color label="標題文字" value={value.header.textColor} onChange={textColor=>patchHeader({textColor})}/>
      <Color label="標題分隔線" value={value.header.borderColor} onChange={borderColor=>patchHeader({borderColor})}/>
      <Step label="標題分隔線" value={value.header.borderWidth} min={0} max={4} step={1} suffix=" px" onChange={borderWidth=>patchHeader({borderWidth})}/>
    </View>

    <View style={styles.block}>
      <Text style={styles.blockTitle}>B 欄位（子）</Text>
      <Text style={styles.note}>每張持股卡共用同一份 B 欄位配置；修改任一欄位後，全部持股卡同步。</Text>
      {FIELD_GROUPS.map(group=><View key={group.title} style={styles.group}>
        <Text style={styles.groupTitle}>{group.title}</Text>
        {value.fields.filter(field=>group.fields.includes(field.field)).map((field,index)=><View key={field.field} style={styles.fieldCard}>
          <View style={styles.fieldTop}>
            <Pressable onPress={()=>patchField(field.field,{enabled:!field.enabled})} style={[styles.choice,field.enabled&&styles.choiceActive]}>
              <Text style={[styles.choiceText,field.enabled&&styles.choiceTextActive]}>{field.label}</Text>
            </Pressable>
            <Mini label="↑" onPress={()=>moveField(field.field,-1)}/>
            <Mini label="↓" onPress={()=>moveField(field.field,1)}/>
          </View>
          <Text style={styles.position}>第 {index+1} 項 · {field.align==='left'?'靠左':field.align==='center'?'置中':'靠右'}</Text>
          {field.enabled?<View style={styles.controls}>
            <TextInput value={field.label} onChangeText={label=>patchField(field.field,{label:label.slice(0,12)})} style={styles.input}/>
            <Step label="字體" value={Math.round(field.fontScale*100)} min={70} max={180} step={5} suffix="%" onChange={fontScale=>patchField(field.field,{fontScale:fontScale/100})}/>
            <Choice value={field.align} onChange={align=>patchField(field.field,{align})}/>
            <Toggle label="套用損益色" value={field.useProfitColor} onChange={useProfitColor=>patchField(field.field,{useProfitColor})}/>
          </View>:null}
        </View>)}
      </View>)}
    </View>

    <View style={styles.block}>
      <Text style={styles.blockTitle}>卡片外觀</Text>
      <Color label="背景" value={value.style.backgroundColor} onChange={backgroundColor=>patchStyle({backgroundColor})}/>
      <Color label="文字" value={value.style.textColor} onChange={textColor=>patchStyle({textColor})}/>
      <Color label="次要文字" value={value.style.secondaryTextColor} onChange={secondaryTextColor=>patchStyle({secondaryTextColor})}/>
      <Color label="上漲 / 獲利" value={value.style.gainColor} onChange={gainColor=>patchStyle({gainColor})}/>
      <Color label="下跌 / 虧損" value={value.style.lossColor} onChange={lossColor=>patchStyle({lossColor})}/>
      <Color label="邊框" value={value.style.borderColor} onChange={borderColor=>patchStyle({borderColor})}/>
      <Step label="邊框" value={value.style.borderWidth} min={0} max={6} step={1} suffix=" px" onChange={borderWidth=>patchStyle({borderWidth})}/>
      <Step label="圓角" value={value.style.cornerRadius} min={0} max={40} step={2} suffix=" px" onChange={cornerRadius=>patchStyle({cornerRadius})}/>
      <Step label="內距" value={value.style.padding} min={0} max={32} step={2} suffix=" px" onChange={padding=>patchStyle({padding})}/>
      <Step label="列間距" value={value.style.rowGap} min={0} max={24} step={2} suffix=" px" onChange={rowGap=>patchStyle({rowGap})}/>
    </View>
  </View>;
}

function Toggle({label,value,onChange}:{label:string;value:boolean;onChange:(value:boolean)=>void}){
  return <Pressable onPress={()=>onChange(!value)} style={styles.toggle}><Text style={styles.label}>{label}</Text><Text style={[styles.state,value&&styles.stateOn]}>{value?'開':'關'}</Text></Pressable>;
}
function Step({label,value,min,max,step,suffix,onChange}:{label:string;value:number;min:number;max:number;step:number;suffix:string;onChange:(value:number)=>void}){
  return <View style={styles.step}><Text style={styles.label}>{label}</Text><Mini label="−" onPress={()=>onChange(Math.max(min,value-step))}/><Text style={styles.stepValue}>{value}{suffix}</Text><Mini label="＋" onPress={()=>onChange(Math.min(max,value+step))}/></View>;
}
function Mini({label,onPress}:{label:string;onPress:()=>void}){return <Pressable onPress={onPress} style={styles.mini}><Text style={styles.miniText}>{label}</Text></Pressable>;}
function Choice({value,onChange}:{value:HoldingWallAlign;onChange:(value:HoldingWallAlign)=>void}){return <View style={styles.row}>{(['left','center','right'] as const).map(item=><Pressable key={item} onPress={()=>onChange(item)} style={[styles.choice,value===item&&styles.choiceActive]}><Text style={[styles.choiceText,value===item&&styles.choiceTextActive]}>{item==='left'?'靠左':item==='center'?'置中':'靠右'}</Text></Pressable>)}</View>;}
function Color({label,value,onChange}:{label:string;value:string;onChange:(value:string)=>void}){return <View><Text style={styles.label}>{label}</Text><View style={styles.row}>{palette.map(color=><Pressable key={color} onPress={()=>onChange(color)} style={[styles.swatch,{backgroundColor:color},value===color&&styles.swatchActive]}/>)}</View></View>;}

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
  fieldTop:{flexDirection:'row',alignItems:'center',gap:6},
  position:{fontSize:9,color:colors.textSecondary},
  controls:{gap:7},
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
  input:{backgroundColor:colors.surfaceMuted,borderRadius:radius.md,borderWidth:1,borderColor:colors.border,paddingHorizontal:10,paddingVertical:8,color:colors.text,fontSize:11},
  swatch:{width:28,height:28,borderRadius:14,borderWidth:2,borderColor:'transparent'},
  swatchActive:{borderColor:colors.primary},
});
