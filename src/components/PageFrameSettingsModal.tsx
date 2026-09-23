import {type ReactNode,useEffect,useMemo,useState} from 'react';
import {Modal,Pressable,ScrollView,StyleSheet,Switch,Text,TextInput,View} from 'react-native';

import type {PageFrameDefinition} from '../domain/frameRegistry';
import {MAIN_PAGES,type MainPageKey} from '../domain/pageRegistry';
import {DEFAULT_HOLDING_WALL_CONFIG} from '../domain/uiModels';
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
import {AB_COLLAPSE_RULES,getComponentCapabilities} from '../editor/componentCapabilities';
import {colors,radius,spacing} from '../theme/tokens';
import {useSettingsRuntime} from '../settings/SettingsRuntime';
import {ColorPalettePicker} from './ColorPalettePicker';
import {HoldingMarketWallEditor} from './HoldingMarketWallEditor';
import {FloatingHoldingCardPreview} from './FloatingHoldingCardPreview';
import {holdingPreviewLayout} from '../editor/holdingPreviewModel';
import type {HoldingQuote,QuoteModuleStyle} from '../domain/uiModels';

const layouts:readonly {key:FrameLayout;label:string}[]=[
  {key:'standard',label:'標準'},{key:'compact',label:'緊湊'},{key:'dense',label:'密集'},
];
const appearances:readonly {key:FrameAppearance;label:string}[]=[
  {key:'theme',label:'跟隨主題'},{key:'soft',label:'柔和底色'},{key:'outline',label:'強調外框'},
];
const behaviors:readonly {key:FrameBehavior;label:string}[]=[
  {key:'manual',label:'手動排序'},{key:'auto',label:'自動順位'},{key:'locked',label:'鎖定'},
];
const aligns=([{key:'left',label:'靠左'},{key:'center',label:'置中'},{key:'right',label:'靠右'}] as const);

