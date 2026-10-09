import {portfolioFrameTone,financialTone} from '../theme/financialTone';
import {useEffect,useMemo,useState,type ReactElement} from 'react';
import {Alert,Image,Pressable,ScrollView,StyleSheet,Switch,Text,TextInput,useWindowDimensions,View} from 'react-native';

import type {PageFrameDefinition} from '../domain/frameRegistry';
import type {MainPageKey} from '../domain/pageRegistry';
import {DEFAULT_HOLDING_WALL_CONFIG,type HoldingQuote,type HoldingWallConfig,type HoldingWallFieldKey,type QuoteModuleStyle} from '../domain/uiModels';
import type {DashboardChartConfig,DashboardChartSource,DashboardChartStyle,FrameBehavior,FrameEditorConfig,PageDisplayConfig} from '../editor/editorModel';
import {layoutKindLabel,layoutToolProfile,type LayoutToolTargetKind} from '../editor/layoutToolModel';
import {colors,radius,spacing} from '../theme/tokens';
import {ColorPalettePicker} from './ColorPalettePicker';
import {HoldingQuoteCollection,type HoldingLayoutMode} from './HoldingQuoteCollection';
import {PortfolioHoldingTable} from './PortfolioHoldingTable';
import {PortfolioSafeList} from './PortfolioSafeList';
import {PortfolioQuickBar} from './PortfolioQuickBar';
import {PortfolioListEditor} from './PortfolioListEditor';
import {DEFAULT_PORTFOLIO_LIST} from '../domain/portfolioList';
import {normalizePortfolioViewMode,quickModeFromDisplay,type PortfolioPrimaryMode} from '../domain/portfolioModeSwitch';
import {sortPreset,sortHoldingQuotes} from '../domain/holdingSort';
import {PageHeaderVisual} from './PageHeaderVisual';
import {FrameCard,type FrameCardProps} from './FrameCard';
import {selectDividendPreview} from './DividendPreviewSelector';
import {DIVIDEND_EDITOR_CATALOG} from '../editor/dividendEditorCatalog';
import {DashboardAssetOverview} from './dashboard/DashboardAssetOverview';
import {DashboardProfitAnalysis} from './dashboard/DashboardProfitAnalysis';
import {DashboardProfitDetail} from './dashboard/DashboardProfitDetail';
import {DashboardQuickActions} from './dashboard/DashboardQuickActions';
import {DEFAULT_DASHBOARD_LAYOUT,type DashboardLayoutConfig} from '../domain/dashboardLayout';
import {useFinance} from '../finance/FinanceRuntime';
import {deriveDailyPnlRecord} from '../finance/dailyPnlHistory';
import {useMarketRuntime} from '../market/MarketRuntime';
import {LayoutSelectionProvider,type LayoutSelectionTarget} from '../editor/LayoutSelectionContext';
import {TARGET_APPEARANCE,mergeTargetAppearance,normalizeTargetOverride,type FrameMaintenanceContext,type TargetAppearance,type TargetOverride} from '../maintenance/inspectionModel';
import {DEFAULT_FRAME_EFFECTS,normalizeFrameEffects,type FrameEffects} from '../maintenance/frameEffects';
import {ITEM_EFFECT_INTENSITIES,ITEM_EFFECT_KINDS,ITEM_EFFECT_SPEEDS,ITEM_EFFECT_TRIGGERS,type ItemEffectConfig} from '../domain/displayItemContract';
import {DEFAULT_ETF_BADGES} from '../domain/etfBadges';
import {safeHoldingStyle} from '../domain/holdingLayoutPolicy';
import {FloatingDashboardChart} from './FloatingDashboardChart';
import {THEME_BACKGROUNDS} from '../theme/ThemeRuntime';
import {ThemeBackgroundLayer} from '../theme/ThemeBackgroundLayer';

type Selection={id:string;kind:LayoutToolTargetKind;label:string;field?:HoldingWallFieldKey;width?:number;height?:number};
const numericFields:readonly HoldingWallFieldKey[]=['price','change','changePercent','pnl','roi','marketValue'];
const money=(value:number)=>Math.round(value).toLocaleString('zh-TW');

const actualHomePreviewKeys=new Set(['asset-dashboard','profit-analysis','pnl-detail','dashboard-quick-actions','holding-quotes']);
const actualPortfolioPreviewKeys=new Set(['holding-view']);
const actualDividendPreviewKeys=new Set(['dividend-summary','dividend-calendar','dividend-list','annual-trend']);
const hasRealPreview=(page:MainPageKey,key:string)=>
  key==='page-header'||(page==='home'?actualHomePreviewKeys.has(key):page==='portfolio'?actualPortfolioPreviewKeys.has(key):page==='dividend'?actualDividendPreviewKeys.has(key):false);

