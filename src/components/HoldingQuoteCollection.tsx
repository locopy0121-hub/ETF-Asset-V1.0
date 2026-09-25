import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import {HoldingQuoteTicker} from './HoldingQuoteTicker';
import {InspectableTarget} from '../maintenance/InspectableTarget';
import {TARGET_APPEARANCE,type FrameMaintenanceContext,type InspectedTarget,type TargetAppearance} from '../maintenance/inspectionModel';
import {useMaintenance} from '../maintenance/MaintenanceRuntime';

import { DEFAULT_HOLDING_WALL_CONFIG, type HoldingQuote, type HoldingWallConfig, type QuoteModuleStyle } from '../domain/uiModels';
import {DEFAULT_ETF_BADGES,type EtfBadgeConfig} from '../domain/etfBadges';
import { spacing } from '../theme/tokens';
import { HoldingQuoteModule } from './HoldingQuoteModule';

export type HoldingLayoutMode='list'|'grid2'|'grid3'|'horizontal'|'paged2';

export function HoldingQuoteCollection({
  rows,style,layoutMode='list',onOpenHolding,wallConfig,badgeConfig,refreshToken,maintenance,
}:{
  rows:readonly HoldingQuote[];
  style:QuoteModuleStyle;
  layoutMode?:HoldingLayoutMode;
  onOpenHolding:(row:HoldingQuote)=>void;
  wallConfig?:HoldingWallConfig;
  badgeConfig?:EtfBadgeConfig;
  refreshToken?:string|number|null|undefined;
  maintenance?:FrameMaintenanceContext;
}){
  const {width}=useWindowDimensions();
  const engineer=useMaintenance();
  const pageWidth=Math.max(280,width-64);
  const effectiveWallConfig=wallConfig??DEFAULT_HOLDING_WALL_CONFIG;
  const effectiveBadgeConfig=badgeConfig??DEFAULT_ETF_BADGES;
  const card=effectiveWallConfig.style;
  const renderHolding=(item:HoldingQuote,narrow=false)=>{
    const render=(appearance?:TargetAppearance)=>{
      const adjusted=appearance?{
        ...effectiveWallConfig,
        style:{...card,
          backgroundColor:appearance.backgroundColor,textColor:appearance.textColor,
          borderColor:appearance.borderColor,borderWidth:appearance.borderWidth,
          cornerRadius:appearance.borderRadius,padding:appearance.padding},
        fields:effectiveWallConfig.fields.map(field=>({...field,fontScale:field.fontScale*appearance.fontSize/16})),
      }:effectiveWallConfig;
      return <HoldingQuoteModule item={item} style={style} layout={narrow?'narrow':'full'}
        wallConfig={adjusted} badgeConfig={effectiveBadgeConfig} refreshToken={refreshToken}
        onPress={()=>onOpenHolding(item)}/>;
    };
    if(!maintenance||!engineer.enabled)return render();
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
    return <InspectableTarget key={target.id} target={target} frame={maintenance}>{appearance=>render(appearance)}</InspectableTarget>;
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
      const pages:Array<readonly HoldingQuote[]>=[];
      for(let i=0;i<rows.length;i+=2)pages.push(rows.slice(i,i+2));
      return <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}
        decelerationRate="fast" snapToInterval={pageWidth} contentContainerStyle={styles.horizontal}>
        {pages.map((page,index)=><View key={index} style={[styles.page,{width:pageWidth}]}>
          {page.map(item=><View key={item.symbol} style={styles.half}>{renderHolding(item,true)}</View>)}
        </View>)}
      </ScrollView>;
    }
    if(layoutMode==='grid2'||layoutMode==='grid3'){
      const widthStyle=layoutMode==='grid3'?styles.third:styles.half;
      return <View style={styles.grid}>
        {rows.map(item=><View key={item.symbol} style={widthStyle}>{renderHolding(item,true)}</View>)}
      </View>;
    }
    return <View style={styles.list}>{rows.map(item=><View key={item.symbol}>{renderHolding(item)}</View>)}</View>;
  })();
  return <View style={styles.collection}>
    {effectiveWallConfig.ticker?.enabled?<HoldingQuoteTicker rows={rows} config={effectiveWallConfig.ticker}/>:null}
    {content}
  </View>;
}

const styles=StyleSheet.create({
  collection:{gap:0},list:{gap:spacing.sm},
  grid:{flexDirection:'row',flexWrap:'wrap',gap:spacing.sm,alignItems:'stretch'},
  half:{width:'48.5%'},third:{width:'31.2%'},
  horizontal:{gap:spacing.sm,paddingRight:spacing.md},
  page:{flexDirection:'row',gap:spacing.sm,paddingRight:spacing.sm},
});
