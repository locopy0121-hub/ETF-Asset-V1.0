import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import { MonitorControlPanel } from '../components/monitor/MonitorControlPanel';
import { WidgetControlPanel } from '../components/widget/WidgetControlPanel';
import { PageShell } from '../components/PageShell';
import { PAGE_FRAMES } from '../domain/frameRegistry';
import { DEFAULT_MONITOR_CONFIG, type MonitorConfig } from '../monitor/monitorDomain';
import { useMarketRuntime, type MarketUpdateConfig } from '../market/MarketRuntime';
import { FINANCE_FORMULA_CATALOG } from '../finance/financeFormulaCatalog';
import { useBrokerSettingsRuntime, type RecurringFeeMode } from '../finance/BrokerSettingsRuntime';
import { colors, radius, spacing } from '../theme/tokens';
import { DEFAULT_WIDGET_CONFIG, type WidgetConfig } from '../widget/widgetDomain';

const children:Record<string,readonly string[]>={
  general:['顯示與主題','通知與提醒','數字格式'],
  accounting:['券商與手續費設定','交易預設值','股息帳務','運算公式'],
  plugins:['Widget（mobile 桌面）','Floating Monitor（浮動即時視窗）'],
  system:['市場更新','背景執行與權限','效能與診斷'],
  backup:['建立備份','還原資料','匯入 / 匯出'],
  disclaimer:['免責聲明','隱私資訊','版本資訊'],
};