export function PageFrameSettingsModal({
  visible,pageKey,title,frames,onClose,previewQuote,
}:{
  visible:boolean;pageKey:MainPageKey;title:string;frames:readonly PageFrameDefinition[];onClose:()=>void;previewQuote?:HoldingQuote|undefined;
}){
  const {config,displayConfig,replacePageConfig,updateDisplayConfig,resetPage}=usePageEditor(pageKey);
  const pageSettings=useSettingsRuntime();
  const defaultPageTitle=MAIN_PAGES.find(page=>page.key===pageKey)?.title??title;
  const [titleDraft,setTitleDraft]=useState(pageSettings.prefs.pageTitles[pageKey]||defaultPageTitle);
  const [openFrame,setOpenFrame]=useState<string|null>(null);
  const [openGroup,setOpenGroup]=useState<string|null>(null);
  const [showWallPreview,setShowWallPreview]=useState(true);
  const [draft,setDraft]=useState<Record<string,FrameEditorConfig>>({...config});
  const [displayDraft,setDisplayDraft]=useState<PageDisplayConfig>({...displayConfig});

  useEffect(()=>{
    if(!visible)return;
    setDraft({...config});
    setTitleDraft(pageSettings.prefs.pageTitles[pageKey]||defaultPageTitle);
    setDisplayDraft({...displayConfig});
    setOpenFrame(null);
    setOpenGroup(null);
    setShowWallPreview(true);
  },[visible,config,displayConfig]);

  const orderedFrames=useMemo(
    ()=>[...frames].sort((a,b)=>(draft[a.key]?.order??0)-(draft[b.key]?.order??0)),
    [frames,draft],
  );
  const patch=(key:string,next:Partial<FrameEditorConfig>)=>{
    const current=draft[key];
    if(!current||current.behavior === 'locked')return;
    setDraft(value=>({...value,[key]:{...current,...next}}));
  };
  const setBehavior=(key:string,behavior:FrameBehavior)=>{
    const current=draft[key];if(!current)return;
    setDraft(value=>({...value,[key]:{...current,behavior}}));
  };
  const move=(key:string,delta:-1|1)=>{
    const current=draft[key];if(!current||current.behavior!=='manual')return;
    const ordered=[...orderedFrames],index=ordered.findIndex(frame=>frame.key===key),target=index+delta;
    if(index<0||target<0||target>=ordered.length)return;
    const other=draft[ordered[target]!.key];if(!other||other.behavior==='locked')return;
    setDraft(value=>({...value,[key]:{...current,order:other.order},[ordered[target]!.key]:{...other,order:current.order}}));
  };
  const toggleFrame=(key:string)=>{
    setOpenFrame(current=>current===key?null:key);
    setOpenGroup(null);
  };
  const toggleGroup=(frameKey:string,group:string)=>{
    const key=`${frameKey}:${group}`;
    setOpenGroup(current=>current===key?null:key);
  };
  const apply=()=>{replacePageConfig(normalizeEditorConfig(pageKey,draft));updateDisplayConfig(displayDraft);pageSettings.patchPageTitle(pageKey,titleDraft.trim()||defaultPageTitle);onClose();};
  const cancel=()=>{setDraft({...config});setDisplayDraft({...displayConfig});onClose();};
  const reset=()=>{resetPage();pageSettings.patchPageTitle(pageKey,defaultPageTitle);onClose();};

  return <Modal visible={visible} animationType="slide" onRequestClose={cancel}>
    <View style={styles.root}>
      <View style={styles.top}>
        <View style={{flex:1}}>
          <Text style={styles.kicker}>頁面設定 · 統一能力模型</Text>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.hint}>元件決定可用工具；AB 規則只負責收合。未編輯區預設收合，切換時上一組自動收起。</Text>
        </View>
        <Pressable style={styles.cancel} onPress={cancel}><Text style={styles.cancelText}>取消</Text></Pressable>
        <Pressable style={styles.save} onPress={apply}><Text style={styles.saveText}>套用</Text></Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <View style={styles.header}><Text style={styles.sectionTitle}>頁面標題</Text></View>
          <View style={styles.body}><Text style={styles.rowHint}>編輯本頁上方顯示的標題，儲存後即時套用。</Text><TextInput accessibilityLabel="頁面標題" value={titleDraft} onChangeText={setTitleDraft} maxLength={48} style={styles.pageTitleInput}/></View>
        </View>
        <View style={styles.toolbar}>
          <Text style={styles.toolbarText}>AB：預設收合 {AB_COLLAPSE_RULES.defaultCollapsed?'✓':'×'} · 同層單一展開 {AB_COLLAPSE_RULES.singleOpenPerLevel?'✓':'×'} · 所有顏色皆使用調色盤。</Text>
          <Pressable onPress={reset}><Text style={styles.resetText}>重設本頁</Text></Pressable>
        </View>
        {orderedFrames.map((frame,index)=>{
          const expanded=openFrame===frame.key,value=draft[frame.key];if(!value)return null;
          const locked=value.behavior==='locked';
          return <View key={frame.key} style={styles.section}>
            <Pressable style={styles.header} onPress={()=>toggleFrame(frame.key)}>
              <View style={{flex:1}}><Text style={styles.sectionTitle}>{frame.title}</Text><Text style={styles.description}>{frame.description}</Text></View>
              <Switch value={value.visible} disabled={locked} onValueChange={visibleValue=>patch(frame.key,{visible:visibleValue})} trackColor={{true:colors.primary}}/>
              <Text style={styles.toggle}>{expanded?'−':'+'}</Text>
            </Pressable>
            {expanded?<View style={styles.body}>
              <AccordionGroup title="顯示／版面" subtitle="顯示、密度、框架行為" expanded={openGroup===`${frame.key}:layout`} onPress={()=>toggleGroup(frame.key,'layout')}>
                <EditorRow title="顯示內容" subtitle={value.visible?'此框架顯示':'此框架隱藏'}><Switch value={value.visible} disabled={locked} onValueChange={visibleValue=>patch(frame.key,{visible:visibleValue})} trackColor={{true:colors.primary}}/></EditorRow>
                <EditorRow title="版面" subtitle="同類框架使用同一套版面工具"><ChoiceGroup disabled={locked} items={layouts} value={value.layout} onChange={layout=>patch(frame.key,{layout})}/></EditorRow>
                <EditorRow title="外觀模式" subtitle="快速套用基本框架風格"><ChoiceGroup disabled={locked} items={appearances} value={value.appearance} onChange={appearance=>patch(frame.key,{appearance})}/></EditorRow>
                <EditorRow title="排序 / 行為" subtitle="鎖定時禁止框架修改"><ChoiceGroup items={behaviors} value={value.behavior} onChange={behavior=>setBehavior(frame.key,behavior)}/></EditorRow>
                <View style={styles.orderRow}>
                  <Pressable disabled={value.behavior !== 'manual'||index===0} onPress={()=>move(frame.key,-1)} style={[styles.orderButton,(value.behavior !== 'manual'||index===0)&&styles.disabled]}><Text style={styles.orderText}>↑ 上移</Text></Pressable>
                  <Text style={styles.orderIndex}>順位 {index+1}</Text>
                  <Pressable disabled={value.behavior !== 'manual'||index===orderedFrames.length-1} onPress={()=>move(frame.key,1)} style={[styles.orderButton,(value.behavior !== 'manual'||index===orderedFrames.length-1)&&styles.disabled]}><Text style={styles.orderText}>↓ 下移</Text></Pressable>
                </View>
              </AccordionGroup>

              <AccordionGroup title="標題" subtitle="所有頁面的標題都使用同一套工具" expanded={openGroup===`${frame.key}:title`} onPress={()=>toggleGroup(frame.key,'title')}>
                <EditorRow title="字體大小" subtitle={`${Math.round(value.titleFontSize)} px`}><NumberStep label="px" value={value.titleFontSize} min={10} max={32} step={1} onChange={titleFontSize=>patch(frame.key,{titleFontSize})}/></EditorRow>
                <ColorPalettePicker label="標題文字顏色" value={value.titleColor} onChange={titleColor=>patch(frame.key,{titleColor})}/>
                <EditorRow title="標題對齊" subtitle="左／中／右"><ChoiceGroup items={aligns} value={value.titleAlign} onChange={titleAlign=>patch(frame.key,{titleAlign})}/></EditorRow>
                <CapabilityHint type="title"/>
              </AccordionGroup>

              <AccordionGroup title="背景" subtitle="顏色、透明度、陰影" expanded={openGroup===`${frame.key}:background`} onPress={()=>toggleGroup(frame.key,'background')}>
                <ColorPalettePicker label="框架背景" value={value.backgroundColor} onChange={backgroundColor=>patch(frame.key,{backgroundColor})}/>
                <EditorRow title="背景透明度" subtitle={`${Math.round(value.backgroundOpacity*100)}%`}><NumberStep label="%" value={Math.round(value.backgroundOpacity*100)} min={10} max={100} step={5} onChange={v=>patch(frame.key,{backgroundOpacity:v/100})}/></EditorRow>
                <EditorRow title="陰影" subtitle={value.shadowEnabled?'開啟':'關閉'}><Switch value={value.shadowEnabled} onValueChange={shadowEnabled=>patch(frame.key,{shadowEnabled})} trackColor={{true:colors.primary}}/></EditorRow>
                {value.shadowEnabled?<EditorRow title="陰影強度" subtitle={`${Math.round(value.shadowOpacity*100)}%`}><NumberStep label="%" value={Math.round(value.shadowOpacity*100)} min={0} max={80} step={5} onChange={v=>patch(frame.key,{shadowOpacity:v/100})}/></EditorRow>:null}
              </AccordionGroup>

              <AccordionGroup title="邊框" subtitle="邊框顏色、粗細、圓角" expanded={openGroup===`${frame.key}:border`} onPress={()=>toggleGroup(frame.key,'border')}>
                <ColorPalettePicker label="邊框顏色" value={value.borderColor} onChange={borderColor=>patch(frame.key,{borderColor})}/>
                <EditorRow title="邊框粗細" subtitle={`${Math.round(value.borderWidth)} px`}><NumberStep label="px" value={value.borderWidth} min={0} max={8} step={1} onChange={borderWidth=>patch(frame.key,{borderWidth})}/></EditorRow>
                <EditorRow title="圓角" subtitle={`${Math.round(value.borderRadius)} px`}><NumberStep label="px" value={value.borderRadius} min={0} max={48} step={2} onChange={borderRadius=>patch(frame.key,{borderRadius})}/></EditorRow>
              </AccordionGroup>

              {hasContentTools(pageKey,frame.key)?<AccordionGroup title="資料／內容" subtitle="只顯示目前框架真正可用的內容工具" expanded={openGroup===`${frame.key}:content`} onPress={()=>toggleGroup(frame.key,'content')}>
                {((pageKey==='home'&&frame.key==='market-news')||(pageKey==='ai'&&frame.key==='ai-news'))?<View style={styles.newsEditor}>
                  <EditorRow title="新聞顯示筆數" subtitle="3／5／10 筆"><ChoiceGroup items={([{key:'3',label:'3 筆'},{key:'5',label:'5 筆'},{key:'10',label:'10 筆'}] as const)} value={String(displayDraft.newsVisibleCount??5) as '3'|'5'|'10'} onChange={v=>setDisplayDraft(current=>({...current,newsVisibleCount:Number(v)}))}/></EditorRow>
                  <EditorRow title="僅顯示持股相關" subtitle="依目前持股代號與名稱篩選"><Switch value={displayDraft.newsHoldingsOnly??true} onValueChange={newsHoldingsOnly=>setDisplayDraft(current=>({...current,newsHoldingsOnly}))} trackColor={{true:colors.primary}}/></EditorRow>
                </View>:null}
                {((pageKey==='home'&&frame.key==='holding-quotes')||(pageKey==='portfolio'&&frame.key==='holding-view'))?<View><Pressable accessibilityLabel="切換單張小卡預覽" onPress={()=>setShowWallPreview(v=>!v)}><Text style={{color:colors.primary,fontWeight:'900',marginBottom:8}}>{showWallPreview?'隱藏':'顯示'}單張小卡即時預覽</Text></Pressable><HoldingMarketWallEditor value={displayDraft.holdingWall??DEFAULT_HOLDING_WALL_CONFIG} onChange={holdingWall=>setDisplayDraft(current=>({...current,holdingWall}))}/></View>:null}
                {pageKey==='home'&&frame.key==='asset-dashboard'?<DashboardToolsEditor value={displayDraft} onChange={patchValue=>setDisplayDraft(current=>({...current,...patchValue}))}/>:null}
              </AccordionGroup>:null}
            </View>:null}
          </View>;
        })}
      </ScrollView>
      {previewQuote&&showWallPreview&&openGroup===`${openFrame}:content`&&((pageKey==='home'&&openFrame==='holding-quotes')||(pageKey==='portfolio'&&openFrame==='holding-view'))?<FloatingHoldingCardPreview item={previewQuote} config={displayDraft.holdingWall??DEFAULT_HOLDING_WALL_CONFIG} style={(displayDraft.quoteStyle??'quote') as QuoteModuleStyle} layout={holdingPreviewLayout(displayDraft.holdingLayoutMode)} onDismiss={()=>setShowWallPreview(false)}/>:null}
    </View>
  </Modal>;
}

