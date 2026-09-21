import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import type { PageFrameDefinition } from '../domain/frameRegistry';
import { DEFAULT_HOLDING_WALL_CONFIG } from '../domain/uiModels';
import type { MainPageKey } from '../domain/pageRegistry';
import {
  normalizeEditorConfig,
  type DashboardChartConfig,
  type DashboardChartSource,
  type DashboardChartStyle,
  type DashboardMetricKey,
  type FrameAppearance,
  type FrameBehavior,
  type FrameEditorConfig,
  type FrameLayout,
  type PageDisplayConfig,
  usePageEditor,
} from '../editor/pageEditor';
import { colors, radius, spacing } from '../theme/tokens';
import { HoldingMarketWallEditor } from './HoldingMarketWallEditor';
import { ColorPalettePicker } from './ColorPalettePicker';

const layouts: readonly { key: FrameLayout; label: string }[] = [
  { key: 'standard', label: '標準' },
  { key: 'compact', label: '緊湊' },
  { key: 'dense', label: '密集' },
];
const appearances: readonly { key: FrameAppearance; label: string }[] = [
  { key: 'theme', label: '跟隨主題' },
  { key: 'soft', label: '柔和底色' },
  { key: 'outline', label: '強調外框' },
];
const behaviors: readonly { key: FrameBehavior; label: string }[] = [
  { key: 'manual', label: '手動排序' },
  { key: 'auto', label: '自動順位' },
  { key: 'locked', label: '鎖定' },
];

