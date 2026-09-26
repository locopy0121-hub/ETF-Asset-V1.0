import {Pressable,Text,View} from 'react-native';
import {useMaintenance} from './MaintenanceRuntime';
import {useThemeRuntime} from '../theme/ThemeRuntime';
import {SIMULATION_STATES,SIMULATION_LABELS} from './dataSimulation';
/** B 資訊顯示 → C 資料狀態模擬：no writes, mock source, or extra AB navigation. */
export function DataSimulationToolDetails(){
 const m=useMaintenance(),theme=useThemeRuntime(),session=m.session;
 if(!session||session.scope!=='target'||!session.target||
   !['metric','text','value','prefix','generic'].includes(session.target.kind))return <Text style={{color:theme.palette.textSecondary}}>
   請選取真正掛載的數值或文字 A；其他元件尚無安全的模擬渲染適配。
 </Text>;
 return <View style={{gap:10,marginTop:9}}>
   <Text style={{fontWeight:'800',color:theme.palette.text}}>C｜目前 A 的即時模擬預覽</Text>
   <Text style={{fontSize:12,color:theme.palette.textSecondary}}>
     僅暫時覆蓋上方目前 A 的顯示情境。上漲／下跌／中性使用已設定的條件外觀；
     讀取中、資料延遲、失敗只顯示情境提示，絕不捏造價格、修改帳務數字、同步其他元件或寫入備份。
   </Text>
   <View style={{flexDirection:'row',flexWrap:'wrap',gap:7}}>
     {SIMULATION_STATES.map(state=><Pressable key={state} accessibilityRole="button"
       accessibilityLabel={'模擬 '+SIMULATION_LABELS[state]}
       onPress={()=>m.setPreviewState(state)}
       style={{paddingHorizontal:10,paddingVertical:9,borderWidth:1,borderRadius:8,
         borderColor:theme.palette.primary,backgroundColor:session.previewState===state?theme.palette.primary:theme.palette.surface}}>
       <Text style={{fontSize:12,fontWeight:'700',color:session.previewState===state?'#FFFFFF':theme.palette.text}}>
         {SIMULATION_LABELS[state]}
       </Text>
     </Pressable>)}
   </View>
   <Text style={{fontSize:11,color:theme.palette.textSecondary}}>
     目前：{SIMULATION_LABELS[session.previewState]}。切換 A、取消或離開維護模式會還原真實顯示，正式「儲存／套用」不保存模擬狀態。
   </Text>
 </View>;
}
