import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { MonitorControlPanel } from '../components/monitor/MonitorControlPanel';
import { WidgetControlPanel } from '../components/widget/WidgetControlPanel';
import { PageShell } from '../components/PageShell';
import { PAGE_FRAMES } from '../domain/frameRegistry';
import { useMarket } from '../market/MarketRuntime';
import { DEFAULT_MONITOR_CONFIG, type MonitorConfig } from '../monitor/monitorDomain';
import { FINANCE_FORMULA_CATALOG } from '../settings/formulaCatalog';
import { colors, radius, spacing } from '../theme/tokens';
import { DEFAULT_WIDGET_CONFIG, type WidgetConfig } from '../widget/widgetDomain';

const children:Record<string,readonly string[]>={
  general:['顯示與主題','通知與提醒','數字格式'],
  accounting:['券商與費率參數','交易預設值','股息帳務','運算公式'],
  market:['行情來源','更新排程','市場狀態','ETF資料','行情快取','顯示設定','手動更新'],
  plugins:['Widget（mobile 桌面）','Floating Monitor（浮動即時視窗）'],
  system:['背景執行與權限','效能與診斷'],
  backup:['建立備份','還原資料','匯入 / 匯出'],
  disclaimer:['免責聲明','隱私資訊','版本資訊'],
};
type PluginPanel='widget'|'monitor'|null;