const dashboardMetricChoices:readonly {key:DashboardMetricKey;label:string}[]=[
  {key:'totalMarketValue',label:'持股市值'},{key:'totalPnl',label:'含息總損益'},{key:'totalUnrealizedProfit',label:'未實現損益'},
  {key:'realizedNetPnL',label:'已實現損益'},{key:'totalDividendsReceived',label:'累積淨股息'},{key:'cashBalance',label:'現金'},{key:'holdingCount',label:'持股檔數'},
];
const dashboardChartStyles:readonly {key:DashboardChartStyle;label:string}[]=[
  {key:'line',label:'折線'},{key:'area',label:'面積'},{key:'bar',label:'長條'},{key:'horizontalBar',label:'水平長條'},{key:'stackedBar',label:'堆疊長條'},
  {key:'pie',label:'圓餅'},{key:'donut',label:'甜甜圈'},{key:'allocation',label:'資產配置'},{key:'pnlTrend',label:'損益趨勢'},{key:'dividendTrend',label:'股息趨勢'},
  {key:'investVsValue',label:'投入 vs 市值'},{key:'holdingWeight',label:'持股占比'},{key:'costVsPrice',label:'成本 vs 市價'},{key:'roiTrend',label:'報酬率'},
  {key:'priceK',label:'價格／K 線'},{key:'volume',label:'成交量'},
];
const dashboardChartSources:readonly {key:DashboardChartSource;label:string}[]=[
  {key:'allocation',label:'資產配置'},{key:'marketValue',label:'市值'},{key:'pnl',label:'損益'},{key:'dividend',label:'股息'},{key:'roi',label:'報酬率'},
  {key:'avgCost',label:'平均成本'},{key:'price',label:'現價'},{key:'shares',label:'持股股數'},{key:'realizedPnl',label:'已實現損益'},
  {key:'comprehensivePnl',label:'含息損益'},{key:'transactions',label:'交易次數'},
];

