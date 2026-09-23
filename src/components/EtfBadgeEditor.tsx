import {useState} from 'react';
import {Pressable,StyleSheet,Switch,Text,TextInput,View} from 'react-native';
import {
  DEFAULT_ETF_BADGES,type EtfBadgeConfig,type EtfBadgeKey,type EtfBadgeStyle,type EtfReminderType,
} from '../domain/etfBadges';
import {ITEM_EFFECT_INTENSITIES,ITEM_EFFECT_KINDS,ITEM_EFFECT_SPEEDS,type ItemEffectConfig,type ItemEffectIntensity,type ItemEffectKind,type ItemEffectSpeed,type ItemEffectTrigger} from '../domain/displayItemContract';
import {colors,spacing} from '../theme/tokens';
import {ColorPalettePicker} from './ColorPalettePicker';
import {EtfBadgeRow} from './EtfBadgeRow';

const LABELS:Record<EtfBadgeKey,string>={etfType:'ETF 分類',dividendType:'配息頻率',reminder:'事件提醒'};
const EFFECTS:Record<ItemEffectKind,string>={none:'無',fade:'淡入',pulse:'呼吸燈','flash-on-change':'閃爍',bounce:'跳動'};
const TRIGGERS:Record<'always'|'change'|'refresh'|'alert',string>={always:'持續',change:'內容變動',refresh:'行情刷新',alert:'事件當日'};
const SPEEDS:Record<ItemEffectSpeed,string>={slow:'慢',normal:'一般',fast:'快'};
const INTENSITIES:Record<ItemEffectIntensity,string>={soft:'柔和',medium:'中',strong:'強'};
const EVENT_LABELS:Record<EtfReminderType,string>={lastBuyDate:'最後買進日',exDate:'今日除息',paymentDate:'股息發放日'};

