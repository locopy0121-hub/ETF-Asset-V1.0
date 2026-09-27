import {Pressable,Text,View} from 'react-native';
import {CHART_DATA_FIELDS,validChartFields,type ChartDataField,type ChartRender} from '../domain/chartDataSelection';
import {useMaintenance} from './MaintenanceRuntime';
import {useThemeRuntime} from '../theme/ThemeRuntime';

/** C-panel: applies display-only bindings to the ACTUAL selected chart target. */
export function ChartDataToolDetails(){
 const maint=useMaintenance(),theme=useThemeRuntime(),s=maint.session;
 const target=s?.scope==='target'?s.target:undefined;
 if(!target||!target.id.startsWith('holding-chart:'))
  return <Text style={{color:theme.palette.textSecondary}}>目前物件尚未接入圖表資料選擇器；中央工具仍可查閱。</Text>;
 const override=maint.getTargetOverride(target.page,target.frameKey,target.id,target.kind);
 const selected=validChartFields(override.chartSeries??target.base.chartSeries);
 const renderMode=override.chartRender??target.base.chartRender;
 const toggle=(field:ChartDataField)=>{
  const next=selected.includes(field)?selected.filter(item=>item!==field):[...selected,field];
  if(next.length)maint.patchTarget(target.id,{chartSeries:next});
 };
 return <View style={{gap:9}}>
  <Text style={{color:theme.palette.text,fontSize:13,fontWeight:'800'}}>資料來源：官方 TWSE 日行情／正式持股（只讀）</Text>
  <Text style={{color:theme.palette.textSecondary,fontSize:11}}>複選資料系列；沒有可信數據時顯示缺失狀態，不產生示意價格。</Text>
  <View style={{flexDirection:'row',flexWrap:'wrap',gap:7}}>
   {CHART_DATA_FIELDS.map(field=><Pressable key={field.id} accessibilityRole="checkbox"
    accessibilityState={{checked:selected.includes(field.id)}} onPress={()=>toggle(field.id)}
    style={{borderWidth:1,borderRadius:8,paddingHorizontal:10,paddingVertical:9,
      borderColor:selected.includes(field.id)?theme.palette.primary:theme.palette.border,
      backgroundColor:selected.includes(field.id)?theme.palette.surfaceMuted:theme.palette.surface}}>
    <Text style={{fontSize:12,color:theme.palette.text}}>{selected.includes(field.id)?'☑':'□'} {field.label}</Text>
   </Pressable>)}
  </View>
  <Text style={{color:theme.palette.text,fontWeight:'800'}}>圖表呈現方式</Text>
  <View style={{flexDirection:'row',flexWrap:'wrap',gap:7}}>
   {([['candles','K 線'],['line','折線'],['bars','柱狀']] as const).map(([value,label])=>
    <Pressable key={value} accessibilityRole="button" accessibilityState={{selected:renderMode===value}}
      onPress={()=>maint.patchTarget(target.id,{chartRender:value as ChartRender})}
      style={{borderWidth:1,borderRadius:8,paddingHorizontal:10,paddingVertical:9,
        borderColor:renderMode===value?theme.palette.primary:theme.palette.border}}>
      <Text style={{color:theme.palette.text}}>{renderMode===value?'✓ ':''}{label}</Text>
    </Pressable>)}
  </View>
  <Text style={{color:theme.palette.textSecondary,fontSize:11}}>設定只暫存於此圖表；按工作台「儲存／套用」後才正式生效。其他同類圖表僅在明確開啟連動後同步外觀。</Text>
 </View>;
}