function DashboardToolsEditor({value,onChange}:{value:PageDisplayConfig;onChange:(patch:Partial<PageDisplayConfig>)=>void}){
  const metrics=value.dashboardMetrics??[],charts=value.dashboardCharts??[];
  const [openChart,setOpenChart]=useState<string|null>(null);
  const [openChartGroup,setOpenChartGroup]=useState<string|null>(null);
  const toggleMetric=(key:DashboardMetricKey)=>onChange({dashboardMetrics:metrics.includes(key)?metrics.filter(item=>item!==key):[...metrics,key]});
  const patchChart=(id:string,patch:Partial<DashboardChartConfig>)=>onChange({dashboardCharts:charts.map(chart=>chart.id===id?{...chart,...patch}:chart)});
  const moveChartLayer=(id:string,action:'down'|'up'|'bottom'|'top')=>{
    const ordered=[...charts].sort((a,b)=>a.zIndex-b.zIndex||charts.indexOf(a)-charts.indexOf(b));
    const from=ordered.findIndex(chart=>chart.id===id);if(from<0)return;
    let to=from;if(action==='down')to=Math.max(0,from-1);if(action==='up')to=Math.min(ordered.length-1,from+1);if(action==='bottom')to=0;if(action==='top')to=ordered.length-1;if(to===from)return;
    const [moving]=ordered.splice(from,1);if(!moving)return;ordered.splice(to,0,moving);
    const layerById=new Map(ordered.map((chart,index)=>[chart.id,index+1]));
    onChange({dashboardCharts:charts.map(chart=>({...chart,zIndex:layerById.get(chart.id)??chart.zIndex}))});
  };
  const addChart=()=>{
    const index=charts.length+1;
    const base=(charts[0]??{
      id:'base',title:'圖表',visible:true,style:'line',source:'marketValue',x:8,y:8,width:210,height:180,zIndex:1,locked:false,aspectLocked:false,
      backgroundColor:'#FFFFFF',backgroundOpacity:1,textColor:'#0F172A',accentColor:'#0066FF',gainColor:'#10B981',lossColor:'#EF4444',flatColor:'#64748B',
      opacity:1,contentOpacity:1,borderColor:'#0066FF',borderWidth:1,borderStyle:'solid',borderRadius:16,shadowEnabled:false,shadowOpacity:.18,padding:10,
      titleFontSize:12,titleAlign:'left',lineWidth:2,showPoints:true,pointSize:4,legendVisible:true,xAxisVisible:true,yAxisVisible:true,gridVisible:true,
      tooltipEnabled:true,dataLabels:false,crosshairEnabled:true,pinchZoomEnabled:true,panEnabled:true,doubleTapReset:true,rememberZoom:true,touchThrough:false,zoomMin:1,zoomMax:8,
    } satisfies DashboardChartConfig);
    onChange({dashboardCharts:[...charts,{...base,id:`chart-${Date.now()}`,title:`圖表 ${index}`,style:'line',source:'marketValue',x:8+index*8,y:8+index*12,zIndex:index,locked:false}]});
  };
  const chartGroup=(id:string,key:string)=>`${id}:${key}`;
  return <View style={styles.dashboardTools}>
    <AccordionGroup title="儀表板資料卡" subtitle="選擇首頁摘要資料" expanded={openChart==='metrics'} onPress={()=>{setOpenChart(v=>v==='metrics'?null:'metrics');setOpenChartGroup(null);}}>
      <View style={styles.choiceGroup}>{dashboardMetricChoices.map(item=><Pressable key={item.key} onPress={()=>toggleMetric(item.key)} style={[styles.choice,metrics.includes(item.key)&&styles.choiceActive]}><Text style={[styles.choiceText,metrics.includes(item.key)&&styles.choiceTextActive]}>{item.label}</Text></Pressable>)}</View>
    </AccordionGroup>
    <View style={styles.chartHeader}><Text style={styles.dashboardTitle}>浮動圖表工具</Text><Pressable onPress={addChart} style={styles.addChart}><Text style={styles.addChartText}>＋ 新增圖表</Text></Pressable></View>
    <Text style={styles.dashboardHint}>圖表可跨框架自由放置；未鎖定時移動 Block，鎖定後手勢切換為資料縮放／平移。</Text>
    {charts.map((chart,index)=>{
      const expanded=openChart===chart.id;
      const toggle=(key:string)=>setOpenChartGroup(v=>v===chartGroup(chart.id,key)?null:chartGroup(chart.id,key));
      return <View key={chart.id} style={styles.chartEditor}>
        <Pressable style={styles.chartHeader} onPress={()=>{setOpenChart(v=>v===chart.id?null:chart.id);setOpenChartGroup(null);}}>
          <Text style={styles.chartName}>{chart.title} · 第 {index+1} 層</Text><Text style={styles.toggle}>{expanded?'−':'+'}</Text>
        </Pressable>
        {expanded?<View style={styles.chartBody}>
          <AccordionGroup title="顯示／鎖定" subtitle="顯示、鎖定、刪除" expanded={openChartGroup===chartGroup(chart.id,'state')} onPress={()=>toggle('state')}>
            <View style={styles.choiceGroup}>
              <Pressable onPress={()=>patchChart(chart.id,{visible:!chart.visible})} style={[styles.choice,chart.visible&&styles.choiceActive]}><Text style={[styles.choiceText,chart.visible&&styles.choiceTextActive]}>{chart.visible?'顯示':'隱藏'}</Text></Pressable>
              <Pressable onPress={()=>patchChart(chart.id,{locked:!chart.locked})} style={[styles.choice,chart.locked&&styles.choiceActive]}><Text style={[styles.choiceText,chart.locked&&styles.choiceTextActive]}>{chart.locked?'已鎖定／檢視手勢':'編輯／自由拖移'}</Text></Pressable>
              <Pressable onPress={()=>patchChart(chart.id,{aspectLocked:!chart.aspectLocked})} style={[styles.choice,chart.aspectLocked&&styles.choiceActive]}><Text style={[styles.choiceText,chart.aspectLocked&&styles.choiceTextActive]}>{chart.aspectLocked?'比例已鎖':'自由比例'}</Text></Pressable>
            </View>
            <Pressable onPress={()=>onChange({dashboardCharts:charts.filter(item=>item.id!==chart.id)})}><Text style={styles.deleteChart}>刪除圖表</Text></Pressable>
          </AccordionGroup>
          <AccordionGroup title="類型／資料" subtitle="圖表樣式與 App 資料來源" expanded={openChartGroup===chartGroup(chart.id,'data')} onPress={()=>toggle('data')}>
            <EditorRow title="圖表樣式" subtitle="切換樣式保留其他設定"><ChoiceGroup items={dashboardChartStyles} value={chart.style} onChange={style=>patchChart(chart.id,{style})}/></EditorRow>
            <EditorRow title="資料來源" subtitle="行情／持股／帳務／股息／績效"><ChoiceGroup items={dashboardChartSources} value={chart.source} onChange={source=>patchChart(chart.id,{source})}/></EditorRow>
          </AccordionGroup>
          <AccordionGroup title="位置／尺寸" subtitle="自由座標、縮放與微調" expanded={openChartGroup===chartGroup(chart.id,'layout')} onPress={()=>toggle('layout')}>
            <Pressable style={styles.layerButton} onPress={()=>patchChart(chart.id,{x:-1})}><Text style={styles.layerButtonText}>靠右對齊</Text></Pressable>
            <View style={styles.stepGrid}><NumberStep label="X" value={Math.max(0,chart.x)} min={0} max={1200} step={8} onChange={x=>patchChart(chart.id,{x})}/><NumberStep label="Y" value={chart.y} min={0} max={1600} step={8} onChange={y=>patchChart(chart.id,{y})}/><NumberStep label="寬" value={chart.width} min={140} max={900} step={10} onChange={width=>patchChart(chart.id,{width})}/><NumberStep label="高" value={chart.height} min={120} max={700} step={10} onChange={height=>patchChart(chart.id,{height})}/></View>
          </AccordionGroup>
          <AccordionGroup title="圖層" subtitle="允許重疊並控制 Z-index" expanded={openChartGroup===chartGroup(chart.id,'layer')} onPress={()=>toggle('layer')}>
            <View style={styles.layerActions}><LayerButton label="最下層" onPress={()=>moveChartLayer(chart.id,'bottom')}/><LayerButton label="↓ 下置" onPress={()=>moveChartLayer(chart.id,'down')}/><LayerButton label="↑ 上置" onPress={()=>moveChartLayer(chart.id,'up')}/><LayerButton label="最上層" onPress={()=>moveChartLayer(chart.id,'top')}/></View>
          </AccordionGroup>
          <AccordionGroup title="外框／背景" subtitle="外框與繪圖內容分離設定" expanded={openChartGroup===chartGroup(chart.id,'appearance')} onPress={()=>toggle('appearance')}>
            <ColorPalettePicker label="圖表背景" value={chart.backgroundColor} onChange={backgroundColor=>patchChart(chart.id,{backgroundColor})}/>
            <EditorRow title="背景透明度" subtitle={`${Math.round(chart.backgroundOpacity*100)}%`}><NumberStep label="%" value={Math.round(chart.backgroundOpacity*100)} min={0} max={100} step={5} onChange={v=>patchChart(chart.id,{backgroundOpacity:v/100})}/></EditorRow>
            <ColorPalettePicker label="邊框顏色" value={chart.borderColor} onChange={borderColor=>patchChart(chart.id,{borderColor})}/>
            <EditorRow title="邊框粗細" subtitle={`${chart.borderWidth}px`}><NumberStep label="px" value={chart.borderWidth} min={0} max={8} step={1} onChange={borderWidth=>patchChart(chart.id,{borderWidth})}/></EditorRow>
            <EditorRow title="邊框樣式" subtitle="實線／虛線／點線"><ChoiceGroup items={([{key:'solid',label:'實線'},{key:'dashed',label:'虛線'},{key:'dotted',label:'點線'}] as const)} value={chart.borderStyle} onChange={borderStyle=>patchChart(chart.id,{borderStyle})}/></EditorRow>
            <EditorRow title="圓角" subtitle={`${chart.borderRadius}px`}><NumberStep label="px" value={chart.borderRadius} min={0} max={48} step={2} onChange={borderRadius=>patchChart(chart.id,{borderRadius})}/></EditorRow>
            <EditorRow title="陰影" subtitle={chart.shadowEnabled?'開啟':'關閉'}><Switch value={chart.shadowEnabled} onValueChange={shadowEnabled=>patchChart(chart.id,{shadowEnabled})} trackColor={{true:colors.primary}}/></EditorRow>
            <EditorRow title="內容透明度" subtitle={`${Math.round(chart.contentOpacity*100)}%`}><NumberStep label="%" value={Math.round(chart.contentOpacity*100)} min={10} max={100} step={5} onChange={v=>patchChart(chart.id,{contentOpacity:v/100})}/></EditorRow>
            <EditorRow title="Padding" subtitle={`${chart.padding}px`}><NumberStep label="px" value={chart.padding} min={0} max={32} step={2} onChange={padding=>patchChart(chart.id,{padding})}/></EditorRow>
          </AccordionGroup>
          <AccordionGroup title="顏色／標題" subtitle="所有顏色統一使用調色盤" expanded={openChartGroup===chartGroup(chart.id,'colors')} onPress={()=>toggle('colors')}>
            <ColorPalettePicker label="文字顏色" value={chart.textColor} onChange={textColor=>patchChart(chart.id,{textColor})}/>
            <ColorPalettePicker label="圖表主色" value={chart.accentColor} onChange={accentColor=>patchChart(chart.id,{accentColor})}/>
            <ColorPalettePicker label="上漲色" value={chart.gainColor} onChange={gainColor=>patchChart(chart.id,{gainColor})}/>
            <ColorPalettePicker label="下跌色" value={chart.lossColor} onChange={lossColor=>patchChart(chart.id,{lossColor})}/>
            <ColorPalettePicker label="平盤色" value={chart.flatColor} onChange={flatColor=>patchChart(chart.id,{flatColor})}/>
            <EditorRow title="標題大小" subtitle={`${chart.titleFontSize}px`}><NumberStep label="px" value={chart.titleFontSize} min={8} max={28} step={1} onChange={titleFontSize=>patchChart(chart.id,{titleFontSize})}/></EditorRow>
            <EditorRow title="標題對齊" subtitle="左／中／右"><ChoiceGroup items={aligns} value={chart.titleAlign} onChange={titleAlign=>patchChart(chart.id,{titleAlign})}/></EditorRow>
          </AccordionGroup>
          <AccordionGroup title="座標／資料顯示" subtitle="座標軸、格線、Tooltip、資料點" expanded={openChartGroup===chartGroup(chart.id,'axes')} onPress={()=>toggle('axes')}>
            <SwitchRow label="X 軸" value={chart.xAxisVisible} onChange={xAxisVisible=>patchChart(chart.id,{xAxisVisible})}/><SwitchRow label="Y 軸" value={chart.yAxisVisible} onChange={yAxisVisible=>patchChart(chart.id,{yAxisVisible})}/><SwitchRow label="格線" value={chart.gridVisible} onChange={gridVisible=>patchChart(chart.id,{gridVisible})}/><SwitchRow label="圖例" value={chart.legendVisible} onChange={legendVisible=>patchChart(chart.id,{legendVisible})}/><SwitchRow label="Tooltip" value={chart.tooltipEnabled} onChange={tooltipEnabled=>patchChart(chart.id,{tooltipEnabled})}/><SwitchRow label="資料標籤" value={chart.dataLabels} onChange={dataLabels=>patchChart(chart.id,{dataLabels})}/><SwitchRow label="十字線" value={chart.crosshairEnabled} onChange={crosshairEnabled=>patchChart(chart.id,{crosshairEnabled})}/>
            <EditorRow title="線寬" subtitle={`${chart.lineWidth}px`}><NumberStep label="px" value={chart.lineWidth} min={1} max={8} step={1} onChange={lineWidth=>patchChart(chart.id,{lineWidth})}/></EditorRow>
            <SwitchRow label="資料點" value={chart.showPoints} onChange={showPoints=>patchChart(chart.id,{showPoints})}/>
            <EditorRow title="資料點大小" subtitle={`${chart.pointSize}px`}><NumberStep label="px" value={chart.pointSize} min={2} max={12} step={1} onChange={pointSize=>patchChart(chart.id,{pointSize})}/></EditorRow>
          </AccordionGroup>
          <AccordionGroup title="互動／手勢" subtitle="編輯手勢與檢視手勢不互搶" expanded={openChartGroup===chartGroup(chart.id,'interaction')} onPress={()=>toggle('interaction')}>
            <SwitchRow label="兩指放大縮小" value={chart.pinchZoomEnabled} onChange={pinchZoomEnabled=>patchChart(chart.id,{pinchZoomEnabled})}/><SwitchRow label="單指平移資料" value={chart.panEnabled} onChange={panEnabled=>patchChart(chart.id,{panEnabled})}/><SwitchRow label="雙擊重設縮放" value={chart.doubleTapReset} onChange={doubleTapReset=>patchChart(chart.id,{doubleTapReset})}/><SwitchRow label="記住縮放範圍" value={chart.rememberZoom} onChange={rememberZoom=>patchChart(chart.id,{rememberZoom})}/><SwitchRow label="觸控穿透" value={chart.touchThrough} onChange={touchThrough=>patchChart(chart.id,{touchThrough})}/>
            <EditorRow title="最小縮放" subtitle={`${chart.zoomMin.toFixed(1)}×`}><NumberStep label="×" value={chart.zoomMin} min={1} max={4} step={1} onChange={zoomMin=>patchChart(chart.id,{zoomMin})}/></EditorRow>
            <EditorRow title="最大縮放" subtitle={`${chart.zoomMax.toFixed(1)}×`}><NumberStep label="×" value={chart.zoomMax} min={2} max={20} step={1} onChange={zoomMax=>patchChart(chart.id,{zoomMax})}/></EditorRow>
            <Text style={styles.rule}>未鎖定＝移動／Resize 編輯；已鎖定＝單指平移資料、兩指 Pinch Zoom。</Text>
          </AccordionGroup>
          <CapabilityHint type="chart"/>
        </View>:null}
      </View>;
    })}
  </View>;
}