export function PageFrameSettingsModal({
  visible,
  pageKey,
  title,
  frames,
  onClose,
}: {
  visible: boolean;
  pageKey: MainPageKey;
  title: string;
  frames: readonly PageFrameDefinition[];
  onClose: () => void;
}) {
  const { config, displayConfig, replacePageConfig, updateDisplayConfig, resetPage } = usePageEditor(pageKey);
  const [open, setOpen] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, FrameEditorConfig>>({ ...config });
  const [displayDraft,setDisplayDraft]=useState<PageDisplayConfig>({...displayConfig});

  useEffect(() => {
    if (visible) {
      setDraft({ ...config });
      setDisplayDraft({...displayConfig});
      setOpen(null);
    }
  }, [visible, config, displayConfig]);

  const orderedFrames = useMemo(
    () => [...frames].sort((a, b) => (draft[a.key]?.order ?? 0) - (draft[b.key]?.order ?? 0)),
    [frames, draft],
  );

  const patch = (key: string, next: Partial<FrameEditorConfig>) => {
    const current = draft[key];
    if (!current || current.behavior === 'locked') return;
    setDraft(value => ({ ...value, [key]: { ...current, ...next } }));
  };

  const setBehavior = (key: string, behavior: FrameBehavior) => {
    const current = draft[key];
    if (!current) return;
    setDraft(value => ({ ...value, [key]: { ...current, behavior } }));
  };

  const move = (key: string, delta: -1 | 1) => {
    const current = draft[key];
    if (!current || current.behavior !== 'manual') return;
    const ordered = [...orderedFrames];
    const index = ordered.findIndex(frame => frame.key === key);
    const target = index + delta;
    if (index < 0 || target < 0 || target >= ordered.length) return;
    const other = draft[ordered[target]!.key];
    if (!other || other.behavior === 'locked') return;
    setDraft(value => ({
      ...value,
      [key]: { ...current, order: other.order },
      [ordered[target]!.key]: { ...other, order: current.order },
    }));
  };

  const apply = () => {
    replacePageConfig(normalizeEditorConfig(pageKey, draft));
    updateDisplayConfig(displayDraft);
    onClose();
  };

  const cancel = () => {
    setDraft({ ...config });
    setDisplayDraft({...displayConfig});
    onClose();
  };

  const reset = () => {
    resetPage();
    onClose();
  };

  return <Modal visible={visible} animationType="slide" onRequestClose={cancel}>
    <View style={styles.root}>
      <View style={styles.top}>
        <View style={{ flex: 1 }}>
          <Text style={styles.kicker}>頁面框架設定</Text>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.hint}>每個實際框架是 A；展開後只修改該框架直接 B 層，不跨層控制。</Text>
        </View>
        <Pressable style={styles.cancel} onPress={cancel}><Text style={styles.cancelText}>取消</Text></Pressable>
        <Pressable style={styles.save} onPress={apply}><Text style={styles.saveText}>套用</Text></Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.toolbar}>
          <Text style={styles.toolbarText}>TF Asset 暫存編輯：只有按「套用」才會寫入目前頁面設定。</Text>
          <Pressable onPress={reset}><Text style={styles.resetText}>重設本頁</Text></Pressable>
        </View>

        {orderedFrames.map((frame, index) => {
          const expanded = open === frame.key;
          const value = draft[frame.key];
          if (!value) return null;
          const locked = value.behavior === 'locked';

          return <View key={frame.key} style={styles.section}>
            <View style={styles.header}>
              <Pressable style={{ flex: 1 }} onPress={() => setOpen(expanded ? null : frame.key)}>
                <Text style={styles.sectionTitle}>{frame.title}</Text>
                <Text style={styles.description}>{frame.description}</Text>
              </Pressable>
              <View style={styles.headerActions}>
                <Switch
                  value={value.visible}
                  disabled={locked}
                  onValueChange={visibleValue => patch(frame.key, { visible: visibleValue })}
                  trackColor={{ true: colors.primary }}
                />
                <Text style={styles.toggle}>{expanded ? '−' : '+'}</Text>
              </View>
            </View>

            {expanded ? <View style={styles.body}>
              <EditorRow title="顯示內容" subtitle={value.visible ? '此框架顯示' : '此框架隱藏'}>
                <Switch
                  value={value.visible}
                  disabled={locked}
                  onValueChange={visibleValue => patch(frame.key, { visible: visibleValue })}
                  trackColor={{ true: colors.primary }}
                />
              </EditorRow>

              <EditorRow title="版面" subtitle="控制框架內距與資訊密度">
                <ChoiceGroup
                  disabled={locked}
                  items={layouts}
                  value={value.layout}
                  onChange={layout => patch(frame.key, { layout })}
                />
              </EditorRow>

              <EditorRow title="外觀" subtitle="只調整目前框架視覺">
                <ChoiceGroup
                  disabled={locked}
                  items={appearances}
                  value={value.appearance}
                  onChange={appearance => patch(frame.key, { appearance })}
                />
              </EditorRow>

              <EditorRow title="排序 / 行為" subtitle="手動可移位；自動回到頁面預設順位；鎖定禁止修改">
                <ChoiceGroup
                  items={behaviors}
                  value={value.behavior}
                  onChange={behavior => setBehavior(frame.key, behavior)}
                />
              </EditorRow>

              <View style={styles.orderRow}>
                <Pressable
                  disabled={value.behavior !== 'manual' || index === 0}
                  onPress={() => move(frame.key, -1)}
                  style={[styles.orderButton, (value.behavior !== 'manual' || index === 0) && styles.disabled]}
                ><Text style={styles.orderText}>↑ 上移</Text></Pressable>
                <Text style={styles.orderIndex}>順位 {index + 1}</Text>
                <Pressable
                  disabled={value.behavior !== 'manual' || index === orderedFrames.length - 1}
                  onPress={() => move(frame.key, 1)}
                  style={[styles.orderButton, (value.behavior !== 'manual' || index === orderedFrames.length - 1) && styles.disabled]}
                ><Text style={styles.orderText}>↓ 下移</Text></Pressable>
              </View>

              {((pageKey==='home'&&frame.key==='market-news')||(pageKey==='ai'&&frame.key==='ai-news'))?<View style={styles.newsEditor}>
                <EditorRow title="新聞顯示筆數" subtitle={pageKey==='home'?'首頁市場新聞顯示 3／5／10 筆':'AI 持股新聞顯示 3／5／10 筆'}>
                  <ChoiceGroup items={([{key:'3',label:'3 筆'},{key:'5',label:'5 筆'},{key:'10',label:'10 筆'}] as const)} value={String(displayDraft.newsVisibleCount??5) as '3'|'5'|'10'} onChange={value=>setDisplayDraft(current=>({...current,newsVisibleCount:Number(value)}))}/>
                </EditorRow>
                <EditorRow title="僅顯示持股相關" subtitle="新聞來源依目前持股代號與名稱搜尋">
                  <Switch value={displayDraft.newsHoldingsOnly??true} onValueChange={newsHoldingsOnly=>setDisplayDraft(current=>({...current,newsHoldingsOnly}))} trackColor={{true:colors.primary}}/>
                </EditorRow>
              </View>:null}

              {pageKey==='home'&&frame.key==='holding-quotes'?<HoldingMarketWallEditor
                value={displayDraft.holdingWall??DEFAULT_HOLDING_WALL_CONFIG}
                onChange={holdingWall=>setDisplayDraft(current=>({...current,holdingWall}))}
              />:null}

              {pageKey==='home'&&frame.key==='asset-dashboard'?<DashboardToolsEditor
                value={displayDraft}
                onChange={patch=>setDisplayDraft(current=>({...current,...patch}))}
              />:null}

              <Text style={styles.rule}>B 層只管理「{frame.title}」，不可直接改動其他框架。</Text>
            </View> : null}
          </View>;
        })}
      </ScrollView>
    </View>
  </Modal>;
}


