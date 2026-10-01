import {useState} from 'react';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import type {DashboardLayoutConfig} from '../../domain/dashboardLayout';
import type {FrameMaintenanceContext} from '../../maintenance/inspectionModel';
import {colors,radius} from '../../theme/tokens';
import {DashboardEditableText} from './DashboardEditableContent';
import {useLayoutRuntime} from '../../editor/LayoutSelectionContext';
import {TARGET_APPEARANCE,mergeTargetAppearance} from '../../maintenance/inspectionModel';
import {TargetBackdrop,targetShadowStyle} from '../../maintenance/TargetSurfaceEffects';
import {colorWithAlpha} from '../../maintenance/frameEffects';
import {linkedColor,type FinancialTone} from '../../maintenance/workspaceModel';
import {useSettingsRuntime} from '../../settings/SettingsRuntime';

const signedMoney=(value:number)=>`${value>0?'+':''}${Math.round(value).toLocaleString('zh-TW')}`;
const displayPnl=(value:number|null)=>value===null?'--':signedMoney(value);
const financialTone=(value:number|null):FinancialTone=>value===null?'neutral':value>0?'gain':value<0?'loss':'neutral';

export function DashboardAssetOverview({
  amount,caption,complete=true,layout,maintenance,
  yesterdayPnl=null,todayPnl=null,totalPnl=0,pnlComplete=false,onPressTotalPnl,
}:{
  amount:string;caption:string;complete?:boolean;layout:DashboardLayoutConfig['overview'];maintenance?:FrameMaintenanceContext;
  yesterdayPnl?:number|null;todayPnl?:number|null;totalPnl?:number;pnlComplete?:boolean;onPressTotalPnl?:()=>void;
}){
  const runtime=useLayoutRuntime();
  const [cardSize,setCardSize]=useState<{width:number;height:number}|null>(null);
  const colorPrefs=useSettingsRuntime().prefs.display;
  const totalTone=financialTone(totalPnl);
  const yesterdayTone=financialTone(yesterdayPnl);
  const todayTone=financialTone(todayPnl);
  const cardId='dashboard:overview-card';
  const cardOverride=runtime.targets[cardId];
  const card=mergeTargetAppearance({...TARGET_APPEARANCE,backgroundColor:colors.surfaceMuted,borderColor:colors.border,
    borderRadius:radius.lg,padding:layout.padding},cardOverride);
  const cardBackground=linkedColor(card.backgroundColor,card.backgroundProfitColor,totalTone,colorPrefs);
  const cardBorder=linkedColor(card.borderColor,card.borderProfitColor,totalTone,colorPrefs);
  const cardGradientMid=linkedColor(card.gradientMidColor,card.gradientMidProfitColor,totalTone,colorPrefs);
  const cardGradientEnd=linkedColor(card.gradientEndColor,card.gradientEndProfitColor,totalTone,colorPrefs);
  const cardShadow=linkedColor(card.shadowColor,card.shadowProfitColor,totalTone,colorPrefs);
  const cardGlow=linkedColor(card.glowColor,card.glowProfitColor,totalTone,colorPrefs);

  const pnlSummary=pnlComplete?<View style={styles.pnlRow} accessibilityLabel={`昨日損益 ${displayPnl(yesterdayPnl)}，今日損益 ${displayPnl(todayPnl)}，累計總損益 ${signedMoney(totalPnl)}`}>
    <View style={styles.pnlCell}>
      <DashboardEditableText id="overview-previous-pnl-label" label="昨日損益標題" frame={maintenance}
        style={styles.pnlLabel}>昨日損益</DashboardEditableText>
      <DashboardEditableText id="overview-previous-pnl" label="昨日單日損益" frame={maintenance} kind="value" tone={yesterdayTone}
        numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={styles.pnlValue}>{displayPnl(yesterdayPnl)}</DashboardEditableText>
    </View>
    <Text style={styles.operator}>│</Text>
    <View style={styles.pnlCell}>
      <DashboardEditableText id="overview-today-pnl-label" label="今日損益標題" frame={maintenance}
        style={styles.pnlLabel}>今日損益</DashboardEditableText>
      <DashboardEditableText id="overview-today-pnl" label="今日單日損益" frame={maintenance} kind="value" tone={todayTone}
        numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={styles.pnlValue}>{displayPnl(todayPnl)}</DashboardEditableText>
    </View>
    <Text style={styles.operator}>│</Text>
    <Pressable disabled={runtime.active||!onPressTotalPnl}
      accessibilityRole="button" accessibilityLabel={`查看每日損益紀錄，累計總損益 ${signedMoney(totalPnl)}`}
      onPress={onPressTotalPnl?(event=>{event.stopPropagation();onPressTotalPnl();}):undefined}
      style={({pressed})=>[styles.pnlCell,styles.totalPnlCell,!runtime.active&&onPressTotalPnl?styles.totalPnlInteractive:undefined,pressed?styles.totalPnlPressed:undefined]}>
      <DashboardEditableText id="overview-total-pnl-label" label="累計總損益標題" frame={maintenance} tone={totalTone}
        style={styles.pnlLabel}>累計總損益</DashboardEditableText>
      <DashboardEditableText id="overview-total-pnl" label="累計總損益" frame={maintenance} kind="value" tone={totalTone}
        numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={styles.totalPnlValue}>{signedMoney(totalPnl)}</DashboardEditableText>
    </Pressable>
  </View>:<DashboardEditableText id="overview-pnl-pending" label="損益狀態" frame={maintenance}
    style={styles.pnlPending}>損益待核對</DashboardEditableText>;

  const renderItem=(item:DashboardLayoutConfig['overview']['order'][number])=>{
    if(item==='label')return <DashboardEditableText key="label" id="overview-label" label="資產總覽標題" frame={maintenance} tone={totalTone}
      style={[styles.label,{fontSize:layout.labelFontSize,color:layout.labelColor,textAlign:layout.align}]}>總資產（持股市值）</DashboardEditableText>;
    if(item==='amount')return <View key="amount-block" style={styles.amountBlock}>
      {complete?<View style={styles.moneyShell}>
        <View style={[styles.moneyRow,{justifyContent:layout.align==='right'?'flex-end':layout.align==='center'?'center':'flex-start'}]}
          accessible accessibilityLabel={'目前持股總市值 NT$ '+amount}>
          {layout.prefixVisible?<DashboardEditableText id="overview-prefix" label="NT$ 貨幣前綴" frame={maintenance} kind="prefix" tone={totalTone}
            numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72}
            style={[styles.prefix,{fontSize:layout.prefixFontSize,color:layout.prefixColor}]}>NT$</DashboardEditableText>:null}
          <DashboardEditableText id="overview-value" label="持股總市值" frame={maintenance} kind="value" tone={totalTone}
            numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.42}
            style={[styles.value,{fontSize:layout.valueFontSize,color:layout.valueColor,textAlign:layout.align}]}>{amount}</DashboardEditableText>
        </View>
      </View>:<DashboardEditableText id="overview-pending" label="估值狀態" frame={maintenance} tone={totalTone}
        style={[styles.pending,{color:layout.valueColor,textAlign:layout.align}]}>估值待核對</DashboardEditableText>}
      {pnlSummary}
    </View>;
    return layout.captionVisible?<DashboardEditableText key="caption" id="overview-caption" label="資產總覽說明" frame={maintenance} tone={totalTone}
      numberOfLines={2} style={[styles.caption,{fontSize:layout.captionFontSize,color:layout.captionColor,textAlign:layout.align}]}>{caption}</DashboardEditableText>:null;
  };
  return <Pressable disabled={!runtime.active}
    onLayout={event=>{const {width,height}=event.nativeEvent.layout;setCardSize({width,height});}}
    onPress={runtime.active?(event=>{event.stopPropagation();runtime.onSelect?.({id:cardId,kind:'card',label:'資產總覽卡片',...(cardSize??{})});}):undefined}
    style={[styles.root,{minHeight:layout.minHeight,padding:card.padding,
      backgroundColor:card.backgroundMode==='gradient'?'transparent':colorWithAlpha(cardBackground,card.backgroundOpacity),
      borderColor:colorWithAlpha(cardBorder,card.borderOpacity),borderWidth:card.borderWidth,borderRadius:card.borderRadius,opacity:card.opacity,
      marginVertical:card.marginVertical,marginHorizontal:card.marginHorizontal,
      ...(cardOverride?.width!==undefined?{width:cardOverride.width}:{}),
      ...(cardOverride?.height!==undefined?{height:cardOverride.height}:{}),
      ...(cardOverride?.offsetX!==undefined||cardOverride?.offsetY!==undefined?{transform:[{translateX:cardOverride.offsetX??0},{translateY:cardOverride.offsetY??0}]}:{}),
      ...targetShadowStyle(card,cardShadow)},
      runtime.active&&runtime.selectedId===cardId?styles.layoutSelected:undefined]}>
    {cardOverride?<TargetBackdrop appearance={card} start={cardBackground} middle={cardGradientMid}
      end={cardGradientEnd} glow={cardGlow}/>:null}
    <View style={[styles.content,{gap:layout.contentGap}]}>{layout.order.map(renderItem)}</View>
    {layout.decorationVisible?<View pointerEvents="none" style={styles.decoration}>
      <View style={[styles.bar,{height:22}]}/><View style={[styles.bar,{height:35}]}/><View style={[styles.bar,{height:50}]}/><View style={[styles.bar,{height:64}]}/>
    </View>:null}
  </Pressable>;
}