export function PageLayoutToolWorkbench({
  pageKey,frames,draft,displayDraft,onPatchFrame,onMoveFrame,onSetFrameBehavior,onChangeDisplay,previewQuote,previewRows,previewElements,pageTitle,onChangePageTitle,previewFirstMode='list',previewListFallback=false,
}:{
  pageKey:MainPageKey;
  frames:readonly PageFrameDefinition[];
  draft:Record<string,FrameEditorConfig>;
  displayDraft:PageDisplayConfig;
  onPatchFrame:(key:string,next:Partial<FrameEditorConfig>)=>void;
  onMoveFrame:(key:string,delta:-1|1)=>void;
  onSetFrameBehavior:(key:string,behavior:FrameBehavior)=>void;
  onChangeDisplay:(next:PageDisplayConfig)=>void;
  previewQuote?:HoldingQuote|undefined;
  previewRows?:readonly HoldingQuote[]|undefined;
  previewElements?:readonly {key:string;element:ReactElement<FrameCardProps>}[]|undefined;
  previewFirstMode?:PortfolioPrimaryMode|undefined;
  previewListFallback?:boolean|undefined;
  pageTitle:string;
  onChangePageTitle:(value:string)=>void;
}){
  const finance=useFinance();
  const market=useMarketRuntime();
  const {width:windowWidth}=useWindowDimensions();
  const previewPnl=useMemo(()=>deriveDailyPnlRecord({
    initialCash:finance.initialCash,
    entries:finance.entries,
    rawQuotes:finance.quotes,
    currentSnapshot:finance.snapshot,
    valuationComplete:finance.valuationComplete,
    marketDataVersion:market.marketDataVersion,
  }),[
    finance.initialCash,finance.entries,finance.quotes,finance.snapshot,
    finance.valuationComplete,market.marketDataVersion,
  ]);
  const orderedFrames=useMemo(()=>[...frames].sort((a,b)=>(draft[a.key]?.order??0)-(draft[b.key]?.order??0)),[frames,draft]);
  const previewFrames=useMemo(()=>orderedFrames.filter(frame=>hasRealPreview(pageKey,frame.key)),[orderedFrames,pageKey]);
  const initial=useMemo(()=>pageKey==='home'&&previewFrames.some(f=>f.key==='asset-dashboard')?'asset-dashboard':
    pageKey==='portfolio'&&previewFrames.some(f=>f.key==='holding-view')?'holding-view':
    pageKey==='dividend'&&previewFrames.some(f=>f.key==='dividend-calendar')?'dividend-calendar':
    previewFrames[0]?.key??frames[0]?.key??'page-header',[pageKey,previewFrames,frames]);
  const [frameKey,setFrameKey]=useState(initial);
  const [selection,setSelection]=useState<Selection>({id:'frame',kind:'frame',label:'框架'});
  const [openGroup,setOpenGroup]=useState<string|null>('size');
  const [frameMeasurements,setFrameMeasurements]=useState<Record<string,{width:number;height:number}>>({});
  const [previewBounds,setPreviewBounds]=useState({width:0,height:0});
  const [previewViewportWidth,setPreviewViewportWidth]=useState(0);
  const [actualCanvasHeight,setActualCanvasHeight]=useState(1);
  const actualPageWidth=Math.max(280,Math.round(windowWidth-spacing.lg*2));
  const previewScale=previewViewportWidth>0?Math.min(1,previewViewportWidth/actualPageWidth):1;
  const scaledPageHeight=Math.max(1,Math.ceil(actualCanvasHeight*previewScale));
  useEffect(()=>{setFrameKey(initial);setSelection({id:'frame',kind:'frame',label:'框架'});setOpenGroup('size');},[initial]);

  const frame=frames.find(item=>item.key===frameKey)??frames[0];
  const frameConfig=frame?draft[frame.key]:undefined;
  if(!frame||!frameConfig)return null;

  const profile=layoutToolProfile(pageKey,frame.key);
  const holding=(pageKey==='home'&&frame.key==='holding-quotes')||(pageKey==='portfolio'&&frame.key==='holding-view');
  const wall=displayDraft.holdingWall??DEFAULT_HOLDING_WALL_CONFIG;
  const holdingLayoutMode=(displayDraft.holdingLayoutMode??'list') as HoldingLayoutMode;
  const rawQuoteStyle=(displayDraft.quoteStyle??'quote') as QuoteModuleStyle;
  const holdingQuoteStyle=safeHoldingStyle(holdingLayoutMode,rawQuoteStyle);
  const holdingPreviewRows=previewRows?.length?previewRows:(previewQuote?[previewQuote]:[]);
  // The preview must follow PortfolioScreen's active view, not force quote cards.
  const portfolioListMode=pageKey==='portfolio'&&normalizePortfolioViewMode(displayDraft.portfolioViewMode)==='list';
  const previewSort=sortPreset(displayDraft.sortKey);
  const sortedPreviewRows=sortHoldingQuotes(holdingPreviewRows,previewSort.key,previewSort.descending);
  const previewQuickMode=quickModeFromDisplay(displayDraft.portfolioViewMode,holdingQuoteStyle,holdingLayoutMode);
  const dashboard=displayDraft.dashboardLayout??DEFAULT_DASHBOARD_LAYOUT;
  const dashboardCharts=displayDraft.dashboardCharts??[];
  const targets=displayDraft.layoutTargets??{};
  const selectedDashboardChart=selection.id.startsWith('chart:')?
    dashboardCharts.find(chart=>'chart:'+chart.id===selection.id):undefined;
  const fx=normalizeFrameEffects(frameConfig.effects,DEFAULT_FRAME_EFFECTS);
  const selectedField=selection.field?wall.fields.find(x=>x.field===selection.field):undefined;

  const patchWall=(next:HoldingWallConfig)=>onChangeDisplay({...displayDraft,holdingWall:next});
  const patchWallStyle=(next:Partial<HoldingWallConfig['style']>)=>patchWall({...wall,style:{...wall.style,...next}});
  const patchField=(field:HoldingWallFieldKey,next:Partial<(typeof wall.fields)[number]>)=>
    patchWall({...wall,fields:wall.fields.map(item=>item.field===field?{...item,...next}:item)});
  const moveField=(field:HoldingWallFieldKey,delta:-1|1)=>{
    const next=[...wall.fields],index=next.findIndex(item=>item.field===field),to=index+delta;
    if(index<0||to<0||to>=next.length)return;
    [next[index],next[to]]=[next[to]!,next[index]!];
    patchWall({...wall,fields:next});
  };
  const patchFx=(next:Partial<FrameEffects>)=>onPatchFrame(frame.key,{effects:normalizeFrameEffects({...fx,...next},DEFAULT_FRAME_EFFECTS)});
  const patchDashboard=(next:DashboardLayoutConfig)=>onChangeDisplay({...displayDraft,dashboardLayout:next});
  const patchDashboardChart=(id:string,next:Partial<DashboardChartConfig>)=>
    onChangeDisplay({...displayDraft,dashboardCharts:dashboardCharts.map(chart=>chart.id===id?{...chart,...next}:chart)});
  const patchTarget=(id:string,next:TargetOverride)=>{
    const current=targets[id]??{};
    onChangeDisplay({...displayDraft,layoutTargets:{...targets,[id]:normalizeTargetOverride({...current,...next})}});
  };
  const resetTarget=(id:string)=>{
    Alert.alert('確認恢復目前物件','將恢復目前選取物件的排版設定。請再次確認是否恢復。',[
      {text:'取消',style:'cancel'},
      {text:'確認恢復',style:'destructive',onPress:()=>{const next={...targets};delete next[id];onChangeDisplay({...displayDraft,layoutTargets:next});}},
    ]);
  };

  const chooseKind=(kind:LayoutToolTargetKind)=>{
    if(kind==='frame')setSelection({id:'frame',kind,label:'框架'});
    else if(holding&&kind==='card')setSelection({id:'card',kind,label:'行情卡片'});
    else if(holding&&kind==='text')setSelection({id:'field:name',kind,label:'名稱',field:'name'});
    else if(holding&&kind==='value')setSelection({id:'field:price',kind,label:'即時價格',field:'price'});
    else if(holding&&kind==='chart')setSelection({id:'chart',kind,label:'Mini 圖表'});
    else if(pageKey==='home'&&frame.key==='asset-dashboard'&&kind==='chart'){
      const chart=(displayDraft.dashboardCharts??[])[0];
      if(chart)setSelection({id:'chart:'+chart.id,kind,label:chart.title});
    }
    else if(frame.key==='page-header'&&kind==='text')setSelection({id:'header:title',kind:'text',label:'頁面主標題'});
    else if(kind==='card')setSelection(defaultDashboardSelection(frame.key,'card'));
    else if(kind==='text')setSelection(defaultDashboardSelection(frame.key,'text'));
    else if(kind==='value')setSelection(defaultDashboardSelection(frame.key,'value'));
    else setSelection({id:kind,kind,label:layoutKindLabel(kind)});
    setOpenGroup(kind==='frame'?'size':kind==='card'?'surface':
      frame.key==='page-header'&&kind==='text'?'content':kind==='text'||kind==='value'?'type':'layout');
  };
  const selectHolding=(id:string,label:string)=>{
    if(id==='card'){setSelection({id,kind:'card',label});setOpenGroup('card-style');return;}
    if(id==='chart'){setSelection({id,kind:'chart',label});setOpenGroup('chart');return;}
    if(id.startsWith('field:')){
      const field=id.slice(6) as HoldingWallFieldKey;
      setSelection({id,kind:numericFields.includes(field)?'value':'text',label,field});
      setOpenGroup('type');
    }
  };
  const selectTarget=(target:LayoutSelectionTarget)=>{
    const kind:LayoutToolTargetKind=target.kind==='prefix'?'text':
      target.kind==='card'||target.kind==='text'||target.kind==='value'||target.kind==='chart'||target.kind==='button'?
        target.kind:'text';
    setSelection({id:target.id,kind,label:target.label,...(target.width!==undefined?{width:target.width}:{}),...(target.height!==undefined?{height:target.height}:{})});
    setOpenGroup(target.id==='header:title'?'content':kind==='card'?'surface':kind==='text'||kind==='value'?'type':'layout');
  };
  const toggle=(key:string)=>setOpenGroup(current=>current===key?null:key);

  const portfolio=finance.snapshot.portfolio;
  const valuationComplete=finance.valuationComplete;
  const kpis=[
    {key:'realizedNetPnL',label:'已實現損益',value:money(portfolio.realizedNetPnL),caption:'歷史賣出',tone:financialTone(portfolio.realizedNetPnL),glyph:'↗'},
    {key:'totalPnl',label:'含息總損益',value:valuationComplete?money(portfolio.totalPnl):'待核對',caption:'含息總損益',tone:financialTone(portfolio.totalPnl,valuationComplete),glyph:'%'},
    {key:'totalUnrealizedProfit',label:'未實現損益',value:valuationComplete?money(portfolio.totalUnrealizedProfit):'待核對',caption:'淨清算',tone:financialTone(portfolio.totalUnrealizedProfit,valuationComplete),glyph:'▥'},
    {key:'totalMarketValue',label:'持股市值',value:valuationComplete?money(portfolio.totalMarketValue):'待核對',caption:'持股行情＋股數',glyph:'◔'},
  ];
  const rows=[
    {key:'price',label:'純價差未實現',value:valuationComplete?money(portfolio.totalPriceUnrealizedProfit):'待核對',tone:financialTone(portfolio.totalPriceUnrealizedProfit,valuationComplete)},
    {key:'net',label:'淨清算未實現',value:valuationComplete?money(portfolio.totalUnrealizedProfit):'待核對',tone:financialTone(portfolio.totalUnrealizedProfit,valuationComplete)},
    {key:'realized',label:'已實現損益',value:money(portfolio.realizedNetPnL),tone:financialTone(portfolio.realizedNetPnL)},
    {key:'total',label:'含息總損益',value:valuationComplete?money(portfolio.totalPnl):'待核對',tone:financialTone(portfolio.totalPnl,valuationComplete)},
  ];

  const chartData=(chart:DashboardChartConfig)=>{
    const source=chart.source;
    const holdingValues=holdingPreviewRows.map(row=>{
      if(source==='pnl')return row.pnl;
      if(source==='dividend')return row.cumulativeDividend;
      if(source==='roi')return row.roi;
      if(source==='avgCost')return row.avgCost;
      if(source==='price')return row.price;
      if(source==='shares')return row.shares;
      if(source==='realizedPnl')return row.realizedPnl;
      if(source==='comprehensivePnl')return row.comprehensivePnl;
      return row.marketValue;
    });
    const values=source==='transactions'
      ?holdingPreviewRows.map(row=>finance.entries.filter(entry=>'symbol' in entry&&entry.symbol===row.symbol&&(entry.kind==='buy'||entry.kind==='sell')).length)
      :holdingValues;
    const labels=holdingPreviewRows.map(row=>row.symbol);
    return {values:values.length?values:[0],labels:labels.length?labels:['目前']};
  };
  const selectFrameDirect=(item:PageFrameDefinition)=>{
    setFrameKey(item.key);setSelection({id:'frame',kind:'frame',label:'框架'});setOpenGroup('size');
  };
  const previewContentFor=(item:PageFrameDefinition)=>{
    if(pageKey==='dividend'){
      const actual=previewElements?.find(view=>view.key===item.key)?.element;
      return actual?selectDividendPreview(actual.props.children,
        selected=>{setFrameKey(item.key);selectTarget(selected);},
        frameKey===item.key?selection.id:null,targets):null;
    }
    const itemHolding=(pageKey==='home'&&item.key==='holding-quotes')||(pageKey==='portfolio'&&item.key==='holding-view');
    if(pageKey==='portfolio'&&item.key==='holding-view')return <View style={{gap:12}}>
      {/* The production quick bar and actual view renderer, bound to the same draft. */}
      <View pointerEvents="none"><PortfolioQuickBar firstMode={previewFirstMode} activeMode={previewQuickMode}
        sortLabel={previewSort.label} onCycleFirst={()=>{}} onSelect={()=>{}} onCycleSort={()=>{}}/></View>
      {portfolioListMode?<>
        <Pressable accessibilityRole="button" accessibilityLabel="選取持股清單設定"
          onPress={()=>{setFrameKey(item.key);setSelection({id:'frame',kind:'frame',label:'框架'});setOpenGroup('portfolio-list');}}
          style={{alignSelf:'flex-start',borderWidth:1,borderColor:colors.primary,backgroundColor:colors.surfaceMuted,
            paddingVertical:7,paddingHorizontal:12,borderRadius:radius.pill}}>
          <Text style={{fontSize:11,fontWeight:'900',color:colors.primary}}>✎ 編輯清單／標籤／提醒及特效</Text>
        </Pressable>
        {previewListFallback?<PortfolioSafeList rows={sortedPreviewRows} onOpenHolding={()=>{}}/>:
          <PortfolioHoldingTable rows={sortedPreviewRows} config={displayDraft.portfolioList??DEFAULT_PORTFOLIO_LIST}
            badges={displayDraft.etfBadges??DEFAULT_ETF_BADGES} refreshToken={finance.sharedSnapshot.generatedAt}/>}
      </>:<>
        <View style={{flexDirection:'row',flexWrap:'wrap',gap:8,alignItems:'center'}}>
          <Text style={{fontSize:10,fontWeight:'800',color:colors.textSecondary}}>排列</Text>
          {(['list','grid2','grid3','horizontal','paged2'] as const).map((key,index)=>
            <Pressable key={key} onPress={()=>onChangeDisplay({...displayDraft,holdingLayoutMode:key,
              ...(key==='grid3'&&(rawQuoteStyle==='chart'||rawQuoteStyle==='advanced')?{quoteStyle:'quote' as const}:{})})}
              style={{paddingHorizontal:10,paddingVertical:6,borderRadius:radius.pill,borderWidth:1,
                borderColor:holdingLayoutMode===key?colors.primary:colors.border,backgroundColor:colors.surfaceMuted}}>
              <Text style={{fontSize:10,color:colors.textSecondary}}>{['單欄','雙欄','三欄','橫滑','雙欄滑動'][index]}</Text>
            </Pressable>)}
        </View>
        {holdingLayoutMode==='grid3'?<Text style={{fontSize:10,color:colors.textSecondary}}>三欄無圖表：僅顯示報價、漲跌、損益，點選卡片可檢視詳情。</Text>:null}
        <HoldingQuoteCollection rows={sortedPreviewRows} wallConfig={wall}
          badgeConfig={displayDraft.etfBadges??DEFAULT_ETF_BADGES} style={holdingQuoteStyle} layoutMode={holdingLayoutMode}
          refreshToken={finance.sharedSnapshot.generatedAt} onOpenHolding={()=>{}} onOpenChart={()=>{}}
          layoutEditMode layoutSelectionId={frameKey===item.key?selection.id:null}
          onLayoutSelect={(id,label)=>{setFrameKey(item.key);selectHolding(id,label);}}/>
        <Text style={{fontSize:10,color:colors.textSecondary}}>共 {sortedPreviewRows.length} 筆持股；排列模式不限制資料筆數。</Text>
      </>}
    </View>;
    if(itemHolding&&holdingPreviewRows.length)return <HoldingQuoteCollection rows={holdingPreviewRows} wallConfig={wall}
      badgeConfig={displayDraft.etfBadges??DEFAULT_ETF_BADGES}
      style={holdingQuoteStyle} layoutMode={holdingLayoutMode}
      refreshToken={finance.sharedSnapshot.generatedAt}
      onOpenHolding={()=>{}} onOpenChart={()=>{}}
      layoutEditMode layoutSelectionId={frameKey===item.key?selection.id:null}
      onLayoutSelect={(id,label)=>{setFrameKey(item.key);selectHolding(id,label);}}/>;
    if(pageKey==='home'&&item.key==='asset-dashboard')return <View style={{paddingHorizontal:dashboard.contentPadding}}>
      <DashboardAssetOverview amount={money(portfolio.totalMarketValue)} complete={valuationComplete}
        caption={valuationComplete?'持股市值＋股數':'待取得可信行情，帳務明細不受影響'} layout={dashboard.overview}
        yesterdayPnl={null} todayPnl={previewPnl?.todayPnl??null}
        totalPnl={portfolio.totalPriceUnrealizedProfit} pnlComplete={valuationComplete}/>
    </View>;
    if(pageKey==='home'&&item.key==='profit-analysis')return <View style={{paddingHorizontal:dashboard.contentPadding}}>
      <DashboardProfitAnalysis items={kpis} layout={dashboard.profitAnalysis}/>
    </View>;
    if(pageKey==='home'&&item.key==='pnl-detail')return <View style={{paddingHorizontal:dashboard.contentPadding}}>
      <DashboardProfitDetail rows={rows} layout={dashboard.profitDetail}/>
    </View>;
    if(pageKey==='home'&&item.key==='dashboard-quick-actions')return <View style={{paddingHorizontal:dashboard.contentPadding}}>
      <DashboardQuickActions layout={dashboard.quickActions} actions={[
        {key:'stock-query',label:'持股查詢',glyph:'⌕',onPress:()=>{}},
        {key:'ledger',label:'交易紀錄',glyph:'▤',onPress:()=>{}},
        {key:'allocation',label:'資產配置',glyph:'◔',onPress:()=>{}},
        {key:'dividend',label:'股息資訊',glyph:'＄',onPress:()=>{}},
      ]}/>
    </View>;
    return null;
  };
  const renderActualFrame=(item:PageFrameDefinition)=>{
    const itemConfig=draft[item.key];
    if(!itemConfig||!itemConfig.visible)return null;
    const selected=frameKey===item.key;
    const maintenance:FrameMaintenanceContext={page:pageKey,frameKey:item.key,frameTitle:item.title,frameConfig:itemConfig,displayConfig:displayDraft};
    const providerSelect=(target:LayoutSelectionTarget)=>{setFrameKey(item.key);selectTarget(target);};
    const dividendAction=pageKey==='dividend'?previewElements?.find(view=>view.key===item.key)?.element.props.action:undefined;
    return <View key={item.key}>
      <LayoutSelectionProvider targets={targets} selectedId={selected?selection.id:null} onSelect={providerSelect}>
        {item.key==='page-header'?
          <Pressable onPress={()=>selectFrameDirect(item)} style={selected&&selection.kind==='frame'?styles.frameSelected:undefined}
            onLayout={event=>{
              const {width,height}=event.nativeEvent.layout;
              setFrameMeasurements(previous=>previous[item.key]?.width===width&&previous[item.key]?.height===height?previous:{...previous,[item.key]:{width,height}});
            }}>
            <PageHeaderVisual title={pageTitle} frameConfig={itemConfig} frame={maintenance}
              layoutTargets={targets} selectedId={selected?selection.id:null} onSelect={providerSelect}/>
          </Pressable>:
          <Pressable onPress={()=>selectFrameDirect(item)} style={selected&&selection.kind==='frame'?styles.frameSelected:undefined}>
            <FrameCard title={item.title} action={pageKey==='dividend'?selectDividendPreview(dividendAction,providerSelect,selected?selection.id:null,targets):undefined} editorStyle={itemConfig}
              tone={portfolioFrameTone(pageKey,item.key,finance.snapshot.portfolio,finance.valuationComplete)}
              onMeasuredSize={({width,height})=>setFrameMeasurements(previous=>
                previous[item.key]?.width===width&&previous[item.key]?.height===height?previous:{...previous,[item.key]:{width,height}})}>
              {previewContentFor(item)}
            </FrameCard>
          </Pressable>}
      </LayoutSelectionProvider>
    </View>;
  };

  const base=selection.id.startsWith('header:')?headerTargetBase(selection.id,frameConfig):dashboardTargetBase(selection.id,dashboard);
  const current=mergeTargetAppearance(base,targets[selection.id]);
  const frameSortIndex=orderedFrames.findIndex(item=>item.key===frame.key);

  const visibleKinds=profile.kinds.filter(kind=>{
    if(kind==='chart')return holding||(pageKey==='home'&&frame.key==='asset-dashboard'&&Boolean((displayDraft.dashboardCharts??[]).length));
    if(kind==='data')return holding;
    if(pageKey==='dividend')return ['frame','card','text','value'].includes(kind);
    if(frame.key==='page-header')return kind==='frame'||kind==='text';
    if(kind==='layout')return pageKey==='home'&&['asset-dashboard','profit-analysis','pnl-detail','dashboard-quick-actions'].includes(frame.key);
    if(portfolioListMode&&holding)return kind==='frame';
    if(holding)return ['frame','card','text','value','chart','data'].includes(kind);
    if(pageKey==='home'&&frame.key==='asset-dashboard')return ['frame','card','text','value','chart','layout'].includes(kind);
    if(pageKey==='home'&&frame.key==='profit-analysis')return ['frame','card','layout'].includes(kind);
    if(pageKey==='home'&&frame.key==='pnl-detail')return ['frame','text','value','layout'].includes(kind);
    if(pageKey==='home'&&frame.key==='dashboard-quick-actions')return ['frame','text','layout'].includes(kind);
    return kind==='frame';
  });

  return <View style={styles.root}>
    <View style={styles.head}><View style={{flex:1}}><Text style={styles.title}>排版工具</Text>
      <Text style={styles.hint}>預覽直接使用 App 真實元件與目前資料。清單模式預覽正式表格，行情牆模式預覽正式卡片；只提供對應模式的編輯工具，帳務內容唯讀。</Text></View></View>

    <Text style={styles.title}>全部框架清單</Text>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.kindRow}>
      {orderedFrames.map(item=><Pressable key={'frame-list:'+item.key}
        accessibilityRole="button" accessibilityLabel={'編輯框架 '+item.title}
        accessibilityState={{selected:frameKey===item.key}}
        onPress={()=>selectFrameDirect(item)}
        style={[styles.kindChip,frameKey===item.key&&styles.kindChipActive]}>
        <Text style={[styles.kindText,frameKey===item.key&&styles.kindTextActive]}>
          {item.title}{draft[item.key]?.visible===false?'（已隱藏）':''}
        </Text>
      </Pressable>)}
    </ScrollView>
    {!hasRealPreview(pageKey,frame.key)?<Text style={styles.hint}>
      此框架可編輯排序、尺寸、外觀與顯示。內容細項請在實際頁面開啟維護工程師選取；此處尚未提供內容預覽。
    </Text>:null}

    <View style={styles.previewShell}>
      <View style={styles.previewTop}>
        <Text style={styles.previewTitle}>實際頁面編輯區</Text>
        <Text style={styles.path}>{frame.title} › {selection.label}｜滑到哪裡、點到哪裡，下方就開啟該物件設定</Text>
      </View>
      <Text style={styles.previewScaleText}>實際內容寬度 {actualPageWidth} px · 預覽 {Math.round(previewScale*100)}%</Text>
      <ScrollView nestedScrollEnabled style={styles.livePageScroll} contentContainerStyle={styles.livePageContent}
        showsVerticalScrollIndicator>
        <View style={styles.previewViewport} onLayout={event=>{
          const width=event.nativeEvent.layout.width;
          setPreviewViewportWidth(previous=>Math.abs(previous-width)<1?previous:width);
        }}>
          <View style={{width:Math.max(1,previewViewportWidth),height:scaledPageHeight,overflow:'hidden'}}>
            <View style={[styles.actualCanvas,{width:actualPageWidth,gap:dashboard.sectionGap,
              transformOrigin:'top left',transform:[{scale:previewScale}]}]} onLayout={event=>{
              const height=event.nativeEvent.layout.height;
              setActualCanvasHeight(previous=>Math.abs(previous-height)<1?previous:height);
              setPreviewBounds(previous=>previous.width===actualPageWidth&&previous.height===height?previous:{width:actualPageWidth,height});
            }}>
              <ThemeBackgroundLayer/>
              {previewFrames.map(renderActualFrame)}
              {pageKey==='home'&&previewBounds.width>0?dashboardCharts.map(chart=>{
                const data=chartData(chart);
                const x=chart.x<0?Math.max(0,previewBounds.width-chart.width):chart.x;
                const selected=selection.id==='chart:'+chart.id;
                return <View key={'actual-chart-'+chart.id} pointerEvents="box-none">
                  {chart.visible?<FloatingDashboardChart config={{...chart,locked:true,touchThrough:true}}
                    values={data.values} labels={data.labels} bounds={previewBounds} onMove={()=>{}} onResize={()=>{}}/>:null}
                  <Pressable accessibilityRole="button" accessibilityLabel={'選取圖表 '+chart.title}
                    onPress={()=>{setFrameKey('asset-dashboard');setSelection({id:'chart:'+chart.id,kind:'chart',label:chart.title,width:chart.width,height:chart.height});setOpenGroup('chart');}}
                    style={[styles.chartSelectOverlay,{left:x,top:chart.y,width:chart.width,height:chart.height,zIndex:Math.max(100,chart.zIndex+100)},
                      selected&&styles.chartSelected,!chart.visible&&styles.chartHidden]}>
                    {!chart.visible?<Text style={styles.chartHiddenText}>圖表已關閉 · {chart.title}</Text>:null}
                  </Pressable>
                </View>;
              }):null}
            </View>
          </View>
        </View>
      </ScrollView>
    </View>

    {pageKey==='dividend'&&DIVIDEND_EDITOR_CATALOG[frame.key]?.length?<View>
      <Text style={styles.title}>股息內容編輯項目</Text>
      <Text style={styles.hint}>上方點選真實內容，或從以下清單選擇項目。所有數值、配發狀態與業務動作維持原始資料及功能。</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.kindRow}>
        {DIVIDEND_EDITOR_CATALOG[frame.key]!.map(item=><Pressable key={item.id} accessibilityRole="button"
          accessibilityLabel={'編輯'+item.label} onPress={()=>selectTarget(item)}
          style={[styles.kindChip,selection.id===item.id&&styles.kindChipActive]}>
          <Text style={[styles.kindText,selection.id===item.id&&styles.kindTextActive]}>{item.label}</Text>
        </Pressable>)}
      </ScrollView>
    </View>:null}

    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.kindRow}>
      {visibleKinds.map(kind=><Pressable key={kind} onPress={()=>chooseKind(kind)} style={[styles.kindChip,selection.kind===kind&&styles.kindChipActive]}>
        <Text style={[styles.kindText,selection.kind===kind&&styles.kindTextActive]}>{layoutKindLabel(kind)}</Text>
      </Pressable>)}
    </ScrollView>

    {selection.kind==='frame'?<FrameTools frame={frameConfig} fx={fx} measured={frameMeasurements[frame.key]}
      position={frameSortIndex+1} canMoveUp={frameSortIndex>0} canMoveDown={frameSortIndex>=0&&frameSortIndex<orderedFrames.length-1}
      open={openGroup} toggle={toggle}
      patch={next=>onPatchFrame(frame.key,next)} patchFx={patchFx}
      setBehavior={behavior=>onSetFrameBehavior(frame.key,behavior)} move={delta=>onMoveFrame(frame.key,delta)}/>:null}

    {portfolioListMode&&frame.key==='holding-view'?<Accordion title="清單欄位／列高／外觀" subtitle="直接編輯正式清單；上方預覽同步更新" open={openGroup==='portfolio-list'} onPress={()=>toggle('portfolio-list')}>
      <PortfolioListEditor value={displayDraft.portfolioList??DEFAULT_PORTFOLIO_LIST}
        onChange={portfolioList=>onChangeDisplay({...displayDraft,portfolioList})}
        previewQuote={sortedPreviewRows[0]} badges={displayDraft.etfBadges??DEFAULT_ETF_BADGES}/>
    </Accordion>:null}
    {!portfolioListMode&&holding&&selection.kind==='card'?<HoldingCardTools wall={wall} open={openGroup} toggle={toggle} patch={patchWallStyle}/>:null}
    {!portfolioListMode&&holding&&(selection.kind==='text'||selection.kind==='value')&&selectedField?
      <HoldingFieldTools field={selectedField} open={openGroup} toggle={toggle}
        patch={next=>patchField(selectedField.field,next)} move={delta=>moveField(selectedField.field,delta)}/>:null}
    {!portfolioListMode&&holding&&selection.kind==='chart'?<HoldingMiniChartTools style={rawQuoteStyle} layoutMode={holdingLayoutMode} open={openGroup} toggle={toggle}
      onChange={quoteStyle=>onChangeDisplay({...displayDraft,quoteStyle})}/>:null}
    {!holding&&selection.kind==='chart'&&selectedDashboardChart?<DashboardChartTools chart={selectedDashboardChart}
      actualX={selectedDashboardChart.x<0?Math.max(0,previewBounds.width-selectedDashboardChart.width):selectedDashboardChart.x}
      open={openGroup} toggle={toggle} patch={next=>patchDashboardChart(selectedDashboardChart.id,next)}/>:null}
    {!portfolioListMode&&holding&&selection.kind==='data'?<Accordion title="欄位顯示" subtitle="只改顯示與排序，不改原始行情與帳務資料" open={openGroup==='layout'} onPress={()=>toggle('layout')}>
      {wall.fields.map(field=><SwitchRow key={field.field} label={field.label} value={field.enabled} onChange={enabled=>patchField(field.field,{enabled})}/>)}
    </Accordion>:null}

    {!holding&&(selection.id.startsWith('dashboard:')||selection.id.startsWith('header:')||selection.id.startsWith('dividend:'))&&(selection.kind==='text'||selection.kind==='value'||selection.kind==='card')?
      <TargetTools kind={selection.kind} id={selection.id} current={current} actualWidth={selection.width} actualHeight={selection.height} open={openGroup} toggle={toggle}
        patch={next=>patchTarget(selection.id,next)} reset={()=>resetTarget(selection.id)}
        {...(selection.id==='header:title'?{contentValue:pageTitle,onContentChange:onChangePageTitle}:{})}/>:null}

    {!holding&&selection.kind==='layout'&&pageKey==='home'?
      <DashboardLayoutTools frameKey={frame.key} value={dashboard} open={openGroup} toggle={toggle} onChange={patchDashboard}/>:null}
  </View>;
}