function hasContentTools(pageKey:MainPageKey,frameKey:string){
  return (pageKey==='home'&&['market-news','holding-quotes','asset-dashboard'].includes(frameKey))||(pageKey==='portfolio'&&frameKey==='holding-view')||(pageKey==='ai'&&frameKey==='ai-news');
}
function CapabilityHint({type}:{type:'title'|'chart'}){
  const groups=getComponentCapabilities(type);
  return <Text style={styles.capabilityHint}>能力模型：{groups.map(group=>group.label).join('／')}</Text>;
}
function AccordionGroup({title,subtitle,expanded,onPress,children}:{title:string;subtitle:string;expanded:boolean;onPress:()=>void;children:ReactNode}){
  return <View style={styles.accordion}><Pressable onPress={onPress} style={styles.accordionHeader}><View style={{flex:1}}><Text style={styles.accordionTitle}>{title}</Text><Text style={styles.rowHint}>{subtitle}</Text></View><Text style={styles.accordionToggle}>{expanded?'−':'+'}</Text></Pressable>{expanded?<View style={styles.accordionBody}>{children}</View>:null}</View>;
}
function SwitchRow({label,value,onChange}:{label:string;value:boolean;onChange:(value:boolean)=>void}){return <EditorRow title={label} subtitle={value?'開啟':'關閉'}><Switch value={value} onValueChange={onChange} trackColor={{true:colors.primary}}/></EditorRow>;}
function LayerButton({label,onPress}:{label:string;onPress:()=>void}){return <Pressable style={styles.layerButton} onPress={onPress}><Text style={styles.layerButtonText}>{label}</Text></Pressable>;}
function NumberStep({label,value,min,max,step,onChange}:{label:string;value:number;min:number;max:number;step:number;onChange:(value:number)=>void}){
  return <View style={styles.numberStep}><Text style={styles.numberLabel}>{label}</Text><Pressable style={styles.numberButton} onPress={()=>onChange(Math.max(min,value-step))}><Text style={styles.numberButtonText}>−</Text></Pressable><Text style={styles.numberValue}>{Number.isInteger(value)?value:value.toFixed(1)}</Text><Pressable style={styles.numberButton} onPress={()=>onChange(Math.min(max,value+step))}><Text style={styles.numberButtonText}>＋</Text></Pressable></View>;
}
function EditorRow({title,subtitle,children}:{title:string;subtitle:string;children:ReactNode}){return <View style={styles.editorRow}><View style={{flex:1}}><Text style={styles.rowLabel}>{title}</Text><Text style={styles.rowHint}>{subtitle}</Text></View><View style={styles.editorControl}>{children}</View></View>;}
function ChoiceGroup<T extends string>({items,value,onChange,disabled=false}:{items:readonly {key:T;label:string}[];value:T;onChange:(value:T)=>void;disabled?:boolean}){
  return <View style={styles.choiceGroup}>{items.map(item=><Pressable key={item.key} disabled={disabled} onPress={()=>onChange(item.key)} style={[styles.choice,value===item.key&&styles.choiceActive,disabled&&styles.disabled]}><Text style={[styles.choiceText,value===item.key&&styles.choiceTextActive]}>{item.label}</Text></Pressable>)}</View>;
}

