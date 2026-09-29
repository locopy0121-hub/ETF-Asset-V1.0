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
import {MiniHoldingChart} from './MiniHoldingChart';
import { radius, spacing } from '../theme/tokens';
import {useSettingsRuntime, type DisplayPrefs} from '../settings/SettingsRuntime';
import {linkedColor} from '../maintenance/workspaceModel';

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
  onOpenChart,
  layoutEditMode=false,
  layoutSelectionId=null,
  onLayoutSelect,
}:{
  item:HoldingQuote;
  style?:QuoteModuleStyle;
  layout?:'full'|'narrow'|'micro';
  wallConfig?:HoldingWallConfig;
  badgeConfig?:EtfBadgeConfig;
  refreshToken?:string|number|null|undefined;
  onPress?:()=>void;
  onOpenChart?:()=>void;
  layoutEditMode?:boolean;
  layoutSelectionId?:string|null;
  onLayoutSelect?:((id:string,label:string)=>void)|undefined;
}){
  const settings=useSettingsRuntime();
  const showQuoteMetadata=settings.prefs.marketCard.showQuoteMetadata;
  const systemColors=settings.prefs.display;
  const change=item.price-item.previousClose;
  const changePct=item.previousClose>0?(change/item.previousClose)*100:0;
  const compact=style==='compact';
  const micro=layout==='micro';
  const narrow=layout!=='full';
  // Three-column cards always show a readable quote, never a crushed graph.
  const showChart=!micro&&(style==='chart'||style==='advanced');
  const miniOpen=onOpenChart??onPress;
  const cfg=wallConfig;
  const cardStyle=cfg.style;
  const cardTone=item.previousClose>0?(change>0?'gain':change<0?'loss':'neutral'):'neutral';
  const cardBackground=linkedColor(cardStyle.backgroundColor,cardStyle.backgroundProfitColor,cardTone,systemColors);
  const cardBorder=linkedColor(cardStyle.borderColor,cardStyle.borderProfitColor,cardTone,systemColors);
  const cardSecondary=linkedColor(cardStyle.secondaryTextColor,cardStyle.secondaryTextProfitColor,cardTone,systemColors);
  const groups={
    header:cfg.fields.filter(field=>field.enabled&&(field.field==='name'||field.field==='symbol')),
    quote:cfg.fields.filter(field=>field.enabled&&(field.field==='price'||field.field==='change'||field.field==='changePercent')),
    footer:cfg.fields.filter(field=>field.enabled&&(field.field==='pnl'||field.field==='roi'||field.field==='marketValue')),
  };

  return <View style={[
    styles.card,
    compact&&!micro&&styles.compact,
    narrow&&styles.narrowCard,
    micro&&styles.microCard,
    {backgroundColor:cardBackground,borderColor:cardBorder,borderWidth:cardStyle.borderWidth,borderRadius:cardStyle.cornerRadius},
  ]}>
    {layoutEditMode&&layoutSelectionId==='card'?<View pointerEvents="none" style={[StyleSheet.absoluteFill,styles.layoutSelected]}/>:null}
    <Pressable onPress={layoutEditMode?(event)=>{event.stopPropagation();onLayoutSelect?.('card','行情卡片');}:onPress} accessibilityRole="button" accessibilityLabel={layoutEditMode?'選取行情卡片':'查看持股 '+item.symbol} style={styles.bodyPress}>
    <View style={[styles.body,{padding:micro?Math.min(8,cardStyle.padding):cardStyle.padding,
      gap:micro?Math.min(5,cardStyle.rowGap):cardStyle.rowGap}]}>
      {cfg.header.visible&&(groups.header.length>0||badgeConfig.order.some(key=>badgeConfig.badges[key].enabled))?<EffectView effect={cfg.header.effect} numeric={changePct} refreshToken={refreshToken}>
        <View style={[
          styles.head,
          micro&&styles.microHead,
          {backgroundColor:cfg.header.backgroundColor,borderBottomColor:cfg.header.borderColor,borderBottomWidth:cfg.header.borderWidth},
        ]}>
          <View style={styles.headerMain}>
            <View style={[styles.headerTop,micro&&styles.microHeaderTop]}>
              <View style={[styles.headerSymbol,micro&&styles.microSymbol]}>
                {groups.header.filter(field=>field.field==='symbol').map(field=><WallText
                  key={field.field} field={field} item={item} change={change} changePct={changePct}
                  wall={cfg} refreshToken={refreshToken} header narrow={narrow} primary
                  layoutEditMode={layoutEditMode} layoutSelectionId={layoutSelectionId} onLayoutSelect={onLayoutSelect}
                />)}
                {item.pinned?<Text accessibilityLabel="已釘選" style={styles.pinMarker}>★</Text>:null}
              </View>
              <EtfBadgeRow etfType={item.etfType} dividendType={item.dividendType}
                reminder={item.reminderEvent} config={badgeConfig} narrow={narrow} refreshToken={refreshToken}/>
            </View>
            {groups.header.filter(field=>field.field==='name').map(field=><WallText
              key={field.field} field={field} item={item} change={change} changePct={changePct}
              wall={cfg} refreshToken={refreshToken} header narrow={narrow}
              layoutEditMode={layoutEditMode} layoutSelectionId={layoutSelectionId} onLayoutSelect={onLayoutSelect}
            />)}
          </View>
          {!narrow?<Text style={[styles.chevron,{color:cardSecondary}]}>›</Text>:null}
        </View>
      </EffectView>:null}

      {(!micro&&showQuoteMetadata||item.quoteVerified===false)?<Text style={{fontSize:10,color:item.quoteVerified===false?'#F59E0B':'#94A3B8'}}>
        {item.quoteVerified===false?'行情待取得｜估值待核對':
          (item.quoteQuality==='official_close'?'官方收盤參考':'實際成交')+'｜'+
          (item.quoteSourceAt?new Date(item.quoteSourceAt).toLocaleString('zh-TW',{timeZone:'Asia/Taipei'}):'來源待核對')+
          '｜資料版本 '+(item.marketDataVersion??0)}
      </Text>:null}
      {groups.quote.length?<View style={[styles.quoteRow,micro&&styles.microQuoteRow]}>
        <View style={micro?{minWidth:0}:{flex:1,minWidth:0}}>
          <WallText field={groups.quote[0]!} item={item} change={change} changePct={changePct} wall={cfg} refreshToken={refreshToken} quotePrimary narrow={narrow}
            layoutEditMode={layoutEditMode} layoutSelectionId={layoutSelectionId} onLayoutSelect={onLayoutSelect}/>
        </View>
        {groups.quote.length>1?<View style={[styles.changeWrap,micro&&styles.microChangeWrap]}>
          {groups.quote.slice(1).map(field=><WallText key={field.field} field={field} item={item} change={change} changePct={changePct} wall={cfg} refreshToken={refreshToken} narrow={narrow}
            layoutEditMode={layoutEditMode} layoutSelectionId={layoutSelectionId} onLayoutSelect={onLayoutSelect}/>)}
        </View>:null}
      </View>:null}

      {micro?<View style={[styles.footer,styles.microFooter,{borderTopColor:cardBorder}]}>
        <Text style={styles.microPnlLabel}>損益</Text>
        <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.65}
          style={[styles.microPnlValue,{color:linkedColor(cardStyle.textColor,true,item.pnl>0?'gain':item.pnl<0?'loss':'neutral',systemColors)}]}>
          {item.quoteVerified===false?'待取得':'NT$ '+money(item.pnl)}
        </Text>
      </View>:!compact&&groups.footer.length?<View style={[styles.footer,{borderTopColor:cardBorder}]}>
        <View style={{flex:1}}>
          <WallMetric field={groups.footer[0]!} item={item} change={change} changePct={changePct} wall={cfg} refreshToken={refreshToken}
            layoutEditMode={layoutEditMode} layoutSelectionId={layoutSelectionId} onLayoutSelect={onLayoutSelect}/>
        </View>
        {groups.footer.length>1?<View style={styles.rightMetric}>
          {groups.footer.slice(1).map(field=><WallMetric key={field.field} field={field} item={item} change={change} changePct={changePct} wall={cfg} refreshToken={refreshToken} right
            layoutEditMode={layoutEditMode} layoutSelectionId={layoutSelectionId} onLayoutSelect={onLayoutSelect}/>)}
        </View>:null}
      </View>:null}
    </View>
    </Pressable>
    {showChart&&item.quoteVerified!==false?<View style={styles.miniChartWrap}>
      {layoutEditMode?
        <Pressable onPress={event=>{event.stopPropagation();onLayoutSelect?.('chart','Mini 圖表');}} style={layoutSelectionId==='chart'?styles.layoutSelected:undefined}>
          <MiniHoldingChart holding={item} narrow={narrow} gainColor={cardStyle.gainColor} lossColor={cardStyle.lossColor}/>
        </Pressable>:
        <MiniHoldingChart holding={item} narrow={narrow} gainColor={cardStyle.gainColor} lossColor={cardStyle.lossColor} {...(miniOpen?{onOpen:miniOpen}:{})}/>}
    </View>:null}
  </View>;
}

