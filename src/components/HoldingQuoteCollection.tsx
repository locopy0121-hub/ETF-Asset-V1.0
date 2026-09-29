import { ScrollView,StyleSheet,Text,useWindowDimensions, View } from 'react-native';
import {useState} from 'react';
import {HoldingQuoteTicker} from './HoldingQuoteTicker';
import {InspectableTarget} from '../maintenance/InspectableTarget';
import {TARGET_APPEARANCE,type FrameMaintenanceContext,type InspectedTarget,type TargetAppearance} from '../maintenance/inspectionModel';
import {useMaintenance} from '../maintenance/MaintenanceRuntime';

import { DEFAULT_HOLDING_WALL_CONFIG, type HoldingQuote, type HoldingWallConfig, type QuoteModuleStyle } from '../domain/uiModels';
import {DEFAULT_ETF_BADGES,type EtfBadgeConfig} from '../domain/etfBadges';
import { spacing } from '../theme/tokens';
import {holdingCardLayout,holdingPageWidth,holdingPages,safeHoldingStyle} from '../domain/holdingLayoutPolicy';
import { HoldingQuoteModule } from './HoldingQuoteModule';

export type HoldingLayoutMode='list'|'grid2'|'grid3'|'horizontal'|'paged2';

export function HoldingQuoteCollection({
  rows,style,layoutMode='list',onOpenHolding,onOpenChart,wallConfig,badgeConfig,refreshToken,maintenance,
  layoutEditMode=false,layoutSelectionId=null,onLayoutSelect,
}:{
  rows:readonly HoldingQuote[];
  style:QuoteModuleStyle;
  layoutMode?:HoldingLayoutMode;
  onOpenHolding:(row:HoldingQuote)=>void;
  onOpenChart?:(row:HoldingQuote)=>void;
  wallConfig?:HoldingWallConfig;
  badgeConfig?:EtfBadgeConfig;
  refreshToken?:string|number|null|undefined;
  maintenance?:FrameMaintenanceContext;
  layoutEditMode?:boolean;
  layoutSelectionId?:string|null;
  onLayoutSelect?:((id:string,label:string)=>void)|undefined;
}){
  const {width}=useWindowDimensions();
  const engineer=useMaintenance();
  // The real viewport, not screen width, determines each swipe page and hitbox.
  const [viewportWidth,setViewportWidth]=useState(0);
  const pageWidth=holdingPageWidth(viewportWidth,width);
  const wallReset=Boolean(maintenance&&engineer.hasIndividualReset(maintenance.page,
    maintenance.frameKey,'shared:holding-wall'));
  const effectiveWallConfig=wallReset?DEFAULT_HOLDING_WALL_CONFIG:wallConfig??DEFAULT_HOLDING_WALL_CONFIG;
  const effectiveBadgeConfig=wallReset?DEFAULT_ETF_BADGES:badgeConfig??DEFAULT_ETF_BADGES;
  const renderHolding=(item:HoldingQuote,narrow=false,micro=false)=>{
    // A single restored ETF card can use native defaults without rewriting the page-wide wall.
    const cardReset=Boolean(maintenance&&engineer.hasIndividualReset(maintenance.page,
      maintenance.frameKey,'quote:'+item.symbol));
    const cardConfig=cardReset?DEFAULT_HOLDING_WALL_CONFIG:effectiveWallConfig;
    const cardBadges=cardReset?DEFAULT_ETF_BADGES:effectiveBadgeConfig;
    const card=cardConfig.style;
    const render=(appearance?:TargetAppearance)=>{
      const adjusted=appearance?{
        ...cardConfig,
        style:{...card,
          backgroundColor:appearance.backgroundColor,textColor:appearance.textColor,
          borderColor:appearance.borderColor,borderWidth:appearance.borderWidth,
          cornerRadius:appearance.borderRadius,padding:appearance.padding},
        fields:cardConfig.fields.map(field=>({...field,fontScale:field.fontScale*appearance.fontSize/16,
          useProfitColor:appearance.useProfitColor?field.useProfitColor:false})),
      }:cardConfig;
      return <HoldingQuoteModule item={item} style={safeHoldingStyle(micro?'grid3':'list',cardReset?'quote':style)}
        layout={holdingCardLayout(micro?'grid3':narrow?'grid2':'list')}
        wallConfig={adjusted} badgeConfig={cardBadges} refreshToken={refreshToken}
        onPress={()=>onOpenHolding(item)} {...(onOpenChart?{onOpenChart:()=>onOpenChart(item)}:{})}
        layoutEditMode={layoutEditMode} layoutSelectionId={layoutSelectionId} onLayoutSelect={onLayoutSelect}/>;
    };
    if(!maintenance)return render();
    const target:InspectedTarget={
      id:'quote:'+item.symbol,kind:'quote-card',label:item.symbol+' '+item.name,
      page:maintenance.page,frameKey:maintenance.frameKey,frameTitle:maintenance.frameTitle,
      properties:[
        {name:'代號',value:item.symbol,readOnly:true},{name:'名稱',value:item.name,readOnly:true},
        {name:'行情',value:item.quoteVerified===false?'尚無可信行情':item.price.toFixed(2),readOnly:true},
        {name:'帳務損益',value:'NT$ '+Math.round(item.pnl).toLocaleString('zh-TW'),readOnly:true},
        {name:'目前顯示模式',value:style},{name:'目前排列',value:layoutMode},
        {name:'框架底色',value:card.backgroundColor},{name:'字體縮放',value:String(effectiveWallConfig.fields[0]?.fontScale??1)},
      ],
      base:{...TARGET_APPEARANCE,fontSize:16,labelFontSize:10,captionFontSize:10,
        textColor:card.textColor,backgroundColor:card.backgroundColor,borderColor:card.borderColor,
        borderWidth:card.borderWidth,borderRadius:card.cornerRadius,padding:card.padding},
    };
    return <InspectableTarget key={target.id} target={target} frame={maintenance}>{(appearance,customized)=>render(customized?appearance:undefined)}</InspectableTarget>;
  };
  const content=(()=>{
    if(layoutMode==='horizontal'){
      const itemWidth=Math.max(230,Math.min(pageWidth-18,width*.78));
      return <ScrollView horizontal showsHorizontalScrollIndicator={false} decelerationRate="fast"
        snapToInterval={itemWidth+spacing.sm} snapToAlignment="start" contentContainerStyle={styles.horizontal}>
        {rows.map(item=><View key={item.symbol} style={{width:itemWidth}}>{renderHolding(item)}</View>)}
      </ScrollView>;
    }
    if(layoutMode==='paged2'){
      const pages=holdingPages(rows,2);
      return <View style={styles.pagedViewport} onLayout={event=>{
        const actual=Math.round(event.nativeEvent.layout.width);
        if(actual>0)setViewportWidth(old=>old===actual?old:actual);
      }}>
        <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}
          decelerationRate="fast" snapToInterval={pageWidth} contentContainerStyle={styles.pagedContent}>
          {pages.map((page,index)=><View key={index} style={[styles.page,{width:pageWidth}]}>
            {page.map(item=><View key={item.symbol} style={styles.pagedHalf}>{renderHolding(item,true)}</View>)}
          </View>)}
        </ScrollView>
      </View>;
    }
    if(layoutMode==='grid2'||layoutMode==='grid3'){
      const widthStyle=layoutMode==='grid3'?styles.third:styles.half;
      return <View style={styles.grid}>
        {rows.map(item=><View key={item.symbol} style={widthStyle}>{renderHolding(item,true,layoutMode==='grid3')}</View>)}
      </View>;
    }
    return <View style={styles.list}>{rows.map(item=><View key={item.symbol}>{renderHolding(item)}</View>)}</View>;
  })();
  const wallTarget:InspectedTarget|undefined=maintenance?{
    id:'shared:holding-wall',kind:'wall',label:'本頁行情牆設定',
    page:maintenance.page,frameKey:maintenance.frameKey,frameTitle:maintenance.frameTitle,
    properties:[
      {name:'目前行情模式',value:style},{name:'目前排列',value:layoutMode},
      {name:'行情欄位數',value:String(effectiveWallConfig.fields.length)},
      {name:'標籤種類',value:String(effectiveBadgeConfig.order.length)},
      {name:'跑馬燈',value:effectiveWallConfig.ticker?.enabled?'已開啟':'已關閉'},
    ],base:{...TARGET_APPEARANCE,padding:2},
  }:undefined;
  return <View style={styles.collection}>
    {engineer.enabled&&maintenance&&wallTarget?<InspectableTarget frame={maintenance} target={wallTarget}>
      {()=> <View style={{paddingVertical:5,paddingHorizontal:9,borderRadius:7,backgroundColor:'#F3E8FF'}}>
        <Text style={{fontSize:11,fontWeight:'800',color:'#6F3DB4'}}>輕點選取本頁行情牆，共用設定工具在下方技能樹</Text>
      </View>}
    </InspectableTarget>:null}
    {effectiveWallConfig.ticker?.enabled?<HoldingQuoteTicker rows={rows} config={effectiveWallConfig.ticker}/>:null}
    {content}
  </View>;
}

const styles=StyleSheet.create({
  collection:{gap:0},list:{gap:spacing.sm},
  grid:{flexDirection:'row',flexWrap:'wrap',gap:spacing.sm,alignItems:'stretch'},
  half:{width:'48.5%'},third:{width:'31.2%'},
  horizontal:{gap:spacing.sm,paddingRight:spacing.md},
  pagedViewport:{width:'100%',overflow:'hidden'},
  // No outer gap: snap distance and page width must match exactly.
  pagedContent:{gap:0},
  page:{flexDirection:'row',gap:spacing.sm,alignItems:'stretch'},
  pagedHalf:{flex:1,minWidth:0},
});
