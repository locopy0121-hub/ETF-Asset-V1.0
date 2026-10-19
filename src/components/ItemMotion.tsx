import {useEffect,useRef,useState,type ReactNode} from 'react';
import {AccessibilityInfo,Animated,AppState,Easing,PanResponder,Pressable,Text,View} from 'react-native';
import type {ItemEffectConfig,ItemEffectKind} from '../domain/displayItemContract';

// Animation-only changes: transformations never mutate the source quote, card size or layout.
const numericKinds:readonly ItemEffectKind[]=['number-roll','count-up','count-down','numeric-tween','flip-number','digit-slide','quote-flip'];
const interactiveKinds:readonly ItemEffectKind[]=['press-scale','long-press','drag-snap','toggle-slide','card-flip'];
const middle=(progress:Animated.Value,from:number,peak:number,to:number)=>progress.interpolate({inputRange:[0,.5,1],outputRange:[from,peak,to]});
const end=(progress:Animated.Value,from:number,to:number)=>progress.interpolate({inputRange:[0,1],outputRange:[from,to]});
const middleAngle=(progress:Animated.Value,from:string,peak:string,to:string)=>progress.interpolate({inputRange:[0,.5,1],outputRange:[from,peak,to]});
const endAngle=(progress:Animated.Value,from:string,to:string)=>progress.interpolate({inputRange:[0,1],outputRange:[from,to]});
const safeStrength=(effect:ItemEffectConfig)=>Math.max(0,Math.min(100,effect.strengthPercent??(effect.intensity==='soft'?25:effect.intensity==='strong'?80:50)))/100;
const duration=(effect:ItemEffectConfig)=>Math.max(100,Math.min(1200,effect.durationMs??(effect.speed==='slow'?1200:effect.speed==='fast'?360:700)));

function makeMotionStyle(kind:ItemEffectKind,p:Animated.Value,strength:number){
  const distance=5+strength*22;
  let opacity:Animated.AnimatedInterpolation<number>|number=1;
  let scale:Animated.AnimatedInterpolation<number>|number=1;
  let translateX:Animated.AnimatedInterpolation<number>|number=0;
  let translateY:Animated.AnimatedInterpolation<number>|number=0;
  let scaleX:Animated.AnimatedInterpolation<number>|number=1;
  if(kind==='trend-draw')scaleX=end(p,.01,1);
  let rotateY:Animated.AnimatedInterpolation<string>|string='0deg';
  let rotateZ:Animated.AnimatedInterpolation<string>|string='0deg';
  if(['fade','flash-on-change','change-flash','bg-pulse','pnl-glow','halo-pulse'].includes(kind))
    opacity=kind==='fade'?end(p,Math.max(.2,1-strength*.8),1):middle(p,1,1-strength*.55,1);
  if(['slide-in','slide-out','toggle-slide','shimmer','border-flow','gradient-flow'].includes(kind))
    translateX=kind==='slide-in'?end(p,-distance,0):kind==='slide-out'?middle(p,0,distance,0):middle(p,-distance*.45,distance*.45,0);
  if(['bounce','spring-in','number-roll','digit-slide','price-pop','volume-pulse'].includes(kind))
    translateY=kind==='spring-in'?end(p,distance,0):middle(p,0,-distance,0);
  if(['shake','sway'].includes(kind))
    translateX=middle(p,-distance/2,distance/2,0);
  if(['sway','elastic'].includes(kind))
    rotateZ=middleAngle(p,'0deg',`${Math.round(3+strength*9)}deg`,'0deg');
  if(['zoom-in','expand','spring-in'].includes(kind))
    scale=end(p,kind==='expand'?.55:.65,1);
  if(['pulse','breathe','elastic','halo-pulse','pnl-glow','ripple','sparkle','bg-pulse','press-scale','long-press','drag-snap','price-pop','volume-pulse','toggle-slide'].includes(kind))
    scale=middle(p,1,1+strength*(kind==='price-pop'?.18:.11),1);
  if(['shrink-out','collapse'].includes(kind))
    scale=middle(p,1,Math.max(.4,1-strength*.65),1);
  if(['flip-in','flip-out','flip-number','quote-flip','card-flip'].includes(kind))
    rotateY=kind==='flip-in'?endAngle(p,'-85deg','0deg'):middleAngle(p,'0deg','-85deg','0deg');
  return {opacity,transform:[{perspective:900},{translateX},{translateY},{scale},{scaleX},{rotateY},{rotateZ}]};
}

function shouldRun(effect:ItemEffectConfig,first:boolean,changed:boolean,numeric:number|null){
  if(effect.kind==='none')return false;
  if(effect.trigger==='press'||effect.trigger==='longPress'||effect.trigger==='alert')return false;
  if(effect.trigger==='always')return true;
  if(effect.trigger==='mount')return first;
  if(effect.trigger==='gain')return changed&&numeric!==null&&numeric>0;
  if(effect.trigger==='loss')return changed&&numeric!==null&&numeric<0;
  return changed;
}