export function EtfBadgeEditor({value,onChange}:{value:EtfBadgeConfig;onChange:(next:EtfBadgeConfig)=>void}){
  const [open,setOpen]=useState<EtfBadgeKey|null>('etfType');
  const [previewReminder,setPreviewReminder]=useState(true);
  const patch=(key:EtfBadgeKey,next:Partial<EtfBadgeStyle>)=>onChange({...value,badges:{...value.badges,[key]:{...value.badges[key],...next}}});
  const patchEffect=(key:EtfBadgeKey,next:Partial<ItemEffectConfig>)=>patch(key,{effect:{...value.badges[key].effect,...next}});
  const move=(key:EtfBadgeKey,step:-1|1)=>{
    const order=[...value.order];const old=order.indexOf(key);const target=old+step;
    if(old<0||target<0||target>=order.length)return;
    [order[old],order[target]]=[order[target]!,order[old]!];
    onChange({...value,order});
  };
  return <View style={styles.root}>
    <Text style={styles.heading}>ETF 標籤｜A 群組、B 單項編輯</Text>
    <Text style={styles.hint}>代號固定靠左；類型、配息及提醒靠右。自訂文字只改畫面，不覆寫官方分類或配息資料。</Text>
    {value.order.map((key,index)=>{
      const item=value.badges[key];
      return <View key={key} style={styles.card}>
        <View style={styles.row}>
          <Pressable onPress={()=>setOpen(open===key?null:key)} style={styles.open}><Text style={styles.name}>{LABELS[key]}　{open===key?'−':'＋'}</Text></Pressable>
          <Switch accessibilityLabel={'顯示'+LABELS[key]} value={item.enabled} onValueChange={enabled=>patch(key,{enabled})} trackColor={{true:colors.primary}}/>
          <Mini text="↑" disabled={index===0} onPress={()=>move(key,-1)}/>
          <Mini text="↓" disabled={index===value.order.length-1} onPress={()=>move(key,1)}/>
        </View>
        {open===key?<View style={styles.details}>
          <Text style={styles.hint}>B 細項設定</Text>
          <Text style={styles.label}>自訂顯示文字（留空＝自動取官方資料）</Text>
          <TextInput placeholder={key==='reminder'?'提醒':key==='etfType'?'自動顯示類別':'自動顯示頻率'} placeholderTextColor="#94A3B8"
            value={item.customText} onChangeText={customText=>patch(key,{customText:customText.slice(0,16)})} style={styles.input}/>
          <Step label="字體比例" value={Math.round(item.fontScale*100)} min={70} max={150} step={5} suffix="%" onChange={v=>patch(key,{fontScale:v/100})}/>
          <ColorPalettePicker label="文字調色盤" value={item.textColor} onChange={textColor=>patch(key,{textColor})}/>
          <ColorPalettePicker label="背景調色盤" value={item.backgroundColor} onChange={backgroundColor=>patch(key,{backgroundColor})}/>
          <ColorPalettePicker label="邊框調色盤" value={item.borderColor} onChange={borderColor=>patch(key,{borderColor})}/>
          <Step label="邊框粗細" value={item.borderWidth} min={0} max={3} step={1} suffix=" px" onChange={borderWidth=>patch(key,{borderWidth})}/>
          <Step label="圓角" value={item.borderRadius} min={0} max={16} step={1} suffix=" px" onChange={borderRadius=>patch(key,{borderRadius})}/>
          <Step label="左右內距" value={item.paddingX} min={0} max={12} step={1} suffix=" px" onChange={paddingX=>patch(key,{paddingX})}/>
          <Step label="上下內距" value={item.paddingY} min={0} max={8} step={1} suffix=" px" onChange={paddingY=>patch(key,{paddingY})}/>
          <Step label="不透明度" value={Math.round(item.opacity*100)} min={25} max={100} step={5} suffix="%" onChange={n=>patch(key,{opacity:n/100})}/>
          <Text style={styles.label}>特效</Text>
          <Choices values={ITEM_EFFECT_KINDS} labels={EFFECTS} value={item.effect.kind} onChange={kind=>patchEffect(key,{kind})}/>
          {item.effect.kind!=='none'?<>
            <Text style={styles.label}>觸發條件</Text>
            <Choices values={key==='reminder'?['alert','always','change'] as const:['change','refresh','always'] as const}
              labels={TRIGGERS} value={item.effect.trigger as 'always'|'change'|'refresh'|'alert'} onChange={trigger=>patchEffect(key,{trigger:trigger as ItemEffectTrigger})}/>
            <Text style={styles.label}>特效速度</Text>
            <Choices values={ITEM_EFFECT_SPEEDS} labels={SPEEDS} value={item.effect.speed} onChange={speed=>patchEffect(key,{speed})}/>
            <Text style={styles.label}>特效強度</Text>
            <Choices values={ITEM_EFFECT_INTENSITIES} labels={INTENSITIES} value={item.effect.intensity} onChange={intensity=>patchEffect(key,{intensity})}/>
          </>:null}
        </View>:null}
      </View>;
    })}
    <View style={styles.card}>
      <Text style={styles.heading}>提醒開關與觸發事件</Text>
      <Text style={styles.hint}>沒有已記錄且日期吻合的事件就不顯示提醒；不推算未公告的最後買進日。</Text>
      {(['lastBuyDate','exDate','paymentDate'] as const).map(event=><View key={event} style={styles.row}>
        <Text style={styles.label}>{EVENT_LABELS[event]}</Text>
        <Switch value={value.reminderEvents.includes(event)} onValueChange={enabled=>onChange({...value,reminderEvents:enabled?[...value.reminderEvents,event]:value.reminderEvents.filter(x=>x!==event)})} trackColor={{true:colors.primary}}/>
      </View>)}
      <Pressable onPress={()=>setPreviewReminder(v=>!v)}><Text style={styles.hint}>示範提醒預覽：{previewReminder?'開':'關'}（不代表目前有已公告事件）</Text></Pressable>
      <View style={styles.preview}>
        <View style={styles.previewRow}>
          <Text style={styles.code}>0050</Text>
          <EtfBadgeRow etfType="市值型" dividendType="半年配" reminder={previewReminder?'exDate':null} config={value} narrow/>
        </View>
        <Text style={styles.hint}>示意資料：真實資料以官方公告及已記錄日期為準。</Text>
      </View>
      <Pressable style={styles.reset} onPress={()=>onChange(DEFAULT_ETF_BADGES)}><Text style={styles.resetText}>恢復預設標籤</Text></Pressable>
    </View>
  </View>;
}
function Mini({text,onPress,disabled=false}:{text:string;onPress:()=>void;disabled?:boolean}){
  return <Pressable disabled={disabled} onPress={onPress} style={[styles.mini,disabled&&styles.disabled]}><Text style={styles.miniText}>{text}</Text></Pressable>;
}
function Step({label,value,min,max,step,suffix,onChange}:{label:string;value:number;min:number;max:number;step:number;suffix:string;onChange:(value:number)=>void}){
  return <View style={styles.row}><Text style={styles.label}>{label}</Text><Mini text="−" onPress={()=>onChange(Math.max(min,value-step))}/><Text style={styles.value}>{value}{suffix}</Text><Mini text="＋" onPress={()=>onChange(Math.min(max,value+step))}/></View>;
}
function Choices<T extends string>({values,labels,value,onChange}:{values:readonly T[];labels:Record<T,string>;value:T;onChange:(next:T)=>void}){
  return <View style={styles.choices}>{values.map(v=><Pressable key={v} onPress={()=>onChange(v)} style={[styles.chip,value===v&&styles.chipOn]}><Text style={[styles.chipText,value===v&&styles.chipTextOn]}>{labels[v]}</Text></Pressable>)}</View>;
}
const styles=StyleSheet.create({
  root:{gap:spacing.sm,marginTop:10},heading:{fontSize:14,fontWeight:'900',color:colors.text},
  hint:{fontSize:10,lineHeight:16,color:colors.textSecondary},label:{fontSize:10,fontWeight:'800',color:colors.textSecondary,flex:1},
  card:{gap:8,borderColor:colors.border,borderWidth:1,borderRadius:12,padding:10},
  row:{flexDirection:'row',alignItems:'center',gap:6,justifyContent:'space-between'},
  open:{flex:1},name:{fontSize:11,fontWeight:'900',color:colors.primary},
  mini:{backgroundColor:colors.surfaceMuted,borderRadius:6,width:28,height:28,alignItems:'center',justifyContent:'center'},
  miniText:{fontSize:15,fontWeight:'900',color:colors.primary},disabled:{opacity:.3},value:{fontSize:10,fontWeight:'900',minWidth:48,textAlign:'center',color:colors.text},
  details:{gap:8,borderTopWidth:1,borderTopColor:colors.border,paddingTop:8},input:{backgroundColor:colors.surfaceMuted,borderRadius:8,padding:8,color:colors.text,borderWidth:1,borderColor:colors.border,fontSize:12},
  choices:{flexDirection:'row',flexWrap:'wrap',gap:5},chip:{paddingVertical:6,paddingHorizontal:9,backgroundColor:colors.surfaceMuted,borderRadius:12},chipOn:{backgroundColor:colors.primary},
  chipText:{fontSize:10,color:colors.textSecondary,fontWeight:'800'},chipTextOn:{color:'#FFF'},
  preview:{backgroundColor:'#151D2E',padding:8,borderRadius:12,gap:6},previewRow:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},code:{fontSize:15,fontWeight:'900',color:'#F87171'},
  reset:{alignSelf:'flex-start'},resetText:{fontSize:11,color:colors.primary,fontWeight:'900'},
});
