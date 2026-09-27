import {useEffect,useState} from 'react';
import {Pressable,Switch,Text,View} from 'react-native';
import {ColorPalettePicker} from '../components/ColorPalettePicker';
import {useThemeRuntime} from '../theme/ThemeRuntime';
import {useMaintenance} from './MaintenanceRuntime';
import {TARGET_APPEARANCE,mergeTargetAppearance,type TargetKind} from './inspectionModel';
import {isEngineerOwnedInstance} from './componentLibrary';
import {CONDITIONAL_TONES,normalizeConditionalStyles,type ConditionalTone,type ConditionalRule} from './conditionalVisual';

// B 特效與動態 → C 條件樣式。The real A is already chosen by its wrench.
// Configuring an inactive tone never fabricates a price or alters a data source.
export function ConditionalStyleToolDetails(){
 const maintenance=useMaintenance(),theme=useThemeRuntime(),session=maintenance.session;
 const target=session?.scope==='target'?session.target:undefined;
 const owned=session?.scope==='instance'?session.draftInstances.find(item=>
   item.id===session.instanceId&&isEngineerOwnedInstance(item)):undefined;
 const id=target?.id??(owned?'installed:'+owned.id:undefined);
 const kind:TargetKind|undefined=target?.kind??(owned?owned.templateId==='divider'?'generic':
   owned.templateId==='parent-frame'?'frame':'text':undefined);
 const supported=Boolean(id&&kind&&['metric','text','value','prefix','generic'].includes(kind));
 const actualTone=target?.profitTone??'neutral';
 const [tone,setTone]=useState<ConditionalTone>(actualTone);
 useEffect(()=>setTone(actualTone),[session?.page,session?.frameKey,id,actualTone]);
 const source=session&&id&&kind?maintenance.getTargetOverride(session.page,session.frameKey,id,kind):{};
 const base=target?.base??{...TARGET_APPEARANCE,...(owned?{fontSize:owned.fontSize,textColor:owned.color}:{})};
 const appearance=mergeTargetAppearance(base,source);
 const selected=source.conditionalStyles?.[tone];
 const enabled=selected?.enabled===true;
 const update=(patch:Partial<ConditionalRule>)=>{
   if(!id||!supported)return;
   const updated=normalizeConditionalStyles({...source.conditionalStyles,
     [tone]:{...selected,enabled:enabled,...patch}});
   maintenance.patchTarget(id,{conditionalStyles:updated});
 };
 const remove=()=>{
   if(!id||!supported)return;
   const next={...source.conditionalStyles};delete next[tone];
   maintenance.patchTarget(id,{conditionalStyles:normalizeConditionalStyles(next)});
 };
 if(!session||!supported)return <Text style={{fontSize:12,color:theme.palette.textSecondary}}>
   目前 A 尚無可用的原生條件視覺適配。此功能僅支援已掛載的數值卡、
   文字、財務數值、前綴與通用元件；不能更動來源或計算規則。
 </Text>;
 const labels:Readonly<Record<ConditionalTone,string>>={gain:'上漲／獲利',loss:'下跌／虧損',neutral:'中性'};
 const activeNow=tone===actualTone;
 const baseOpacity=selected?.backgroundOpacity??appearance.backgroundOpacity;
 return <View style={{gap:9,marginTop:7}}>
   <Text style={{fontWeight:'800',fontSize:13,color:theme.palette.text}}>C｜依真實損益狀態切換外觀</Text>
   <Text style={{fontSize:11,color:theme.palette.textSecondary}}>
     目前已掛載資料狀態：{labels[actualTone]}。僅套用目前 A 的背景、
     邊框、文字與背景透明度，不會改變交易數值、狀態來源或其他頁面。
   </Text>
   <View style={{flexDirection:'row',flexWrap:'wrap',gap:6}}>
     {CONDITIONAL_TONES.map(item=><Pressable key={item} accessibilityRole="button"
       accessibilityLabel={'編輯'+labels[item]+'條件外觀'} onPress={()=>setTone(item)}
       style={{padding:9,borderWidth:1,borderRadius:8,borderColor:theme.palette.primary,
         backgroundColor:tone===item?theme.palette.primary:theme.palette.surface}}>
       <Text style={{fontSize:12,fontWeight:'700',color:tone===item?'#FFFFFF':theme.palette.text}}>{labels[item]}</Text>
     </Pressable>)}
   </View>
   <View style={{minHeight:43,flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:10}}>
     <Text style={{fontSize:12,fontWeight:'800',color:theme.palette.text}}>C｜啟用此狀態的條件外觀</Text>
     <Switch accessibilityLabel={'啟用'+labels[tone]+'外觀'} value={enabled}
       onValueChange={value=>update({enabled:value})}/>
   </View>
   {!activeNow?<Text style={{fontSize:11,color:theme.palette.textSecondary}}>
     目前真實資料不是此狀態；設定先存於當前 A 草稿，待真實狀態符合時才渲染，不製造假行情。
   </Text>:<Text style={{fontSize:11,color:theme.palette.primary}}>
     此狀態符合目前真實資料；啟用並調色後，請查看上方原位預覽。
   </Text>}
   {enabled?<View style={{gap:8}}>
     <ColorPalettePicker label="C｜背景顏色" value={selected?.backgroundColor??appearance.backgroundColor}
       onChange={value=>update({backgroundColor:value})}/>
     <ColorPalettePicker label="C｜文字顏色" value={selected?.textColor??appearance.textColor}
       onChange={value=>update({textColor:value})}/>
     <ColorPalettePicker label="C｜邊框顏色" value={selected?.borderColor??appearance.borderColor}
       onChange={value=>update({borderColor:value})}/>
     <Text style={{color:theme.palette.text,fontWeight:'700'}}>C｜背景透明度 {Math.round(baseOpacity*100)}%</Text>
     <View style={{flexDirection:'row',alignItems:'center',gap:10}}>
       {([-0.05,0.05] as const).map(delta=><Pressable key={delta} accessibilityRole="button"
         accessibilityLabel={'背景透明度'+(delta<0?'減少':'增加')+' 5%'}
         onPress={()=>update({backgroundOpacity:Math.round(Math.min(1,Math.max(0,baseOpacity+delta))*100)/100})}
         style={{padding:10,borderRadius:8,borderWidth:1,borderColor:theme.palette.primary,flex:1,alignItems:'center'}}>
         <Text style={{color:theme.palette.primary,fontWeight:'800'}}>{delta<0?'−5%':'+5%'}</Text>
       </Pressable>)}
     </View>
   </View>:null}
   {selected?<Pressable accessibilityRole="button" accessibilityLabel={'清除'+labels[tone]+'條件規則'}
     onPress={remove} style={{padding:8,alignItems:'center'}}>
     <Text style={{color:theme.palette.loss,fontWeight:'700'}}>清除此狀態的局部規則</Text>
   </Pressable>:null}
   <Text style={{color:theme.palette.textSecondary,fontSize:11}}>
     目前為暫存草稿；工作台底部「儲存／套用」才持久化。原生資料來源與帳務公式一律不可寫入。
   </Text>
 </View>;
}