const dashboardMetricChoices:readonly {key:DashboardMetricKey;label:string}[]=[
  {key:'totalMarketValue',label:'持股市值'},{key:'totalPnl',label:'含息總損益'},{key:'totalUnrealizedProfit',label:'未實現損益'},
  {key:'realizedNetPnL',label:'已實現損益'},{key:'totalDividendsReceived',label:'累積淨股息'},{key:'cashBalance',label:'現金'},{key:'holdingCount',label:'持股檔數'},
];
const dashboardChartStyles:readonly {key:DashboardChartStyle;label:string}[]=[
  {key:'line',label:'折線'},{key:'area',label:'面積'},{key:'bar',label:'長條'},{key:'horizontalBar',label:'水平長條'},{key:'stackedBar',label:'堆疊長條'},
  {key:'pie',label:'圓餅'},{key:'donut',label:'甜甜圈'},{key:'allocation',label:'資產配置'},{key:'pnlTrend',label:'損益趨勢'},
  {key:'dividendTrend',label:'股息趨勢'},{key:'investVsValue',label:'投入 vs 市值'},{key:'holdingWeight',label:'持股占比'},
  {key:'costVsPrice',label:'成本 vs 市價'},{key:'roiTrend',label:'報酬率'},{key:'priceK',label:'價格／K 線'},{key:'volume',label:'成交量'},
];
const dashboardChartSources:readonly {key:DashboardChartSource;label:string}[]=[
  {key:'allocation',label:'資產配置'},{key:'marketValue',label:'市值'},{key:'pnl',label:'損益'},{key:'dividend',label:'股息'},{key:'roi',label:'報酬率'},
];