function FrameTools({frame,fx,measured,position,canMoveUp,canMoveDown,open,toggle,patch,patchFx,setBehavior,move}:{frame:FrameEditorConfig;fx:FrameEffects;measured?:{width:number;height:number}|undefined;position:number;canMoveUp:boolean;canMoveDown:boolean;open:string|null;toggle:(k:string)=>void;patch:(n:Partial<FrameEditorConfig>)=>void;patchFx:(n:Partial<FrameEffects>)=>void;setBehavior:(behavior:FrameBehavior)=>void;move:(delta:-1|1)=>void}){
  const basePadding=frame.padding??(frame.layout==='compact'?12:frame.layout==='dense'?10:16);
  const baseGap=frame.layout==='compact'?8:frame.layout==='dense'?6:12;
  const actualWidth=Math.round(frame.width??measured?.width??320);
  const actualHeight=Math.round(frame.height??measured?.height??Math.max(frame.minHeight??0,260));
  const actualMinHeight=Math.round((frame.minHeight??0)>0?(frame.minHeight??0):actualHeight);
  const actualMaxWidth=Math.round(fx.maxWidth>0?fx.maxWidth:actualWidth);
  return <View>
    <Accordion title="排序" subtitle="恢復原有框架順位設定；只改同層顯示順序" open={open==='order'} onPress={()=>toggle('order')}>
      <ChoiceRow label="排序模式" value={frame.behavior} items={[['manual','手動排序'],['auto','自動順位'],['locked','鎖定']]} onChange={value=>setBehavior(value as FrameBehavior)}/>
      <View style={styles.row}><Text style={styles.rowLabel}>目前順位</Text><Text style={styles.readOnlyValue}>{position}</Text></View>
      <View style={styles.orderButtons}>
        <Pressable accessibilityRole="button" disabled={frame.behavior!=='manual'||!canMoveUp}
          onPress={()=>move(-1)} style={[styles.orderButton,(frame.behavior!=='manual'||!canMoveUp)&&styles.orderButtonDisabled]}>
          <Text style={styles.orderButtonText}>↑ 前移</Text>
        </Pressable>
        <Pressable accessibilityRole="button" disabled={frame.behavior!=='manual'||!canMoveDown}
          onPress={()=>move(1)} style={[styles.orderButton,(frame.behavior!=='manual'||!canMoveDown)&&styles.orderButtonDisabled]}>
          <Text style={styles.orderButtonText}>↓ 後移</Text>
        </Pressable>
      </View>
    </Accordion>
    <Accordion title="尺寸" subtitle="寬度、高度、最小高度、最大寬度" open={open==='size'} onPress={()=>toggle('size')}>
      <NumberStep label="寬度" value={actualWidth} min={160} max={1600} step={10} suffix=" px" onChange={width=>patch({width})}/>
      <NumberStep label="高度" value={actualHeight} min={80} max={2400} step={10} suffix=" px" onChange={height=>patch({height})}/>
      <NumberStep label="最小高度" value={actualMinHeight} min={0} max={2400} step={10} suffix=" px" onChange={minHeight=>patch({minHeight})}/>
      <NumberStep label="最大寬度" value={actualMaxWidth} min={160} max={1600} step={20} suffix=" px" onChange={maxWidth=>patchFx({maxWidth})}/>
    </Accordion>
    <Accordion title="內距／空間" subtitle="整體內距、四邊內距、內容間距與外距" open={open==='spacing'} onPress={()=>toggle('spacing')}>
      <NumberStep label="整體 Padding" value={frame.padding??16} min={0} max={32} step={1} suffix=" px" onChange={padding=>patch({padding})}/>
      {(['paddingTop','paddingRight','paddingBottom','paddingLeft'] as const).map((key,i)=><NumberStep key={key} label={['上內距','右內距','下內距','左內距'][i]!}
        value={fx[key]>=0?fx[key]:basePadding} min={0} max={32} step={1} suffix=" px" onChange={v=>patchFx({[key]:v} as Partial<FrameEffects>)}/>)}
      <NumberStep label="內容間距" value={fx.contentGap>=0?fx.contentGap:baseGap} min={0} max={40} step={1} suffix=" px" onChange={contentGap=>patchFx({contentGap})}/>
      <NumberStep label="上下外距" value={fx.marginVertical} min={0} max={32} step={1} suffix=" px" onChange={marginVertical=>patchFx({marginVertical})}/>
    </Accordion>
    <Accordion title="框架標題" subtitle="標題字體、顏色、對齊與跑馬燈" open={open==='title'} onPress={()=>toggle('title')}>
      <NumberStep label="字體大小" value={frame.titleFontSize} min={10} max={32} step={1} suffix=" px" onChange={titleFontSize=>patch({titleFontSize})}/>
      <ColorPalettePicker label="標題顏色" value={frame.titleColor} onChange={titleColor=>patch({titleColor})} opacity={frame.titleOpacity} onOpacityChange={titleOpacity=>patch({titleOpacity})}/>
      <SwitchRow label="標題損益色" value={frame.titleProfitColor===true} onChange={titleProfitColor=>patch({titleProfitColor})}/>
      <AlignRow value={frame.titleAlign} onChange={titleAlign=>patch({titleAlign})}/>
      <SwitchRow label="跑馬燈" value={fx.titleMarqueeEnabled} onChange={titleMarqueeEnabled=>patchFx({titleMarqueeEnabled})}/>
      {fx.titleMarqueeEnabled?<><NumberStep label="速度" value={fx.titleMarqueeSpeed} min={24} max={180} step={8} suffix="" onChange={titleMarqueeSpeed=>patchFx({titleMarqueeSpeed})}/>
        <NumberStep label="循環間距" value={fx.titleMarqueeGap} min={12} max={80} step={4} suffix=" px" onChange={titleMarqueeGap=>patchFx({titleMarqueeGap})}/></>:null}
    </Accordion>
    <Accordion title="背景" subtitle="純色／漸層／圖片；圖片只影響背景，不改內容尺寸" open={open==='background'} onPress={()=>toggle('background')}>
      <ChoiceRow label="背景模式" value={fx.backgroundMode} items={[['solid','純色'],['gradient','漸層'],['image','圖片']]} onChange={v=>patchFx({backgroundMode:v as FrameEffects['backgroundMode']})}/>
      {fx.backgroundMode!=='image'?<>
        <ColorPalettePicker label="起始顏色" value={frame.backgroundColor} onChange={backgroundColor=>patch({backgroundColor})} opacity={frame.backgroundOpacity} onOpacityChange={backgroundOpacity=>patch({backgroundOpacity})}/>
        <SwitchRow label="背景損益色" value={frame.backgroundProfitColor===true} onChange={backgroundProfitColor=>patch({backgroundProfitColor})}/>
        <NumberStep label="背景透明度" value={Math.round(frame.backgroundOpacity*100)} min={0} max={100} step={5} suffix="%" onChange={v=>patch({backgroundOpacity:v/100})}/>
      </>:null}
      {fx.backgroundMode==='gradient'?<>
        <ColorPalettePicker label="結束顏色" value={fx.gradientEndColor} onChange={gradientEndColor=>patchFx({gradientEndColor})} opacity={frame.backgroundOpacity} onOpacityChange={backgroundOpacity=>patch({backgroundOpacity})}/>
        <SwitchRow label="漸層結束損益色" value={fx.gradientEndProfitColor} onChange={gradientEndProfitColor=>patchFx({gradientEndProfitColor})}/>
        <ChoiceRow label="方向" value={fx.gradientDirection} items={[['horizontal','水平'],['vertical','垂直']]} onChange={v=>patchFx({gradientDirection:v as FrameEffects['gradientDirection']})}/>
        <SwitchRow label="第三色" value={fx.gradientMidEnabled} onChange={gradientMidEnabled=>patchFx({gradientMidEnabled})}/>
        {fx.gradientMidEnabled?<><ColorPalettePicker label="中間顏色" value={fx.gradientMidColor} onChange={gradientMidColor=>patchFx({gradientMidColor})} opacity={frame.backgroundOpacity} onOpacityChange={backgroundOpacity=>patch({backgroundOpacity})}/>
          <SwitchRow label="漸層中間損益色" value={fx.gradientMidProfitColor} onChange={gradientMidProfitColor=>patchFx({gradientMidProfitColor})}/>
          <NumberStep label="中間位置" value={Math.round(fx.gradientMidStop*100)} min={10} max={90} step={5} suffix="%" onChange={v=>patchFx({gradientMidStop:v/100})}/></>:null}
      </>:null}
      {fx.backgroundMode==='image'?<View style={styles.imageBackgroundTools}>
        <ChoiceRow label="圖片來源" value={fx.imageSource} items={[['builtIn','內建圖片'],['custom','自訂圖片']]} onChange={v=>patchFx({imageSource:v as FrameEffects['imageSource']})}/>
        {fx.imageSource==='builtIn'?<View>
          <Text style={styles.orderTitle}>選擇背景圖片</Text>
          <View style={styles.backgroundImageGrid}>
            {THEME_BACKGROUNDS.map((uri,index)=><Pressable key={index} accessibilityRole="button"
              accessibilityLabel={'背景圖片 '+(index+1)} onPress={()=>patchFx({imageIndex:index})}
              style={[styles.backgroundImageChoice,index===fx.imageIndex&&styles.backgroundImageChoiceActive]}>
              <Image source={{uri}} resizeMode="cover" style={styles.backgroundImageThumb}/>
              <Text style={styles.backgroundImageNumber}>{index+1}</Text>
            </Pressable>)}
          </View>
        </View>:<View style={styles.customImageBox}>
          <Text style={styles.orderTitle}>自訂圖片 URI</Text>
          <TextInput value={fx.imageUri??''} onChangeText={imageUri=>patchFx({imageUri:imageUri.trim()||null})}
            placeholder="content://、file:// 或 ph:// 圖片 URI" autoCapitalize="none" autoCorrect={false}
            style={styles.textInput}/>
          <Pressable onPress={()=>patchFx({imageUri:null})} style={styles.removeImageButton}><Text style={styles.removeImageText}>移除自訂圖片</Text></Pressable>
        </View>}
        <ChoiceRow label="顯示方式" value={fx.imageFit} items={[['cover','填滿'],['contain','完整顯示'],['stretch','拉伸']]} onChange={v=>patchFx({imageFit:v as FrameEffects['imageFit']})}/>
        <NumberStep label="圖片透明度" value={Math.round(fx.imageOpacity*100)} min={0} max={100} step={5} suffix="%" onChange={v=>patchFx({imageOpacity:v/100})}/>
        <NumberStep label="水平焦點" value={Math.round(fx.imageFocusX*100)} min={0} max={100} step={5} suffix="%" onChange={v=>patchFx({imageFocusX:v/100})}/>
        <NumberStep label="垂直焦點" value={Math.round(fx.imageFocusY*100)} min={0} max={100} step={5} suffix="%" onChange={v=>patchFx({imageFocusY:v/100})}/>
        <ColorPalettePicker label="圖片遮罩" value={fx.maskColor} onChange={maskColor=>patchFx({maskColor})} opacity={fx.maskOpacity} onOpacityChange={maskOpacity=>patchFx({maskOpacity})}/>
      </View>:null}
    </Accordion>
    <Accordion title="邊框／圓角" subtitle="邊框樣式、四邊與四角" open={open==='border'} onPress={()=>toggle('border')}>
      <ColorPalettePicker label="邊框顏色" value={frame.borderColor} onChange={borderColor=>patch({borderColor})} opacity={frame.borderOpacity} onOpacityChange={borderOpacity=>patch({borderOpacity})}/>
      <SwitchRow label="邊框損益色" value={frame.borderProfitColor===true} onChange={borderProfitColor=>patch({borderProfitColor})}/>
      <NumberStep label="邊框粗細" value={frame.borderWidth} min={0} max={8} step={1} suffix=" px" onChange={borderWidth=>patch({borderWidth})}/>
      <ChoiceRow label="邊框樣式" value={fx.borderStyle} items={[['solid','實線'],['dashed','虛線'],['dotted','點線']]} onChange={v=>patchFx({borderStyle:v as FrameEffects['borderStyle']})}/>
      <NumberStep label="整體圓角" value={frame.borderRadius} min={0} max={48} step={2} suffix=" px" onChange={borderRadius=>patch({borderRadius})}/>
      {(['cornerTopLeft','cornerTopRight','cornerBottomRight','cornerBottomLeft'] as const).map((key,i)=><NumberStep key={key} label={['左上角','右上角','右下角','左下角'][i]!}
        value={fx[key]>=0?fx[key]:frame.borderRadius} min={0} max={48} step={1} suffix=" px" onChange={v=>patchFx({[key]:v} as Partial<FrameEffects>)}/>)}
    </Accordion>
    <Accordion title="陰影／光效" subtitle="原生陰影、Glow、外光暈" open={open==='effects'} onPress={()=>toggle('effects')}>
      <SwitchRow label="陰影" value={frame.shadowEnabled} onChange={shadowEnabled=>patch({shadowEnabled})}/>
      {frame.shadowEnabled?<><ColorPalettePicker label="陰影顏色" value={fx.shadowColor} onChange={shadowColor=>patchFx({shadowColor})} opacity={frame.shadowOpacity} onOpacityChange={shadowOpacity=>patch({shadowOpacity})}/>
        <SwitchRow label="陰影損益色" value={fx.shadowProfitColor} onChange={shadowProfitColor=>patchFx({shadowProfitColor})}/>
        <NumberStep label="陰影強度" value={Math.round(frame.shadowOpacity*100)} min={0} max={80} step={5} suffix="%" onChange={v=>patch({shadowOpacity:v/100})}/>
        <NumberStep label="陰影模糊" value={fx.shadowBlur} min={0} max={48} step={2} suffix="" onChange={shadowBlur=>patchFx({shadowBlur})}/></>:null}
      <SwitchRow label="Glow" value={fx.glowEnabled} onChange={glowEnabled=>patchFx({glowEnabled})}/>
      {fx.glowEnabled?<><ColorPalettePicker label="Glow 顏色" value={fx.glowColor} onChange={glowColor=>patchFx({glowColor})} opacity={fx.glowOpacity} onOpacityChange={glowOpacity=>patchFx({glowOpacity})}/>
        <SwitchRow label="Glow 損益色" value={fx.glowProfitColor} onChange={glowProfitColor=>patchFx({glowProfitColor})}/>
        <NumberStep label="Glow 強度" value={Math.round(fx.glowOpacity*100)} min={0} max={80} step={5} suffix="%" onChange={v=>patchFx({glowOpacity:v/100})}/>
        <NumberStep label="Glow 寬度" value={fx.glowWidth} min={0} max={16} step={1} suffix=" px" onChange={glowWidth=>patchFx({glowWidth})}/>
        <SwitchRow label="呼吸光效" value={fx.glowPulse} onChange={glowPulse=>patchFx({glowPulse})}/></>:null}
      <SwitchRow label="外光暈" value={fx.outerGlowEnabled} onChange={outerGlowEnabled=>patchFx({outerGlowEnabled})}/>
      {fx.outerGlowEnabled?<><ColorPalettePicker label="外光暈顏色" value={fx.outerGlowColor} onChange={outerGlowColor=>patchFx({outerGlowColor})} opacity={fx.outerGlowOpacity} onOpacityChange={outerGlowOpacity=>patchFx({outerGlowOpacity})}/>
        <SwitchRow label="外光暈損益色" value={fx.outerGlowProfitColor} onChange={outerGlowProfitColor=>patchFx({outerGlowProfitColor})}/></>:null}
    </Accordion>
    <Accordion title="動畫／響應式" subtitle="閃爍、進場與尺寸響應" open={open==='responsive'} onPress={()=>toggle('responsive')}>
      <SwitchRow label="閃爍" value={fx.blinkEnabled} onChange={blinkEnabled=>patchFx({blinkEnabled})}/>
      {fx.blinkEnabled?<><ColorPalettePicker label="閃爍顏色" value={fx.blinkColor} onChange={blinkColor=>patchFx({blinkColor})} opacity={fx.blinkOpacity} onOpacityChange={blinkOpacity=>patchFx({blinkOpacity})}/>
        <SwitchRow label="閃爍損益色" value={fx.blinkProfitColor} onChange={blinkProfitColor=>patchFx({blinkProfitColor})}/></>:null}
      <SwitchRow label="進場動畫" value={fx.entranceEnabled} onChange={entranceEnabled=>patchFx({entranceEnabled})}/>
      {fx.entranceEnabled?<><ChoiceRow label="進場方式" value={fx.entranceMode} items={[['slide','滑入'],['zoom','縮放'],['rotate','旋轉']]} onChange={v=>patchFx({entranceMode:v as FrameEffects['entranceMode']})}/>
        <NumberStep label="時間" value={fx.entranceDurationMs} min={200} max={2500} step={50} suffix=" ms" onChange={entranceDurationMs=>patchFx({entranceDurationMs})}/></>:null}
      <SwitchRow label="響應式" value={fx.responsiveEnabled} onChange={responsiveEnabled=>patchFx({responsiveEnabled})}/>
      {fx.responsiveEnabled?<><NumberStep label="Compact 臨界" value={fx.responsiveCompactWidth} min={360} max={900} step={10} suffix=" px" onChange={responsiveCompactWidth=>patchFx({responsiveCompactWidth})}/>
        <NumberStep label="Dense 臨界" value={fx.responsiveDenseWidth} min={240} max={600} step={10} suffix=" px" onChange={responsiveDenseWidth=>patchFx({responsiveDenseWidth})}/></>:null}
    </Accordion>
  </View>;
}