function WallText({
  field,item,change,changePct,wall,refreshToken,header=false,quotePrimary=false,narrow=false,primary=false,
  layoutEditMode=false,layoutSelectionId=null,onLayoutSelect,
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
  layoutEditMode?:boolean;
  layoutSelectionId?:string|null;
  onLayoutSelect?:((id:string,label:string)=>void)|undefined;
}){
  const numeric=fieldNumeric(field.field,item,change,changePct);
  const systemColors=useSettingsRuntime().prefs.display;
  const liveBackground=resolveWallBackground(field,item,change,systemColors);
  const tone=fieldColor(field,item,change,wall,systemColors);
  const value=fieldValue(field.field,item,change,changePct);
  const fontSize=header
    ?(primary?(narrow?12:15):11)*field.fontScale*wall.header.fontScale
    :(quotePrimary?(narrow?20:29):11)*field.fontScale;
  const rendered=<EffectText
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
  if(!layoutEditMode)return rendered;
  const id='field:'+field.field;
  return <Pressable onPress={event=>{event.stopPropagation();onLayoutSelect?.(id,field.label);}} style={layoutSelectionId===id?styles.layoutSelected:undefined}>{rendered}</Pressable>;
}

function WallMetric({
  field,item,change,changePct,wall,refreshToken,right=false,
  layoutEditMode=false,layoutSelectionId=null,onLayoutSelect,
}:{
  field:HoldingWallFieldConfig;
  item:HoldingQuote;
  change:number;
  changePct:number;
  wall:HoldingWallConfig;
  refreshToken?:string|number|null|undefined;
  right?:boolean;
  layoutEditMode?:boolean;
  layoutSelectionId?:string|null;
  onLayoutSelect?:((id:string,label:string)=>void)|undefined;
}){
  const numeric=fieldNumeric(field.field,item,change,changePct);
  const systemColors=useSettingsRuntime().prefs.display;
  const liveBackground=resolveWallBackground(field,item,change,systemColors);
  const rendered=<View style={[right?styles.rightMetric:undefined,{backgroundColor:liveBackground??'transparent',paddingVertical:field.paddingY,marginTop:field.lineGap??0}]}>
    <Text style={[styles.footerLabel,{color:field.useProfitBackground&&liveBackground?'#FFFFFF':
      linkedColor(field.textColor??wall.style.secondaryTextColor,wall.style.secondaryTextProfitColor,
        item.pnl>0?'gain':item.pnl<0?'loss':'neutral',systemColors),textAlign:field.align}]}>{field.label}</Text>
    <EffectText
      text={fieldValue(field.field,item,change,changePct)}
      effect={field.effect}
      numeric={numeric}
      refreshToken={refreshToken}
      style={{
        color:field.useProfitBackground&&liveBackground&&field.useProfitColor?'#FFFFFF':fieldColor(field,item,change,wall,systemColors),
        fontSize:12*field.fontScale,
        fontWeight:'900',
        marginTop:2,
        textAlign:field.align,
        fontVariant:['tabular-nums'],
      }}
    />
  </View>;
  if(!layoutEditMode)return rendered;
  const id='field:'+field.field;
  return <Pressable onPress={event=>{event.stopPropagation();onLayoutSelect?.(id,field.label);}} style={layoutSelectionId===id?styles.layoutSelected:undefined}>{rendered}</Pressable>;
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

function fieldColor(field:HoldingWallFieldConfig,item:HoldingQuote,change:number,wall:HoldingWallConfig,system:DisplayPrefs){
  const value=field.field==='pnl'||field.field==='roi'?item.pnl:field.field==='marketValue'?item.marketValue:change;
  const tone=value>0?'gain':value<0?'loss':'neutral';
  const base=field.textColor??(field.field==='symbol'?wall.style.secondaryTextColor:wall.style.textColor);
  if(field.useProfitColor)return linkedColor(base,true,tone,system);
  const linked=field.field==='symbol'?wall.style.secondaryTextProfitColor:wall.style.textProfitColor;
  return linkedColor(base,linked,tone,system);
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
  if(item.quoteVerified===false&&['price','change','changePercent','pnl','roi','marketValue'].includes(field))return '待取得';
  if(item.previousCloseKnown===false&&['change','changePercent'].includes(field))return '前收待取得';
  if(field==='name')return item.name;
  if(field==='symbol')return item.symbol;
  if(field==='etfType')return item.etfType?.trim().replace(/型$/u,'')||'類別待確認';
  if(field==='dividendType')return item.dividendType?.trim()||'配息待確認';
  if(field==='price')return item.price.toFixed(2);
  if(field==='change')return `${change>=0?'▲':'▼'} ${change>=0?'+':''}${change.toFixed(2)}`;
  if(field==='changePercent')return pct(changePct);
  if(field==='pnl')return `NT$ ${money(item.pnl)}`;
  if(field==='roi')return pct(item.roi);
  return `NT$ ${money(item.marketValue)}`;
}

const styles=StyleSheet.create({
  card:{flexDirection:'row',backgroundColor:'#0C121B',borderRadius:radius.lg,overflow:'hidden',minHeight:132,borderWidth:1,borderColor:'#263343'},
  compact:{minHeight:86},
  bodyPress:{flex:1},
  miniChartWrap:{paddingHorizontal:8,paddingBottom:6},
  body:{flex:1,padding:spacing.md,gap:8},
  head:{flexDirection:'row',alignItems:'flex-start',paddingBottom:5},
  headerMain:{flex:1,minWidth:0,gap:3},
  headerTop:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:3,minWidth:0},
  headerSymbol:{flexDirection:'row',alignItems:'center',gap:2,flexShrink:0,maxWidth:'41%'},
  pinMarker:{fontSize:9,fontWeight:'900',color:'#FBBF24'},
  chevron:{fontSize:25,color:'#8292A8',lineHeight:26},
  quoteRow:{flexDirection:'row',alignItems:'flex-end',justifyContent:'space-between',gap:spacing.sm,paddingTop:5},
  changeWrap:{alignItems:'flex-end'},
  footer:{borderTopWidth:StyleSheet.hairlineWidth,borderTopColor:'#2C394A',paddingTop:8,flexDirection:'row',alignItems:'flex-end',justifyContent:'space-between',gap:8},
  footerLabel:{fontSize:10,color:'#91A0B5'},
  rightMetric:{alignItems:'flex-end'},
  narrowCard:{flexDirection:'column',minHeight:168},
  microCard:{minHeight:155,minWidth:0,width:'100%'},
  microHead:{paddingBottom:3},
  microHeaderTop:{flexDirection:'column',alignItems:'flex-start',gap:2},
  microSymbol:{maxWidth:'100%'},
  microQuoteRow:{flexDirection:'column',alignItems:'stretch',gap:2,paddingTop:3},
  microChangeWrap:{alignItems:'flex-start'},
  microFooter:{paddingTop:4,flexDirection:'column',alignItems:'flex-start',gap:2},
  microPnlLabel:{fontSize:9,color:'#91A0B5'},
  microPnlValue:{fontSize:12,fontWeight:'900',maxWidth:'100%'},
  layoutSelected:{borderWidth:2,borderStyle:'dashed',borderColor:'#0B6CFF',borderRadius:8},
});
