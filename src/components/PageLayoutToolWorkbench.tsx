import {useEffect,useMemo,useState} from 'react';
import {Pressable,ScrollView,StyleSheet,Switch,Text,View} from 'react-native';

import type {PageFrameDefinition} from '../domain/frameRegistry';
import type {MainPageKey} from '../domain/pageRegistry';
import {DEFAULT_HOLDING_WALL_CONFIG,type HoldingQuote,type HoldingWallConfig,type HoldingWallFieldKey} from '../domain/uiModels';
import type {FrameEditorConfig,PageDisplayConfig} from '../editor/editorModel';
import {layoutKindLabel,layoutToolProfile,type LayoutToolTargetKind} from '../editor/layoutToolModel';
import {colors,radius} from '../theme/tokens';
import {ColorPalettePicker} from './ColorPalettePicker';
import {HoldingQuoteModule} from './HoldingQuoteModule';
import {FrameCard} from './FrameCard';
import {DashboardAssetOverview} from './dashboard/DashboardAssetOverview';
import {DashboardProfitAnalysis} from './dashboard/DashboardProfitAnalysis';
import {DashboardProfitDetail} from './dashboard/DashboardProfitDetail';
import {DashboardQuickActions} from './dashboard/DashboardQuickActions';
import {DEFAULT_DASHBOARD_LAYOUT,type DashboardLayoutConfig} from '../domain/dashboardLayout';
import {useFinance} from '../finance/FinanceRuntime';
import {LayoutSelectionProvider,type LayoutSelectionTarget} from '../editor/LayoutSelectionContext';
import {TARGET_APPEARANCE,mergeTargetAppearance,normalizeTargetOverride,type TargetAppearance,type TargetOverride} from '../maintenance/inspectionModel';
import {DEFAULT_FRAME_EFFECTS,normalizeFrameEffects,type FrameEffects} from '../maintenance/frameEffects';
import {ITEM_EFFECT_INTENSITIES,ITEM_EFFECT_KINDS,ITEM_EFFECT_SPEEDS,ITEM_EFFECT_TRIGGERS,type ItemEffectConfig} from '../domain/displayItemContract';

type Selection={id:string;kind:LayoutToolTargetKind;label:string;field?:HoldingWallFieldKey};
const numericFields:readonly HoldingWallFieldKey[]=['price','change','changePercent','pnl','roi','marketValue'];
const money=(value:number)=>Math.round(value).toLocaleString('zh-TW');

const actualHomePreviewKeys=new Set(['asset-dashboard','profit-analysis','pnl-detail','dashboard-quick-actions','holding-quotes']);
const actualPortfolioPreviewKeys=new Set(['holding-view']);
const hasRealPreview=(page:MainPageKey,key:string)=>
  page==='home'?actualHomePreviewKeys.has(key):page==='portfolio'?actualPortfolioPreviewKeys.has(key):false;