export function SettingsScreen(){
  const market=useMarket();
  const [open,setOpen]=useState<string|null>(null);
  const [childOpen,setChildOpen]=useState<string|null>(null);
  const [marketChild,setMarketChild]=useState<string|null>(null);
  const [scheduleChild,setScheduleChild]=useState<string|null>(null);
  const [pluginPanel,setPluginPanel]=useState<PluginPanel>(null);
  const [widgetConfig,setWidgetConfig]=useState<WidgetConfig>(DEFAULT_WIDGET_CONFIG);
  const [monitorConfig,setMonitorConfig]=useState<MonitorConfig>(DEFAULT_MONITOR_CONFIG);

  const toggleFrame=(key:string)=>{setOpen(current=>current===key?null:key);setChildOpen(null);setMarketChild(null);setScheduleChild(null);setPluginPanel(null);};

  return <PageShell title="控制中心" subtitle="主設定負責全局；各頁齒輪負責該頁框架">
    <View style={styles.ruleCard}><Text style={styles.ruleTitle}>A-B 關係層定律</Text><Text style={styles.ruleText}>每個實際框架就是設定大項 A；展開後只顯示直接 B 層。進入下一層時，同層其他項目自動收合。</Text></View>
    {PAGE_FRAMES.settings.map(frame=>{
      const expanded=open===frame.key;
      return <View key={frame.key} style={styles.section}>
        <Pressable onPress={()=>toggleFrame(frame.key)} style={styles.header}>
          <View style={{flex:1}}><Text style={styles.title}>{frame.title}</Text><Text style={styles.description}>{frame.description}</Text></View>
          <Text style={styles.toggle}>{expanded?'−':'+'}</Text>
        </Pressable>
        {expanded?<View style={styles.body}>
          {(children[frame.key]??[]).map((item,index)=>{
            const key=frame.key+':'+item;
            const selected=childOpen===key;
            const pluginTarget:PluginPanel=frame.key==='plugins'?(index===0?'widget':'monitor'):null;
            return <View key={item}>
              <Pressable onPress={()=>{
                setChildOpen(selected?null:key);
                if(frame.key==='market')setMarketChild(selected?null:item);
                if(frame.key==='plugins')setPluginPanel(selected?null:pluginTarget);
                setScheduleChild(null);
              }} style={[styles.row,selected&&styles.rowSelected]}>
                <View style={[styles.index,selected&&styles.indexSelected]}><Text style={[styles.indexText,selected&&styles.indexTextSelected]}>{index+1}</Text></View>
                <Text style={[styles.rowLabel,selected&&styles.rowLabelSelected]}>{item}</Text><Text style={styles.arrow}>{selected?'⌄':'›'}</Text>
              </Pressable>
              {selected&&frame.key==='accounting'&&item==='運算公式'?<FormulaList/>:null}
              {selected&&frame.key==='market'?<MarketBranch branch={item} activeChild={scheduleChild} setActiveChild={setScheduleChild}/>:null}
              {selected&&frame.key==='plugins'?<View style={styles.pluginStack}>
                {pluginPanel==='widget'?<WidgetControlPanel value={widgetConfig} onChange={setWidgetConfig}/>:null}
                {pluginPanel==='monitor'?<MonitorControlPanel value={monitorConfig} onChange={setMonitorConfig}/>:null}
              </View>:null}
            </View>;
          })}
        </View>:null}
      </View>;
    })}
  </PageShell>;

  function MarketBranch({branch,activeChild,setActiveChild}:{branch:string;activeChild:string|null;setActiveChild:(v:string|null)=>void}){
    if(branch==='行情來源')return <View style={styles.branch}><Info label="主要來源" value="TWSE 即時行情"/><Info label="來源策略" value="自動／TWSE"/></View>;
    if(branch==='市場狀態')return <View style={styles.branch}><Info label="目前狀態" value={sessionLabel(market.session)}/></View>;
    if(branch==='ETF資料')return <View style={styles.branch}><Info label="已載入 ETF" value={market.instruments.length.toLocaleString('zh-TW')+' 檔'}/><Text style={styles.hint}>代號與名稱搜尋共用市場 ETF Registry。</Text></View>;
    if(branch==='行情快取')return <View style={styles.branch}><Text style={styles.subTitle}>行情逾時判定</Text><Choice values={[30000,60000,90000,180000]} current={market.settings.staleAfterMs} label={v=>v/1000+' 秒'} onPick={v=>market.updateSettings({staleAfterMs:v})}/></View>;
    if(branch==='顯示設定')return <View style={styles.branch}><Info label="最後更新" value={market.lastUpdatedAt?new Date(market.lastUpdatedAt).toLocaleTimeString('zh-TW'):'尚未更新'}/><Info label="行情筆數" value={market.quotes.length+' 筆'}/></View>;
    if(branch==='手動更新')return <View style={styles.branch}><Pressable style={styles.primary} onPress={()=>market.refresh()}><Text style={styles.primaryText}>立即重新整理行情</Text></Pressable></View>;
    if(branch==='更新排程'){
      const rows=['自動更新','盤中排程','盤後排程','回前景刷新'];
      return <View style={styles.branch}>{rows.map((row,i)=>{const selected=activeChild===row;return <View key={row}>
        <Pressable onPress={()=>setActiveChild(selected?null:row)} style={[styles.subRow,selected&&styles.subRowSelected]}><Text style={styles.subIndex}>{i+1}</Text><Text style={styles.subLabel}>{row}</Text><Text style={styles.arrow}>{selected?'⌄':'›'}</Text></Pressable>
        {selected&&row==='自動更新'?<Toggle value={market.settings.enabled} onChange={v=>market.updateSettings({enabled:v})}/>:null}
        {selected&&row==='盤中排程'?<View style={styles.deep}><Text style={styles.subTitle}>更新頻率</Text><Choice values={[1000,3000,5000,10000,15000,30000,60000]} current={market.settings.openIntervalMs} label={v=>v/1000+' 秒'} onPick={v=>market.updateSettings({openIntervalMs:v})}/></View>:null}
        {selected&&row==='盤後排程'?<View style={styles.deep}><Text style={styles.subTitle}>更新頻率</Text><Choice values={[300000,900000,1800000,3600000]} current={market.settings.closedIntervalMs} label={v=>v/60000+' 分'} onPick={v=>market.updateSettings({closedIntervalMs:v})}/></View>:null}
        {selected&&row==='回前景刷新'?<Toggle value={market.settings.refreshOnForeground} onChange={v=>market.updateSettings({refreshOnForeground:v})}/>:null}
      </View>;})}</View>;
    }
    return null;
  }
}
function FormulaList(){return <View style={styles.formulaWrap}><View style={styles.readonlyBadge}><Text style={styles.readonlyText}>唯讀｜完整運算公式</Text></View>{FINANCE_FORMULA_CATALOG.map((row,i)=><View key={row.title} style={styles.formulaRow}><Text style={styles.formulaNo}>{i+1}</Text><View style={{flex:1}}><Text style={styles.formulaTitle}>{row.title}</Text><Text style={styles.formulaText}>{row.formula}</Text>{row.note?<Text style={styles.formulaNote}>{row.note}</Text>:null}</View></View>)}</View>;}
function Info({label,value}:{label:string;value:string}){return <View style={styles.info}><Text style={styles.infoLabel}>{label}</Text><Text style={styles.infoValue}>{value}</Text></View>;}
function Toggle({value,onChange}:{value:boolean;onChange:(v:boolean)=>void}){return <View style={styles.deep}><Pressable onPress={()=>onChange(!value)} style={[styles.toggleButton,value&&styles.toggleOn]}><Text style={[styles.toggleButtonText,value&&styles.toggleOnText]}>{value?'開啟':'關閉'}</Text></Pressable></View>;}
function Choice<T extends number>({values,current,label,onPick}:{values:readonly T[];current:number;label:(v:T)=>string;onPick:(v:T)=>void}){return <View style={styles.choiceRow}>{values.map(v=><Pressable key={v} onPress={()=>onPick(v)} style={[styles.choice,current===v&&styles.choiceActive]}><Text style={[styles.choiceText,current===v&&styles.choiceTextActive]}>{label(v)}</Text></Pressable>)}</View>;}
function sessionLabel(v:string){return v==='open'?'盤中':v==='preopen'?'盤前':v==='holiday'?'休市':'盤後';}