const styles=StyleSheet.create({
  root:{flex:1,backgroundColor:colors.background},
  pageTitleInput:{borderWidth:1,borderColor:colors.border,borderRadius:radius.md,minHeight:42,paddingHorizontal:12,color:colors.text,backgroundColor:colors.surface,fontSize:15},
  top:{paddingTop:56,paddingHorizontal:spacing.lg,paddingBottom:spacing.lg,backgroundColor:colors.surface,borderBottomWidth:1,borderBottomColor:colors.border,flexDirection:'row',alignItems:'flex-start',gap:spacing.sm},
  kicker:{fontSize:12,fontWeight:'800',color:colors.primary},title:{fontSize:26,fontWeight:'900',color:colors.text,marginTop:4},hint:{fontSize:12,color:colors.textSecondary,lineHeight:18,marginTop:5},
  cancel:{paddingHorizontal:12,paddingVertical:10,borderRadius:radius.pill,backgroundColor:colors.surfaceMuted},cancelText:{color:colors.textSecondary,fontWeight:'800'},
  save:{paddingHorizontal:14,paddingVertical:10,borderRadius:radius.pill,backgroundColor:colors.primary},saveText:{color:'#FFFFFF',fontWeight:'800'},
  content:{padding:spacing.lg,gap:spacing.md,paddingBottom:48},toolbar:{backgroundColor:colors.surfaceMuted,borderRadius:radius.md,padding:spacing.md,flexDirection:'row',alignItems:'center',gap:spacing.md},toolbarText:{flex:1,fontSize:10,lineHeight:15,color:colors.textSecondary},resetText:{fontSize:11,fontWeight:'900',color:colors.primary},
  section:{backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border,borderRadius:radius.lg,overflow:'hidden'},header:{padding:spacing.lg,flexDirection:'row',alignItems:'center',gap:spacing.md},sectionTitle:{fontSize:17,fontWeight:'900',color:colors.text},description:{fontSize:12,color:colors.textSecondary,marginTop:4},toggle:{fontSize:25,color:colors.primary,fontWeight:'600'},
  body:{paddingHorizontal:spacing.lg,paddingBottom:spacing.lg,borderTopWidth:StyleSheet.hairlineWidth,borderTopColor:colors.border,gap:8},
  accordion:{borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:colors.border},accordionHeader:{paddingVertical:13,flexDirection:'row',alignItems:'center',gap:8},accordionTitle:{fontSize:13,fontWeight:'900',color:colors.text},accordionToggle:{fontSize:20,fontWeight:'900',color:colors.primary},accordionBody:{paddingBottom:10},
  editorRow:{paddingVertical:10,gap:8},rowLabel:{fontWeight:'800',color:colors.text},rowHint:{fontSize:10,color:colors.textSecondary,marginTop:3,lineHeight:15},editorControl:{marginTop:5},
  choiceGroup:{flexDirection:'row',flexWrap:'wrap',gap:6},choice:{paddingHorizontal:10,paddingVertical:7,borderRadius:radius.pill,backgroundColor:colors.surfaceMuted,borderWidth:1,borderColor:colors.border},choiceActive:{backgroundColor:colors.primary,borderColor:colors.primary},choiceText:{fontSize:10,fontWeight:'800',color:colors.textSecondary},choiceTextActive:{color:'#FFFFFF'},
  orderRow:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingVertical:12},orderButton:{paddingHorizontal:12,paddingVertical:8,borderRadius:radius.md,backgroundColor:colors.surfaceMuted},orderText:{fontSize:11,fontWeight:'900',color:colors.primary},orderIndex:{fontSize:11,fontWeight:'800',color:colors.textSecondary},disabled:{opacity:.35},
  newsEditor:{gap:4},rule:{fontSize:11,lineHeight:17,color:colors.primary,marginTop:4,fontWeight:'700'},capabilityHint:{fontSize:10,lineHeight:16,color:colors.textSecondary,marginTop:8},
  dashboardTools:{gap:10},dashboardTitle:{fontSize:13,fontWeight:'900',color:colors.text},dashboardHint:{fontSize:10,lineHeight:16,color:colors.textSecondary},chartHeader:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8},addChart:{paddingHorizontal:10,paddingVertical:7,borderRadius:radius.pill,backgroundColor:colors.primary},addChartText:{fontSize:10,fontWeight:'900',color:'#FFFFFF'},
  chartEditor:{borderWidth:1,borderColor:colors.border,borderRadius:radius.md,overflow:'hidden'},chartBody:{padding:10,gap:6},chartName:{fontSize:11,fontWeight:'900',color:colors.text,padding:10},deleteChart:{fontSize:10,fontWeight:'900',color:colors.loss,paddingVertical:8},layerActions:{flexDirection:'row',flexWrap:'wrap',gap:6},layerButton:{paddingHorizontal:10,paddingVertical:7,borderRadius:radius.pill,backgroundColor:colors.surfaceMuted,borderWidth:1,borderColor:colors.border},layerButtonText:{fontSize:10,fontWeight:'900',color:colors.primary},
  stepGrid:{gap:6},numberStep:{flexDirection:'row',alignItems:'center',gap:6},numberLabel:{width:24,fontSize:10,fontWeight:'800',color:colors.textSecondary},numberButton:{width:32,height:30,alignItems:'center',justifyContent:'center',borderRadius:radius.sm,backgroundColor:colors.surfaceMuted},numberButtonText:{fontSize:14,fontWeight:'900',color:colors.primary},numberValue:{minWidth:48,textAlign:'center',fontSize:10,fontWeight:'900',color:colors.text},
});