export function PageLayoutToolWorkbench({
  pageKey,frames,draft,displayDraft,onPatchFrame,onChangeDisplay,previewQuote,
}:{
  pageKey:MainPageKey;
  frames:readonly PageFrameDefinition[];
  draft:Record<string,FrameEditorConfig>;
  displayDraft:PageDisplayConfig;
  onPatchFrame:(key:string,next:Partial<FrameEditorConfig>)=>void;
  onChangeDisplay:(next:PageDisplayConfig)=>void;
  previewQuote?:HoldingQuote|undefined;
}){
  const finance=useFinance();
  const previewFrames=useMemo(()=>frames.filter(frame=>hasRealPreview(pageKey,frame.key)),[frames,pageKey]);
  const initial=useMemo(()=>pageKey==='home'&&previewFrames.some(f=>f.key==='asset-dashboard')?'asset-dashboard':
    pageKey==='portfolio'&&previewFrames.some(f=>f.key==='holding-view')?'holding-view':
    previewFrames[0]?.key??frames[0]?.key??'page-header',[pageKey,previewFrames,frames]);
  const [frameKey,setFrameKey]=useState(initial);
  const [selection,setSelection]=useState<Selection>({id:'frame',kind:'frame',label:'框架'});
  const [openGroup,setOpenGroup]=useState<string|null>('size');
  useEffect(()=>{setFrameKey(initial);setSelection({id:'frame',kind:'frame',label:'框架'});setOpenGroup('size');},[initial]);

  const frame=frames.find(item=>item.key===frameKey)??frames[0];
  const frameConfig=frame?draft[frame.key]:undefined;
  if(!frame||!frameConfig)return null;

  const profile=layoutToolProfile(pageKey,frame.key);
  const holding=(pageKey==='home'&&frame.key==='holding-quotes')||(pageKey==='portfolio'&&frame.key==='holding-view');
  const wall=displayDraft.holdingWall??DEFAULT_HOLDING_WALL_CONFIG;
  const dashboard=displayDraft.dashboardLayout??DEFAULT_DASHBOARD_LAYOUT;
  const targets=displayDraft.layoutTargets??{};
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
  const patchTarget=(id:string,next:TargetOverride)=>{
    const current=targets[id]??{};
    onChangeDisplay({...displayDraft,layoutTargets:{...targets,[id]:normalizeTargetOverride({...current,...next})}});
  };
  const resetTarget=(id:string)=>{
    const next={...targets};delete next[id];onChangeDisplay({...displayDraft,layoutTargets:next});
  };

  const chooseKind=(kind:LayoutToolTargetKind)=>{
    if(kind==='frame')setSelection({id:'frame',kind,label:'框架'});
    else if(holding&&kind==='card')setSelection({id:'card',kind,label:'行情卡片'});
    else if(holding&&kind==='text')setSelection({id:'field:name',kind,label:'名稱',field:'name'});
    else if(holding&&kind==='value')setSelection({id:'field:price',kind,label:'即時價格',field:'price'});
    else if(holding&&kind==='chart')setSelection({id:'chart',kind,label:'Mini 圖表'});
    else if(kind==='card')setSelection(defaultDashboardSelection(frame.key,'card'));
    else if(kind==='text')setSelection(defaultDashboardSelection(frame.key,'text'));
    else if(kind==='value')setSelection(defaultDashboardSelection(frame.key,'value'));
    else setSelection({id:kind,kind,label:layoutKindLabel(kind)});
    setOpenGroup(kind==='frame'?'size':kind==='card'?'surface':kind==='text'||kind==='value'?'type':'layout');
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
    setSelection({id:target.id,kind,label:target.label});
    setOpenGroup(kind==='card'?'surface':kind==='text'||kind==='value'?'type':'layout');
  };
  const toggle=(key:string)=>setOpenGroup(current=>current===key?null:key);

  const portfolio=finance.snapshot.portfolio;
  const valuationComplete=finance.valuationComplete;
  const kpis=[
    {key:'realizedNetPnL',label:'已實現損益',value:money(portfolio.realizedNetPnL),caption:'歷史賣出',tone:portfolio.realizedNetPnL>=0?'gain' as const:'loss' as const,glyph:'↗'},
    {key:'totalPnl',label:'含息總損益',value:valuationComplete?money(portfolio.totalPnl):'待核對',caption:'含息總損益',tone:portfolio.totalPnl>=0?'gain' as const:'loss' as const,glyph:'%'},
    {key:'totalUnrealizedProfit',label:'未實現損益',value:valuationComplete?money(portfolio.totalUnrealizedProfit):'待核對',caption:'淨清算',tone:portfolio.totalUnrealizedProfit>=0?'gain' as const:'loss' as const,glyph:'▥'},
    {key:'totalMarketValue',label:'持股市值',value:valuationComplete?money(portfolio.totalMarketValue):'待核對',caption:'持股行情＋股數',glyph:'◔'},
  ];
  const rows=[
    {key:'price',label:'純價差未實現',value:valuationComplete?money(portfolio.totalPriceUnrealizedProfit):'待核對',tone:portfolio.totalPriceUnrealizedProfit>=0?'gain' as const:'loss' as const},
    {key:'net',label:'淨清算未實現',value:valuationComplete?money(portfolio.totalUnrealizedProfit):'待核對',tone:portfolio.totalUnrealizedProfit>=0?'gain' as const:'loss' as const},
    {key:'realized',label:'已實現損益',value:money(portfolio.realizedNetPnL),tone:portfolio.realizedNetPnL>=0?'gain' as const:'loss' as const},
    {key:'total',label:'含息總損益',value:valuationComplete?money(portfolio.totalPnl):'待核對',tone:portfolio.totalPnl>=0?'gain' as const:'loss' as const},
  ];

  const realPreview=hasRealPreview(pageKey,frame.key);
  const previewContent=holding&&previewQuote?
    <HoldingQuoteModule item={previewQuote} wallConfig={wall} style={(displayDraft.quoteStyle??'quote') as any}
      layout="narrow" layoutEditMode layoutSelectionId={selection.id} onLayoutSelect={selectHolding}/>:
    pageKey==='home'&&frame.key==='asset-dashboard'?
      <DashboardAssetOverview amount={money(portfolio.totalMarketValue)} complete={valuationComplete}
        caption={valuationComplete?'持股市值＋股數':'待取得可信行情，帳務明細不受影響'} layout={dashboard.overview}/>:
    pageKey==='home'&&frame.key==='profit-analysis'?
      <DashboardProfitAnalysis items={kpis} layout={dashboard.profitAnalysis}/>:
    pageKey==='home'&&frame.key==='pnl-detail'?
      <DashboardProfitDetail rows={rows} layout={dashboard.profitDetail}/>:
    pageKey==='home'&&frame.key==='dashboard-quick-actions'?
      <DashboardQuickActions layout={dashboard.quickActions} actions={[
        {key:'stock-query',label:'持股查詢',glyph:'⌕',onPress:()=>{}},
        {key:'ledger',label:'交易紀錄',glyph:'▤',onPress:()=>{}},
        {key:'allocation',label:'資產配置',glyph:'◔',onPress:()=>{}},
        {key:'dividend',label:'股息資訊',glyph:'＄',onPress:()=>{}},
      ]}/>:null;

  const base=dashboardTargetBase(selection.id,dashboard);
  const current=mergeTargetAppearance(base,targets[selection.id]);

  const visibleKinds=profile.kinds.filter(kind=>{
    if(kind==='chart')return holding&&Boolean(previewQuote&&(displayDraft.quoteStyle==='chart'||displayDraft.quoteStyle==='advanced')&&previewQuote.sparkline?.length);
    if(kind==='data')return holding;
    if(kind==='layout')return pageKey==='home'&&['asset-dashboard','profit-analysis','pnl-detail','dashboard-quick-actions'].includes(frame.key);
    if(kind==='card'||kind==='text'||kind==='value')return holding||pageKey==='home'&&['asset-dashboard','profit-analysis','pnl-detail','dashboard-quick-actions'].includes(frame.key);
    return true;
  });

  return <View style={styles.root}>
    <View style={styles.head}><View style={{flex:1}}><Text style={styles.title}>排版工具</Text>
      <Text style={styles.hint}>預覽直接使用 App 真實元件與目前資料。點到哪個物件，虛線框就鎖定該物件，下方只顯示已實裝的工具。</Text></View></View>

    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.moduleRow}>
      {previewFrames.map(item=><Pressable key={item.key} onPress={()=>{setFrameKey(item.key);setSelection({id:'frame',kind:'frame',label:'框架'});setOpenGroup('size');}}
        style={[styles.moduleChip,item.key===frame.key&&styles.moduleChipActive]}>
        <Text style={[styles.moduleText,item.key===frame.key&&styles.moduleTextActive]}>{item.title}</Text>
      </Pressable>)}
    </ScrollView>

    {realPreview?<View style={styles.previewShell}>
      <View style={styles.previewTop}><Text style={styles.previewTitle}>{profile.label}｜真實元件預覽</Text><Text style={styles.path}>{frame.title} › {selection.label}</Text></View>
      <LayoutSelectionProvider targets={targets} selectedId={selection.id} onSelect={selectTarget}>
        <Pressable onPress={()=>chooseKind('frame')} style={selection.kind==='frame'?styles.frameSelected:undefined}>
          <FrameCard title={frame.title} editorStyle={frameConfig}>{previewContent}</FrameCard>
        </Pressable>
      </LayoutSelectionProvider>
    </View>:null}

    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.kindRow}>
      {visibleKinds.map(kind=><Pressable key={kind} onPress={()=>chooseKind(kind)} style={[styles.kindChip,selection.kind===kind&&styles.kindChipActive]}>
        <Text style={[styles.kindText,selection.kind===kind&&styles.kindTextActive]}>{layoutKindLabel(kind)}</Text>
      </Pressable>)}
    </ScrollView>

    {selection.kind==='frame'?<FrameTools frame={frameConfig} fx={fx} open={openGroup} toggle={toggle}
      patch={next=>onPatchFrame(frame.key,next)} patchFx={patchFx}/>:null}

    {holding&&selection.kind==='card'?<HoldingCardTools wall={wall} open={openGroup} toggle={toggle} patch={patchWallStyle}/>:null}
    {holding&&(selection.kind==='text'||selection.kind==='value')&&selectedField?
      <HoldingFieldTools field={selectedField} open={openGroup} toggle={toggle}
        patch={next=>patchField(selectedField.field,next)} move={delta=>moveField(selectedField.field,delta)}/>:null}
    {holding&&selection.kind==='data'?<Accordion title="欄位顯示" subtitle="只改顯示與排序，不改原始行情與帳務資料" open={openGroup==='layout'} onPress={()=>toggle('layout')}>
      {wall.fields.map(field=><SwitchRow key={field.field} label={field.label} value={field.enabled} onChange={enabled=>patchField(field.field,{enabled})}/>)}
    </Accordion>:null}

    {!holding&&selection.id.startsWith('dashboard:')&&(selection.kind==='text'||selection.kind==='value'||selection.kind==='card')?
      <TargetTools kind={selection.kind} id={selection.id} current={current} open={openGroup} toggle={toggle}
        patch={next=>patchTarget(selection.id,next)} reset={()=>resetTarget(selection.id)}/>:null}

    {!holding&&selection.kind==='layout'&&pageKey==='home'?
      <DashboardLayoutTools frameKey={frame.key} value={dashboard} open={openGroup} toggle={toggle} onChange={patchDashboard}/>:null}
  </View>;
}