const styles=StyleSheet.create({
  ruleCard:{backgroundColor:colors.surfaceMuted,borderRadius:radius.lg,padding:spacing.lg,borderWidth:1,borderColor:colors.border},ruleTitle:{fontSize:14,fontWeight:'900',color:colors.primary},ruleText:{fontSize:11,lineHeight:18,color:colors.textSecondary,marginTop:6},
  section:{backgroundColor:colors.surface,borderRadius:radius.lg,borderWidth:1,borderColor:colors.border,overflow:'hidden'},header:{padding:spacing.lg,flexDirection:'row',alignItems:'center',gap:spacing.md},title:{fontSize:17,fontWeight:'900',color:colors.text},description:{fontSize:11,color:colors.textSecondary,marginTop:3},toggle:{fontSize:25,fontWeight:'700',color:colors.primary},
  body:{paddingHorizontal:spacing.lg,paddingBottom:spacing.lg,borderTopWidth:StyleSheet.hairlineWidth,borderTopColor:colors.border},row:{paddingVertical:13,flexDirection:'row',alignItems:'center',gap:10,borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:colors.border},rowSelected:{backgroundColor:colors.surfaceMuted},index:{width:24,height:24,borderRadius:12,backgroundColor:colors.surfaceMuted,alignItems:'center',justifyContent:'center'},indexSelected:{backgroundColor:colors.primary},indexText:{fontSize:10,fontWeight:'900',color:colors.primary},indexTextSelected:{color:'#fff'},rowLabel:{flex:1,fontSize:13,fontWeight:'800',color:colors.text},rowLabelSelected:{color:colors.primary},arrow:{fontSize:18,color:colors.textSecondary},
  pluginStack:{gap:10,marginVertical:12},branch:{padding:12,gap:10,backgroundColor:'#FBFCFF',borderBottomWidth:1,borderBottomColor:colors.border},subRow:{flexDirection:'row',alignItems:'center',gap:10,paddingVertical:10},subRowSelected:{backgroundColor:colors.surfaceMuted,borderRadius:10,paddingHorizontal:8},subIndex:{width:20,fontSize:10,fontWeight:'900',color:colors.primary},subLabel:{flex:1,fontSize:12,fontWeight:'800',color:colors.text},deep:{padding:10,marginBottom:6,borderRadius:10,backgroundColor:colors.surfaceMuted},subTitle:{fontSize:11,fontWeight:'900',color:colors.text,marginBottom:8},
  choiceRow:{flexDirection:'row',flexWrap:'wrap',gap:7},choice:{paddingHorizontal:10,paddingVertical:7,borderRadius:radius.pill,backgroundColor:colors.surface},choiceActive:{backgroundColor:colors.primary},choiceText:{fontSize:10,fontWeight:'800',color:colors.textSecondary},choiceTextActive:{color:'#fff'},
  toggleButton:{paddingVertical:10,borderRadius:10,alignItems:'center',backgroundColor:colors.surface},toggleOn:{backgroundColor:colors.primary},toggleButtonText:{fontWeight:'900',color:colors.textSecondary},toggleOnText:{color:'#fff'},primary:{paddingVertical:12,borderRadius:10,backgroundColor:colors.primary,alignItems:'center'},primaryText:{color:'#fff',fontWeight:'900'},
  info:{flexDirection:'row',justifyContent:'space-between',gap:12},infoLabel:{fontSize:11,color:colors.textSecondary},infoValue:{fontSize:11,fontWeight:'900',color:colors.text},hint:{fontSize:10,lineHeight:16,color:colors.textSecondary},
  formulaWrap:{paddingVertical:8},readonlyBadge:{alignSelf:'flex-start',backgroundColor:colors.surfaceMuted,borderRadius:radius.pill,paddingHorizontal:10,paddingVertical:6,marginBottom:8},readonlyText:{fontSize:10,fontWeight:'900',color:colors.primary},formulaRow:{flexDirection:'row',gap:10,paddingVertical:11,borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:colors.border},formulaNo:{width:22,fontSize:10,fontWeight:'900',color:colors.primary},formulaTitle:{fontSize:12,fontWeight:'900',color:colors.text},formulaText:{fontSize:10,lineHeight:16,color:colors.textSecondary,marginTop:3},formulaNote:{fontSize:9,lineHeight:15,color:colors.textSecondary,marginTop:3,fontStyle:'italic'},
});
