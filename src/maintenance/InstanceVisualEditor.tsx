import {Pressable,ScrollView,Switch,Text,View} from 'react-native';
import {ColorPalettePicker} from '../components/ColorPalettePicker';
import {useThemeRuntime} from '../theme/ThemeRuntime';
import {useMaintenance} from './MaintenanceRuntime';
import {mergeTargetAppearance,TARGET_APPEARANCE,type TargetAppearance,type TargetOverride} from './inspectionModel';
import type {MaintenanceInstance} from './componentLibrary';

// The native/engineer-owned objects use the very same target appearance schema and runtime.
export function InstanceVisualEditor({instance}:{instance:MaintenanceInstance}){
  const maint=useMaintenance(),theme=useThemeRuntime(),s=maint.session;
  if(!s||s.scope!=='instance'||s.instanceId!==instance.id)return null;
  const kind=instance.templateId==='parent-frame'?'frame':instance.templateId==='divider'?'generic':'text';
  const id='installed:'+instance.id;
  const override=maint.getTargetOverride(s.page,s.frameKey,id,kind);
  const visual=mergeTargetAppearance({...TARGET_APPEARANCE,fontSize:instance.fontSize,
    textColor:instance.color,backgroundColor:theme.palette.surface},override);
  const patch=(field:keyof TargetAppearance,value:unknown)=>maint.patchInstanceVisual(instance.id,{[field]:value} as TargetOverride);
  const color=(label:string,field:'textColor'|'backgroundColor'|'borderColor'|'gradientEndColor'|'gradientMidColor'|'shadowColor'|'glowColor')=>
    <ColorPalettePicker key={field} label={label} value={visual[field]} onChange={v=>patch(field,v)}/>;
  const toggle=(label:string,field:'shadowEnabled'|'glowEnabled'|'gradientMidEnabled'|'textProfitColor'|'backgroundProfitColor'|'borderProfitColor')=>
    <View key={field} style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:8,minHeight:42}}>
      <Text style={{color:theme.palette.text,flex:1}}>{label}</Text>
      <Switch value={visual[field]===true} onValueChange={v=>patch(field,v)}/>
    </View>;
  const step=(label:string,field:'fontSize'|'backgroundOpacity'|'borderWidth'|'borderRadius'|'shadowOpacity'|'shadowBlur'|'glowOpacity'|'glowWidth'|'padding'|'letterSpacing'|'lineHeight'|'marginVertical'|'marginHorizontal',
    min:number,max:number,delta:number)=>
    <View key={field} style={{flexDirection:'row',alignItems:'center',gap:8,minHeight:42}}>
      <Text style={{color:theme.palette.text,flex:1}}>{label}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={label+'減少'} onPress={()=>patch(field,Math.max(min,Math.round((visual[field]-delta)*100)/100))}
        style={{padding:9,borderWidth:1,borderColor:theme.palette.border,borderRadius:7}}><Text style={{color:theme.palette.primary}}>－</Text></Pressable>
      <Text style={{minWidth:48,textAlign:'center',color:theme.palette.text}}>{delta<1?Math.round(visual[field]*100)+'%':String(visual[field])}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={label+'增加'} onPress={()=>patch(field,Math.min(max,Math.round((visual[field]+delta)*100)/100))}
        style={{padding:9,borderWidth:1,borderColor:theme.palette.border,borderRadius:7}}><Text style={{color:theme.palette.primary}}>＋</Text></Pressable>
    </View>;
  const choices=(label:string,field:'backgroundMode'|'gradientDirection'|'borderStyle'|'fontStyle'|'textDecorationLine'|'fontWeight',
    options:readonly (readonly [string,string])[])=>
    <View key={field} style={{gap:5}}><Text style={{color:theme.palette.text,fontWeight:'700'}}>{label}</Text>
      <View style={{flexDirection:'row',flexWrap:'wrap',gap:5}}>{options.map(([value,name])=>
        <Pressable key={value} accessibilityRole="button" onPress={()=>patch(field,value)}
          style={{borderWidth:1,borderRadius:7,padding:7,borderColor:theme.palette.primary,
            backgroundColor:visual[field]===value?theme.palette.primary:theme.palette.surface}}>
          <Text style={{color:visual[field]===value?'#FFFFFF':theme.palette.text}}>{name}</Text>
        </Pressable>)}</View>
    </View>;
  return <ScrollView nestedScrollEnabled style={{maxHeight:460}} contentContainerStyle={{gap:9,paddingBottom:10}}>
    <Text style={{color:theme.palette.textSecondary,fontSize:12}}>共用中央材質技能，所有外觀變更先預覽、按「儲存／套用」才寫入。同類同步範圍由上方控制。</Text>
    {color('文字顏色','textColor')}
    {toggle('文字套用損益色','textProfitColor')}
    {step('文字大小','fontSize',8,48,1)}
    {choices('字重','fontWeight',[['normal','標準'],['500','中等'],['700','粗體'],['900','特粗']])}
    {choices('字形','fontStyle',[['normal','標準'],['italic','斜體']])}
    {choices('文字裝飾','textDecorationLine',[['none','無'],['underline','底線'],['line-through','刪除線']])}
    {step('字距','letterSpacing',-4,16,1)}
    {step('行高','lineHeight',0,96,2)}
    {color('背景主色','backgroundColor')}
    {toggle('背景套用損益色','backgroundProfitColor')}
    {step('背景透明度','backgroundOpacity',0,1,.05)}
    {choices('背景材質','backgroundMode',[['solid','純色'],['gradient','漸層']])}
    {choices('漸層方向','gradientDirection',[['horizontal','水平'],['vertical','垂直']])}
    {color('漸層終點色','gradientEndColor')}
    {toggle('第三漸層色','gradientMidEnabled')}
    {visual.gradientMidEnabled?color('漸層中間色','gradientMidColor'):null}
    {color('邊框顏色','borderColor')}
    {toggle('邊框套用損益色','borderProfitColor')}
    {step('邊框寬度','borderWidth',0,8,1)}
    {step('圓角','borderRadius',0,48,2)}
    {choices('邊框樣式','borderStyle',[['solid','實線'],['dashed','虛線'],['dotted','點線']])}
    {step('內距','padding',0,32,2)}
    {step('上下外距','marginVertical',0,32,2)}
    {step('左右外距','marginHorizontal',0,32,2)}
    {toggle('開啟陰影','shadowEnabled')}
    {visual.shadowEnabled?<>{color('陰影顏色','shadowColor')}
      {step('陰影強度','shadowOpacity',0,.8,.05)}{step('陰影柔邊','shadowBlur',0,48,2)}</>:null}
    {toggle('開啟光圈','glowEnabled')}
    {visual.glowEnabled?<>{color('光圈顏色','glowColor')}
      {step('光圈強度','glowOpacity',0,.8,.05)}{step('光圈寬度','glowWidth',0,16,1)}</>:null}
  </ScrollView>;
}