function FrameTools({frame,fx,open,toggle,patch,patchFx}:{frame:FrameEditorConfig;fx:FrameEffects;open:string|null;toggle:(k:string)=>void;patch:(n:Partial<FrameEditorConfig>)=>void;patchFx:(n:Partial<FrameEffects>)=>void}){
  return <View>
    <Accordion title="尺寸" subtitle="寬度、高度、最小高度、最大寬度" open={open==='size'} onPress={()=>toggle('size')}>
      <ModeStep label="寬度" value={frame.width} fallback={320} min={160} max={1600} step={10} onAuto={()=>patch({width:undefined} as any)} onChange={width=>patch({width})}/>
      <ModeStep label="高度" value={frame.height} fallback={260} min={80} max={2400} step={10} onAuto={()=>patch({height:undefined} as any)} onChange={height=>patch({height})}/>
      <NumberStep label="最小高度" value={frame.minHeight??0} min={0} max={600} step={10} suffix=" px" onChange={minHeight=>patch({minHeight})}/>
      <NumberStep label="最大寬度" value={fx.maxWidth} min={0} max={1600} step={20} suffix={fx.maxWidth===0?'（不限）':' px'} onChange={maxWidth=>patchFx({maxWidth})}/>
    </Accordion>
    <Accordion title="內距／空間" subtitle="整體內距、四邊內距、內容間距與外距" open={open==='spacing'} onPress={()=>toggle('spacing')}>
      <NumberStep label="整體 Padding" value={frame.padding??16} min={0} max={32} step={1} suffix=" px" onChange={padding=>patch({padding})}/>
      {(['paddingTop','paddingRight','paddingBottom','paddingLeft'] as const).map((key,i)=><NumberStep key={key} label={['上內距','右內距','下內距','左內距'][i]!}
        value={fx[key]} min={-1} max={32} step={1} suffix={fx[key]<0?'（跟隨）':' px'} onChange={v=>patchFx({[key]:v} as Partial<FrameEffects>)}/>)}
      <NumberStep label="內容間距" value={fx.contentGap} min={-1} max={40} step={1} suffix={fx.contentGap<0?'（跟隨）':' px'} onChange={contentGap=>patchFx({contentGap})}/>
      <NumberStep label="上下外距" value={fx.marginVertical} min={0} max={32} step={1} suffix=" px" onChange={marginVertical=>patchFx({marginVertical})}/>
    </Accordion>
    <Accordion title="框架標題" subtitle="標題字體、顏色、對齊與跑馬燈" open={open==='title'} onPress={()=>toggle('title')}>
      <NumberStep label="字體大小" value={frame.titleFontSize} min={10} max={32} step={1} suffix=" px" onChange={titleFontSize=>patch({titleFontSize})}/>
      <ColorPalettePicker label="標題顏色" value={frame.titleColor} onChange={titleColor=>patch({titleColor})}/>
      <AlignRow value={frame.titleAlign} onChange={titleAlign=>patch({titleAlign})}/>
      <SwitchRow label="跑馬燈" value={fx.titleMarqueeEnabled} onChange={titleMarqueeEnabled=>patchFx({titleMarqueeEnabled})}/>
      {fx.titleMarqueeEnabled?<><NumberStep label="速度" value={fx.titleMarqueeSpeed} min={24} max={180} step={8} suffix="" onChange={titleMarqueeSpeed=>patchFx({titleMarqueeSpeed})}/>
        <NumberStep label="循環間距" value={fx.titleMarqueeGap} min={12} max={80} step={4} suffix=" px" onChange={titleMarqueeGap=>patchFx({titleMarqueeGap})}/></>:null}
    </Accordion>
    <Accordion title="背景" subtitle="純色／漸層與透明度" open={open==='background'} onPress={()=>toggle('background')}>
      <ChoiceRow label="背景模式" value={fx.backgroundMode} items={[['solid','純色'],['gradient','漸層']]} onChange={v=>patchFx({backgroundMode:v as FrameEffects['backgroundMode']})}/>
      <ColorPalettePicker label="起始顏色" value={frame.backgroundColor} onChange={backgroundColor=>patch({backgroundColor})}/>
      <NumberStep label="背景透明度" value={Math.round(frame.backgroundOpacity*100)} min={0} max={100} step={5} suffix="%" onChange={v=>patch({backgroundOpacity:v/100})}/>
      {fx.backgroundMode==='gradient'?<>
        <ColorPalettePicker label="結束顏色" value={fx.gradientEndColor} onChange={gradientEndColor=>patchFx({gradientEndColor})}/>
        <ChoiceRow label="方向" value={fx.gradientDirection} items={[['horizontal','水平'],['vertical','垂直']]} onChange={v=>patchFx({gradientDirection:v as FrameEffects['gradientDirection']})}/>
        <SwitchRow label="第三色" value={fx.gradientMidEnabled} onChange={gradientMidEnabled=>patchFx({gradientMidEnabled})}/>
        {fx.gradientMidEnabled?<><ColorPalettePicker label="中間顏色" value={fx.gradientMidColor} onChange={gradientMidColor=>patchFx({gradientMidColor})}/>
          <NumberStep label="中間位置" value={Math.round(fx.gradientMidStop*100)} min={10} max={90} step={5} suffix="%" onChange={v=>patchFx({gradientMidStop:v/100})}/></>:null}
      </>:null}
    </Accordion>
    <Accordion title="邊框／圓角" subtitle="邊框樣式、四邊與四角" open={open==='border'} onPress={()=>toggle('border')}>
      <ColorPalettePicker label="邊框顏色" value={frame.borderColor} onChange={borderColor=>patch({borderColor})}/>
      <NumberStep label="邊框粗細" value={frame.borderWidth} min={0} max={8} step={1} suffix=" px" onChange={borderWidth=>patch({borderWidth})}/>
      <ChoiceRow label="邊框樣式" value={fx.borderStyle} items={[['solid','實線'],['dashed','虛線'],['dotted','點線']]} onChange={v=>patchFx({borderStyle:v as FrameEffects['borderStyle']})}/>
      <NumberStep label="整體圓角" value={frame.borderRadius} min={0} max={48} step={2} suffix=" px" onChange={borderRadius=>patch({borderRadius})}/>
      {(['cornerTopLeft','cornerTopRight','cornerBottomRight','cornerBottomLeft'] as const).map((key,i)=><NumberStep key={key} label={['左上角','右上角','右下角','左下角'][i]!}
        value={fx[key]} min={-1} max={48} step={1} suffix={fx[key]<0?'（跟隨）':' px'} onChange={v=>patchFx({[key]:v} as Partial<FrameEffects>)}/>)}
    </Accordion>
    <Accordion title="陰影／光效" subtitle="原生陰影、Glow、外光暈" open={open==='effects'} onPress={()=>toggle('effects')}>
      <SwitchRow label="陰影" value={frame.shadowEnabled} onChange={shadowEnabled=>patch({shadowEnabled})}/>
      {frame.shadowEnabled?<><ColorPalettePicker label="陰影顏色" value={fx.shadowColor} onChange={shadowColor=>patchFx({shadowColor})}/>
        <NumberStep label="陰影強度" value={Math.round(frame.shadowOpacity*100)} min={0} max={80} step={5} suffix="%" onChange={v=>patch({shadowOpacity:v/100})}/>
        <NumberStep label="陰影模糊" value={fx.shadowBlur} min={0} max={48} step={2} suffix="" onChange={shadowBlur=>patchFx({shadowBlur})}/></>:null}
      <SwitchRow label="Glow" value={fx.glowEnabled} onChange={glowEnabled=>patchFx({glowEnabled})}/>
      {fx.glowEnabled?<><ColorPalettePicker label="Glow 顏色" value={fx.glowColor} onChange={glowColor=>patchFx({glowColor})}/>
        <NumberStep label="Glow 強度" value={Math.round(fx.glowOpacity*100)} min={0} max={80} step={5} suffix="%" onChange={v=>patchFx({glowOpacity:v/100})}/>
        <NumberStep label="Glow 寬度" value={fx.glowWidth} min={0} max={16} step={1} suffix=" px" onChange={glowWidth=>patchFx({glowWidth})}/>
        <SwitchRow label="呼吸光效" value={fx.glowPulse} onChange={glowPulse=>patchFx({glowPulse})}/></>:null}
      <SwitchRow label="外光暈" value={fx.outerGlowEnabled} onChange={outerGlowEnabled=>patchFx({outerGlowEnabled})}/>
    </Accordion>
    <Accordion title="動畫／響應式" subtitle="閃爍、進場與尺寸響應" open={open==='responsive'} onPress={()=>toggle('responsive')}>
      <SwitchRow label="閃爍" value={fx.blinkEnabled} onChange={blinkEnabled=>patchFx({blinkEnabled})}/>
      <SwitchRow label="進場動畫" value={fx.entranceEnabled} onChange={entranceEnabled=>patchFx({entranceEnabled})}/>
      {fx.entranceEnabled?<><ChoiceRow label="進場方式" value={fx.entranceMode} items={[['slide','滑入'],['zoom','縮放'],['rotate','旋轉']]} onChange={v=>patchFx({entranceMode:v as FrameEffects['entranceMode']})}/>
        <NumberStep label="時間" value={fx.entranceDurationMs} min={200} max={2500} step={50} suffix=" ms" onChange={entranceDurationMs=>patchFx({entranceDurationMs})}/></>:null}
      <SwitchRow label="響應式" value={fx.responsiveEnabled} onChange={responsiveEnabled=>patchFx({responsiveEnabled})}/>
      {fx.responsiveEnabled?<><NumberStep label="Compact 臨界" value={fx.responsiveCompactWidth} min={360} max={900} step={10} suffix=" px" onChange={responsiveCompactWidth=>patchFx({responsiveCompactWidth})}/>
        <NumberStep label="Dense 臨界" value={fx.responsiveDenseWidth} min={240} max={600} step={10} suffix=" px" onChange={responsiveDenseWidth=>patchFx({responsiveDenseWidth})}/></>:null}
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
      <ColorPalettePicker label="背景" value={wall.style.backgroundColor} onChange={backgroundColor=>patch({backgroundColor})}/>
      <ColorPalettePicker label="主要文字" value={wall.style.textColor} onChange={textColor=>patch({textColor})}/>
      <ColorPalettePicker label="次要文字" value={wall.style.secondaryTextColor} onChange={secondaryTextColor=>patch({secondaryTextColor})}/>
      <ColorPalettePicker label="上漲色" value={wall.style.gainColor} onChange={gainColor=>patch({gainColor})}/>
      <ColorPalettePicker label="下跌色" value={wall.style.lossColor} onChange={lossColor=>patch({lossColor})}/>
      <ColorPalettePicker label="邊框" value={wall.style.borderColor} onChange={borderColor=>patch({borderColor})}/>
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
      <SwitchRow label="套用損益色" value={field.useProfitColor} onChange={useProfitColor=>patch({useProfitColor})}/>
      <ColorPalettePicker label="自訂文字色" value={field.textColor??'#FFFFFF'} onChange={textColor=>patch({textColor})}/>
      <SwitchRow label="背景跟隨損益色" value={field.useProfitBackground??false} onChange={useProfitBackground=>patch({useProfitBackground})}/>
      <ColorPalettePicker label="固定背景色" value={field.backgroundColor??'#0C121B'} onChange={backgroundColor=>patch({backgroundColor})}/>
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

function TargetTools({kind,id,current,open,toggle,patch,reset}:{kind:'card'|'text'|'value';id:string;current:TargetAppearance;open:string|null;toggle:(k:string)=>void;patch:(n:TargetOverride)=>void;reset:()=>void}){
  const card=kind==='card';
  return <View>
    {card?<Accordion title="尺寸／空間" subtitle="卡片實際尺寸、內距與外距" open={open==='surface'} onPress={()=>toggle('surface')}>
      <NumberStep label="寬度" value={Math.round(current.width??0)} min={0} max={900} step={10} suffix={(current.width??0)===0?'（自動）':' px'} onChange={width=>patch({width:width||undefined} as any)}/>
      <NumberStep label="高度" value={Math.round(current.height??0)} min={0} max={700} step={10} suffix={(current.height??0)===0?'（自動）':' px'} onChange={height=>patch({height:height||undefined} as any)}/>
      <NumberStep label="內距" value={current.padding} min={0} max={32} step={1} suffix=" px" onChange={padding=>patch({padding})}/>
      <NumberStep label="上下外距" value={current.marginVertical} min={0} max={32} step={1} suffix=" px" onChange={marginVertical=>patch({marginVertical})}/>
      <NumberStep label="左右外距" value={current.marginHorizontal} min={0} max={32} step={1} suffix=" px" onChange={marginHorizontal=>patch({marginHorizontal})}/>
    </Accordion>:<Accordion title={kind==='value'?'數值文字':'文字'} subtitle="字體、字重、字距、行距與對齊" open={open==='type'} onPress={()=>toggle('type')}>
      <NumberStep label="字體大小" value={Math.round(current.fontSize)} min={8} max={64} step={1} suffix=" px" onChange={fontSize=>patch({fontSize})}/>
      <ChoiceRow label="字重" value={String(current.fontWeight)} items={[['400','一般'],['500','中'],['600','半粗'],['700','粗'],['800','特粗'],['900','黑體']]} onChange={fontWeight=>patch({fontWeight:fontWeight as TargetAppearance['fontWeight']})}/>
      <ChoiceRow label="字體樣式" value={current.fontStyle} items={[['normal','正常'],['italic','斜體']]} onChange={fontStyle=>patch({fontStyle:fontStyle as TargetAppearance['fontStyle']})}/>
      <ChoiceRow label="裝飾" value={current.textDecorationLine} items={[['none','無'],['underline','底線'],['line-through','刪除線']]} onChange={textDecorationLine=>patch({textDecorationLine:textDecorationLine as TargetAppearance['textDecorationLine']})}/>
      <NumberStep label="字距" value={current.letterSpacing} min={-4} max={16} step={1} suffix=" px" onChange={letterSpacing=>patch({letterSpacing})}/>
      <NumberStep label="行高" value={current.lineHeight} min={0} max={96} step={2} suffix={current.lineHeight===0?'（自動）':' px'} onChange={lineHeight=>patch({lineHeight})}/>
      <AlignRow value={current.align} onChange={align=>patch({align})}/>
    </Accordion>}
    {!card&&kind==='value'?<Accordion title="數值格式" subtitle="只改顯示格式，不改帳務原始數值" open={open==='number'} onPress={()=>toggle('number')}>
      <ChoiceRow label="顯示單位" value={current.displayUnit} items={[['original','原始'],['yuan','元'],['thousand','千'],['ten-thousand','萬'],['million','百萬']]} onChange={displayUnit=>patch({displayUnit:displayUnit as TargetAppearance['displayUnit']})}/>
      <NumberStep label="小數位" value={current.displayDigits} min={0} max={4} step={1} suffix=" 位" onChange={displayDigits=>patch({displayDigits})}/>
    </Accordion>:null}
    <Accordion title="顏色／背景" subtitle={card?'卡片材質、邊框、陰影與光效':'文字色、背景、邊框與透明度'} open={open==='color'} onPress={()=>toggle('color')}>
      {!card?<ColorPalettePicker label="文字顏色" value={current.textColor} onChange={textColor=>patch({textColor})}/>:null}
      <ColorPalettePicker label="背景顏色" value={current.backgroundColor} onChange={backgroundColor=>patch({backgroundColor})}/>
      <NumberStep label="背景透明度" value={Math.round(current.backgroundOpacity*100)} min={0} max={100} step={5} suffix="%" onChange={v=>patch({backgroundOpacity:v/100})}/>
      <ColorPalettePicker label="邊框顏色" value={current.borderColor} onChange={borderColor=>patch({borderColor})}/>
      <NumberStep label="邊框粗細" value={current.borderWidth} min={0} max={8} step={1} suffix=" px" onChange={borderWidth=>patch({borderWidth})}/>
      <NumberStep label="圓角" value={current.borderRadius} min={0} max={48} step={2} suffix=" px" onChange={borderRadius=>patch({borderRadius})}/>
      {!card?<><NumberStep label="內距" value={current.padding} min={0} max={32} step={1} suffix=" px" onChange={padding=>patch({padding})}/>
        <NumberStep label="透明度" value={Math.round(current.opacity*100)} min={5} max={100} step={5} suffix="%" onChange={v=>patch({opacity:v/100})}/></>:null}
      {card?<><ChoiceRow label="背景模式" value={current.backgroundMode} items={[['solid','純色'],['gradient','漸層']]} onChange={backgroundMode=>patch({backgroundMode:backgroundMode as TargetAppearance['backgroundMode']})}/>
        {current.backgroundMode==='gradient'?<><ColorPalettePicker label="漸層結束色" value={current.gradientEndColor} onChange={gradientEndColor=>patch({gradientEndColor})}/>
          <ChoiceRow label="漸層方向" value={current.gradientDirection} items={[['horizontal','水平'],['vertical','垂直']]} onChange={gradientDirection=>patch({gradientDirection:gradientDirection as TargetAppearance['gradientDirection']})}/></>:null}
        <SwitchRow label="陰影" value={current.shadowEnabled} onChange={shadowEnabled=>patch({shadowEnabled})}/>
        {current.shadowEnabled?<><ColorPalettePicker label="陰影顏色" value={current.shadowColor} onChange={shadowColor=>patch({shadowColor})}/>
          <NumberStep label="陰影強度" value={Math.round(current.shadowOpacity*100)} min={0} max={80} step={5} suffix="%" onChange={v=>patch({shadowOpacity:v/100})}/></>:null}
        <SwitchRow label="Glow" value={current.glowEnabled} onChange={glowEnabled=>patch({glowEnabled})}/>
        {current.glowEnabled?<ColorPalettePicker label="Glow 顏色" value={current.glowColor} onChange={glowColor=>patch({glowColor})}/>:null}
      </>:null}
    </Accordion>
    {card&&id.startsWith('dashboard:kpi-')?<Accordion title="卡片文字" subtitle="標題、主數值、說明各自可調" open={open==='card-type'} onPress={()=>toggle('card-type')}>
      <NumberStep label="標題大小" value={current.labelFontSize} min={8} max={32} step={1} suffix=" px" onChange={labelFontSize=>patch({labelFontSize})}/>
      <ColorPalettePicker label="標題顏色" value={current.labelColor} onChange={labelColor=>patch({labelColor})}/>
      <NumberStep label="數值大小" value={current.fontSize} min={10} max={48} step={1} suffix=" px" onChange={fontSize=>patch({fontSize})}/>
      <ColorPalettePicker label="數值顏色" value={current.textColor} onChange={textColor=>patch({textColor})}/>
      <NumberStep label="說明大小" value={current.captionFontSize} min={8} max={30} step={1} suffix=" px" onChange={captionFontSize=>patch({captionFontSize})}/>
      <ColorPalettePicker label="說明顏色" value={current.captionColor} onChange={captionColor=>patch({captionColor})}/>
      <AlignRow value={current.align} onChange={align=>patch({align})}/>
    </Accordion>:null}
    <Pressable onPress={reset} style={styles.reset}><Text style={styles.resetText}>恢復目前物件排版</Text></Pressable>
  </View>;
}

function DashboardLayoutTools({frameKey,value,open,toggle,onChange}:{frameKey:string;value:DashboardLayoutConfig;open:string|null;toggle:(k:string)=>void;onChange:(v:DashboardLayoutConfig)=>void}){
  const patchOverview=(next:Partial<DashboardLayoutConfig['overview']>)=>onChange({...value,overview:{...value.overview,...next}});
  const patchProfit=(next:Partial<DashboardLayoutConfig['profitAnalysis']>)=>onChange({...value,profitAnalysis:{...value.profitAnalysis,...next}});
  const patchDetail=(next:Partial<DashboardLayoutConfig['profitDetail']>)=>onChange({...value,profitDetail:{...value.profitDetail,...next}});
  const patchQuick=(next:Partial<DashboardLayoutConfig['quickActions']>)=>onChange({...value,quickActions:{...value.quickActions,...next}});
  if(frameKey==='asset-dashboard')return <Accordion title="內容佈局" subtitle="資產總覽的真實內容結構" open={open==='layout'} onPress={()=>toggle('layout')}>
    <NumberStep label="最小高度" value={value.overview.minHeight} min={104} max={220} step={4} suffix=" px" onChange={minHeight=>patchOverview({minHeight})}/>
    <NumberStep label="卡片內距" value={value.overview.padding} min={8} max={28} step={1} suffix=" px" onChange={padding=>patchOverview({padding})}/>
    <NumberStep label="內容間距" value={value.overview.contentGap} min={0} max={24} step={1} suffix=" px" onChange={contentGap=>patchOverview({contentGap})}/>
    <AlignRow value={value.overview.align} onChange={align=>patchOverview({align})}/>
    <SwitchRow label="NT$ 前綴" value={value.overview.prefixVisible} onChange={prefixVisible=>patchOverview({prefixVisible})}/>
    <SwitchRow label="說明文字" value={value.overview.captionVisible} onChange={captionVisible=>patchOverview({captionVisible})}/>
    <SwitchRow label="裝飾圖形" value={value.overview.decorationVisible} onChange={decorationVisible=>patchOverview({decorationVisible})}/>
  </Accordion>;
  if(frameKey==='profit-analysis')return <Accordion title="KPI 佈局" subtitle="卡片高度、間距、圖示與說明" open={open==='layout'} onPress={()=>toggle('layout')}>
    <NumberStep label="卡片高度" value={value.profitAnalysis.cardHeight} min={84} max={156} step={4} suffix=" px" onChange={cardHeight=>patchProfit({cardHeight})}/>
    <NumberStep label="卡片間距" value={value.profitAnalysis.cardGap} min={6} max={24} step={1} suffix=" px" onChange={cardGap=>patchProfit({cardGap})}/>
    <NumberStep label="卡片內距" value={value.profitAnalysis.cardPadding} min={0} max={28} step={1} suffix=" px" onChange={cardPadding=>patchProfit({cardPadding})}/>
    <SwitchRow label="圖示" value={value.profitAnalysis.iconVisible} onChange={iconVisible=>patchProfit({iconVisible})}/>
    <SwitchRow label="說明" value={value.profitAnalysis.captionVisible} onChange={captionVisible=>patchProfit({captionVisible})}/>
  </Accordion>;
  if(frameKey==='pnl-detail')return <Accordion title="明細佈局" subtitle="列數、高度、左右內距與欄位間距" open={open==='layout'} onPress={()=>toggle('layout')}>
    <NumberStep label="顯示列數" value={value.profitDetail.itemCount} min={2} max={4} step={1} suffix=" 列" onChange={v=>patchDetail({itemCount:v as 2|3|4})}/>
    <NumberStep label="列高" value={value.profitDetail.rowHeight} min={40} max={72} step={2} suffix=" px" onChange={rowHeight=>patchDetail({rowHeight})}/>
    <NumberStep label="左右內距" value={value.profitDetail.rowPaddingHorizontal} min={0} max={32} step={1} suffix=" px" onChange={rowPaddingHorizontal=>patchDetail({rowPaddingHorizontal})}/>
    <NumberStep label="欄位間距" value={value.profitDetail.rowGap} min={0} max={28} step={1} suffix=" px" onChange={rowGap=>patchDetail({rowGap})}/>
    <SwitchRow label="查看更多" value={value.profitDetail.showMore} onChange={showMore=>patchDetail({showMore})}/>
  </Accordion>;
  if(frameKey==='dashboard-quick-actions')return <Accordion title="快捷按鈕佈局" subtitle="欄數、內距、圖示文字間距" open={open==='layout'} onPress={()=>toggle('layout')}>
    <ChoiceRow label="欄數" value={String(value.quickActions.columns)} items={[['2','雙欄'],['4','四欄']]} onChange={v=>patchQuick({columns:Number(v) as 2|4})}/>
    <NumberStep label="按鈕內距" value={value.quickActions.itemPadding} min={0} max={28} step={1} suffix=" px" onChange={itemPadding=>patchQuick({itemPadding})}/>
    <NumberStep label="圖示／文字間距" value={value.quickActions.itemGap} min={0} max={24} step={1} suffix=" px" onChange={itemGap=>patchQuick({itemGap})}/>
    <SwitchRow label="顯示文字" value={value.quickActions.titleVisible} onChange={titleVisible=>patchQuick({titleVisible})}/>
  </Accordion>;
  return null;
}

function dashboardTargetBase(id:string,layout:DashboardLayoutConfig):TargetAppearance{
  if(id==='dashboard:overview-card')return {...TARGET_APPEARANCE,backgroundColor:colors.surfaceMuted,borderColor:colors.border,borderRadius:radius.lg,padding:layout.overview.padding};
  if(id==='dashboard:overview-label')return {...TARGET_APPEARANCE,fontSize:layout.overview.labelFontSize,textColor:layout.overview.labelColor,align:layout.overview.align,fontWeight:'900'};
  if(id==='dashboard:overview-value')return {...TARGET_APPEARANCE,fontSize:layout.overview.valueFontSize,textColor:layout.overview.valueColor,align:layout.overview.align,fontWeight:'900'};
  if(id==='dashboard:overview-prefix')return {...TARGET_APPEARANCE,fontSize:layout.overview.prefixFontSize,textColor:layout.overview.prefixColor,align:layout.overview.align,fontWeight:'900',prefixText:'NT$',prefixGap:8};
  if(id==='dashboard:overview-caption')return {...TARGET_APPEARANCE,fontSize:layout.overview.captionFontSize,textColor:layout.overview.captionColor,align:layout.overview.align};
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
function ModeStep({label,value,fallback,min,max,step,onAuto,onChange}:{label:string;value:number|undefined;fallback:number;min:number;max:number;step:number;onAuto:()=>void;onChange:(value:number)=>void}){
  const actual=value??fallback;
  return <View style={styles.modeBlock}><View style={styles.row}><Text style={styles.rowLabel}>{label}</Text><Pressable onPress={value===undefined?()=>onChange(fallback):onAuto} style={[styles.autoChip,value===undefined&&styles.autoChipActive]}><Text style={[styles.autoText,value===undefined&&styles.autoTextActive]}>{value===undefined?'自動':'固定'}</Text></Pressable></View>{value!==undefined?<NumberStep label="" value={actual} min={min} max={max} step={step} suffix=" px" onChange={onChange}/>:null}</View>;
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
  frameSelected:{borderWidth:2,borderStyle:'dashed',borderColor:colors.primary,borderRadius:radius.lg,padding:3},
  kindRow:{gap:6,paddingVertical:2},kindChip:{paddingHorizontal:11,paddingVertical:7,borderRadius:radius.pill,backgroundColor:colors.surfaceMuted,borderWidth:1,borderColor:colors.border},kindChipActive:{backgroundColor:colors.primary,borderColor:colors.primary},kindText:{fontSize:10,fontWeight:'900',color:colors.textSecondary},kindTextActive:{color:'#FFFFFF'},
  accordion:{borderTopWidth:StyleSheet.hairlineWidth,borderTopColor:colors.border},accordionHead:{paddingVertical:11,flexDirection:'row',alignItems:'center',gap:8},accordionTitle:{fontSize:13,fontWeight:'900',color:colors.text},rowHint:{fontSize:9,lineHeight:14,color:colors.textSecondary,marginTop:2},chev:{fontSize:18,fontWeight:'900',color:colors.primary},accordionBody:{gap:8,paddingBottom:8},
  row:{minHeight:40,flexDirection:'row',alignItems:'center',gap:8},rowLabel:{flex:1,fontSize:11,fontWeight:'800',color:colors.textSecondary},rowButtons:{flexDirection:'row',gap:6},step:{width:34,height:34,borderRadius:10,backgroundColor:'#EAF2FF',alignItems:'center',justifyContent:'center'},stepText:{fontSize:17,fontWeight:'900',color:colors.primary},num:{minWidth:76,textAlign:'center',fontSize:11,fontWeight:'900',color:colors.text},
  modeBlock:{gap:2},autoChip:{paddingHorizontal:10,paddingVertical:6,borderRadius:999,backgroundColor:colors.surfaceMuted},autoChipActive:{backgroundColor:colors.primary},autoText:{fontSize:10,fontWeight:'900',color:colors.textSecondary},autoTextActive:{color:'#FFFFFF'},
  choices:{flexDirection:'row',flexWrap:'wrap',gap:5,justifyContent:'flex-end',maxWidth:'68%'},choice:{paddingHorizontal:9,paddingVertical:7,borderRadius:10,backgroundColor:colors.surfaceMuted,borderWidth:1,borderColor:colors.border},choiceActive:{backgroundColor:colors.primary,borderColor:colors.primary},choiceText:{fontSize:9,fontWeight:'800',color:colors.textSecondary},choiceTextActive:{color:'#FFFFFF'},
  reset:{marginTop:10,minHeight:42,borderRadius:12,backgroundColor:colors.surfaceMuted,alignItems:'center',justifyContent:'center'},resetText:{fontSize:11,fontWeight:'900',color:colors.primary},
});
