import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  DEFAULT_HOLDING_WALL_CONFIG,
  type HoldingQuote,
  type HoldingWallConfig,
  type HoldingWallFieldConfig,
  type HoldingWallFieldKey,
  type QuoteModuleStyle,
} from '../domain/uiModels';
import { colors, radius, spacing } from '../theme/tokens';

const money=(value:number)=>Math.round(value).toLocaleString('zh-TW');
const pct=(value:number)=>`${value>=0?'+':''}${value.toFixed(2)}%`;

export function HoldingQuoteModule({
  item,
  style='quote',
  layout='full',
  wallConfig=DEFAULT_HOLDING_WALL_CONFIG,
  primaryField='price',
  onPress,
}:{
  item:HoldingQuote;
  style?:QuoteModuleStyle;
  layout?:'full'|'narrow';
  wallConfig?:HoldingWallConfig;
  primaryField?:'price'|'marketValue'|'pnl'|'roi';
  onPress?:()=>void;
}){
  const change=item.price-item.previousClose;
  const changePct=item.previousClose>0?(change/item.previousClose)*100:0;
  const compact=style==='compact';
  const narrow=layout==='narrow';
  const showChart=style==='chart'||style==='advanced';
  const cfg=wallConfig;
  const cardStyle=cfg.style;
  const headerFields=cfg.fields.filter(field=>field.enabled&&(field.field==='name'||field.field==='symbol'));
  const regularQuoteFields=cfg.fields.filter(field=>field.enabled&&(field.field==='price'||field.field==='change'||field.field==='changePercent'));
  const footerFields=cfg.fields.filter(field=>field.enabled&&(field.field==='pnl'||field.field==='roi'||field.field==='marketValue'));
  const requestedPrimary=cfg.fields.find(field=>field.enabled&&field.field===primaryField);
  const quoteFields=requestedPrimary
    ?[requestedPrimary,...regularQuoteFields.filter(field=>field.field!==requestedPrimary.field)]
    :regularQuoteFields;
  const groups={
    header:headerFields,
    quote:quoteFields,
    footer:footerFields.filter(field=>field.field!==requestedPrimary?.field),
  };

  return <Pressable onPress={onPress} style={[
    styles.card,
    compact&&styles.compact,
    narrow&&styles.narrowCard,
    {backgroundColor:cardStyle.backgroundColor,borderColor:cardStyle.borderColor,borderWidth:cardStyle.borderWidth,borderRadius:cardStyle.cornerRadius},
  ]}>
    {showChart?<Sparkline values={item.sparkline} positive={change>=0} narrow={narrow} gainColor={cardStyle.gainColor} lossColor={cardStyle.lossColor}/>:null}
    <View style={[styles.body,{padding:cardStyle.padding,gap:cardStyle.rowGap}]}>
      {cfg.header.visible&&groups.header.length?<View style={[
        styles.head,
        {backgroundColor:cfg.header.backgroundColor,borderBottomColor:cfg.header.borderColor,borderBottomWidth:cfg.header.borderWidth},
      ]}>
        <View style={styles.nameWrap}>
          {groups.header.map((field,index)=><WallText
            key={field.field}
            field={field}
            item={item}
            change={change}
            changePct={changePct}
            wall={cfg}
            header
            narrow={narrow}
            primary={index===0}
          />)}
        </View>
        <Text style={[styles.chevron,{color:cardStyle.secondaryTextColor}]}>›</Text>
      </View>:null}

      {groups.quote.length?<View style={styles.quoteRow}>
        <View style={{flex:1}}>
          <WallText field={groups.quote[0]!} item={item} change={change} changePct={changePct} wall={cfg} quotePrimary narrow={narrow}/>
        </View>
        {groups.quote.length>1?<View style={styles.changeWrap}>
          {groups.quote.slice(1).map(field=><WallText key={field.field} field={field} item={item} change={change} changePct={changePct} wall={cfg} narrow={narrow}/>)}
        </View>:null}
      </View>:null}

      {!compact&&groups.footer.length?<View style={[styles.footer,{borderTopColor:cardStyle.borderColor}]}>
        <View style={{flex:1}}>
          <WallMetric field={groups.footer[0]!} item={item} change={change} changePct={changePct} wall={cfg}/>
        </View>
        {groups.footer.length>1?<View style={styles.rightMetric}>
          {groups.footer.slice(1).map(field=><WallMetric key={field.field} field={field} item={item} change={change} changePct={changePct} wall={cfg} right/>)}
        </View>:null}
      </View>:null}
    </View>
  </Pressable>;
}

