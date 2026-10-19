import {useEffect,useState} from 'react';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import {
 DEFAULT_ITEM_EFFECT,ITEM_EFFECT_CATALOG,ITEM_EFFECT_GROUPS,
 ITEM_EFFECT_INTENSITIES,ITEM_EFFECT_SPEEDS,ITEM_ALL_EFFECT_TRIGGERS,
 itemEffectGroup,itemEffectLabel,
 type ItemEffectConfig,type ItemEffectGroup,type ItemEffectKind,type ItemEffectTrigger,type ItemEffectExtendedTrigger,
} from '../domain/displayItemContract';
import {ItemMotionText} from './ItemMotion';

// Standalone extension. The inherited HoldingMarketWallEditor is hash-locked.
export function MotionControls({value,onChange}:{value:ItemEffectConfig;onChange:(next:Partial<ItemEffectConfig>)=>void}){
 const [group,setGroup]=useState<ItemEffectGroup>(()=>itemEffectGroup(value.kind));
 // Follow the selected item's saved effect when this editor is reused for another card.
 useEffect(()=>setGroup(itemEffectGroup(value.kind)),[value.kind]);
 const [preview,setPreview]=useState(0);
 const effects=ITEM_EFFECT_CATALOG.filter(effect=>effect.group===group);
 return <View style={styles.root}>
  <Text style={styles.heading}>動畫分類</Text>
  <View style={styles.row}>{ITEM_EFFECT_GROUPS.map(item=><Chip key={item.id} label={item.label} active={group===item.id} onPress={()=>setGroup(item.id)}/>)}</View>
  <Text style={styles.heading}>動畫效果</Text>
  <View style={styles.row}>{effects.map(item=><Chip key={item.id} label={item.label} active={value.kind===item.id} onPress={()=>onChange({kind:item.id as ItemEffectKind})}/>)}</View>
  {value.kind!=='none'?<>
   <Text style={styles.heading}>觸發條件</Text>
   <View style={styles.row}>{ITEM_ALL_EFFECT_TRIGGERS.filter(item=>item!=='alert').map(item=><Chip key={item} label={triggerName(item)} active={value.trigger===item} onPress={()=>onChange({trigger:item as ItemEffectTrigger})}/>)}</View>
   <Text style={styles.heading}>速度</Text>
   <View style={styles.row}>{ITEM_EFFECT_SPEEDS.map(item=><Chip key={item} label={item==='slow'?'慢速':item==='fast'?'快速':'標準'} active={value.speed===item} onPress={()=>onChange({speed:item,durationMs:item==='slow'?1000:item==='fast'?200:500})}/>)}</View>
   <Text style={styles.heading}>強度</Text>
   <View style={styles.row}>{ITEM_EFFECT_INTENSITIES.map(item=><Chip key={item} label={item==='soft'?'柔和':item==='strong'?'強烈':'適中'} active={value.intensity===item} onPress={()=>onChange({intensity:item,strengthPercent:item==='soft'?25:item==='strong'?80:50})}/>)}</View>
   <Step label="動畫時間" value={value.durationMs??DEFAULT_ITEM_EFFECT.durationMs??300} min={100} max={1200} delta={50} suffix=" ms" onChange={durationMs=>onChange({durationMs})}/>
   <Step label="強度百分比" value={value.strengthPercent??DEFAULT_ITEM_EFFECT.strengthPercent??40} min={0} max={100} delta={5} suffix="%" onChange={strengthPercent=>onChange({strengthPercent})}/>
   <View style={styles.row}><Text style={styles.heading}>允許循環</Text><Chip label={value.loop?'開啟':'關閉'} active={value.loop===true} onPress={()=>onChange({loop:!value.loop})}/></View>
   <View style={styles.preview}>
    <Text style={styles.caption}>模擬行情更新（不影響真實報價）</Text>
    <ItemMotionText text={preview%2===0?'1,285.00':'1,286.50'} numeric={preview%2===0?1285:1286.5}
      effect={{...value,trigger:'change',loop:false}} style={styles.previewValue} numberOfLines={1}/>
    <Chip label="▶ 預覽" active={false} onPress={()=>setPreview(prev=>prev+1)}/>
   </View>
  </>:null}
 </View>;
}
function triggerName(name:ItemEffectExtendedTrigger){
 const labels:Record<ItemEffectExtendedTrigger,string>={
  always:'持續',refresh:'刷新',change:'數值變動',gain:'上漲',loss:'下跌',alert:'警報',mount:'首次顯示',press:'點擊',longPress:'長按',
 };
 return labels[name];
}
function Chip({label,active,onPress}:{label:string;active:boolean;onPress:()=>void}){
 return <Pressable accessibilityRole="button" accessibilityState={{selected:active}}
   onPress={onPress} style={[styles.chip,active&&styles.chipActive]}>
    <Text style={[styles.chipText,active&&styles.activeText]}>{label}</Text>
   </Pressable>;
}
function Step({label,value,min,max,delta,suffix,onChange}:{label:string;value:number;min:number;max:number;delta:number;suffix:string;onChange:(next:number)=>void}){
 return <View style={styles.step}><Text style={styles.heading}>{label}</Text>
  <Chip label="−" active={false} onPress={()=>onChange(Math.max(min,value-delta))}/>
  <Text style={styles.amount}>{value}{suffix}</Text>
  <Chip label="＋" active={false} onPress={()=>onChange(Math.min(max,value+delta))}/>
 </View>;
}
const styles=StyleSheet.create({
 root:{gap:7,paddingVertical:5},
 heading:{fontSize:11,fontWeight:'800',color:'#64748B'},
 row:{flexDirection:'row',flexWrap:'wrap',alignItems:'center',gap:6},
 chip:{borderWidth:1,borderColor:'#CBD5E1',backgroundColor:'#F1F5F9',borderRadius:8,paddingHorizontal:10,paddingVertical:8},
 chipActive:{borderColor:'#2563EB',backgroundColor:'#2563EB'},
 chipText:{color:'#1E293B',fontSize:10,fontWeight:'800'},
 activeText:{color:'#FFFFFF'},
 step:{flexDirection:'row',flexWrap:'wrap',alignItems:'center',gap:8,marginTop:5},
 amount:{minWidth:65,textAlign:'center',color:'#0F172A',fontWeight:'800',fontSize:11},
 preview:{backgroundColor:'#0F172A',borderRadius:10,padding:10,gap:10,alignItems:'flex-start'},
 caption:{fontSize:10,color:'#CBD5E1'},
 previewValue:{color:'#FFFFFF',fontSize:20,fontWeight:'900',fontVariant:['tabular-nums']},
});
