import { useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import { MonitorControlPanel } from '../components/monitor/MonitorControlPanel';
import { WidgetControlPanel } from '../components/widget/WidgetControlPanel';
import { PageShell } from '../components/PageShell';
import { PAGE_FRAMES } from '../domain/frameRegistry';
import { DEFAULT_MONITOR_CONFIG, type MonitorConfig } from '../monitor/monitorDomain';
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
type MarketUpdateConfig={
  scheduleEnabled:boolean;
  refreshOnForeground:boolean;
  stopAll:boolean;
  live:{enabled:boolean;start:string;end:string;refreshSeconds:number};
  afterHours:{enabled:boolean;start:string;end:string;refreshSeconds:number};
};
const DEFAULT_MARKET_UPDATE:MarketUpdateConfig={
  scheduleEnabled:true,
  refreshOnForeground:true,
  stopAll:false,
  live:{enabled:true,start:'09:00',end:'13:30',refreshSeconds:5},
  afterHours:{enabled:true,start:'13:31',end:'18:00',refreshSeconds:60},
};

export function SettingsScreen() {
  const [open,setOpen]=useState<string|null>(null);
  const [pluginPanel,setPluginPanel]=useState<PluginPanel>('widget');
  const [widgetConfig,setWidgetConfig]=useState<WidgetConfig>(DEFAULT_WIDGET_CONFIG);
  const [monitorConfig,setMonitorConfig]=useState<MonitorConfig>(DEFAULT_MONITOR_CONFIG);
  const [systemPanel,setSystemPanel]=useState<SystemPanel>(null);
  const [accountingPanel,setAccountingPanel]=useState<AccountingPanel>(null);
  const [marketUpdate,setMarketUpdate]=useState<MarketUpdateConfig>(DEFAULT_MARKET_UPDATE);

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
          {frame.key==='system'&&systemPanel==='market'?<MarketUpdatePanel value={marketUpdate} onChange={setMarketUpdate}/>:null}
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

const ACCOUNTING_FORMULAS:readonly {title:string;formula:string;note?:string}[]=[
  {title:'成交金額',formula:'股數 × 成交價'},
  {title:'買進現金支出',formula:'成交金額 ＋ 實際買進手續費'},
  {title:'賣出現金流入',formula:'成交金額 － 實際賣出手續費 － 實際證交稅'},
  {title:'標準手續費',formula:'成交金額 × 券商手續費率 × 折扣率',note:'依券商設定套用折扣與最低手續費規則'},
  {title:'實際手續費',formula:'採用該筆交易已確認的實際手續費',note:'一旦入帳即固化；後續不得因費率設定變更而重算歷史交易'},
  {title:'ETF 賣出證交稅',formula:'成交金額 × ETF 證交稅率',note:'實際稅金入帳後固化，不回頭重算'},
  {title:'金額取整',formula:'依金融核心規則對成交金額、手續費、稅金、股息與補充保費執行取整'},
  {title:'純成交成本',formula:'所有仍持有部位對應的純成交金額合計'},
  {title:'含費持有成本',formula:'純成交成本 ＋ 對應仍持有部位的實際買進手續費'},
  {title:'純成交均價',formula:'純成交成本 ÷ 持有股數',note:'不含任何手續費'},
  {title:'含費成本均價',formula:'含費持有成本 ÷ 持有股數'},
  {title:'目前市值',formula:'持有股數 × 即時市價'},
  {title:'預估賣出手續費',formula:'目前市值 × 券商手續費率 × 折扣率',note:'僅供目前清算估算，不覆寫歷史實際費用'},
  {title:'預估賣出證交稅',formula:'目前市值 × ETF 證交稅率'},
  {title:'預估清算價值',formula:'目前市值 － 預估賣出手續費 － 預估賣出證交稅'},
  {title:'未實現價格損益',formula:'目前市值 － 純成交成本'},
  {title:'未實現現金損益',formula:'預估清算價值 － 含費持有成本'},
  {title:'未實現價格報酬率',formula:'未實現價格損益 ÷ 純成交成本 × 100%'},
  {title:'未實現現金報酬率',formula:'未實現現金損益 ÷ 含費持有成本 × 100%'},
  {title:'賣出釋放純成本',formula:'賣出股數 × 賣出前純成交均價',note:'依移動平均成本法釋放'},
  {title:'賣出釋放含費成本',formula:'賣出股數 × 賣出前含費成本均價',note:'依移動平均成本法釋放'},
  {title:'已實現價格損益',formula:'賣出成交金額 － 賣出釋放純成本'},
  {title:'已實現現金損益',formula:'賣出現金流入 － 賣出釋放含費成本'},
  {title:'股息總額',formula:'符合配息資格股數 × 每股股息'},
  {title:'補充保費',formula:'依適用門檻與費率計算股息補充保費'},
  {title:'股息淨收入',formula:'股息總額 － 補充保費 － 其他實際扣款'},
  {title:'累積股息',formula:'所有已入帳股息淨收入合計'},
  {title:'含息總損益',formula:'未實現現金損益 ＋ 已實現現金損益 ＋ 累積股息'},
  {title:'含息總報酬率',formula:'含息總損益 ÷ 歷史現金投入基礎 × 100%'},
  {title:'現金餘額',formula:'期初現金 ＋ 入金 － 出金 － 買進支出 ＋ 賣出流入 ＋ 股息淨收入'},
  {title:'持股總市值',formula:'各持股目前市值加總'},
  {title:'總資產',formula:'持股總市值 ＋ 現金餘額'},
  {title:'資產權重',formula:'單一標的目前市值 ÷ 持股總市值 × 100%'},
  {title:'單期現金殖利率',formula:'該期每股股息 ÷ 參考價格 × 100%'},
  {title:'成本殖利率',formula:'年度每股股息 ÷ 持有成本均價 × 100%'},
  {title:'年化殖利率',formula:'依實際配息期間換算為一年基準'},
  {title:'歷史費稅鎖定規則',formula:'實際手續費與實際證交稅於交易寫入時固化',note:'Portfolio、Widget、Monitor 與報表只能加總或讀取，不得自行重跑費率公式'},
  {title:'單一金融核心規則',formula:'所有頁面與外掛只讀取 Canonical Finance Core 的計算結果',note:'禁止 UI、Widget、Monitor 各自重複計算'},
];

function AccountingFormulaList(){
  return <View style={styles.formulaPanel}>
    <Text style={styles.panelTitle}>運算公式</Text>
    <Text style={styles.panelHint}>唯讀完整清單。此處只供查看，不可在設定頁直接修改金融核心。</Text>
    {ACCOUNTING_FORMULAS.map((item,index)=><View key={item.title} style={styles.formulaRow}>
      <View style={styles.formulaIndex}><Text style={styles.formulaIndexText}>{index+1}</Text></View>
      <View style={styles.formulaBody}>
        <Text style={styles.formulaTitle}>{item.title}</Text>
        <Text style={styles.formulaText}>{item.formula}</Text>
        {item.note?<Text style={styles.formulaNote}>{item.note}</Text>:null}
      </View>
    </View>)}
  </View>;
}

function MarketUpdatePanel({value,onChange}:{value:MarketUpdateConfig;onChange:(next:MarketUpdateConfig)=>void}){
  const patch=(next:Partial<MarketUpdateConfig>)=>onChange({...value,...next});
  const patchLive=(next:Partial<MarketUpdateConfig['live']>)=>patch({live:{...value.live,...next}});
  const patchAfterHours=(next:Partial<MarketUpdateConfig['afterHours']>)=>patch({afterHours:{...value.afterHours,...next}});
  return <View style={styles.marketPanel}>
    <Text style={styles.panelTitle}>市場更新</Text>
    <Text style={styles.panelHint}>排程總控 → 盤中排程 → 盤後排程。每層只控制自己的下一層。</Text>
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
  pluginRule:{padding:12,borderRadius:radius.md,backgroundColor:colors.surfaceMuted},
  pluginRuleTitle:{fontSize:11,fontWeight:'900',color:colors.primary},
  pluginRuleText:{fontSize:10,lineHeight:16,color:colors.textSecondary,marginTop:4},
});