const dashboardChartStyleItems:readonly (readonly [DashboardChartStyle,string])[]=[
  ['line','折線'],['area','面積'],['bar','長條'],['horizontalBar','水平長條'],['stackedBar','堆疊長條'],
  ['pie','圓餅'],['donut','甜甜圈'],['allocation','資產配置'],['pnlTrend','損益趨勢'],['dividendTrend','股息趨勢'],
  ['investVsValue','投入 vs 市值'],['holdingWeight','持股占比'],['costVsPrice','成本 vs 市價'],['roiTrend','報酬率趨勢'],
  ['priceK','價格／K 線'],['volume','成交量'],
];
const dashboardChartSourceItems:readonly (readonly [DashboardChartSource,string])[]=[
  ['allocation','資產配置'],['pnl','持股損益'],['dividend','累計股息'],['roi','報酬率'],['marketValue','持股市值'],
  ['avgCost','平均成本'],['price','市價'],['shares','股數'],['realizedPnl','已實現損益'],
  ['comprehensivePnl','綜合損益'],['transactions','交易紀錄'],
];

function HoldingMiniChartTools({style,layoutMode,open,toggle,onChange}:{style:QuoteModuleStyle;layoutMode:HoldingLayoutMode;open:string|null;toggle:(k:string)=>void;onChange:(style:QuoteModuleStyle)=>void}){
  const enabled=style==='chart'||style==='advanced';
  return <View>
    <Accordion title="圖表" subtitle="Mini 圖表顯示、樣式與實際資料來源" open={open==='chart'||open==='layout'} onPress={()=>toggle('chart')}>
      <SwitchRow label="顯示 Mini 圖表" value={enabled} onChange={visible=>onChange(visible?(style==='advanced'?'advanced':'chart'):'quote')}/>
      {enabled?<ChoiceRow label="圖表卡模式" value={style} items={[['chart','圖表'],['advanced','進階']]} onChange={value=>onChange(value as QuoteModuleStyle)}/>:null}
      <View style={styles.row}><Text style={styles.rowLabel}>資料來源</Text><Text style={styles.readOnlyValue}>今日分時行情</Text></View>
      <View style={styles.row}><Text style={styles.rowLabel}>實際排列</Text><Text style={styles.readOnlyValue}>{layoutMode==='grid3'?'三欄（可讀性規則隱藏 Mini 圖表）':layoutMode}</Text></View>
    </Accordion>
  </View>;
}

