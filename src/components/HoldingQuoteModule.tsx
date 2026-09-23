import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { type ReactNode, useEffect, useRef } from 'react';

import {
  DEFAULT_HOLDING_WALL_CONFIG,
  type HoldingQuote,
  type HoldingWallConfig,
  type HoldingWallFieldConfig,
  type HoldingWallFieldKey,
  type QuoteModuleStyle,
} from '../domain/uiModels';
import type { ItemEffectConfig } from '../domain/displayItemContract';
import {DEFAULT_ETF_BADGES,type EtfBadgeConfig} from '../domain/etfBadges';
import {EtfBadgeRow} from './EtfBadgeRow';
import { radius, spacing } from '../theme/tokens';
import {useSettingsRuntime, type DisplayPrefs} from '../settings/SettingsRuntime';

const money=(value:number)=>Math.round(value).toLocaleString('zh-TW');
const pct=(value:number)=>`${value>=0?'+':''}${value.toFixed(2)}%`;

export function HoldingQuoteModule({
  item,
  style='quote',
  layout='full',
  wallConfig=DEFAULT_HOLDING_WALL_CONFIG,
  badgeConfig=DEFAULT_ETF_BADGES,
  refreshToken,
  onPress,
}:{
  item:HoldingQuote;
  style?:QuoteModuleStyle;
  layout?:'full'|'narrow';
  wallConfig?:HoldingWallConfig;
  badgeConfig?:EtfBadgeConfig;
  refreshToken?:string|number|null|undefined;
  onPress?:()=>void;
}){
  const change=item.price-item.previousClose;
  const changePct=item.previousClose>0?(change/item.previousClose)*100:0;
  const compact=style==='compact';
  const narrow=layout==='narrow';
  const showChart=style==='chart'||style==='advanced';
  const cfg=wallConfig;
  const cardStyle=cfg.style;
  const groups={
    header:cfg.fields.filter(field=>field.enabled&&(field.field==='name'||field.field==='symbol')),
    quote:cfg.fields.filter(field=>field.enabled&&(field.field==='price'||field.field==='change'||field.field==='changePercent')),
    footer:cfg.fields.filter(field=>field.enabled&&(field.field==='pnl'||field.field==='roi'||field.field==='marketValue')),
  };

  return <Pressable onPress={onPress} style={[
    styles.card,
    compact&&styles.compact,
    narrow&&styles.narrowCard,
    {backgroundColor:cardStyle.backgroundColor,borderColor:cardStyle.borderColor,borderWidth:cardStyle.borderWidth,borderRadius:cardStyle.cornerRadius},
  ]}>
    {showChart?<Sparkline values={item.sparkline} positive={change>=0} narrow={narrow} gainColor={cardStyle.gainColor} lossColor={cardStyle.lossColor}/>:null}
    <View style={[styles.body,{padding:cardStyle.padding,gap:cardStyle.rowGap}]}>
      {cfg.header.visible&&groups.header.length?<EffectView effect={cfg.header.effect} numeric={changePct} refreshToken={refreshToken}>
        <View style={[
          styles.head,
          {backgroundColor:cfg.header.backgroundColor,borderBottomColor:cfg.header.borderColor,borderBottomWidth:cfg.header.borderWidth},
        ]}>
          <View style={styles.headerMain}>
            <View style={styles.headerTop}>
              <View style={styles.headerSymbol}>
                {groups.header.filter(field=>field.field==='symbol').map(field=><WallText
                  key={field.field} field={field} item={item} change={change} changePct={changePct}
                  wall={cfg} refreshToken={refreshToken} header narrow={narrow} primary
                />)}
              </View>
              <EtfBadgeRow etfType={item.etfType} dividendType={item.dividendType}
                reminder={item.reminderEvent} config={badgeConfig} narrow={narrow} refreshToken={refreshToken}/>
            </View>
            {groups.header.filter(field=>field.field==='name').map(field=><WallText
              key={field.field} field={field} item={item} change={change} changePct={changePct}
              wall={cfg} refreshToken={refreshToken} header narrow={narrow}
            />)}
          </View>
          {!narrow?<Text style={[styles.chevron,{color:cardStyle.secondaryTextColor}]}>›</Text>:null}
        </View>
      </EffectView>:null}

      {groups.quote.length?<View style={styles.quoteRow}>
        <View style={{flex:1,minWidth:0}}>
          <WallText field={groups.quote[0]! item={item} change={change} changePct={changePct} wall={cfg} refreshToken={refreshToken} quotePrimary narrow={narrow}/>
        </View>
        {groups.quote.length>1?<View style={styles.changeWrap}>
          {groups.quote.slice(1).map(field=><WallText key={field.field} field={field} item={item} change={change} changePct={changePct} wall={cfg} refreshToken={refreshToken} narrow={narrow}/>)}
        </View>:null}
      </View>:null}

      {!compact&&groups.footer.length?<View style={[styles.footer,{borderTopColor:cardStyle.borderColor}]}>
        <View style={{flex:1}}>
          <WallMetric field={groups.footer[0]!} item={item} change={change} changePct={changePct} wall={cfg} refreshToken={refreshToken}/>
        </View>
        {groups.footer.length>1?<View style={styles.rightMetric}>
          {groups.footer.slice(1).map(field=><WallMetric key={field.field} field={field} item={item} change={change} changePct={changePct} wall={cfg} refreshToken={refreshToken} right/>)}
        </View>:null}
      </View>:null}
    </View>
  </Pressable>;
}

function WallText({
  field,item,change,changePct,wall,refreshToken,header=false,quotePrimary=false,narrow=false,primary=false,
}:{
  field:HoldingWallFieldConfig;
  item:HoldingQuote;
  change:number;
  changePct:number;
  wall:HoldingWallConfig;
  refreshToken?:string|number|null|undefined;
  header?:boolean;
  quotePrimary?:boolean;
  narrow?:boolean;
  primary?:boolean;
}){
  const numeric=fieldNumeric(field.field,item,change,changePct);
  const systemColors=useSettingsRuntime().prefs.display;
  const liveBackground=resolveWallBackground(field,item,change,systemColors);
  const tone=fieldColor(field,item,change,wall);
  const value=fieldValue(field.field,item,change,changePct);
  const fontSize=header
    ?(primary?(narrow?12:15):11)*field.fontScale*wall.header.fontScale
    :(quotePrimary?(narrow?20:29):11)*field.fontScale;
  return <EffectText
    text={value}
    effect={field.effect}
    numeric={numeric}
    refreshToken={refreshToken}
    numberOfLines={1}
    inlineBackgroundColor={liveBackground}
    style={{
      color:liveBackground&&field.useProfitBackground&&field.useProfitColor?'#FFFFFF':header&&!field.useProfitColor?(field.textColor??wall.header.textColor):tone,
      fontSize,
      fontWeight:quotePrimary||primary?'900':'800',
      textAlign:header&&field.field==='symbol'?'left':field.align,
      marginTop:header&&!primary?(field.lineGap??2):(field.lineGap??0),
      paddingVertical:field.paddingY,
      fontVariant:['tabular-nums'],
    }}
  />;
}

function WallMetric({
  field,item,change,changePct,wall,refreshToken,right=false,
}:{
  field:HoldingWallFieldConfig;
  item:HoldingQuote;
  change:number;
  changePct:number;
  wall:HoldingWallConfig;
  refreshToken?:string|number|null|undefined;
  right?:boolean;
}){
  const numeric=fieldNumeric(field.field,item,change,changePct);
  const systemColors=useSettingsRuntime().prefs.display;
  const liveBackground=resolveWallBackground(field,item,change,systemColors);
  return <View style={[right?styles.rightMetric:undefined,{backgroundColor:liveBackground??'transparent',paddingVertical:field.paddingY,marginTop:field.lineGap??0}]}>
    <Text style={[styles.footerLabel,{color:field.useProfitBackground&&liveBackground?'#FFFFFF':(field.textColor??wall.style.secondaryTextColor),textAlign:field.align}]}>{field.label}</Text>
    <EffectText
      text={fieldValue(field.field,item,change,changePct)}
      effect={field.effect}
      numeric={numeric}
      refreshToken={refreshToken}
      style={{
        color:field.useProfitBackground&&liveBackground&&field.useProfitColor?'#FFFFFF':fieldColor(field,item,change,wall),
        fontSize:12*field.fontScale,
        fontWeight:'900',
        marginTop:2,
        textAlign:field.align,
        fontVariant:['tabular-nums'],
      }}
    />
  </View>;
}

function EffectText({text,effect,numeric,refreshToken,style,numberOfLines,inlineBackgroundColor}:{text:string;effect:ItemEffectConfig;numeric:number|null;refreshToken?:string|number|null|undefined;style:any;numberOfLines?:number;inlineBackgroundColor?:string|null}){
  const anim=useRef(new Animated.Value(1)).current;
  const translate=useRef(new Animated.Value(0)).current;
  const triggerToken=effect.trigger==='refresh'?refreshToken:numeric;
  useEffect(()=>{
    anim.stopAnimation();translate.stopAnimation();anim.setValue(1);translate.setValue(0);
    if(effect.kind==='none'||!effectActive(effect,numeric))return;
    const duration=effect.speed==='slow'?1200:effect.speed==='fast'?360:700;
    const low=effect.intensity==='soft'?.78:effect.intensity==='strong'?.24:.48;
    let runner:Animated.CompositeAnimation;
    if(effect.kind==='bounce'){
      const distance=effect.intensity==='soft'?-3:effect.intensity==='strong'?-10:-6;
      runner=Animated.sequence([
        Animated.timing(translate,{toValue:distance,duration:Math.round(duration/2),useNativeDriver:true}),
        Animated.timing(translate,{toValue:0,duration:Math.round(duration/2),useNativeDriver:true}),
      ]);
    }else if(effect.kind==='fade'){
      anim.setValue(low);
      runner=Animated.timing(anim,{toValue:1,duration,useNativeDriver:true});
    }else{
      runner=Animated.sequence([
        Animated.timing(anim,{toValue:low,duration:Math.round(duration/2),useNativeDriver:true}),
        Animated.timing(anim,{toValue:1,duration:Math.round(duration/2),useNativeDriver:true}),
      ]);
    }
    const actual=effect.trigger==='always'?Animated.loop(runner):runner;
    actual.start();
    return()=>actual.stop();
  },[anim,translate,effect.kind,effect.trigger,effect.speed,effect.intensity,triggerToken]);
  return <Animated.Text numberOfLines={numberOfLines} style={[style,{opacity:anim,transform:[{translateY:translate}]}]} >{inlineBackgroundColor?<Text style={{backgroundColor:inlineBackgroundColor}}>{text}</Text>:text}</Animated.Text>;
}

function EffectView({effect,numeric,refreshToken,children}:{effect:ItemEffectConfig;numeric:number|null;refreshToken?:string|number|null|undefined;children:ReactNode}){
  const anim=useRef(new Animated.Value(1)).current;
  const translate=useRef(new Animated.Value(0)).current;
  const triggerToken=effect.trigger==='refresh'?refreshToken:numeric;
  useEffect(()=>{
    anim.stopAnimation();translate.stopAnimation();anim.setValue(1);translate.setValue(0);
    if(effect.kind==='none'||!effectActive(effect,numeric))return;
    const duration=effect.speed==='slow'?1200:effect.speed==='fast'?360:700;
    const low=effect.intensity==='soft'?.82:effect.intensity==='strong'?.3:.55;
    let runner:Animated.CompositeAnimation;
    if(effect.kind==='bounce'){
      const distance=effect.intensity==='soft'?-3:effect.intensity==='strong'?-10:-6;
      runner=Animated.sequence([
        Animated.timing(translate,{toValue:distance,duration:Math.round(duration/2),useNativeDriver:true}),
        Animated.timing(translate,{toValue:0,duration:Math.round(duration/2),useNativeDriver:true}),
      ]);
    }else if(effect.kind==='fade'){
      anim.setValue(low);
      runner=Animated.timing(anim,{toValue:1,duration,useNativeDriver:true});
    }else{
      runner=Animated.sequence([
        Animated.timing(anim,{toValue:low,duration:Math.round(duration/2),useNativeDriver:true}),
        Animated.timing(anim,{toValue:1,duration:Math.round(duration/2),useNativeDriver:true}),
      ]);
    }
    const actual=effect.trigger==='always'?Animated.loop(runner):runner;
    actual.start();
    return()=>actual.stop();
  },[anim,translate,effect.kind,effect.trigger,effect.speed,effect.intensity,triggerToken]);
  return <Animated.View style={{opacity:anim,transform:[{translateY:translate}]}}>{children}</Animated.View>;
}
function effectActive(effect:ItemEffectConfig,numeric:number|null){
  if(effect.trigger==='gain')return numeric!=null&&numeric>0;
  if(effect.trigger==='loss')return numeric!=null&&numeric<0;
  if(effect.trigger==='alert')return false;
  return true;
}

function fieldColor(field:HoldingWallFieldConfig,item:HoldingQuote,change:number,wall:HoldingWallConfig){
  if(!field.useProfitColor)return field.textColor??(field.field==='symbol'?wall.style.secondaryTextColor:wall.style.textColor);
  const value=field.field==='pnl'||field.field==='roi'?item.pnl:field.field==='marketValue'?item.marketValue:change;
  return value>0?wall.style.gainColor:value<0?wall.style.lossColor:(field.textColor??wall.style.secondaryTextColor);
}
function resolveWallBackground(field:HoldingWallFieldConfig,item:HoldingQuote,change:number,system:DisplayPrefs):string|null{
  if(!field.useProfitBackground)return field.backgroundColor;
  const value=field.field==='pnl'||field.field==='roi'||field.field==='marketValue'?item.pnl:change;
  if(!Number.isFinite(value)||(field.field!=='pnl'&&field.field!=='roi'&&field.field!=='marketValue'&&!(item.previousClose>0)))return field.backgroundColor;
  return value>0?system.gainColor:value<0?system.lossColor:system.neutralColor;
}
function fieldNumeric(field:HoldingWallFieldKey,item:HoldingQuote,change:number,changePct:number){
  const value=field==='pnl'?item.pnl:field==='roi'?item.roi:field==='marketValue'?item.marketValue:field==='changePercent'?changePct:field==='change'?change:field==='price'?item.price:null;
  return typeof value==='number'&&Number.isFinite(value)?value:null;
}
function fieldValue(field:HoldingWallFieldKey,item:HoldingQuote,change:number,changePct:number){
  if(field==='name')return item.name;
  if(field==='symbol')return `${item.symbol}${item.pinned?'  • PIN':''}`;
  if(field==='etfType')return item.etfType?.trim()||'類型待確認';
  if(field==='dividendType')return item.dividendType?.trim()||'配息待確認';
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
  head:{flexDirection:'row',alignItems:'flex-start',paddingBottom:5},
  headerMain:{flex:1,minWidth:0,gap:3},
  headerTop:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:3,minWidth:0},
  headerSymbol:{flexShrink:0,maxWidth:'41%'},
  chevron:{fontSize:25,color:'#8292A8',lineHeight:26},
  quoteRow:{flexDirection:'row',alignItems:'flex-end',justifyContent:'space-between',gap:spacing.sm,paddingTop:5},
  changeWrap:{alignItems:'flex-end'},
  footer:{borderTopWidth:StyleSheet.hairlineWidth,borderTopColor:'#2C394A',paddingTop:8,flexDirection:'row',alignItems:'flex-end',justifyContent:'space-between',gap:8},
  footerLabel:{fontSize:10,color:'#91A0B5'},
  rightMetric:{alignItems:'flex-end'},
  narrowCard:{flexDirection:'column',minHeight:168},
  narrowSpark:{width:'100%',height:54,paddingHorizontal:10,paddingVertical:8},
});