function WallText({
  field,item,change,changePct,wall,header=false,quotePrimary=false,narrow=false,primary=false,
}:{
  field:HoldingWallFieldConfig;
  item:HoldingQuote;
  change:number;
  changePct:number;
  wall:HoldingWallConfig;
  header?:boolean;
  quotePrimary?:boolean;
  narrow?:boolean;
  primary?:boolean;
}){
  const tone=fieldColor(field,item,change,wall);
  const value=fieldValue(field.field,item,change,changePct);
  const fontSize=header
    ?(primary?(narrow?12:15):11)*field.fontScale*wall.header.fontScale
    :(quotePrimary?(narrow?21:29):11)*field.fontScale;
  return <Text
    numberOfLines={1}
    style={{
      color:header&&!field.useProfitColor?wall.header.textColor:tone,
      fontSize,
      fontWeight:quotePrimary||primary?'900':'800',
      textAlign:field.align,
      marginTop:header&&!primary?2:0,
      fontVariant:['tabular-nums'],
    }}
  >{value}</Text>;
}

function WallMetric({
  field,item,change,changePct,wall,right=false,
}:{
  field:HoldingWallFieldConfig;
  item:HoldingQuote;
  change:number;
  changePct:number;
  wall:HoldingWallConfig;
  right?:boolean;
}){
  return <View style={right?styles.rightMetric:undefined}>
    <Text style={[styles.footerLabel,{color:wall.style.secondaryTextColor,textAlign:field.align}]}>{field.label}</Text>
    <Text style={{
      color:fieldColor(field,item,change,wall),
      fontSize:12*field.fontScale,
      fontWeight:'900',
      marginTop:2,
      textAlign:field.align,
      fontVariant:['tabular-nums'],
    }}>{fieldValue(field.field,item,change,changePct)}</Text>
  </View>;
}

function fieldColor(field:HoldingWallFieldConfig,item:HoldingQuote,change:number,wall:HoldingWallConfig){
  if(!field.useProfitColor)return field.field==='symbol'?wall.style.secondaryTextColor:wall.style.textColor;
  const value=field.field==='pnl'||field.field==='roi'?item.pnl:change;
  return value>0?wall.style.gainColor:value<0?wall.style.lossColor:wall.style.secondaryTextColor;
}

function fieldValue(field:HoldingWallFieldKey,item:HoldingQuote,change:number,changePct:number){
  if(field==='name')return item.name;
  if(field==='symbol')return `${item.symbol}${item.pinned?'  • PIN':''}`;
  if(field==='price')return item.price.toFixed(2);
  if(field==='change')return `${change>=0?'▲':'▼'} ${change>=0?'+':''}${change.toFixed(2)}`;
  if(field==='changePercent')return pct(changePct);
  if(field==='pnl')return `NT$ ${money(item.pnl)}`;
  if(field==='roi')return pct(item.roi);
  return `NT$ ${money(item.marketValue)}`;
}

function Sparkline({values,positive,narrow=false,gainColor,lossColor}:{values:number[];positive:boolean;narrow?:boolean;gainColor:string;lossColor:string}){
  const max=Math.max(...values),min=Math.min(...values),range=Math.max(0.001,max-min);
  return <View style={[styles.spark,narrow&&styles.narrowSpark]}>
    {values.map((value,index)=>{
      const height=12+((value-min)/range)*44;
      return <View key={index} style={[styles.sparkBar,{height,backgroundColor:positive?gainColor:lossColor}]} />;
    })}
  </View>;
}

const styles=StyleSheet.create({
  card:{flexDirection:'row',backgroundColor:'#0C121B',borderRadius:radius.lg,overflow:'hidden',minHeight:132,borderWidth:1,borderColor:'#263343'},
  compact:{minHeight:86},
  spark:{width:104,padding:spacing.md,flexDirection:'row',alignItems:'flex-end',gap:3,backgroundColor:'#090E15'},
  sparkBar:{flex:1,borderRadius:3,opacity:0.9},
  body:{flex:1,padding:spacing.md,gap:8},
  head:{flexDirection:'row',alignItems:'flex-start'},
  nameWrap:{flex:1},
  chevron:{fontSize:25,color:'#8292A8',lineHeight:26},
  quoteRow:{flexDirection:'row',alignItems:'flex-end',justifyContent:'space-between',gap:spacing.sm},
  changeWrap:{alignItems:'flex-end'},
  footer:{borderTopWidth:StyleSheet.hairlineWidth,borderTopColor:'#2C394A',paddingTop:8,flexDirection:'row',alignItems:'flex-end',justifyContent:'space-between',gap:8},
  footerLabel:{fontSize:10,color:'#91A0B5'},
  rightMetric:{alignItems:'flex-end'},
  narrowCard:{flexDirection:'column',minHeight:150},
  narrowSpark:{width:'100%',height:54,paddingHorizontal:10,paddingVertical:8},
});