function useMotion(effect:ItemEffectConfig,value:unknown,numeric:number|null,refreshToken?:string|number|null){
  const p=useRef(new Animated.Value(1)).current;
  const motionValue=effect.trigger==='refresh'?refreshToken:value;
  const previous=useRef(motionValue);
  const first=useRef(true);
  const running=useRef<Animated.CompositeAnimation|null>(null);
  const [reduceMotion,setReduceMotion]=useState(false);
  const [foreground,setForeground]=useState(AppState.currentState!=='background'&&AppState.currentState!=='inactive');
  useEffect(()=>{
    if(effect.kind==='none')return;
    let active=true;
    AccessibilityInfo.isReduceMotionEnabled().then(enabled=>{if(active)setReduceMotion(enabled);}).catch(()=>{});
    const listener=AccessibilityInfo.addEventListener('reduceMotionChanged',setReduceMotion);
    return()=>{active=false;listener.remove();};
  },[effect.kind]);
  useEffect(()=>{
    if(effect.kind==='none'||(!(effect.loop||effect.trigger==='always')))return;
    const listener=AppState.addEventListener('change',state=>setForeground(state==='active'));
    return()=>listener.remove();
  },[effect.kind,effect.loop,effect.trigger]);
  const strength=safeStrength(effect);
  const run=()=>{
    running.current?.stop();p.stopAnimation();p.setValue(0);
    const animation=Animated.timing(p,{toValue:1,duration:duration(effect),easing:Easing.out(Easing.cubic),useNativeDriver:true});
    running.current=(effect.loop||effect.trigger==='always')?Animated.loop(animation):animation;
    running.current.start();
  };
  useEffect(()=>{
    const isFirst=first.current;first.current=false;
    const changed=!Object.is(previous.current,motionValue);
    previous.current=motionValue;
    running.current?.stop();p.setValue(1);
    if(!reduceMotion&&foreground&&shouldRun(effect,isFirst,changed,numeric))run();
    return()=>{running.current?.stop();p.setValue(1);};
  // Compare primitive effect properties; changes to unrelated quote fields do not restart animations.
  },[p,motionValue,numeric,effect.kind,effect.trigger,effect.speed,effect.intensity,effect.durationMs,effect.strengthPercent,effect.loop,reduceMotion,foreground]);
  return {p,strength,run:()=>{if(!reduceMotion&&foreground)run();},reduceMotion};
}

function parseNumeric(text:string){
  const match=/[+-]?\d[\d,]*(?:\.\d+)?/.exec(text);
  if(!match)return null;
  const amount=Number(match[0].replace(/,/g,''));
  if(!Number.isFinite(amount))return null;
  return {amount,match:match[0],index:match.index,decimals:(match[0].split('.')[1]??'').length,comma:match[0].includes(',')};
}
function tweenText(template:string,parsed:NonNullable<ReturnType<typeof parseNumeric>>,amount:number){
  const formatted=parsed.comma?amount.toLocaleString('en-US',{minimumFractionDigits:parsed.decimals,maximumFractionDigits:parsed.decimals}):amount.toFixed(parsed.decimals);
  return template.slice(0,parsed.index)+formatted+template.slice(parsed.index+parsed.match.length);
}
function useNumberTransition(text:string,effect:ItemEffectConfig,enabled:boolean){
  const previous=useRef(text);
  const [displayed,setDisplayed]=useState(text);
  const value=useRef(new Animated.Value(0)).current;
  useEffect(()=>{
    const before=previous.current;
    previous.current=text;
    if(before===text||!enabled||!numericKinds.includes(effect.kind)){setDisplayed(text);return;}
    const oldNumber=parseNumeric(before),newNumber=parseNumeric(text);
    if(!oldNumber||!newNumber){setDisplayed(text);return;}
    const start=oldNumber.amount,endValue=newNumber.amount;
    const direction=effect.kind==='count-up'?endValue>=start:effect.kind==='count-down'?endValue<=start:true;
    if(!direction){setDisplayed(text);return;}
    let last=0;value.stopAnimation();value.setValue(0);
    setDisplayed(tweenText(text,newNumber,start));
    const subscription=value.addListener(({value:ratio})=>{
      const now=Date.now();if(ratio<1&&now-last<48)return;last=now;
      setDisplayed(tweenText(text,newNumber,start+(endValue-start)*ratio));
    });
    const runner=Animated.timing(value,{toValue:1,duration:duration(effect),useNativeDriver:false});
    runner.start(({finished})=>{if(finished)setDisplayed(text);});
    return()=>{runner.stop();value.removeListener(subscription);};
  },[text,effect.kind,effect.durationMs,effect.speed,enabled,value]);
  return displayed;
}