function DashboardChartTools({chart,actualX,open,toggle,patch}:{chart:DashboardChartConfig;actualX:number;open:string|null;toggle:(k:string)=>void;patch:(next:Partial<DashboardChartConfig>)=>void}){
  return <View>
    <Accordion title="圖表" subtitle="顯示／關閉、類型與資料來源" open={open==='chart'||open==='layout'} onPress={()=>toggle('chart')}>
      <SwitchRow label="顯示圖表" value={chart.visible} onChange={visible=>patch({visible})}/>
      <TextInput accessibilityLabel="圖表標題" value={chart.title} onChangeText={title=>patch({title:title.slice(0,20)})} style={styles.textInput}/>
      <ChoiceRow label="圖表類型" value={chart.style} items={dashboardChartStyleItems} onChange={style=>patch({style:style as DashboardChartStyle})}/>
      <ChoiceRow label="資料來源" value={chart.source} items={dashboardChartSourceItems} onChange={source=>patch({source:source as DashboardChartSource})}/>
    </Accordion>
    <Accordion title="尺寸／位置" subtitle="全部顯示目前實際像素值" open={open==='chart-size'} onPress={()=>toggle('chart-size')}>
      <NumberStep label="X" value={Math.round(actualX)} min={0} max={1600} step={4} suffix=" px" onChange={x=>patch({x})}/>
      <NumberStep label="Y" value={Math.round(chart.y)} min={0} max={2400} step={4} suffix=" px" onChange={y=>patch({y})}/>
      <NumberStep label="寬度" value={Math.round(chart.width)} min={140} max={900} step={8} suffix=" px" onChange={width=>patch({width})}/>
      <NumberStep label="高度" value={Math.round(chart.height)} min={120} max={700} step={8} suffix=" px" onChange={height=>patch({height})}/>
      <NumberStep label="圖層" value={chart.zIndex} min={0} max={99} step={1} suffix="" onChange={zIndex=>patch({zIndex})}/>
    </Accordion>
    <Accordion title="顏色／外觀" subtitle="沿用現有顏色規劃；每個顏色追加透明度" open={open==='chart-color'} onPress={()=>toggle('chart-color')}>
      <ColorPalettePicker label="背景顏色" value={chart.backgroundColor} onChange={backgroundColor=>patch({backgroundColor})} opacity={chart.backgroundOpacity} onOpacityChange={backgroundOpacity=>patch({backgroundOpacity})}/>
      <ColorPalettePicker label="文字顏色" value={chart.textColor} onChange={textColor=>patch({textColor})} opacity={chart.textOpacity} onOpacityChange={textOpacity=>patch({textOpacity})}/>
      <ColorPalettePicker label="主圖顏色" value={chart.accentColor} onChange={accentColor=>patch({accentColor})} opacity={chart.accentOpacity} onOpacityChange={accentOpacity=>patch({accentOpacity})}/>
      <ColorPalettePicker label="上漲色" value={chart.gainColor} onChange={gainColor=>patch({gainColor})} opacity={chart.gainOpacity} onOpacityChange={gainOpacity=>patch({gainOpacity})}/>
      <ColorPalettePicker label="下跌色" value={chart.lossColor} onChange={lossColor=>patch({lossColor})} opacity={chart.lossOpacity} onOpacityChange={lossOpacity=>patch({lossOpacity})}/>
      <ColorPalettePicker label="中性色" value={chart.flatColor} onChange={flatColor=>patch({flatColor})} opacity={chart.flatOpacity} onOpacityChange={flatOpacity=>patch({flatOpacity})}/>
      <ColorPalettePicker label="邊框顏色" value={chart.borderColor} onChange={borderColor=>patch({borderColor})} opacity={chart.borderOpacity} onOpacityChange={borderOpacity=>patch({borderOpacity})}/>
      <NumberStep label="邊框粗細" value={chart.borderWidth} min={0} max={8} step={1} suffix=" px" onChange={borderWidth=>patch({borderWidth})}/>
      <NumberStep label="圓角" value={chart.borderRadius} min={0} max={48} step={2} suffix=" px" onChange={borderRadius=>patch({borderRadius})}/>
      <NumberStep label="內容透明度" value={Math.round(chart.contentOpacity*100)} min={5} max={100} step={5} suffix="%" onChange={value=>patch({contentOpacity:value/100})}/>
    </Accordion>
    <Accordion title="圖表內容" subtitle="線條、資料點、圖例、座標與格線" open={open==='chart-content'} onPress={()=>toggle('chart-content')}>
      <NumberStep label="線條粗細" value={chart.lineWidth} min={1} max={8} step={1} suffix=" px" onChange={lineWidth=>patch({lineWidth})}/>
      <SwitchRow label="資料點" value={chart.showPoints} onChange={showPoints=>patch({showPoints})}/>
      <NumberStep label="資料點大小" value={chart.pointSize} min={2} max={12} step={1} suffix=" px" onChange={pointSize=>patch({pointSize})}/>
      <SwitchRow label="圖例" value={chart.legendVisible} onChange={legendVisible=>patch({legendVisible})}/>
      <SwitchRow label="X 軸" value={chart.xAxisVisible} onChange={xAxisVisible=>patch({xAxisVisible})}/>
      <SwitchRow label="Y 軸" value={chart.yAxisVisible} onChange={yAxisVisible=>patch({yAxisVisible})}/>
      <SwitchRow label="格線" value={chart.gridVisible} onChange={gridVisible=>patch({gridVisible})}/>
      <SwitchRow label="資料標籤" value={chart.dataLabels} onChange={dataLabels=>patch({dataLabels})}/>
    </Accordion>
    <Accordion title="互動" subtitle="十字線、縮放、平移與重設" open={open==='chart-interaction'} onPress={()=>toggle('chart-interaction')}>
      <SwitchRow label="十字線" value={chart.crosshairEnabled} onChange={crosshairEnabled=>patch({crosshairEnabled})}/>
      <SwitchRow label="兩指縮放" value={chart.pinchZoomEnabled} onChange={pinchZoomEnabled=>patch({pinchZoomEnabled})}/>
      <SwitchRow label="平移" value={chart.panEnabled} onChange={panEnabled=>patch({panEnabled})}/>
      <SwitchRow label="雙擊重設" value={chart.doubleTapReset} onChange={doubleTapReset=>patch({doubleTapReset})}/>
      <SwitchRow label="記住縮放" value={chart.rememberZoom} onChange={rememberZoom=>patch({rememberZoom})}/>
    </Accordion>
  </View>;
}

function HoldingCardTools({wall,open,toggle,patch}:{wall:HoldingWallConfig;open:string|null;toggle:(k:string)=>void;patch:(n:Partial<HoldingWallConfig['style']>)=>void}){
  return <View>
    <Accordion title="卡片尺寸／空間" subtitle="內距、行距與圓角" open={open==='card-style'} onPress={()=>toggle('card-style')}>
      <NumberStep label="卡片內距" value={wall.style.padding} min={0} max={32} step={1} suffix=" px" onChange={padding=>patch({padding})}/>
      <NumberStep label="內容行距" value={wall.style.rowGap} min={0} max={32} step={1} suffix=" px" onChange={rowGap=>patch({rowGap})}/>
      <NumberStep label="圓角" value={wall.style.cornerRadius} min={0} max={40} step={2} suffix=" px" onChange={cornerRadius=>patch({cornerRadius})}/>
    </Accordion>
    <Accordion title="背景／邊框" subtitle="行情卡片實際使用色彩" open={open==='card-color'} onPress={()=>toggle('card-color')}>
      <ColorPalettePicker label="背景" value={wall.style.backgroundColor} onChange={backgroundColor=>patch({backgroundColor})} opacity={wall.style.backgroundOpacity} onOpacityChange={backgroundOpacity=>patch({backgroundOpacity})}/>
      <SwitchRow label="背景損益色" value={wall.style.backgroundProfitColor===true} onChange={backgroundProfitColor=>patch({backgroundProfitColor})}/>
      <ColorPalettePicker label="主要文字" value={wall.style.textColor} onChange={textColor=>patch({textColor})} opacity={wall.style.textOpacity} onOpacityChange={textOpacity=>patch({textOpacity})}/>
      <SwitchRow label="主要文字損益色" value={wall.style.textProfitColor===true} onChange={textProfitColor=>patch({textProfitColor})}/>
      <ColorPalettePicker label="次要文字" value={wall.style.secondaryTextColor} onChange={secondaryTextColor=>patch({secondaryTextColor})} opacity={wall.style.secondaryTextOpacity} onOpacityChange={secondaryTextOpacity=>patch({secondaryTextOpacity})}/>
      <SwitchRow label="次要文字損益色" value={wall.style.secondaryTextProfitColor===true} onChange={secondaryTextProfitColor=>patch({secondaryTextProfitColor})}/>
      <ColorPalettePicker label="上漲色" value={wall.style.gainColor} onChange={gainColor=>patch({gainColor})} opacity={wall.style.gainOpacity} onOpacityChange={gainOpacity=>patch({gainOpacity})}/>
      <ColorPalettePicker label="下跌色" value={wall.style.lossColor} onChange={lossColor=>patch({lossColor})} opacity={wall.style.lossOpacity} onOpacityChange={lossOpacity=>patch({lossOpacity})}/>
      <ColorPalettePicker label="邊框" value={wall.style.borderColor} onChange={borderColor=>patch({borderColor})} opacity={wall.style.borderOpacity} onOpacityChange={borderOpacity=>patch({borderOpacity})}/>
      <SwitchRow label="邊框損益色" value={wall.style.borderProfitColor===true} onChange={borderProfitColor=>patch({borderProfitColor})}/>
      <NumberStep label="邊框粗細" value={wall.style.borderWidth} min={0} max={6} step={1} suffix=" px" onChange={borderWidth=>patch({borderWidth})}/>
    </Accordion>
  </View>;
}