type PluginPanel = 'widget' | 'monitor' | null;
type SystemPanel = 'market' | null;
type AccountingPanel = 'broker' | 'formulas' | null;
export function SettingsScreen() {
  const [open,setOpen]=useState<string|null>(null);
  const [pluginPanel,setPluginPanel]=useState<PluginPanel>(null);
  const [widgetConfig,setWidgetConfig]=useState<WidgetConfig>(DEFAULT_WIDGET_CONFIG);
  const [monitorConfig,setMonitorConfig]=useState<MonitorConfig>(DEFAULT_MONITOR_CONFIG);
  const [systemPanel,setSystemPanel]=useState<SystemPanel>(null);
  const [accountingPanel,setAccountingPanel]=useState<AccountingPanel>(null);
  const market=useMarketRuntime();
  const toggleTop=(key:string)=>{
    const next=open===key?null:key;
    setOpen(next);
    setPluginPanel(null);
    setSystemPanel(null);
    setAccountingPanel(null);
  };

  return <PageShell title="控制中心" subtitle="主設定負責全局；各頁齒輪負責該頁框架">
    <View style={styles.ruleCard}>
      <Text style={styles.ruleTitle}>A-B 關係層定律</Text>
      <Text style={styles.ruleText}>每個實際框架就是設定大項 A；展開後才顯示直接 B 層。B 可成為下一層新的 A，禁止跨層直接控制。</Text>
    </View>
    {PAGE_FRAMES.settings.map(frame=>{
      const expanded=open===frame.key;
      return <View key={frame.key} style={styles.section}>
        <Pressable onPress={()=>toggleTop(frame.key)} style={styles.header}>
          <View style={{flex:1}}><Text style={styles.title}>{frame.title}</Text><Text style={styles.description}>{frame.description}</Text></View>
          <Text style={styles.toggle}>{expanded?'−':'+'}</Text>
        </Pressable>
        {expanded?<View style={styles.body}>
          {(children[frame.key]??[]).map((item,index)=>{
            const pluginTarget:PluginPanel=frame.key==='plugins'?(index===0?'widget':'monitor'):null;
            const systemTarget:SystemPanel=frame.key==='system'&&index===0?'market':null;
            const accountingTarget:AccountingPanel=frame.key==='accounting'?(index===0?'broker':index===3?'formulas':null):null;
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
          {frame.key==='accounting'&&accountingPanel==='broker'?<BrokerFeeSettingsPanel/>:null}
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

type BrokerDraft={
  commissionRatePct:string;
  commissionDiscountPct:string;
  minimumRoundLot:string;
  minimumOddLot:string;
  recurringMode:RecurringFeeMode;
  recurringFixedFee:string;
  recurringDiscountPct:string;
  recurringMinimumFee:string;
};

function BrokerFeeSettingsPanel(){
  const runtime=useBrokerSettingsRuntime();
  const makeDraft=():BrokerDraft=>({
    commissionRatePct:String(runtime.activeProfile.commissionRate*100),
    commissionDiscountPct:String(runtime.activeProfile.commissionDiscount*100),
    minimumRoundLot:String(runtime.activeProfile.minimumCommissionRoundLot),
    minimumOddLot:String(runtime.activeProfile.minimumCommissionOddLot),
    recurringMode:runtime.recurring.mode,
    recurringFixedFee:String(runtime.recurring.fixedFee),
    recurringDiscountPct:String(runtime.recurring.discount*100),
    recurringMinimumFee:String(runtime.recurring.minimumFee),
  });
  const [draft,setDraft]=useState<BrokerDraft>(makeDraft);

  useEffect(()=>{setDraft(makeDraft());},[
    runtime.activeProfile.id,
    runtime.activeProfile.commissionRate,
    runtime.activeProfile.commissionDiscount,
    runtime.activeProfile.minimumCommissionRoundLot,
    runtime.activeProfile.minimumCommissionOddLot,
    runtime.recurring.mode,
    runtime.recurring.fixedFee,
    runtime.recurring.discount,
    runtime.recurring.minimumFee,
  ]);

  const nonNegative=(text:string,fallback:number)=>{
    const n=Number(text.trim());
    return Number.isFinite(n)&&n>=0?n:fallback;
  };
  const save=()=>{
    runtime.setProfile({
      ...runtime.activeProfile,
      commissionRate:nonNegative(draft.commissionRatePct,runtime.activeProfile.commissionRate*100)/100,
      commissionDiscount:nonNegative(draft.commissionDiscountPct,runtime.activeProfile.commissionDiscount*100)/100,
      minimumCommissionRoundLot:nonNegative(draft.minimumRoundLot,runtime.activeProfile.minimumCommissionRoundLot),
      minimumCommissionOddLot:nonNegative(draft.minimumOddLot,runtime.activeProfile.minimumCommissionOddLot),
    });
    runtime.setRecurring(runtime.activeProfile.id,{
      mode:draft.recurringMode,
      fixedFee:nonNegative(draft.recurringFixedFee,runtime.recurring.fixedFee),
      discount:nonNegative(draft.recurringDiscountPct,runtime.recurring.discount*100)/100,
      minimumFee:nonNegative(draft.recurringMinimumFee,runtime.recurring.minimumFee),
    });
  };

  return <View style={styles.brokerPanel}>
    <Text style={styles.panelTitle}>券商與手續費設定</Text>
    <Text style={styles.panelHint}>設定只影響之後的公式預估；歷史已固化的實際手續費／實際證交稅不回算。所有金額欄位允許 0 元。</Text>

    <Text style={styles.subTitle}>券商 Profile</Text>
    <View style={styles.brokerTabs}>
      {runtime.profiles.map(profile=>{
        const active=profile.id===runtime.activeProfileId;
        return <Pressable key={profile.id} style={[styles.brokerTab,active&&styles.brokerTabActive]} onPress={()=>runtime.setActiveProfileId(profile.id)}>
          <Text style={[styles.brokerTabText,active&&styles.brokerTabTextActive]}>{profile.name}</Text>
        </Pressable>;
      })}
    </View>

    <Text style={styles.subTitle}>一般交易</Text>
    <SettingNumberRow label="公定手續費率" suffix="%" value={draft.commissionRatePct} onChange={commissionRatePct=>setDraft(current=>({...current,commissionRatePct}))}/>
    <SettingNumberRow label="電子下單折扣率" suffix="%" value={draft.commissionDiscountPct} onChange={commissionDiscountPct=>setDraft(current=>({...current,commissionDiscountPct}))}/>
    <SettingNumberRow label="整股最低手續費" suffix="元" value={draft.minimumRoundLot} onChange={minimumRoundLot=>setDraft(current=>({...current,minimumRoundLot}))}/>
    <SettingNumberRow label="零股最低手續費" suffix="元" value={draft.minimumOddLot} onChange={minimumOddLot=>setDraft(current=>({...current,minimumOddLot}))}/>

    <Text style={styles.subTitle}>定期定額</Text>
    <View style={styles.modeRow}>
      <Pressable style={[styles.modeButton,draft.recurringMode==='fixed'&&styles.modeButtonActive]} onPress={()=>setDraft(current=>({...current,recurringMode:'fixed'}))}>
        <Text style={[styles.modeText,draft.recurringMode==='fixed'&&styles.modeTextActive]}>固定單筆</Text>
      </Pressable>
      <Pressable style={[styles.modeButton,draft.recurringMode==='variable'&&styles.modeButtonActive]} onPress={()=>setDraft(current=>({...current,recurringMode:'variable'}))}>
        <Text style={[styles.modeText,draft.recurringMode==='variable'&&styles.modeTextActive]}>非固定</Text>
      </Pressable>
    </View>
    {draft.recurringMode==='fixed'
      ?<SettingNumberRow label="固定單筆手續費" suffix="元" value={draft.recurringFixedFee} onChange={recurringFixedFee=>setDraft(current=>({...current,recurringFixedFee}))}/>
      :<>
        <SettingNumberRow label="定期定額折扣率" suffix="%" value={draft.recurringDiscountPct} onChange={recurringDiscountPct=>setDraft(current=>({...current,recurringDiscountPct}))}/>
        <SettingNumberRow label="定期定額最低手續費" suffix="元" value={draft.recurringMinimumFee} onChange={recurringMinimumFee=>setDraft(current=>({...current,recurringMinimumFee}))}/>
      </>}

    <Text style={styles.subTitle}>證交稅規則</Text>
    <View style={styles.readonlyRule}><Text style={styles.controlLabel}>ETF</Text><Text style={styles.ruleValue}>0.1%</Text></View>
    <View style={styles.readonlyRule}><Text style={styles.controlLabel}>一般股票</Text><Text style={styles.ruleValue}>0.3%</Text></View>

    <View style={styles.actionRow}>
      <Pressable style={styles.resetButton} onPress={()=>runtime.resetProfile(runtime.activeProfile.id)}><Text style={styles.resetButtonText}>重設</Text></Pressable>
      <Pressable style={styles.saveButton} onPress={save}><Text style={styles.saveButtonText}>更新設定</Text></Pressable>
    </View>
  </View>;
}

function SettingNumberRow({label,suffix,value,onChange}:{label:string;suffix:string;value:string;onChange:(value:string)=>void}){
  return <View style={styles.controlRow}>
    <Text style={styles.controlLabel}>{label}</Text>
    <View style={styles.numberEditor}>
      <TextInput keyboardType="decimal-pad" value={value} onChangeText={onChange} style={styles.settingNumberInput}/>
      <Text style={styles.numberSuffix}>{suffix}</Text>
    </View>
  </View>;
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
  brokerPanel:{gap:10,marginTop:12,padding:12,borderRadius:radius.md,backgroundColor:colors.surfaceMuted},
  brokerTabs:{flexDirection:'row',flexWrap:'wrap',gap:7},
  brokerTab:{paddingHorizontal:10,paddingVertical:8,borderRadius:radius.md,backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border},
  brokerTabActive:{backgroundColor:colors.primary,borderColor:colors.primary},
  brokerTabText:{fontSize:10,fontWeight:'900',color:colors.textSecondary},
  brokerTabTextActive:{color:'#FFF'},
  modeRow:{flexDirection:'row',gap:8},
  modeButton:{flex:1,paddingVertical:9,borderRadius:radius.md,backgroundColor:colors.surface,alignItems:'center',borderWidth:1,borderColor:colors.border},
  modeButtonActive:{backgroundColor:colors.primary,borderColor:colors.primary},
  modeText:{fontSize:10,fontWeight:'900',color:colors.textSecondary},
  modeTextActive:{color:'#FFF'},
  numberEditor:{flexDirection:'row',alignItems:'center',gap:6},
  settingNumberInput:{minWidth:82,borderWidth:1,borderColor:colors.border,borderRadius:radius.md,paddingHorizontal:10,paddingVertical:8,color:colors.text,textAlign:'right',fontWeight:'900',backgroundColor:colors.surface},
  numberSuffix:{minWidth:22,fontSize:10,fontWeight:'800',color:colors.textSecondary},
  readonlyRule:{minHeight:38,flexDirection:'row',alignItems:'center',justifyContent:'space-between',borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:colors.border},
  ruleValue:{fontSize:11,fontWeight:'900',color:colors.primary},
  actionRow:{flexDirection:'row',gap:8,marginTop:4},
  resetButton:{flex:1,paddingVertical:11,borderRadius:radius.md,backgroundColor:colors.surface,alignItems:'center',borderWidth:1,borderColor:colors.border},
  resetButtonText:{fontSize:11,fontWeight:'900',color:colors.textSecondary},
  saveButton:{flex:1,paddingVertical:11,borderRadius:radius.md,backgroundColor:colors.primary,alignItems:'center'},
  saveButtonText:{fontSize:11,fontWeight:'900',color:'#FFF'},
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
