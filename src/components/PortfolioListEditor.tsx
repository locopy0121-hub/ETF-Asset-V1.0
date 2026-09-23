import {useState} from 'react';
import {Pressable,StyleSheet,Switch,Text,TextInput,View} from 'react-native';
import {ITEM_EFFECT_INTENSITIES,ITEM_EFFECT_KINDS,ITEM_EFFECT_SPEEDS,type ItemEffectConfig,type ItemEffectKind,type ItemEffectIntensity,type ItemEffectSpeed,type ItemEffectTrigger} from '../domain/displayItemContract';
import {DEFAULT_ETF_BADGES,type EtfBadgeConfig} from '../domain/etfBadges';
import {DEFAULT_PORTFOLIO_LIST,type PortfolioColumnConfig,type PortfolioColumnKey,type PortfolioListConfig} from '../domain/portfolioList';
import type {HoldingQuote} from '../domain/uiModels';
import {colors,spacing} from '../theme/tokens';
import {ColorPalettePicker} from './ColorPalettePicker';
import {PortfolioHoldingTable} from './PortfolioHoldingTable';

const EFFECTS:Record<ItemEffectKind,string>={none:'無',fade:'淡入',pulse:'呼吸燈','flash-on-change':'變動閃爍',bounce:'跳動'};
const TRIGGERS:Record<'always'|'change'|'refresh'|'gain'|'loss',string>={always:'持續',change:'數值變動',refresh:'資料刷新',gain:'正值',loss:'負值'};
const SPEEDS:Record<ItemEffectSpeed,string>={slow:'慢',normal:'一般',fast:'快'};
const INTENSITIES:Record<ItemEffectIntensity,string>={soft:'柔和',medium:'中',strong:'強'};