function Decoration({effect,progress,strength,color}:{effect:ItemEffectConfig;progress:Animated.Value;strength:number;color:string}){
  const kind=effect.kind;
  if(!['halo-pulse','pnl-glow','border-flow','gradient-flow','shimmer','sparkle','ripple','bg-pulse','change-flash','flash-on-change'].includes(kind))return null;
  const opacity=middle(progress,0,.2+strength*.5,0);
  if(kind==='shimmer'||kind==='gradient-flow')
    return <Animated.View pointerEvents="none" style={{position:'absolute',top:0,bottom:0,left:0,width:25,backgroundColor:color,opacity,transform:[{translateX:end(progress,-40,170)},{skewX:'-18deg'}]}}/>;
  if(kind==='ripple')
    return <Animated.View pointerEvents="none" style={{position:'absolute',alignSelf:'center',top:0,width:30,height:30,borderRadius:25,borderWidth:2,borderColor:color,opacity,transform:[{scale:end(progress,.3,2.3)}]}}/>;
  if(kind==='sparkle')
    return <Animated.View pointerEvents="none" style={{position:'absolute',top:2,right:8,width:7,height:7,borderRadius:5,backgroundColor:color,opacity,transform:[{translateY:middle(progress,8,-6,0)},{scale:middle(progress,.3,1.6,.3)}]}}/>;
  return <Animated.View pointerEvents="none" style={{position:'absolute',top:0,bottom:0,left:0,right:0,borderRadius:7,opacity,
    ...(kind==='halo-pulse'||kind==='pnl-glow'||kind==='border-flow'?{borderWidth:kind==='border-flow'?2:1,borderColor:color}:{backgroundColor:color})}}/>;
}

export function ItemMotionText({text,effect,numeric,style,numberOfLines,color,refreshToken,inlineBackgroundColor}:{text:string;effect:ItemEffectConfig;numeric:number|null;style:any;numberOfLines?:number;color?:string;refreshToken?:string|number|null;inlineBackgroundColor?:string|null}){
  const {p,strength,run,reduceMotion}=useMotion(effect,text,numeric,refreshToken);
  const displayed=useNumberTransition(text,effect,!reduceMotion&&effect.kind!=='none');
  const [drag]=useState(()=>new Animated.ValueXY());
  const pan=useRef<ReturnType<typeof PanResponder.create>|null>(null);
  if(effect.kind==='drag-snap'&&!pan.current)pan.current=PanResponder.create({
    onMoveShouldSetPanResponder:(_,gesture)=>Math.abs(gesture.dx)>8||Math.abs(gesture.dy)>8,
    onPanResponderMove:Animated.event([null,{dx:drag.x,dy:drag.y}],{useNativeDriver:false}),
    onPanResponderRelease:()=>Animated.spring(drag,{toValue:{x:0,y:0},useNativeDriver:false}).start(),
    onPanResponderTerminate:()=>Animated.spring(drag,{toValue:{x:0,y:0},useNativeDriver:false}).start(),
  });
  const interactive=interactiveKinds.includes(effect.kind)||effect.trigger==='press'||effect.trigger==='longPress';
  const needsDecoration=['halo-pulse','pnl-glow','border-flow','gradient-flow','shimmer','sparkle','ripple','bg-pulse','change-flash','flash-on-change'].includes(effect.kind);
  const label=<Animated.Text numberOfLines={numberOfLines} style={[style,makeMotionStyle(effect.kind,p,strength)]}>{inlineBackgroundColor?<Text style={{backgroundColor:inlineBackgroundColor}}>{displayed}</Text>:displayed}</Animated.Text>;
  // Preserve exact Text layout for legacy fields and non-decorative effects.
  if(!interactive&&!needsDecoration)return label;
  const props=effect.kind==='drag-snap'?(pan.current?.panHandlers??{}):{};
  const body=<Animated.View {...props} style={[effect.kind==='drag-snap'&&{transform:drag.getTranslateTransform()}]}>
    <Decoration effect={effect} progress={p} strength={strength} color={color??(numeric!==null&&numeric<0?'#10B981':'#EF5B64')}/>
    {label}
  </Animated.View>;
  if(interactive)return <Pressable onPressIn={effect.trigger==='longPress'?undefined:run} onLongPress={run} delayLongPress={380}>{body}</Pressable>;
  return body;
}

export function ItemMotionView({effect,value,numeric,children,color,refreshToken}:{effect:ItemEffectConfig;value:unknown;numeric:number|null;children:ReactNode;color?:string;refreshToken?:string|number|null}){
  const {p,strength,run}=useMotion(effect,value,numeric,refreshToken);
  if(effect.kind==='none')return <>{children}</>;
  const body=<Animated.View style={makeMotionStyle(effect.kind,p,strength)}>
    <Decoration effect={effect} progress={p} strength={strength} color={color??(numeric!==null&&numeric<0?'#10B981':'#EF5B64')}/>
    {children}
  </Animated.View>;
  if(interactiveKinds.includes(effect.kind)||effect.trigger==='press'||effect.trigger==='longPress')
    return <Pressable onPressIn={run} onLongPress={run}>{body}</Pressable>;
  return body;
}