function HoldingFieldTools({field,open,toggle,patch,move}:{field:HoldingWallConfig['fields'][number];open:string|null;toggle:(k:string)=>void;patch:(n:Partial<HoldingWallConfig['fields'][number]>)=>void;move:(d:-1|1)=>void}){
  return <View>
    <Accordion title="文字／數值" subtitle="字體大小、對齊、顯示與排序" open={open==='type'} onPress={()=>toggle('type')}>
      <NumberStep label="字體大小" value={Math.round(field.fontScale*100)} min={70} max={200} step={5} suffix="%" onChange={v=>patch({fontScale:v/100})}/>
      <AlignRow value={field.align} onChange={align=>patch({align})}/>
      <SwitchRow label="顯示" value={field.enabled} onChange={enabled=>patch({enabled})}/>
      <View style={styles.row}><Text style={styles.rowLabel}>排序</Text><View style={styles.rowButtons}>
        <Pressable style={styles.step} onPress={()=>move(-1)}><Text style={styles.stepText}>↑</Text></Pressable>
        <Pressable style={styles.step} onPress={()=>move(1)}><Text style={styles.stepText}>↓</Text></Pressable>
      </View></View>
    </Accordion>
    <Accordion title="顏色" subtitle="固定色與損益色分開控制" open={open==='color'} onPress={()=>toggle('color')}>
      <ColorPalettePicker label="自訂文字色" value={field.textColor??'#FFFFFF'} onChange={textColor=>patch({textColor})} opacity={field.textOpacity} onOpacityChange={textOpacity=>patch({textOpacity})}/>
      <SwitchRow label="文字損益色" value={field.useProfitColor} onChange={useProfitColor=>patch({useProfitColor})}/>
      <SwitchRow label="背景損益色" value={field.useProfitBackground??false} onChange={useProfitBackground=>patch({useProfitBackground})}/>
      <ColorPalettePicker label="固定背景色" value={field.backgroundColor??'#0C121B'} onChange={backgroundColor=>patch({backgroundColor})} opacity={field.backgroundOpacity} onOpacityChange={backgroundOpacity=>patch({backgroundOpacity})}/>
    </Accordion>
    <Accordion title="間距" subtitle="上下內距與欄位行距" open={open==='spacing'} onPress={()=>toggle('spacing')}>
      <NumberStep label="上下內距" value={field.paddingY} min={0} max={16} step={1} suffix=" px" onChange={paddingY=>patch({paddingY})}/>
      <NumberStep label="行距" value={field.lineGap??0} min={0} max={32} step={1} suffix=" px" onChange={lineGap=>patch({lineGap})}/>
    </Accordion>
    <Accordion title="特效" subtitle="實際 EffectText 支援的動畫" open={open==='effect'} onPress={()=>toggle('effect')}>
      <ChoiceRow label="效果" value={field.effect.kind} items={ITEM_EFFECT_KINDS.map(v=>[v,effectLabel(v)] as [string,string])} onChange={v=>patch({effect:{...field.effect,kind:v as ItemEffectConfig['kind']}})}/>
      <ChoiceRow label="觸發" value={field.effect.trigger} items={ITEM_EFFECT_TRIGGERS.map(v=>[v,triggerLabel(v)] as [string,string])} onChange={v=>patch({effect:{...field.effect,trigger:v as ItemEffectConfig['trigger']}})}/>
      <ChoiceRow label="速度" value={field.effect.speed} items={ITEM_EFFECT_SPEEDS.map(v=>[v,v==='slow'?'慢':v==='fast'?'快':'正常'] as [string,string])} onChange={v=>patch({effect:{...field.effect,speed:v as ItemEffectConfig['speed']}})}/>
      <ChoiceRow label="強度" value={field.effect.intensity} items={ITEM_EFFECT_INTENSITIES.map(v=>[v,v==='soft'?'柔和':v==='strong'?'強':'中'] as [string,string])} onChange={v=>patch({effect:{...field.effect,intensity:v as ItemEffectConfig['intensity']}})}/>
    </Accordion>
  </View>;
}

function TargetTools({kind,id,current,actualWidth,actualHeight,open,toggle,patch,reset,contentValue,onContentChange}:{kind:'card'|'text'|'value';id:string;current:TargetAppearance;actualWidth?:number|undefined;actualHeight?:number|undefined;open:string|null;toggle:(k:string)=>void;patch:(n:TargetOverride)=>void;reset:()=>void;contentValue?:string;onContentChange?:(value:string)=>void}){
  const card=kind==='card';
  const effectiveWidth=Math.round(current.width??actualWidth??Math.max(28,current.fontSize*4));
  const effectiveHeight=Math.round(current.height??actualHeight??Math.max(24,current.lineHeight||current.fontSize*1.35));
  const effectiveLineHeight=Math.round(current.lineHeight>0?current.lineHeight:Math.max(current.fontSize*1.2,actualHeight??0));
  return <View>
    {contentValue!==undefined&&onContentChange?<Accordion title="文字內容" subtitle="直接修改本頁實際標題；套用後寫入既有 pageTitles" open={open==='content'} onPress={()=>toggle('content')}>
      <TextInput accessibilityLabel="頁面標題" value={contentValue} onChangeText={onContentChange}
        maxLength={48} style={styles.textInput}/>
    </Accordion>:null}
    {card?<Accordion title="尺寸／空間" subtitle="卡片實際尺寸、內距與外距" open={open==='surface'} onPress={()=>toggle('surface')}>
      <NumberStep label="寬度" value={effectiveWidth} min={28} max={900} step={10} suffix=" px" onChange={width=>patch({width})}/>
      <NumberStep label="高度" value={effectiveHeight} min={24} max={700} step={10} suffix=" px" onChange={height=>patch({height})}/>
      <NumberStep label="內距" value={current.padding} min={0} max={32} step={1} suffix=" px" onChange={padding=>patch({padding})}/>
      <NumberStep label="上下外距" value={current.marginVertical} min={0} max={32} step={1} suffix=" px" onChange={marginVertical=>patch({marginVertical})}/>
      <NumberStep label="左右外距" value={current.marginHorizontal} min={0} max={32} step={1} suffix=" px" onChange={marginHorizontal=>patch({marginHorizontal})}/>
    </Accordion>:<Accordion title={kind==='value'?'數值文字':'文字'} subtitle="字體、字重、字距、行距與對齊" open={open==='type'} onPress={()=>toggle('type')}>
      <NumberStep label="字體大小" value={Math.round(current.fontSize)} min={8} max={64} step={1} suffix=" px" onChange={fontSize=>patch({fontSize})}/>
      <ChoiceRow label="字重" value={String(current.fontWeight)} items={[['400','一般'],['500','中'],['600','半粗'],['700','粗'],['800','特粗'],['900','黑體']]} onChange={fontWeight=>patch({fontWeight:fontWeight as TargetAppearance['fontWeight']})}/>
      <ChoiceRow label="字體樣式" value={current.fontStyle} items={[['normal','正常'],['italic','斜體']]} onChange={fontStyle=>patch({fontStyle:fontStyle as TargetAppearance['fontStyle']})}/>
      <ChoiceRow label="裝飾" value={current.textDecorationLine} items={[['none','無'],['underline','底線'],['line-through','刪除線']]} onChange={textDecorationLine=>patch({textDecorationLine:textDecorationLine as TargetAppearance['textDecorationLine']})}/>
      <NumberStep label="字距" value={current.letterSpacing} min={-4} max={16} step={1} suffix=" px" onChange={letterSpacing=>patch({letterSpacing})}/>
      <NumberStep label="行高" value={effectiveLineHeight} min={8} max={96} step={2} suffix=" px" onChange={lineHeight=>patch({lineHeight})}/>
      <AlignRow value={current.align} onChange={align=>patch({align})}/>
    </Accordion>}
    {!card&&kind==='value'?<Accordion title="數值格式" subtitle="只改顯示格式，不改帳務原始數值" open={open==='number'} onPress={()=>toggle('number')}>
      <ChoiceRow label="顯示單位" value={current.displayUnit} items={[['original','原始'],['yuan','元'],['thousand','千'],['ten-thousand','萬'],['million','百萬']]} onChange={displayUnit=>patch({displayUnit:displayUnit as TargetAppearance['displayUnit']})}/>
      <NumberStep label="小數位" value={current.displayDigits} min={0} max={4} step={1} suffix=" 位" onChange={displayDigits=>patch({displayDigits})}/>
    </Accordion>:null}
    <Accordion title="顏色／背景" subtitle={card?'卡片材質、邊框、陰影與光效':'文字色、背景、邊框與透明度'} open={open==='color'} onPress={()=>toggle('color')}>
      {!card?<><ColorPalettePicker label="文字顏色" value={current.textColor} onChange={textColor=>patch({textColor})} opacity={current.textOpacity} onOpacityChange={textOpacity=>patch({textOpacity})}/>
        <SwitchRow label="文字損益色" value={current.textProfitColor===true} onChange={textProfitColor=>patch({textProfitColor})}/></>:null}
      <ColorPalettePicker label="背景顏色" value={current.backgroundColor} onChange={backgroundColor=>patch({backgroundColor})} opacity={current.backgroundOpacity} onOpacityChange={backgroundOpacity=>patch({backgroundOpacity})}/>
      <SwitchRow label="背景損益色" value={current.backgroundProfitColor===true} onChange={backgroundProfitColor=>patch({backgroundProfitColor})}/>
      <NumberStep label="背景透明度" value={Math.round(current.backgroundOpacity*100)} min={0} max={100} step={5} suffix="%" onChange={v=>patch({backgroundOpacity:v/100})}/>
      <ColorPalettePicker label="邊框顏色" value={current.borderColor} onChange={borderColor=>patch({borderColor})} opacity={current.borderOpacity} onOpacityChange={borderOpacity=>patch({borderOpacity})}/>
      <SwitchRow label="邊框損益色" value={current.borderProfitColor===true} onChange={borderProfitColor=>patch({borderProfitColor})}/>
      <NumberStep label="邊框粗細" value={current.borderWidth} min={0} max={8} step={1} suffix=" px" onChange={borderWidth=>patch({borderWidth})}/>
      <NumberStep label="圓角" value={current.borderRadius} min={0} max={48} step={2} suffix=" px" onChange={borderRadius=>patch({borderRadius})}/>
      {!card?<><NumberStep label="內距" value={current.padding} min={0} max={32} step={1} suffix=" px" onChange={padding=>patch({padding})}/>
        <NumberStep label="透明度" value={Math.round(current.opacity*100)} min={5} max={100} step={5} suffix="%" onChange={v=>patch({opacity:v/100})}/></>:null}
      {card?<><ChoiceRow label="背景模式" value={current.backgroundMode} items={[['solid','純色'],['gradient','漸層'],['image','圖片']]} onChange={backgroundMode=>patch({backgroundMode:backgroundMode as TargetAppearance['backgroundMode']})}/>
        {current.backgroundMode==='gradient'?<><ColorPalettePicker label="漸層結束色" value={current.gradientEndColor} onChange={gradientEndColor=>patch({gradientEndColor})} opacity={current.gradientEndOpacity} onOpacityChange={gradientEndOpacity=>patch({gradientEndOpacity})}/>
          <SwitchRow label="漸層結束損益色" value={current.gradientEndProfitColor} onChange={gradientEndProfitColor=>patch({gradientEndProfitColor})}/>
          <ChoiceRow label="漸層方向" value={current.gradientDirection} items={[['horizontal','水平'],['vertical','垂直']]} onChange={gradientDirection=>patch({gradientDirection:gradientDirection as TargetAppearance['gradientDirection']})}/></>:null}
        {current.backgroundMode==='image'?<View style={styles.imageBackgroundTools}>
          <ChoiceRow label="圖片來源" value={current.imageSource} items={[['builtIn','內建圖片'],['custom','自訂圖片']]} onChange={imageSource=>patch({imageSource:imageSource as TargetAppearance['imageSource']})}/>
          {current.imageSource==='builtIn'?<View style={styles.backgroundImageGrid}>
            {THEME_BACKGROUNDS.map((uri,index)=><Pressable key={index} onPress={()=>patch({imageIndex:index})}
              style={[styles.backgroundImageChoice,index===current.imageIndex&&styles.backgroundImageChoiceActive]}>
              <Image source={{uri}} resizeMode="cover" style={styles.backgroundImageThumb}/>
              <Text style={styles.backgroundImageNumber}>{index+1}</Text>
            </Pressable>)}
          </View>:<View style={styles.customImageBox}>
            <TextInput value={current.imageUri??''} onChangeText={imageUri=>patch({imageUri:imageUri.trim()||null})}
              placeholder="content://、file:// 或 ph:// 圖片 URI" autoCapitalize="none" autoCorrect={false} style={styles.textInput}/>
            <Pressable onPress={()=>patch({imageUri:null})} style={styles.removeImageButton}><Text style={styles.removeImageText}>移除自訂圖片</Text></Pressable>
          </View>}
          <ChoiceRow label="顯示方式" value={current.imageFit} items={[['cover','填滿'],['contain','完整顯示'],['stretch','拉伸']]} onChange={imageFit=>patch({imageFit:imageFit as TargetAppearance['imageFit']})}/>
          <NumberStep label="圖片透明度" value={Math.round(current.imageOpacity*100)} min={0} max={100} step={5} suffix="%" onChange={v=>patch({imageOpacity:v/100})}/>
        </View>:null}
        <SwitchRow label="陰影" value={current.shadowEnabled} onChange={shadowEnabled=>patch({shadowEnabled})}/>
        {current.shadowEnabled?<><ColorPalettePicker label="陰影顏色" value={current.shadowColor} onChange={shadowColor=>patch({shadowColor})} opacity={current.shadowOpacity} onOpacityChange={shadowOpacity=>patch({shadowOpacity})}/>
          <SwitchRow label="陰影損益色" value={current.shadowProfitColor} onChange={shadowProfitColor=>patch({shadowProfitColor})}/>
          <NumberStep label="陰影強度" value={Math.round(current.shadowOpacity*100)} min={0} max={80} step={5} suffix="%" onChange={v=>patch({shadowOpacity:v/100})}/></>:null}
        <SwitchRow label="Glow" value={current.glowEnabled} onChange={glowEnabled=>patch({glowEnabled})}/>
        {current.glowEnabled?<><ColorPalettePicker label="Glow 顏色" value={current.glowColor} onChange={glowColor=>patch({glowColor})} opacity={current.glowOpacity} onOpacityChange={glowOpacity=>patch({glowOpacity})}/>
          <SwitchRow label="Glow 損益色" value={current.glowProfitColor} onChange={glowProfitColor=>patch({glowProfitColor})}/></>:null}
      </>:null}
    </Accordion>
    {card&&id.startsWith('dashboard:kpi-')?<Accordion title="卡片文字" subtitle="標題、主數值、說明各自可調" open={open==='card-type'} onPress={()=>toggle('card-type')}>
      <NumberStep label="標題大小" value={current.labelFontSize} min={8} max={32} step={1} suffix=" px" onChange={labelFontSize=>patch({labelFontSize})}/>
      <ColorPalettePicker label="標題顏色" value={current.labelColor} onChange={labelColor=>patch({labelColor})} opacity={current.labelOpacity} onOpacityChange={labelOpacity=>patch({labelOpacity})}/>
      <SwitchRow label="標題損益色" value={current.labelProfitColor===true} onChange={labelProfitColor=>patch({labelProfitColor})}/>
      <NumberStep label="數值大小" value={current.fontSize} min={10} max={48} step={1} suffix=" px" onChange={fontSize=>patch({fontSize})}/>
      <ColorPalettePicker label="數值顏色" value={current.textColor} onChange={textColor=>patch({textColor})} opacity={current.textOpacity} onOpacityChange={textOpacity=>patch({textOpacity})}/>
      <SwitchRow label="數值損益色" value={current.textProfitColor===true} onChange={textProfitColor=>patch({textProfitColor})}/>
      <NumberStep label="說明大小" value={current.captionFontSize} min={8} max={30} step={1} suffix=" px" onChange={captionFontSize=>patch({captionFontSize})}/>
      <ColorPalettePicker label="說明顏色" value={current.captionColor} onChange={captionColor=>patch({captionColor})} opacity={current.captionOpacity} onOpacityChange={captionOpacity=>patch({captionOpacity})}/>
      <SwitchRow label="說明損益色" value={current.captionProfitColor===true} onChange={captionProfitColor=>patch({captionProfitColor})}/>
      <AlignRow value={current.align} onChange={align=>patch({align})}/>
    </Accordion>:null}
    <Pressable onPress={reset} style={styles.reset}><Text style={styles.resetText}>恢復目前物件排版</Text></Pressable>
  </View>;
}