function DashboardToolsEditor({value,onChange}:{value:PageDisplayConfig;onChange:(patch:Partial<PageDisplayConfig>)=>void}){
  const metrics=value.dashboardMetrics??[];
  const charts=value.dashboardCharts??[];
  const toggleMetric=(key:DashboardMetricKey)=>onChange({dashboardMetrics:metrics.includes(key)?metrics.filter(item=>item!==key):[...metrics,key]});
  const patchChart=(id:string,patch:Partial<DashboardChartConfig>)=>onChange({dashboardCharts:charts.map(chart=>chart.id===id?{...chart,...patch}:chart)});
  const moveChartLayer=(id:string,action:'down'|'up'|'bottom'|'top')=>{
    const ordered=[...charts].sort((a,b)=>a.zIndex-b.zIndex||charts.indexOf(a)-charts.indexOf(b));
    const from=ordered.findIndex(chart=>chart.id===id);
    if(from<0)return;
    let to=from;
    if(action==='down')to=Math.max(0,from-1);
    if(action==='up')to=Math.min(ordered.length-1,from+1);
    if(action==='bottom')to=0;
    if(action==='top')to=ordered.length-1;
    if(to===from)return;
    const [moving]=ordered.splice(from,1);
    if(!moving)return;
    ordered.splice(to,0,moving);
    const layerById=new Map(ordered.map((chart,index)=>[chart.id,index+1]));
    onChange({dashboardCharts:charts.map(chart=>({...chart,zIndex:layerById.get(chart.id)??chart.zIndex}))});
  };
  const addChart=()=>{
    const index=charts.length+1;
    onChange({dashboardCharts:[...charts,{id:`chart-${Date.now()}`,title:`圖表 ${index}`,visible:true,style:'line',source:'marketValue',x:8+index*8,y:8+index*12,width:210,height:180,zIndex:index,locked:false,backgroundColor:'#FFFFFF',textColor:'#0F172A',accentColor:'#0066FF',opacity:1}]});
  };
  return <View style={styles.dashboardTools}>
    <Text style={styles.dashboardTitle}>B 層內容工具</Text>
    <Text style={styles.dashboardHint}>A 是資產儀表板框架；以下只新增／調整 A 內的直接 B 內容，不跨層。</Text>
    <View style={styles.choiceGroup}>{dashboardMetricChoices.map(item=><Pressable key={item.key} onPress={()=>toggleMetric(item.key)} style={[styles.choice,metrics.includes(item.key)&&styles.choiceActive]}><Text style={[styles.choiceText,metrics.includes(item.key)&&styles.choiceTextActive]}>{item.label}</Text></Pressable>)}</View>
    <View style={styles.chartHeader}><Text style={styles.dashboardTitle}>浮動圖表 Block</Text><Pressable onPress={addChart} style={styles.addChart}><Text style={styles.addChartText}>＋ 新增圖表</Text></Pressable></View>
    <Text style={styles.dashboardHint}>圖表採自由座標；實際首頁可手指自由拖移。格線不限制位置，鎖定後才禁止拖移。</Text>
    {charts.map((chart,index)=><View key={chart.id} style={styles.chartEditor}>
      <View style={styles.chartHeader}><Text style={styles.chartName}>{chart.title} · 第 {index+1} 層</Text><Pressable onPress={()=>onChange({dashboardCharts:charts.filter(item=>item.id!==chart.id)})}><Text style={styles.deleteChart}>刪除</Text></Pressable></View>
      <EditorRow title="顯示／鎖定" subtitle="未鎖定即可在首頁自由拖移">
        <View style={styles.choiceGroup}><Pressable onPress={()=>patchChart(chart.id,{visible:!chart.visible})} style={[styles.choice,chart.visible&&styles.choiceActive]}><Text style={[styles.choiceText,chart.visible&&styles.choiceTextActive]}>{chart.visible?'顯示':'隱藏'}</Text></Pressable><Pressable onPress={()=>patchChart(chart.id,{locked:!chart.locked})} style={[styles.choice,chart.locked&&styles.choiceActive]}><Text style={[styles.choiceText,chart.locked&&styles.choiceTextActive]}>{chart.locked?'已鎖定':'自由拖移'}</Text></Pressable></View>
      </EditorRow>
      <EditorRow title="圖表樣式" subtitle="切換樣式不會清除位置、尺寸與資料來源"><ChoiceGroup items={dashboardChartStyles} value={chart.style} onChange={style=>patchChart(chart.id,{style})}/></EditorRow>
      <EditorRow title="資料來源" subtitle="只讀 Finance Core / Shared Snapshot"><ChoiceGroup items={dashboardChartSources} value={chart.source} onChange={source=>patchChart(chart.id,{source})}/></EditorRow>
      <EditorRow title="自由位置" subtitle={`X ${Math.round(chart.x)} / Y ${Math.round(chart.y)}`}>
        <View style={styles.stepGrid}><NumberStep label="X" value={chart.x} min={0} max={1200} step={8} onChange={x=>patchChart(chart.id,{x})}/><NumberStep label="Y" value={chart.y} min={0} max={1600} step={8} onChange={y=>patchChart(chart.id,{y})}/></View>
      </EditorRow>
      <EditorRow title="尺寸" subtitle={`${Math.round(chart.width)} × ${Math.round(chart.height)} px`}>
        <View style={styles.stepGrid}><NumberStep label="寬" value={chart.width} min={140} max={900} step={10} onChange={width=>patchChart(chart.id,{width})}/><NumberStep label="高" value={chart.height} min={120} max={700} step={10} onChange={height=>patchChart(chart.id,{height})}/></View>
      </EditorRow>
      <EditorRow title="圖層" subtitle={`目前第 ${chart.zIndex} 層；允許重疊，提供上置／下置／最上／最下快速控制`}>
        <View style={styles.layerActions}>
          <Pressable style={styles.layerButton} onPress={()=>moveChartLayer(chart.id,'bottom')}><Text style={styles.layerButtonText}>最下層</Text></Pressable>
          <Pressable style={styles.layerButton} onPress={()=>moveChartLayer(chart.id,'down')}><Text style={styles.layerButtonText}>↓ 下置</Text></Pressable>
          <Pressable style={styles.layerButton} onPress={()=>moveChartLayer(chart.id,'up')}><Text style={styles.layerButtonText}>↑ 上置</Text></Pressable>
          <Pressable style={styles.layerButton} onPress={()=>moveChartLayer(chart.id,'top')}><Text style={styles.layerButtonText}>最上層</Text></Pressable>
        </View>
      </EditorRow>
      <ColorPalettePicker label="圖表背景" value={chart.backgroundColor} onChange={backgroundColor=>patchChart(chart.id,{backgroundColor})}/>
      <ColorPalettePicker label="圖表文字" value={chart.textColor} onChange={textColor=>patchChart(chart.id,{textColor})}/>
      <ColorPalettePicker label="圖表主色" value={chart.accentColor} onChange={accentColor=>patchChart(chart.id,{accentColor})}/>
      <EditorRow title="透明度" subtitle={`${Math.round(chart.opacity*100)}%`}><NumberStep label="%" value={Math.round(chart.opacity*100)} min={20} max={100} step={5} onChange={opacity=>patchChart(chart.id,{opacity:opacity/100})}/></EditorRow>
    </View>)}
  </View>;
}

