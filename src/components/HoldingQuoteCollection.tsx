import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

import type { HoldingQuote, QuoteModuleStyle } from '../domain/uiModels';
import { spacing } from '../theme/tokens';
import { HoldingQuoteModule } from './HoldingQuoteModule';

export type HoldingLayoutMode='list'|'grid2'|'grid3'|'horizontal'|'paged2';

export function HoldingQuoteCollection({
  rows,
  style,
  layoutMode='list',
  onOpenHolding,
}:{
  rows:readonly HoldingQuote[];
  style:QuoteModuleStyle;
  layoutMode?:HoldingLayoutMode;
  onOpenHolding:(row:HoldingQuote)=>void;
}){
  const {width}=useWindowDimensions();
  const pageWidth=Math.max(280,width-64);
  if(layoutMode==='horizontal'){
    const itemWidth=Math.max(230,Math.min(pageWidth-18,width*0.78));
    return <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      decelerationRate="fast"
      snapToInterval={itemWidth+spacing.sm}
      snapToAlignment="start"
      contentContainerStyle={styles.horizontal}
    >
      {rows.map(item=><View key={item.symbol} style={{width:itemWidth}}>
        <HoldingQuoteModule item={item} style={style} onPress={()=>onOpenHolding(item)}/>
      </View>)}
    </ScrollView>;
  }

  if(layoutMode==='paged2'){
    const pages:Array<readonly HoldingQuote[]>=[];
    for(let i=0;i<rows.length;i+=2)pages.push(rows.slice(i,i+2));
    return <ScrollView
      horizontal
      pagingEnabled
      showsHorizontalScrollIndicator={false}
      decelerationRate="fast"
      snapToInterval={pageWidth}
      contentContainerStyle={styles.horizontal}
    >
      {pages.map((page,index)=><View key={index} style={[styles.page,{width:pageWidth}]}>
        {page.map(item=><View key={item.symbol} style={styles.half}>
          <HoldingQuoteModule item={item} style={style} layout="narrow" onPress={()=>onOpenHolding(item)}/>
        </View>)}
      </View>)}
    </ScrollView>;
  }

  if(layoutMode==='grid2'||layoutMode==='grid3'){
    const widthStyle=layoutMode==='grid3'?styles.third:styles.half;
    return <View style={styles.grid}>
      {rows.map(item=><View key={item.symbol} style={widthStyle}>
        <HoldingQuoteModule item={item} style={style} layout="narrow" onPress={()=>onOpenHolding(item)}/>
      </View>)}
    </View>;
  }

  return <View style={styles.list}>
    {rows.map(item=><HoldingQuoteModule key={item.symbol} item={item} style={style} onPress={()=>onOpenHolding(item)}/>)}
  </View>;
}

const styles=StyleSheet.create({
  list:{gap:spacing.sm},
  grid:{flexDirection:'row',flexWrap:'wrap',gap:spacing.sm,alignItems:'stretch'},
  half:{width:'48.5%'},
  third:{width:'31.2%'},
  horizontal:{gap:spacing.sm,paddingRight:spacing.md},
  page:{flexDirection:'row',gap:spacing.sm,paddingRight:spacing.sm},
});