function OrderRows<T extends string>({order,labels,onChange}:{order:readonly T[];labels:Record<T,string>;onChange:(order:readonly T[])=>void}){
  const move=(key:T,delta:-1|1)=>{
    const next=[...order],index=next.indexOf(key),to=index+delta;
    if(index<0||to<0||to>=next.length)return;
    [next[index],next[to]]=[next[to]!,next[index]!];
    onChange(next);
  };
  return <View style={styles.orderList}>
    <Text style={styles.orderTitle}>功能設定排序</Text>
    {order.map((key,index)=><View key={key} style={styles.orderRow}>
      <Text style={styles.orderIndex}>{index+1}</Text><Text style={styles.orderLabel}>{labels[key]}</Text>
      <Pressable disabled={index===0} onPress={()=>move(key,-1)} style={[styles.orderMini,index===0&&styles.orderButtonDisabled]}><Text style={styles.orderButtonText}>↑</Text></Pressable>
      <Pressable disabled={index===order.length-1} onPress={()=>move(key,1)} style={[styles.orderMini,index===order.length-1&&styles.orderButtonDisabled]}><Text style={styles.orderButtonText}>↓</Text></Pressable>
    </View>)}
  </View>;
}

function DashboardLayoutTools({frameKey,value,open,toggle,onChange}:{frameKey:string;value:DashboardLayoutConfig;open:string|null;toggle:(k:string)=>void;onChange:(v:DashboardLayoutConfig)=>void}){
  const patchOverview=(next:Partial<DashboardLayoutConfig['overview']>)=>onChange({...value,overview:{...value.overview,...next}});
  const patchProfit=(next:Partial<DashboardLayoutConfig['profitAnalysis']>)=>onChange({...value,profitAnalysis:{...value.profitAnalysis,...next}});
  const patchDetail=(next:Partial<DashboardLayoutConfig['profitDetail']>)=>onChange({...value,profitDetail:{...value.profitDetail,...next}});
  const patchQuick=(next:Partial<DashboardLayoutConfig['quickActions']>)=>onChange({...value,quickActions:{...value.quickActions,...next}});
  if(frameKey==='asset-dashboard')return <Accordion title="內容佈局" subtitle="資產總覽的真實內容結構" open={open==='layout'} onPress={()=>toggle('layout')}>
    <OrderRows order={value.overview.order} labels={{label:'標題',amount:'金額',caption:'說明'}} onChange={order=>patchOverview({order})}/>
    <NumberStep label="最小高度" value={value.overview.minHeight} min={104} max={220} step={4} suffix=" px" onChange={minHeight=>patchOverview({minHeight})}/>
    <NumberStep label="卡片內距" value={value.overview.padding} min={8} max={28} step={1} suffix=" px" onChange={padding=>patchOverview({padding})}/>
    <NumberStep label="內容間距" value={value.overview.contentGap} min={0} max={24} step={1} suffix=" px" onChange={contentGap=>patchOverview({contentGap})}/>
    <AlignRow value={value.overview.align} onChange={align=>patchOverview({align})}/>
    <SwitchRow label="NT$ 前綴" value={value.overview.prefixVisible} onChange={prefixVisible=>patchOverview({prefixVisible})}/>
    <SwitchRow label="說明文字" value={value.overview.captionVisible} onChange={captionVisible=>patchOverview({captionVisible})}/>
    <SwitchRow label="裝飾圖形" value={value.overview.decorationVisible} onChange={decorationVisible=>patchOverview({decorationVisible})}/>
  </Accordion>;
  if(frameKey==='profit-analysis')return <Accordion title="KPI 佈局" subtitle="卡片高度、間距、圖示與說明" open={open==='layout'} onPress={()=>toggle('layout')}>
    <OrderRows order={value.profitAnalysis.order} labels={{realizedNetPnL:'已實現損益',totalPnl:'含息總損益',totalUnrealizedProfit:'未實現損益',totalMarketValue:'持股市值'}} onChange={order=>patchProfit({order})}/>
    <NumberStep label="卡片高度" value={value.profitAnalysis.cardHeight} min={84} max={156} step={4} suffix=" px" onChange={cardHeight=>patchProfit({cardHeight})}/>
    <NumberStep label="卡片間距" value={value.profitAnalysis.cardGap} min={6} max={24} step={1} suffix=" px" onChange={cardGap=>patchProfit({cardGap})}/>
    <NumberStep label="卡片內距" value={value.profitAnalysis.cardPadding} min={0} max={28} step={1} suffix=" px" onChange={cardPadding=>patchProfit({cardPadding})}/>
    <SwitchRow label="圖示" value={value.profitAnalysis.iconVisible} onChange={iconVisible=>patchProfit({iconVisible})}/>
    <SwitchRow label="說明" value={value.profitAnalysis.captionVisible} onChange={captionVisible=>patchProfit({captionVisible})}/>
  </Accordion>;
  if(frameKey==='pnl-detail')return <Accordion title="明細佈局" subtitle="列數、高度、左右內距與欄位間距" open={open==='layout'} onPress={()=>toggle('layout')}>
    <OrderRows order={value.profitDetail.order} labels={{price:'純價差未實現',net:'淨清算未實現',realized:'已實現損益',total:'含息總損益'}} onChange={order=>patchDetail({order})}/>
    <NumberStep label="顯示列數" value={value.profitDetail.itemCount} min={2} max={4} step={1} suffix=" 列" onChange={v=>patchDetail({itemCount:v as 2|3|4})}/>
    <NumberStep label="列高" value={value.profitDetail.rowHeight} min={40} max={72} step={2} suffix=" px" onChange={rowHeight=>patchDetail({rowHeight})}/>
    <NumberStep label="左右內距" value={value.profitDetail.rowPaddingHorizontal} min={0} max={32} step={1} suffix=" px" onChange={rowPaddingHorizontal=>patchDetail({rowPaddingHorizontal})}/>
    <NumberStep label="欄位間距" value={value.profitDetail.rowGap} min={0} max={28} step={1} suffix=" px" onChange={rowGap=>patchDetail({rowGap})}/>
    <SwitchRow label="查看更多" value={value.profitDetail.showMore} onChange={showMore=>patchDetail({showMore})}/>
  </Accordion>;
  if(frameKey==='dashboard-quick-actions')return <Accordion title="快捷按鈕佈局" subtitle="欄數、內距、圖示文字間距" open={open==='layout'} onPress={()=>toggle('layout')}>
    <OrderRows order={value.quickActions.order} labels={{'stock-query':'持股查詢',ledger:'交易紀錄',allocation:'資產配置',dividend:'股息資訊'}} onChange={order=>patchQuick({order})}/>
    <ChoiceRow label="欄數" value={String(value.quickActions.columns)} items={[['2','雙欄'],['4','四欄']]} onChange={v=>patchQuick({columns:Number(v) as 2|4})}/>
    <NumberStep label="按鈕內距" value={value.quickActions.itemPadding} min={0} max={28} step={1} suffix=" px" onChange={itemPadding=>patchQuick({itemPadding})}/>
    <NumberStep label="圖示／文字間距" value={value.quickActions.itemGap} min={0} max={24} step={1} suffix=" px" onChange={itemGap=>patchQuick({itemGap})}/>
    <SwitchRow label="顯示文字" value={value.quickActions.titleVisible} onChange={titleVisible=>patchQuick({titleVisible})}/>
  </Accordion>;
  return null;
}

function headerTargetBase(id:string,frame:FrameEditorConfig):TargetAppearance{
  if(id==='header:title')return {...TARGET_APPEARANCE,fontSize:frame.titleFontSize,textColor:frame.titleColor,
    align:frame.titleAlign,fontWeight:'800',backgroundOpacity:0,padding:0,borderWidth:0,borderRadius:0};
  if(id==='header:brand')return {...TARGET_APPEARANCE,fontSize:13,textColor:colors.primary,fontWeight:'800',
    letterSpacing:.4,backgroundOpacity:0,padding:0,borderWidth:0,borderRadius:0};
  return {...TARGET_APPEARANCE,fontSize:13,textColor:colors.textSecondary,backgroundOpacity:0,padding:0,borderWidth:0,borderRadius:0};
}

