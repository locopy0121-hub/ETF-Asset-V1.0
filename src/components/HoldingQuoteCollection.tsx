import { FlatList, StyleSheet, useWindowDimensions, View } from 'react-native';

import { DEFAULT_HOLDING_WALL_CONFIG, type HoldingQuote, type HoldingWallConfig, type QuoteModuleStyle } from '../domain/uiModels';
import { spacing } from '../theme/tokens';
import { HoldingQuoteModule } from './HoldingQuoteModule';

export type HoldingLayoutMode='list'|'grid2'|'grid3'|'horizontal'|'paged2';
export type HoldingColumnCount=1|2|3;
export type HoldingScrollMode='none'|'horizontal';
export type HoldingPrimaryField='price'|'marketValue'|'pnl'|'roi';

const legacyLayout=(mode:HoldingLayoutMode):Readonly<{columns:HoldingColumnCount;scroll:HoldingScrollMode}>=>{
  if(mode==='grid2')return {columns:2,scroll:'none'};
  if(mode==='grid3')return {columns:3,scroll:'none'};
  if(mode==='horizontal')return {columns:1,scroll:'horizontal'};
  if(mode==='paged2')return {columns:2,scroll:'horizontal'};
  return {columns:1,scroll:'none'};
};

export function HoldingQuoteCollection({
  rows,
  style,
  layoutMode='list',
  columns,
  scrollMode,
  primaryField='price',
  onOpenHolding,
  wallConfig,
}:{
  rows:readonly HoldingQuote[];
  style:QuoteModuleStyle;
  layoutMode?:HoldingLayoutMode;
  columns?:HoldingColumnCount;
  scrollMode?:HoldingScrollMode;
  primaryField?:HoldingPrimaryField;
  onOpenHolding:(row:HoldingQuote)=>void;
  wallConfig?:HoldingWallConfig;
}){
  const {width}=useWindowDimensions();
  const pageWidth=Math.max(280,width-64);
  const legacy=legacyLayout(layoutMode);
  const requestedColumns=columns??legacy.columns;
  const effectiveColumns:HoldingColumnCount=style==='chart'?1:requestedColumns;
  const effectiveScroll=scrollMode??legacy.scroll;
  const effectiveWallConfig=wallConfig??DEFAULT_HOLDING_WALL_CONFIG;
  const renderCard=(item:HoldingQuote,narrow:boolean)=><HoldingQuoteModule
    item={item}
    style={style}
    layout={narrow?'narrow':'full'}
    wallConfig={effectiveWallConfig}
    primaryField={primaryField}
    onPress={()=>onOpenHolding(item)}
  />;

  if(effectiveScroll==='horizontal'){
    const pages:Array<readonly HoldingQuote[]>=[];
    for(let i=0;i<rows.length;i+=effectiveColumns)pages.push(rows.slice(i,i+effectiveColumns));
    return <FlatList
      horizontal
      data={pages}
      keyExtractor={(page,index)=>page.map(item=>item.symbol).join('|')||String(index)}
      showsHorizontalScrollIndicator={false}
      decelerationRate="fast"
      snapToInterval={pageWidth}
      snapToAlignment="start"
      initialNumToRender={4}
      maxToRenderPerBatch={4}
      windowSize={5}
      contentContainerStyle={styles.horizontal}
      renderItem={({item:page})=><View style={[styles.page,{width:pageWidth}]}>
        {page.map(item=><View key={item.symbol} style={styles.pageItem}>{renderCard(item,effectiveColumns>1)}</View>)}
      </View>}
    />;
  }

  const tall=rows.length>12;
  return <FlatList
    key={'holding-columns-'+effectiveColumns}
    data={[...rows]}
    keyExtractor={item=>item.symbol}
    numColumns={effectiveColumns}
    nestedScrollEnabled
    scrollEnabled={tall}
    removeClippedSubviews={tall}
    initialNumToRender={Math.min(12,Math.max(effectiveColumns*3,6))}
    maxToRenderPerBatch={12}
    updateCellsBatchingPeriod={40}
    windowSize={7}
    style={tall?styles.virtualized:undefined}
    contentContainerStyle={styles.list}
    {...(effectiveColumns>1?{columnWrapperStyle:styles.row}: {})}
    renderItem={({item})=><View style={styles.gridItem}>{renderCard(item,effectiveColumns>1)}</View>}
  />;
}

const styles=StyleSheet.create({
  list:{gap:spacing.sm},
  row:{gap:spacing.sm},
  gridItem:{flex:1,minWidth:0,marginBottom:spacing.sm},
  horizontal:{gap:spacing.sm,paddingRight:spacing.md},
  page:{flexDirection:'row',gap:spacing.sm,paddingRight:spacing.sm},
  pageItem:{flex:1,minWidth:0},
  virtualized:{maxHeight:620},
});