const styles=StyleSheet.create({
  root:{position:'relative',overflow:'hidden',borderRadius:radius.lg,backgroundColor:colors.surfaceMuted,justifyContent:'center'},
  content:{minWidth:0,zIndex:2,paddingRight:54},
  label:{fontSize:12,fontWeight:'900',color:colors.textSecondary},
  amountBlock:{width:'100%',minWidth:0,gap:8},
  moneyShell:{width:'100%',minWidth:0,overflow:'hidden'},
  moneyRow:{flexDirection:'row',alignItems:'flex-end',width:'100%',minWidth:0,overflow:'hidden'},
  prefix:{fontSize:18,lineHeight:42,fontWeight:'900',color:colors.primary,marginRight:8,flexShrink:1,maxWidth:'30%'},
  value:{fontSize:42,lineHeight:46,fontWeight:'900',fontVariant:['tabular-nums'],color:colors.text,flex:1,minWidth:0,flexShrink:1},
  pending:{fontSize:24,lineHeight:34,fontWeight:'900',color:colors.text},
  pnlRow:{flexDirection:'row',alignItems:'stretch',width:'100%',minWidth:0,gap:4},
  pnlCell:{flex:1,minWidth:0,justifyContent:'center',paddingHorizontal:5,paddingVertical:5,borderRadius:8},
  pnlLabel:{fontSize:9,lineHeight:12,fontWeight:'800',color:colors.textSecondary},
  pnlValue:{fontSize:12,lineHeight:17,fontWeight:'900',fontVariant:['tabular-nums'],color:colors.text},
  totalPnlValue:{fontSize:13,lineHeight:18,fontWeight:'900',fontVariant:['tabular-nums'],color:colors.text},
  totalPnlCell:{backgroundColor:colors.surface},
  totalPnlInteractive:{borderWidth:1,borderColor:colors.border},
  totalPnlPressed:{opacity:.65},
  operator:{alignSelf:'center',fontSize:11,fontWeight:'900',color:colors.textSecondary},
  pnlPending:{fontSize:10,lineHeight:15,fontWeight:'800',color:colors.textSecondary},
  caption:{fontSize:11,lineHeight:16,color:colors.textSecondary},
  decoration:{position:'absolute',right:12,bottom:10,height:72,width:60,flexDirection:'row',alignItems:'flex-end',gap:4,opacity:.16},
  bar:{flex:1,borderRadius:4,backgroundColor:colors.primary},
  layoutSelected:{borderStyle:'dashed',borderWidth:2,borderColor:'#0B6CFF'},
});