function dashboardTargetBase(id:string,layout:DashboardLayoutConfig):TargetAppearance{
  if(id==='dashboard:overview-card')return {...TARGET_APPEARANCE,backgroundColor:colors.surfaceMuted,borderColor:colors.border,borderRadius:radius.lg,padding:layout.overview.padding};
  if(id==='dashboard:overview-label')return {...TARGET_APPEARANCE,fontSize:layout.overview.labelFontSize,textColor:layout.overview.labelColor,align:layout.overview.align,fontWeight:'900'};
  if(id==='dashboard:overview-value')return {...TARGET_APPEARANCE,fontSize:layout.overview.valueFontSize,textColor:layout.overview.valueColor,align:layout.overview.align,fontWeight:'900'};
  if(id==='dashboard:overview-prefix')return {...TARGET_APPEARANCE,fontSize:layout.overview.prefixFontSize,textColor:layout.overview.prefixColor,align:layout.overview.align,fontWeight:'900',prefixText:'NT$',prefixGap:8};
  if(id==='dashboard:overview-caption')return {...TARGET_APPEARANCE,fontSize:layout.overview.captionFontSize,textColor:layout.overview.captionColor,align:layout.overview.align};
  if(id==='dashboard:overview-previous-pnl-label'||id==='dashboard:overview-today-pnl-label'||id==='dashboard:overview-total-pnl-label')return {...TARGET_APPEARANCE,fontSize:9,lineHeight:12,textColor:colors.textSecondary,fontWeight:'800'};
  if(id==='dashboard:overview-previous-pnl'||id==='dashboard:overview-today-pnl')return {...TARGET_APPEARANCE,fontSize:12,lineHeight:17,textColor:colors.text,fontWeight:'900'};
  if(id==='dashboard:overview-total-pnl')return {...TARGET_APPEARANCE,fontSize:13,lineHeight:18,textColor:colors.text,fontWeight:'900'};
  if(id==='dashboard:overview-pnl-pending')return {...TARGET_APPEARANCE,fontSize:10,lineHeight:15,textColor:colors.textSecondary,fontWeight:'800'};
  if(id.startsWith('dashboard:kpi-'))return {...TARGET_APPEARANCE,padding:layout.profitAnalysis.cardPadding,align:layout.profitAnalysis.align,
    labelFontSize:layout.profitAnalysis.labelFontSize,fontSize:layout.profitAnalysis.valueFontSize,captionFontSize:layout.profitAnalysis.captionFontSize,
    labelColor:layout.profitAnalysis.labelColor,textColor:layout.profitAnalysis.valueColor,captionColor:layout.profitAnalysis.captionColor,
    backgroundColor:colors.surfaceMuted,borderColor:colors.border,borderRadius:radius.md};
  if(id.startsWith('dashboard:detail-label-'))return {...TARGET_APPEARANCE,fontSize:layout.profitDetail.labelFontSize,textColor:layout.profitDetail.labelColor,align:layout.profitDetail.align,fontWeight:'700'};
  if(id.startsWith('dashboard:detail-value-'))return {...TARGET_APPEARANCE,fontSize:layout.profitDetail.valueFontSize,textColor:layout.profitDetail.valueColor,align:layout.profitDetail.align,fontWeight:'900'};
  if(id.startsWith('dashboard:quick-icon-'))return {...TARGET_APPEARANCE,fontSize:layout.quickActions.iconSize,textColor:layout.quickActions.iconColor,align:layout.quickActions.align,fontWeight:'900'};
  if(id.startsWith('dashboard:quick-label-'))return {...TARGET_APPEARANCE,fontSize:layout.quickActions.labelFontSize,textColor:layout.quickActions.labelColor,align:layout.quickActions.align,fontWeight:'800'};
  return TARGET_APPEARANCE;
}

function defaultDashboardSelection(frameKey:string,kind:'card'|'text'|'value'):Selection{
  if(frameKey==='asset-dashboard'){
    if(kind==='card')return {id:'dashboard:overview-card',kind,label:'資產總覽卡片'};
    if(kind==='text')return {id:'dashboard:overview-label',kind,label:'資產總覽標題'};
    return {id:'dashboard:overview-value',kind,label:'持股總市值'};
  }
  if(frameKey==='profit-analysis'){
    if(kind==='card')return {id:'dashboard:kpi-realizedNetPnL',kind,label:'已實現損益卡'};
    if(kind==='text')return {id:'dashboard:kpi-realizedNetPnL',kind:'card',label:'已實現損益卡'};
    return {id:'dashboard:kpi-realizedNetPnL',kind:'card',label:'已實現損益卡'};
  }
  if(frameKey==='pnl-detail'){
    return kind==='value'?{id:'dashboard:detail-value-price',kind,label:'純價差未實現數值'}:{id:'dashboard:detail-label-price',kind:'text',label:'純價差未實現標題'};
  }
  if(frameKey==='dashboard-quick-actions'){
    return {id:'dashboard:quick-label-stock-query',kind:'text',label:'持股查詢名稱'};
  }
  return {id:'frame',kind:'frame',label:'框架'};
}

function effectLabel(v:ItemEffectConfig['kind']){return v==='none'?'無':v==='fade'?'淡入淡出':v==='pulse'?'呼吸':v==='flash-on-change'?'變化閃爍':'跳動';}
function triggerLabel(v:ItemEffectConfig['trigger']){return v==='always'?'持續':v==='refresh'?'刷新':v==='change'?'數值變化':v==='gain'?'上漲':v==='loss'?'下跌':'警示';}

function Accordion({title,subtitle,open,onPress,children}:{title:string;subtitle:string;open:boolean;onPress:()=>void;children:any}){
  return <View style={styles.accordion}><Pressable onPress={onPress} style={styles.accordionHead}><View style={{flex:1}}><Text style={styles.accordionTitle}>{title}</Text><Text style={styles.rowHint}>{subtitle}</Text></View><Text style={styles.chev}>{open?'−':'＋'}</Text></Pressable>{open?<View style={styles.accordionBody}>{children}</View>:null}</View>;
}
function NumberStep({label,value,min,max,step,suffix,onChange}:{label:string;value:number;min:number;max:number;step:number;suffix:string;onChange:(value:number)=>void}){
  return <View style={styles.row}><Text style={styles.rowLabel}>{label}</Text><Pressable style={styles.step} onPress={()=>onChange(Math.max(min,value-step))}><Text style={styles.stepText}>−</Text></Pressable><Text style={styles.num}>{value}{suffix}</Text><Pressable style={styles.step} onPress={()=>onChange(Math.min(max,value+step))}><Text style={styles.stepText}>＋</Text></Pressable></View>;
}
function SwitchRow({label,value,onChange}:{label:string;value:boolean;onChange:(value:boolean)=>void}){return <View style={styles.row}><Text style={styles.rowLabel}>{label}</Text><Switch value={value} onValueChange={onChange} trackColor={{true:colors.primary}}/></View>;}
function AlignRow({value,onChange}:{value:'left'|'center'|'right';onChange:(value:'left'|'center'|'right')=>void}){return <ChoiceRow label="對齊" value={value} items={[['left','靠左'],['center','置中'],['right','靠右']]} onChange={v=>onChange(v as 'left'|'center'|'right')}/>;}
function ChoiceRow({label,value,items,onChange}:{label:string;value:string;items:readonly (readonly [string,string])[];onChange:(value:string)=>void}){
  return <View style={[styles.row,{alignItems:'flex-start'}]}><Text style={[styles.rowLabel,{paddingTop:8}]}>{label}</Text><View style={styles.choices}>{items.map(([key,text])=><Pressable key={key} onPress={()=>onChange(key)} style={[styles.choice,value===key&&styles.choiceActive]}><Text style={[styles.choiceText,value===key&&styles.choiceTextActive]}>{text}</Text></Pressable>)}</View></View>;
}

const styles=StyleSheet.create({
  root:{gap:12},head:{flexDirection:'row',gap:8,alignItems:'flex-start'},title:{fontSize:18,fontWeight:'900',color:colors.text},hint:{fontSize:11,lineHeight:17,color:colors.textSecondary,marginTop:3},
  moduleRow:{gap:6,paddingVertical:2},moduleChip:{paddingHorizontal:10,paddingVertical:7,borderRadius:radius.pill,borderWidth:1,borderColor:colors.border,backgroundColor:colors.surfaceMuted},moduleChipActive:{backgroundColor:colors.primary,borderColor:colors.primary},moduleText:{fontSize:10,fontWeight:'800',color:colors.textSecondary},moduleTextActive:{color:'#FFFFFF'},
  previewShell:{borderWidth:1,borderColor:'#9AC3F7',borderRadius:radius.lg,padding:10,backgroundColor:'#EFF6FF'},previewTop:{marginBottom:8},previewTitle:{fontSize:12,fontWeight:'900',color:colors.primary},path:{fontSize:10,color:colors.textSecondary,marginTop:2},
  livePageScroll:{height:380,borderRadius:radius.md,backgroundColor:colors.background},livePageContent:{padding:8,paddingBottom:24},previewScaleText:{fontSize:9,fontWeight:'800',color:colors.textSecondary,marginBottom:5},previewViewport:{width:'100%',alignItems:'flex-start'},actualCanvas:{position:'relative',gap:10,minHeight:420},
  chartSelectOverlay:{position:'absolute',borderWidth:1,borderColor:'transparent',borderRadius:12},chartSelected:{borderWidth:2,borderStyle:'dashed',borderColor:colors.primary},chartHidden:{borderStyle:'dashed',borderColor:'#94A3B8',backgroundColor:'rgba(248,250,252,0.72)',alignItems:'center',justifyContent:'center'},chartHiddenText:{fontSize:9,fontWeight:'900',color:colors.textSecondary,textAlign:'center',padding:6},
  frameSelected:{borderWidth:2,borderStyle:'dashed',borderColor:colors.primary,borderRadius:radius.lg,padding:3},
  kindRow:{gap:6,paddingVertical:2},kindChip:{paddingHorizontal:11,paddingVertical:7,borderRadius:radius.pill,backgroundColor:colors.surfaceMuted,borderWidth:1,borderColor:colors.border},kindChipActive:{backgroundColor:colors.primary,borderColor:colors.primary},kindText:{fontSize:10,fontWeight:'900',color:colors.textSecondary},kindTextActive:{color:'#FFFFFF'},
  accordion:{borderTopWidth:StyleSheet.hairlineWidth,borderTopColor:colors.border},accordionHead:{paddingVertical:11,flexDirection:'row',alignItems:'center',gap:8},accordionTitle:{fontSize:13,fontWeight:'900',color:colors.text},rowHint:{fontSize:9,lineHeight:14,color:colors.textSecondary,marginTop:2},chev:{fontSize:18,fontWeight:'900',color:colors.primary},accordionBody:{gap:8,paddingBottom:8},
  row:{minHeight:40,flexDirection:'row',alignItems:'center',gap:8},rowLabel:{flex:1,fontSize:11,fontWeight:'800',color:colors.textSecondary},readOnlyValue:{fontSize:10,fontWeight:'900',color:colors.text},rowButtons:{flexDirection:'row',gap:6},step:{width:34,height:34,borderRadius:10,backgroundColor:'#EAF2FF',alignItems:'center',justifyContent:'center'},stepText:{fontSize:17,fontWeight:'900',color:colors.primary},num:{minWidth:76,textAlign:'center',fontSize:11,fontWeight:'900',color:colors.text},
  modeBlock:{gap:2},autoChip:{paddingHorizontal:10,paddingVertical:6,borderRadius:999,backgroundColor:colors.surfaceMuted},autoChipActive:{backgroundColor:colors.primary},autoText:{fontSize:10,fontWeight:'900',color:colors.textSecondary},autoTextActive:{color:'#FFFFFF'},
  choices:{flexDirection:'row',flexWrap:'wrap',gap:5,justifyContent:'flex-end',maxWidth:'68%'},choice:{paddingHorizontal:9,paddingVertical:7,borderRadius:10,backgroundColor:colors.surfaceMuted,borderWidth:1,borderColor:colors.border},choiceActive:{backgroundColor:colors.primary,borderColor:colors.primary},choiceText:{fontSize:9,fontWeight:'800',color:colors.textSecondary},choiceTextActive:{color:'#FFFFFF'},
  textInput:{minHeight:44,borderWidth:1,borderColor:colors.border,borderRadius:12,paddingHorizontal:12,color:colors.text,backgroundColor:'#FFFFFF'},
  orderButtons:{flexDirection:'row',gap:8},orderButton:{flex:1,minHeight:38,borderRadius:10,backgroundColor:'#EAF2FF',alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:colors.border},orderButtonDisabled:{opacity:.35},orderButtonText:{fontSize:11,fontWeight:'900',color:colors.primary},
  orderList:{gap:6,paddingVertical:2},orderTitle:{fontSize:10,fontWeight:'900',color:colors.textSecondary},orderRow:{minHeight:38,flexDirection:'row',alignItems:'center',gap:7,borderWidth:1,borderColor:colors.border,borderRadius:10,paddingHorizontal:8,backgroundColor:colors.surface},orderIndex:{width:20,textAlign:'center',fontSize:10,fontWeight:'900',color:colors.primary},orderLabel:{flex:1,fontSize:10,fontWeight:'800',color:colors.text},orderMini:{width:32,height:30,borderRadius:8,alignItems:'center',justifyContent:'center',backgroundColor:'#EAF2FF'},
  imageBackgroundTools:{gap:8},backgroundImageGrid:{flexDirection:'row',flexWrap:'wrap',gap:7},backgroundImageChoice:{width:58,height:58,borderRadius:10,borderWidth:1,borderColor:colors.border,overflow:'hidden',position:'relative'},backgroundImageChoiceActive:{borderWidth:3,borderColor:colors.primary},backgroundImageThumb:{width:'100%',height:'100%'},backgroundImageNumber:{position:'absolute',right:3,bottom:2,fontSize:9,fontWeight:'900',color:'#FFFFFF',backgroundColor:'rgba(15,23,42,.62)',paddingHorizontal:4,borderRadius:5},customImageBox:{gap:6},removeImageButton:{minHeight:36,borderWidth:1,borderColor:colors.border,borderRadius:10,alignItems:'center',justifyContent:'center'},removeImageText:{fontSize:10,fontWeight:'900',color:colors.primary},
  reset:{marginTop:10,minHeight:42,borderRadius:12,backgroundColor:colors.surfaceMuted,alignItems:'center',justifyContent:'center'},resetText:{fontSize:11,fontWeight:'900',color:colors.primary},
});