function NumberStep({label,value,min,max,step,onChange}:{label:string;value:number;min:number;max:number;step:number;onChange:(value:number)=>void}){
  return <View style={styles.numberStep}><Text style={styles.numberLabel}>{label}</Text><Pressable style={styles.numberButton} onPress={()=>onChange(Math.max(min,value-step))}><Text style={styles.numberButtonText}>−</Text></Pressable><Text style={styles.numberValue}>{Math.round(value)}</Text><Pressable style={styles.numberButton} onPress={()=>onChange(Math.min(max,value+step))}><Text style={styles.numberButtonText}>＋</Text></Pressable></View>;
}

function EditorRow({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return <View style={styles.editorRow}>
    <View style={{ flex: 1 }}>
      <Text style={styles.rowLabel}>{title}</Text>
      <Text style={styles.rowHint}>{subtitle}</Text>
    </View>
    <View style={styles.editorControl}>{children}</View>
  </View>;
}

function ChoiceGroup<T extends string>({
  items,
  value,
  onChange,
  disabled = false,
}: {
  items: readonly { key: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
}) {
  return <View style={styles.choiceGroup}>
    {items.map(item => <Pressable
      key={item.key}
      disabled={disabled}
      onPress={() => onChange(item.key)}
      style={[styles.choice, value === item.key && styles.choiceActive, disabled && styles.disabled]}
    >
      <Text style={[styles.choiceText, value === item.key && styles.choiceTextActive]}>{item.label}</Text>
    </Pressable>)}
  </View>;
}

const styles = StyleSheet.create({
  root:{flex:1,backgroundColor:colors.background},
  top:{paddingTop:56,paddingHorizontal:spacing.lg,paddingBottom:spacing.lg,backgroundColor:colors.surface,borderBottomWidth:1,borderBottomColor:colors.border,flexDirection:'row',alignItems:'flex-start',gap:spacing.sm},
  kicker:{fontSize:12,fontWeight:'800',color:colors.primary},
  title:{fontSize:26,fontWeight:'900',color:colors.text,marginTop:4},
  hint:{fontSize:12,color:colors.textSecondary,lineHeight:18,marginTop:5},
  cancel:{paddingHorizontal:12,paddingVertical:10,borderRadius:radius.pill,backgroundColor:colors.surfaceMuted},
  cancelText:{color:colors.textSecondary,fontWeight:'800'},
  save:{paddingHorizontal:14,paddingVertical:10,borderRadius:radius.pill,backgroundColor:colors.primary},
  saveText:{color:'#FFFFFF',fontWeight:'800'},
  content:{padding:spacing.lg,gap:spacing.md,paddingBottom:48},
  toolbar:{backgroundColor:colors.surfaceMuted,borderRadius:radius.md,padding:spacing.md,flexDirection:'row',alignItems:'center',gap:spacing.md},
  toolbarText:{flex:1,fontSize:10,lineHeight:15,color:colors.textSecondary},
  resetText:{fontSize:11,fontWeight:'900',color:colors.primary},
  section:{backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border,borderRadius:radius.lg,overflow:'hidden'},
  header:{padding:spacing.lg,flexDirection:'row',alignItems:'center',gap:spacing.md},
  headerActions:{flexDirection:'row',alignItems:'center',gap:10},
  sectionTitle:{fontSize:17,fontWeight:'900',color:colors.text},
  description:{fontSize:12,color:colors.textSecondary,marginTop:4},
  toggle:{fontSize:25,color:colors.primary,fontWeight:'600'},
  body:{paddingHorizontal:spacing.lg,paddingBottom:spacing.lg,borderTopWidth:StyleSheet.hairlineWidth,borderTopColor:colors.border},
  editorRow:{paddingVertical:13,borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:colors.border,gap:10},
  rowLabel:{fontWeight:'800',color:colors.text},
  rowHint:{fontSize:10,color:colors.textSecondary,marginTop:3,lineHeight:15},
  editorControl:{marginTop:7},
  choiceGroup:{flexDirection:'row',flexWrap:'wrap',gap:6},
  choice:{paddingHorizontal:10,paddingVertical:7,borderRadius:radius.pill,backgroundColor:colors.surfaceMuted,borderWidth:1,borderColor:colors.border},
  choiceActive:{backgroundColor:colors.primary,borderColor:colors.primary},
  choiceText:{fontSize:10,fontWeight:'800',color:colors.textSecondary},
  choiceTextActive:{color:'#FFFFFF'},
  orderRow:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingVertical:12},
  orderButton:{paddingHorizontal:12,paddingVertical:8,borderRadius:radius.md,backgroundColor:colors.surfaceMuted},
  orderText:{fontSize:11,fontWeight:'900',color:colors.primary},
  orderIndex:{fontSize:11,fontWeight:'800',color:colors.textSecondary},
  disabled:{opacity:0.35},
  newsEditor:{gap:4},
  rule:{fontSize:11,lineHeight:17,color:colors.primary,marginTop:4,fontWeight:'700'},
  dashboardTools:{gap:10,paddingTop:12,borderTopWidth:StyleSheet.hairlineWidth,borderTopColor:colors.border},
  dashboardTitle:{fontSize:13,fontWeight:'900',color:colors.text},
  dashboardHint:{fontSize:10,lineHeight:16,color:colors.textSecondary},
  chartHeader:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8},
  addChart:{paddingHorizontal:10,paddingVertical:7,borderRadius:radius.pill,backgroundColor:colors.primary},
  addChartText:{fontSize:10,fontWeight:'900',color:'#FFFFFF'},
  chartEditor:{gap:6,padding:10,borderWidth:1,borderColor:colors.border,borderRadius:radius.md},
  chartName:{fontSize:11,fontWeight:'900',color:colors.text},
  deleteChart:{fontSize:10,fontWeight:'900',color:colors.loss},
  layerActions:{flexDirection:'row',flexWrap:'wrap',gap:6},
  layerButton:{paddingHorizontal:10,paddingVertical:7,borderRadius:radius.pill,backgroundColor:colors.surfaceMuted,borderWidth:1,borderColor:colors.border},
  layerButtonText:{fontSize:10,fontWeight:'900',color:colors.primary},
  stepGrid:{gap:6},
  numberStep:{flexDirection:'row',alignItems:'center',gap:6},
  numberLabel:{width:24,fontSize:10,fontWeight:'800',color:colors.textSecondary},
  numberButton:{width:32,height:30,alignItems:'center',justifyContent:'center',borderRadius:radius.sm,backgroundColor:colors.surfaceMuted},
  numberButtonText:{fontSize:14,fontWeight:'900',color:colors.primary},
  numberValue:{minWidth:48,textAlign:'center',fontSize:10,fontWeight:'900',color:colors.text},
});
