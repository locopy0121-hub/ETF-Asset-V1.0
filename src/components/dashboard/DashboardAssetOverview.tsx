import {Pressable,StyleSheet,View} from 'react-native';
import type {DashboardLayoutConfig} from '../../domain/dashboardLayout';
import type {FrameMaintenanceContext} from '../../maintenance/inspectionModel';
import {colors,radius} from '../../theme/tokens';
import {DashboardEditableText} from './DashboardEditableContent';
import {useLayoutRuntime} from '../../editor/LayoutSelectionContext';
import {TARGET_APPEARANCE,mergeTargetAppearance} from '../../maintenance/inspectionModel';
import {TargetBackdrop,targetShadowStyle} from '../../maintenance/TargetSurfaceEffects';
import {colorWithAlpha} from '../../maintenance/frameEffects';

export function DashboardAssetOverview({amount,caption,complete=true,layout,maintenance}:{
  amount:string;caption:string;complete?:boolean;layout:DashboardLayoutConfig['overview'];maintenance?:FrameMaintenanceContext;
}){
  const runtime=useLayoutRuntime();
  const cardId='dashboard:overview-card';
  const cardOverride=runtime.targets[cardId];
  const card=mergeTargetAppearance({...TARGET_APPEARANCE,backgroundColor:colors.surfaceMuted,borderColor:colors.border,
    borderRadius:radius.lg,padding:layout.padding},cardOverride);
  const renderItem=(item:DashboardLayoutConfig['overview']['order'][number])=>{
    if(item==='label')return <DashboardEditableText key="label" id="overview-label" label="資產總覽標題" frame={maintenance}
      style={[styles.label,{fontSize:layout.labelFontSize,color:layout.labelColor,textAlign:layout.align}]}>總資產（持股市值）</DashboardEditableText>;
    if(item==='amount')return complete?<View key="amount" style={styles.moneyShell}>
      <View style={[styles.moneyRow,{justifyContent:layout.align==='right'?'flex-end':layout.align==='center'?'center':'flex-start'}]}
        accessible accessibilityLabel={'目前持股總市值 NT$ '+amount}>
        {layout.prefixVisible?<DashboardEditableText id="overview-prefix" label="NT$ 貨幣前綴" frame={maintenance} kind="prefix"
          numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72}
          style={[styles.prefix,{fontSize:layout.prefixFontSize,color:layout.prefixColor}]}>NT$</DashboardEditableText>:null}
        <DashboardEditableText id="overview-value" label="持股總市值" frame={maintenance} kind="value"
          numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.42}
          style={[styles.value,{fontSize:layout.valueFontSize,color:layout.valueColor,textAlign:layout.align}]}>{amount}</DashboardEditableText>
      </View>
    </View>:<DashboardEditableText key="amount" id="overview-pending" label="估值狀態" frame={maintenance}
      style={[styles.pending,{color:layout.valueColor,textAlign:layout.align}]}>估值待核對</DashboardEditableText>;
    return layout.captionVisible?<DashboardEditableText key="caption" id="overview-caption" label="資產總覽說明" frame={maintenance}
      numberOfLines={2} style={[styles.caption,{fontSize:layout.captionFontSize,color:layout.captionColor,textAlign:layout.align}]}>{caption}</DashboardEditableText>:null;
  };
  return <Pressable disabled={!runtime.active}
    onPress={runtime.active?(event=>{event.stopPropagation();runtime.onSelect?.({id:cardId,kind:'card',label:'資產總覽卡片'});}):undefined}
    style={[styles.root,{minHeight:layout.minHeight,padding:card.padding,
      backgroundColor:card.backgroundMode==='gradient'?'transparent':colorWithAlpha(card.backgroundColor,card.backgroundOpacity),
      borderColor:card.borderColor,borderWidth:card.borderWidth,borderRadius:card.borderRadius,opacity:card.opacity,
      marginVertical:card.marginVertical,marginHorizontal:card.marginHorizontal,
      ...(cardOverride?.width!==undefined?{width:cardOverride.width}:{}),
      ...(cardOverride?.height!==undefined?{height:cardOverride.height}:{}),
      ...(cardOverride?.offsetX!==undefined||cardOverride?.offsetY!==undefined?{transform:[{translateX:cardOverride.offsetX??0},{translateY:cardOverride.offsetY??0}]}:{}),
      ...targetShadowStyle(card,card.shadowColor)},
      runtime.active&&runtime.selectedId===cardId?styles.layoutSelected:undefined]}>
    {cardOverride?<TargetBackdrop appearance={card} start={card.backgroundColor} middle={card.gradientMidColor}
      end={card.gradientEndColor} glow={card.glowColor}/>:null}
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
  moneyShell:{width:'100%',minWidth:0,overflow:'hidden'},
  moneyRow:{flexDirection:'row',alignItems:'flex-end',width:'100%',minWidth:0,overflow:'hidden'},
  prefix:{fontSize:18,lineHeight:42,fontWeight:'900',color:colors.primary,marginRight:8,flexShrink:1,maxWidth:'30%'},
  value:{fontSize:42,lineHeight:46,fontWeight:'900',fontVariant:['tabular-nums'],color:colors.text,flex:1,minWidth:0,flexShrink:1},
  pending:{fontSize:24,lineHeight:34,fontWeight:'900',color:colors.text},
  caption:{fontSize:11,lineHeight:16,color:colors.textSecondary},
  decoration:{position:'absolute',right:12,bottom:10,height:72,width:60,flexDirection:'row',alignItems:'flex-end',gap:4,opacity:.16},
  bar:{flex:1,borderRadius:4,backgroundColor:colors.primary},
  layoutSelected:{borderStyle:'dashed',borderWidth:2,borderColor:'#0B6CFF'},
});
