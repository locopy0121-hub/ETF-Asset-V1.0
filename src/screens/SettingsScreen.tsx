import { useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import { MonitorControlPanel } from '../components/monitor/MonitorControlPanel';
import { WidgetControlPanel } from '../components/widget/WidgetControlPanel';
import { PageShell } from '../components/PageShell';
import { PAGE_FRAMES } from '../domain/frameRegistry';
import { DEFAULT_MONITOR_CONFIG, type MonitorConfig } from '../monitor/monitorDomain';
import { useMarketRuntime, type MarketUpdateConfig } from '../market/MarketRuntime';
import { FINANCE_FORMULA_CATALOG } from '../finance/financeFormulaCatalog';
import { colors, radius, spacing } from '../theme/tokens';
import { DEFAULT_WIDGET_CONFIG, type WidgetConfig } from '../widget/widgetDomain';

const children:Record<string,readonly string[]>={
  general:['顯示與主題','通知與提醒','數字格式'],
  accounting:['券商與費率參數','交易預設值','股息帳務','運算公式'],
  plugins:['Widget（mobile 桌面）','Floating Monitor（浮動即時視窗）'],
  system:['市場更新','背景執行與權限','效能與診斷'],
  backup:['建立備份','還原資料','匯入 / 匯出'],
  disclaimer:['免責聲明','隱私資訊','版本資訊'],
};

type PluginPanel = 'widget' | 'monitor' | null;
type SystemPanel = 'market' | null;
type AccountingPanel = 'formulas' | null;
export function SettingsScreen() {
  const [open,setOpen]=useState<string|null>(null);
  const [pluginPanel,setPluginPanel]=useState<PluginPanel>('widget');
  const [widgetConfig,setWidgetConfig]=useState<WidgetConfig>(DEFAULT_WIDGET_CONFIG);
  const [monitorConfig,setMonitorConfig]=useState<MonitorConfig>(DEFAULT_MONITOR_CONFIG);
  const [systemPanel,setSystemPanel]=useState<SystemPanel>(null);
  const [accountingPanel,setAccountingPanel]=useState<AccountingPanel>(null);
  const market=useMarketRuntime();

  return <PageShell title="控制中心" subtitle="主設定負責全局；各頁齒輪負責該頁框架">
    <View style={styles.ruleCard}>
      <Text style={styles.ruleTitle}>A-B 關係層定律</Text>
      <Text style={styles.ruleText}>每個實際框架就是設定大項 A；展開後才顯示直接 B 層。B 可成為下一層新的 A，禁止跨層直接控制。</Text>
    </View>
    {PAGE_FRAMES.settings.map(frame=>{
      const expanded=open===frame.key;
      return <View key={frame.key} style={styles.section}>
        <Pressable onPress={()=>setOpen(expanded?null:frame.key)} style={styles.header}>
          <View style={{flex:1}}><Text style={styles.title}>{frame.title}</Text><Text style={styles.description}>{frame.description}</Text></View>
          <Text style={styles.toggle}>{expanded?'−':'+'}</Text>
        </Pressable>
        {expanded?<View style={styles.body}>
          {(children[frame.key]??[]).map((item,index)=>{
            const pluginTarget:PluginPanel=frame.key==='plugins'?(index===0?'widget':'monitor'):null;
            const systemTarget:SystemPanel=frame.key==='system'&&index===0?'market':null;
            const accountingTarget:AccountingPanel=frame.key==='accounting'&&index===3?'formulas':null;
            const selected=(pluginTarget!==null&&pluginPanel===pluginTarget)||(systemTarget!==null&&systemPanel===systemTarget)||(accountingTarget!==null&&accountingPanel===accountingTarget);
            const onPress=pluginTarget?()=>setPluginPanel(pluginTarget):systemTarget?()=>setSystemPanel(systemTarget):accountingTarget?()=>setAccountingPanel(accountingTarget):undefined;
            return <Pressable
              key={item}
              onPress={onPress}
              style={[styles.row,selected&&styles.rowSelected]}
            >
              <View style={[styles.index,selected&&styles.indexSelected]}><Text style={[styles.indexText,selected&&styles.indexTextSelected]}>{index+1}</Text></View>
              <Text style={[styles.rowLabel,selected&&styles.rowLabelSelected]}>{item}</Text>
              <Text style={styles.arrow}>›</Text>
            </Pressable>;
          })}
          {frame.key==='accounting'&&accountingPanel==='formulas'?<AccountingFormulaList/>:null}
          {frame.key==='system'&&systemPanel==='market'?<MarketUpdatePanel value={market.config} onChange={market.setConfig} phase={market.phase} refreshing={market.refreshing} lastSuccessAt={market.lastSuccessAt} lastError={market.lastError} onRefresh={market.refresh}/>:null}
          {frame.key==='plugins'?<View style={styles.pluginStack}>
            <View style={styles.pluginRule}><Text style={styles.pluginRuleTitle}>外掛分離原則</Text><Text style={styles.pluginRuleText}>Widget 只存在 mobile 桌面；Floating Monitor 是跨 App 浮動即時視窗。共用 Shared Snapshot，不共用產品邏輯與控制 UI。</Text></View>
            {pluginPanel==='widget'?<WidgetControlPanel value={widgetConfig} onChange={setWidgetConfig}/>:null}
            {pluginPanel==='monitor'?<MonitorControlPanel value={monitorConfig} onChange={setMonitorConfig}/>:null}
          </View>:null}
        </View>:null}
      </View>;
    })}
  </PageShell>;
}

function AccountingFormulaList(){
  return <View style={styles.formulaPanel}>
    <Text style={styles.panelTitle}>運算公式</Text>
    <Text style={styles.panelHint}>唯讀完整清單。此處只供查看，不可在設定頁直接修改金融核心。</Text>
    {FINANCE_FORMULA_CATALOG.map((item,index)=><View key={item.title} style={styles.formulaRow}>
      <View style={styles.formulaIndex}><Text style={styles.formulaIndexText}>{index+1}</Text></View>
      <View style={styles.formulaBody}>
        <Text style={styles.formulaTitle}>{item.title}</Text>
        <Text style={styles.formulaText}>{item.formula}</Text>
        {item.note?<Text style={styles.formulaNote}>{item.note}</Text>:null}
      </View>
    </View>)}
  </View>;
}

function MarketUpdatePanel({value,onChange,phase,refreshing,lastSuccessAt,lastError,onRefresh}:{value:MarketUpdateConfig;onChange:(next:MarketUpdateConfig)=>void;phase:string;refreshing:boolean;lastSuccessAt:number|null;lastError:string|null;onRefresh:()=>Promise<void>}){
  const patch=(next:Partial<MarketUpdateConfig>)=>onChange({...value,...next});
  const patchLive=(next:Partial<MarketUpdateConfig['live']>)=>patch({live:{...value.live,...next}});
  const patchAfterHours=(next:Partial<MarketUpdateConfig['afterHours']>)=>patch({afterHours:{...value.afterHours,...next}});
  return <View style={styles.marketPanel}>
    <Text style={styles.panelTitle}>市場更新</Text>
    <Text style={styles.panelHint}>行情來源：{value.source}｜目前狀態：{phase==='live'?'盤中':phase==='afterHours'?'盤後':'停止'}。排程總控 → 盤中排程 → 盤後排程。</Text>
    <View style={styles.controlRow}><View><Text style={styles.controlLabel}>手動更新行情</Text><Text style={styles.controlNote}>{lastSuccessAt?`上次成功 ${new Date(lastSuccessAt).toLocaleTimeString('zh-TW')}`:'尚未成功更新'}{lastError?` · ${lastError}`:''}</Text></View><Pressable disabled={refreshing} style={[styles.manualRefresh,refreshing&&styles.disabled]} onPress={()=>{void onRefresh();}}><Text style={styles.manualRefreshText}>{refreshing?'更新中':'立即更新'}</Text></Pressable></View>
    <ToggleRow label="啟用市場更新排程" value={value.scheduleEnabled} onChange={scheduleEnabled=>patch({scheduleEnabled})}/>
    <ToggleRow label="回到前景立即刷新" value={value.refreshOnForeground} onChange={refreshOnForeground=>patch({refreshOnForeground})}/>
    <ToggleRow label="停止全部自動更新" value={value.stopAll} onChange={stopAll=>patch({stopAll})}/>

    <Text style={styles.subTitle}>盤中</Text>
    <ToggleRow label="啟用盤中排程" value={value.live.enabled} onChange={enabled=>patchLive({enabled})}/>
    <TimeRow label="開始" value={value.live.start} onChange={start=>patchLive({start})}/>
    <TimeRow label="結束" value={value.live.end} onChange={end=>patchLive({end})}/>
    <FrequencyRow label="更新頻率" value={value.live.refreshSeconds} onChange={refreshSeconds=>patchLive({refreshSeconds})}/>

    <Text style={styles.subTitle}>盤後</Text>
    <ToggleRow label="啟用盤後排程" value={value.afterHours.enabled} onChange={enabled=>patchAfterHours({enabled})}/>
    <TimeRow label="開始" value={value.afterHours.start} onChange={start=>patchAfterHours({start})}/>
    <TimeRow label="結束" value={value.afterHours.end} onChange={end=>patchAfterHours({end})}/>
    <FrequencyRow label="更新頻率" value={value.afterHours.refreshSeconds} onChange={refreshSeconds=>patchAfterHours({refreshSeconds})}/>
  </View>;
}
function ToggleRow({label,value,onChange}:{label:string;value:boolean;onChange:(value:boolean)=>void}){
  return <View style={styles.controlRow}><Text style={styles.controlLabel}>{label}</Text><Switch value={value} onValueChange={onChange}/></View>;
}
function TimeRow({label,value,onChange}:{label:string;value:string;onChange:(value:string)=>void}){
  return <View style={styles.controlRow}><Text style={styles.controlLabel}>{label}</Text><TextInput value={value} onChangeText={onChange} style={styles.timeInput} maxLength={5} placeholder="HH:MM" placeholderTextColor={colors.textSecondary}/></View>;
}
function FrequencyRow({label,value,onChange}:{label:string;value:number;onChange:(value:number)=>void}){
  const set=(next:number)=>onChange(Math.max(1,Math.min(3600,next)));
  return <View style={styles.controlRow}>
    <View><Text style={styles.controlLabel}>{label}</Text><Text style={styles.controlNote}>最低 1 秒</Text></View>
    <View style={styles.stepper}>
      <Pressable style={styles.stepButton} onPress={()=>set(value-1)}><Text style={styles.stepText}>−</Text></Pressable>
      <TextInput keyboardType="number-pad" value={String(value)} onChangeText={text=>set(Number(text)||1)} style={styles.frequencyInput}/>
      <Text style={styles.seconds}>秒</Text>
      <Pressable style={styles.stepButton} onPress={()=>set(value+1)}><Text style={styles.stepText}>＋</Text></Pressable>
    </View>
  </View>;
}

const styles=StyleSheet.create({
  ruleCard:{backgroundColor:colors.surfaceMuted,borderRadius:radius.lg,padding:spacing.lg,borderWidth:1,borderColor:colors.border},
  ruleTitle:{fontSize:14,fontWeight:'900',color:colors.primary},
  ruleText:{fontSize:11,lineHeight:18,color:colors.textSecondary,marginTop:6},
  section:{backgroundColor:colors.surface,borderRadius:radius.lg,borderWidth:1,borderColor:colors.border,overflow:'hidden'},
  header:{padding:spacing.lg,flexDirection:'row',alignItems:'center',gap:spacing.md},
  title:{fontSize:17,fontWeight:'900',color:colors.text},
  description:{fontSize:11,color:colors.textSecondary,marginTop:3},
  toggle:{fontSize:25,fontWeight:'700',color:colors.primary},
  body:{paddingHorizontal:spacing.lg,paddingBottom:spacing.lg,borderTopWidth:StyleSheet.hairlineWidth,borderTopColor:colors.border},
  row:{paddingVertical:13,flexDirection:'row',alignItems:'center',gap:10,borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:colors.border},
  rowSelected:{backgroundColor:colors.surfaceMuted},
  index:{width:24,height:24,borderRadius:12,backgroundColor:colors.surfaceMuted,alignItems:'center',justifyContent:'center'},
  indexSelected:{backgroundColor:colors.primary},
  indexText:{fontSize:10,fontWeight:'900',color:colors.primary},
  indexTextSelected:{color:'#FFFFFF'},
  rowLabel:{flex:1,fontSize:13,fontWeight:'800',color:colors.text},
  rowLabelSelected:{color:colors.primary},
  arrow:{fontSize:22,color:colors.textSecondary},
  pluginStack:{gap:10,marginTop:12},
  formulaPanel:{marginTop:12,padding:12,borderRadius:radius.md,backgroundColor:colors.surfaceMuted},
  formulaRow:{flexDirection:'row',gap:10,paddingVertical:11,borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:colors.border},
  formulaIndex:{width:24,height:24,borderRadius:12,backgroundColor:colors.surface,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:colors.border},
  formulaIndexText:{fontSize:9,fontWeight:'900',color:colors.primary},
  formulaBody:{flex:1},
  formulaTitle:{fontSize:11,fontWeight:'900',color:colors.text},
  formulaText:{fontSize:10,lineHeight:16,color:colors.text,marginTop:3},
  formulaNote:{fontSize:9,lineHeight:14,color:colors.textSecondary,marginTop:3},
  marketPanel:{gap:10,marginTop:12,padding:12,borderRadius:radius.md,backgroundColor:colors.surfaceMuted},
  panelTitle:{fontSize:14,fontWeight:'900',color:colors.primary},
  panelHint:{fontSize:10,lineHeight:16,color:colors.textSecondary},
  subTitle:{fontSize:12,fontWeight:'900',color:colors.text,marginTop:6},
  controlRow:{minHeight:44,flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:12,borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:colors.border},
  controlLabel:{fontSize:11,fontWeight:'800',color:colors.text},
  controlNote:{fontSize:9,color:colors.textSecondary,marginTop:2},
  timeInput:{width:82,borderWidth:1,borderColor:colors.border,borderRadius:radius.md,paddingHorizontal:10,paddingVertical:8,color:colors.text,textAlign:'center',fontWeight:'800'},
  stepper:{flexDirection:'row',alignItems:'center',gap:6},
  stepButton:{width:30,height:30,borderRadius:15,backgroundColor:colors.surface,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:colors.border},
  stepText:{fontSize:16,fontWeight:'900',color:colors.primary},
  frequencyInput:{minWidth:48,borderWidth:1,borderColor:colors.border,borderRadius:radius.md,paddingHorizontal:8,paddingVertical:7,color:colors.text,textAlign:'center',fontWeight:'900'},
  seconds:{fontSize:10,fontWeight:'800',color:colors.textSecondary},
  manualRefresh:{paddingHorizontal:12,paddingVertical:8,borderRadius:radius.md,backgroundColor:colors.primary},
  manualRefreshText:{fontSize:10,fontWeight:'900',color:'#FFF'},
  disabled:{opacity:.45},
  pluginRule:{padding:12,borderRadius:radius.md,backgroundColor:colors.surfaceMuted},
  pluginRuleTitle:{fontSize:11,fontWeight:'900',color:colors.primary},
  pluginRuleText:{fontSize:10,lineHeight:16,color:colors.textSecondary,marginTop:4},
});