export function PortfolioListEditor({value,onChange,previewQuote,badges=DEFAULT_ETF_BADGES}:{
  value:PortfolioListConfig;onChange:(next:PortfolioListConfig)=>void;previewQuote?:HoldingQuote;badges?:EtfBadgeConfig;
}){
  const [editing,setEditing]=useState<PortfolioColumnKey|null>('shares');
  const patch=(key:PortfolioColumnKey,change:Partial<PortfolioColumnConfig>)=>
    onChange({...value,columns:value.columns.map(item=>item.key===key?{...item,...change}:item)});
  const patchEffect=(key:PortfolioColumnKey,change:Partial<ItemEffectConfig>)=>{
    const current=value.columns.find(item=>item.key===key);
    if(current)patch(key,{effect:{...current.effect,...change}});
  };
  const move=(key:PortfolioColumnKey,delta:-1|1)=>{
    const cols=[...value.columns],index=cols.findIndex(item=>item.key===key),to=index+delta;
    if(index<0||to<0||to>=cols.length)return;
    [cols[index],cols[to]]=[cols[to]!,cols[index]!];onChange({...value,columns:cols});
  };
  return <View style={styles.root}>
    <Text style={styles.heading}>庫存清單 A/B 編輯器</Text>
    <Text style={styles.hint}>A 管理欄位顯示及順序，B 可獨立設定內容、字級、調色盤、寬度、對齊、背景和特效。僅改顯示，不修改帳務核心。</Text>
    <View style={styles.card}>
      <Text style={styles.title}>A 固定代號欄</Text>
      <Step label="固定欄寬" value={value.fixedWidth} min={160} max={270} step={10} suffix="dp" onChange={fixedWidth=>onChange({...value,fixedWidth})}/>
      <Step label="每列高度" value={value.rowHeight} min={52} max={96} step={4} suffix="dp" onChange={rowHeight=>onChange({...value,rowHeight})}/>
      <View style={styles.row}><Text style={styles.label}>名稱顯示在代號下方</Text><Switch value={value.showName} onValueChange={showName=>onChange({...value,showName})} trackColor={{true:colors.primary}}/></View>
      <Text style={styles.hint}>代號固定靠左，標籤群組靠右；不足時標籤縮小而非擠壓右側金額。</Text>
    </View>
    <View style={styles.card}>
      <Text style={styles.title}>A 右側數值欄</Text>
      {value.columns.map((field,index)=><View key={field.key} style={styles.field}>
        <View style={styles.row}>
          <Pressable onPress={()=>setEditing(current=>current===field.key?null:field.key)} style={{flex:1}}><Text style={styles.item}>{field.label}　{editing===field.key?'−':'＋'}</Text></Pressable>
          <Switch accessibilityLabel={'顯示'+field.label} value={field.enabled} onValueChange={enabled=>patch(field.key,{enabled})} trackColor={{true:colors.primary}}/>
          <Mini text="↑" disabled={index===0} onPress={()=>move(field.key,-1)}/>
          <Mini text="↓" disabled={index===value.columns.length-1} onPress={()=>move(field.key,1)}/>
        </View>
        {editing===field.key?<View style={styles.details}>
          <Text style={styles.label}>B 單欄編輯</Text>
          <TextInput accessibilityLabel={field.label+'欄位標題'} style={styles.input} maxLength={16} value={field.label} onChangeText={label=>patch(field.key,{label:label.slice(0,16)})}/>
          <Step label="欄寬" value={field.width} min={54} max={150} step={4} suffix="dp" onChange={width=>patch(field.key,{width})}/>
          <Step label="文字比例" value={Math.round(field.fontScale*100)} min={70} max={150} step={5} suffix="%" onChange={n=>patch(field.key,{fontScale:n/100})}/>
          <Text style={styles.label}>文字對齊</Text>
          <Choice values={['left','center','right'] as const} labels={{left:'靠左',center:'置中',right:'靠右'}} value={field.align} onChange={align=>patch(field.key,{align})}/>
          <View style={styles.row}><Text style={styles.label}>自訂文字顏色（預設沿用系統損益色）</Text><Switch value={field.textColor!==null} onValueChange={enabled=>patch(field.key,{textColor:enabled?'#0F172A':null})}/></View>
          {field.textColor!==null?<ColorPalettePicker label="欄位文字調色盤" value={field.textColor} onChange={textColor=>patch(field.key,{textColor})}/>:null}
          <View style={styles.row}><Text style={styles.label}>自訂欄位背景</Text><Switch value={field.backgroundColor!==null} onValueChange={enabled=>patch(field.key,{backgroundColor:enabled?'#EFF6FF':null})}/></View>
          {field.backgroundColor!==null?<ColorPalettePicker label="欄位背景調色盤" value={field.backgroundColor} onChange={backgroundColor=>patch(field.key,{backgroundColor})}/>:null}
          <Text style={styles.label}>欄位特效</Text>
          <Choice values={ITEM_EFFECT_KINDS} labels={EFFECTS} value={field.effect.kind} onChange={kind=>patchEffect(field.key,{kind})}/>
          {field.effect.kind!=='none'?<>
            <Choice values={['change','refresh','always','gain','loss'] as const} labels={TRIGGERS}
              value={field.effect.trigger as 'change'|'refresh'|'always'|'gain'|'loss'} onChange={trigger=>patchEffect(field.key,{trigger:trigger as ItemEffectTrigger})}/>
            <Choice values={ITEM_EFFECT_SPEEDS} labels={SPEEDS} value={field.effect.speed} onChange={speed=>patchEffect(field.key,{speed})}/>
            <Choice values={ITEM_EFFECT_INTENSITIES} labels={INTENSITIES} value={field.effect.intensity} onChange={intensity=>patchEffect(field.key,{intensity})}/>
          </>:null}
        </View>:null}
      </View>)}
    </View>
    {previewQuote?<View style={styles.card}>
      <Text style={styles.title}>即時清單預覽（僅本列，完整欄位可水平滑動）</Text>
      <PortfolioHoldingTable rows={[previewQuote]} config={value} badges={badges}/>
      <Text style={styles.hint}>修改後先預覽整列，再按頁面設定的「套用」儲存。</Text>
    </View>:null}
    <Pressable style={styles.reset} onPress={()=>onChange(DEFAULT_PORTFOLIO_LIST)}><Text style={styles.resetText}>恢復清單預設配置</Text></Pressable>
  </View>;
}
function Mini({text,onPress,disabled=false}:{text:string;onPress:()=>void;disabled?:boolean}){return <Pressable onPress={onPress} disabled={disabled} style={[styles.mini,disabled&&styles.disabled]}><Text style={styles.miniText}>{text}</Text></Pressable>;}
function Step({label,value,min,max,step,suffix,onChange}:{label:string;value:number;min:number;max:number;step:number;suffix:string;onChange:(v:number)=>void}){return <View style={styles.row}><Text style={styles.label}>{label}</Text><Mini text="−" onPress={()=>onChange(Math.max(min,value-step))}/><Text style={styles.value}>{value} {suffix}</Text><Mini text="＋" onPress={()=>onChange(Math.min(max,value+step))}/></View>;}
function Choice<T extends string>({values,labels,value,onChange}:{values:readonly T[];labels:Record<T,string>;value:T;onChange:(v:T)=>void}){
  return <View style={styles.options}>{values.map(v=><Pressable key={v} onPress={()=>onChange(v)} style={[styles.chip,value===v&&styles.chipOn]}><Text style={[styles.chipText,value===v&&styles.chipTextOn]}>{labels[v]}</Text></Pressable>)}</View>;
}
const styles=StyleSheet.create({
  root:{gap:spacing.md,marginTop:12},heading:{fontSize:15,fontWeight:'900',color:colors.text},
  hint:{fontSize:10,lineHeight:16,color:colors.textSecondary},
  card:{borderWidth:1,borderColor:colors.border,padding:10,borderRadius:12,gap:10},
  title:{fontSize:12,fontWeight:'900',color:colors.primary},label:{flex:1,fontSize:10,fontWeight:'800',color:colors.textSecondary},
  row:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:6},
  field:{gap:6,borderTopWidth:StyleSheet.hairlineWidth,borderTopColor:colors.border,paddingTop:8},
  details:{gap:8,padding:8,backgroundColor:colors.surfaceMuted,borderRadius:10},
  item:{fontSize:11,fontWeight:'900',color:colors.text},value:{minWidth:50,textAlign:'center',fontSize:10,fontWeight:'900',color:colors.text},
  input:{borderWidth:1,borderColor:colors.border,backgroundColor:colors.surface,padding:8,borderRadius:8,color:colors.text,fontSize:11},
  mini:{width:28,height:28,borderRadius:6,backgroundColor:colors.surfaceMuted,justifyContent:'center',alignItems:'center'},
  miniText:{fontSize:14,fontWeight:'900',color:colors.primary},disabled:{opacity:.3},
  options:{flexDirection:'row',gap:5,flexWrap:'wrap'},
  chip:{paddingVertical:6,paddingHorizontal:9,borderRadius:10,backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border},
  chipOn:{backgroundColor:colors.primary,borderColor:colors.primary},chipText:{fontSize:10,fontWeight:'800',color:colors.textSecondary},chipTextOn:{color:'#FFF'},
  reset:{alignSelf:'flex-start'},resetText:{fontSize:11,fontWeight:'900',color:colors.primary},
});
