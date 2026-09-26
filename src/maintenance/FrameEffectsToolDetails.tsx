import {useEffect,useState} from 'react';
import {Image,Pressable,Switch,Text,TextInput,View} from 'react-native';
import {ColorPalettePicker} from '../components/ColorPalettePicker';
import {THEME_BACKGROUNDS} from '../theme/ThemeRuntime';
import {nativeRuntimeAvailable,pickNativeThemeBackground} from '../native/TfAssetNativeBridge';
import {DEFAULT_FRAME_EFFECTS,normalizeFrameEffects,type FrameEffects} from './frameEffects';
import {useMaintenance} from './MaintenanceRuntime';
import {useThemeRuntime} from '../theme/ThemeRuntime';

const options:Partial<Record<keyof FrameEffects,readonly (readonly [string,string])[]>>={
  backgroundMode:[['solid','純色'],['gradient','多段漸層'],['image','背景圖片']],
  imageSource:[['builtIn','10 張內建圖'],['custom','自訂圖片']],
  imageFit:[['cover','填滿裁切'],['contain','適合完整顯示'],['stretch','拉伸']],
  gradientDirection:[['vertical','上下漸層'],['horizontal','左右漸層']],
  borderStyle:[['solid','實線'],['dashed','虛線'],['dotted','點線']],
};
const limits:Partial<Record<keyof FrameEffects,readonly [number,number,number]>>={
  borderTop:[-1,8,1],borderRight:[-1,8,1],borderBottom:[-1,8,1],borderLeft:[-1,8,1],
  cornerTopLeft:[-1,48,1],cornerTopRight:[-1,48,1],
  cornerBottomRight:[-1,48,1],cornerBottomLeft:[-1,48,1],
  shadowBlur:[0,48,1],shadowOffsetX:[-24,24,1],shadowOffsetY:[-24,24,1],
  glowOpacity:[0,.8,.05],glowWidth:[0,16,1],glowPeriodMs:[800,4000,100],
  outerGlowOpacity:[0,.8,.05],outerGlowSpread:[0,32,1],outerGlowSoftness:[0,48,1],
  paddingTop:[-1,32,1],paddingRight:[-1,32,1],paddingBottom:[-1,32,1],paddingLeft:[-1,32,1],
  contentGap:[-1,40,1],marginVertical:[0,32,1],maxWidth:[0,1600,10],
  gradientMidStop:[.1,.9,.05],imageOpacity:[0,1,.05],maskOpacity:[0,1,.05],
};
const colorProfitFlag:Partial<Record<keyof FrameEffects,
  'gradientEndProfitColor'|'gradientMidProfitColor'|'maskProfitColor'|'shadowProfitColor'|'glowProfitColor'|'outerGlowProfitColor'>>={
  gradientEndColor:'gradientEndProfitColor',gradientMidColor:'gradientMidProfitColor',
  maskColor:'maskProfitColor',shadowColor:'shadowProfitColor',glowColor:'glowProfitColor',
  outerGlowColor:'outerGlowProfitColor',
};
function FrameImagePicker({currentUri,onPicked}:{currentUri:string|null;onPicked:(uri:string)=>void}){
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');
  const pick=async()=>{
    if(busy||!nativeRuntimeAvailable)return;
    setBusy(true);setMessage('');
    try{
      const uri=await pickNativeThemeBackground();
      if(uri)onPicked(uri);
    }catch{setMessage('圖片選取失敗。請重試，原有設定未變更。');}
    finally{setBusy(false);}
  };
  return <View style={{gap:8,marginTop:10}}>
    {currentUri?<View style={{flexDirection:'row',alignItems:'center',gap:10}}>
      <Image source={{uri:currentUri}} resizeMode="cover"
        style={{width:72,height:72,borderRadius:8,backgroundColor:'#E2E8F0'}}/>
      <Text style={{flex:1,color:'#64748B',fontSize:12}}>已選取自訂圖片。Android 會保留相簿／檔案讀取授權；正式儲存前仍可取消。</Text>
    </View>:<Text style={{fontSize:12,color:'#64748B'}}>尚未選取自訂圖片。可先使用 10 張內建背景。</Text>}
    <Pressable accessibilityRole="button" disabled={!nativeRuntimeAvailable||busy}
      accessibilityLabel="Android 選取自訂框架背景" onPress={()=>void pick()}
      style={{padding:12,alignItems:'center',backgroundColor:'#EDE9FE',borderRadius:8,opacity:nativeRuntimeAvailable?1:0.45}}>
      <Text style={{fontWeight:'700',color:'#5B21B6'}}>{busy?'正在開啟選檔器…':'選取手機圖片'}</Text>
    </Pressable>
    {!nativeRuntimeAvailable?<Text style={{color:'#64748B',fontSize:11}}>自訂圖片選擇器需要 Android 原生環境。</Text>:null}
    {message?<Text style={{color:'#B91C1C'}}>{message}</Text>:null}
  </View>;
}
function NumericDetail({value,onChange,min,max,step}:{
  value:number;onChange:(next:number)=>void;min:number;max:number;step:number;
}){
  const [typed,setTyped]=useState(String(value));
  useEffect(()=>setTyped(String(value)),[value]);
  const commit=()=>{
    const n=Number(typed);
    if(typed.trim()===''||!Number.isFinite(n)){setTyped(String(value));return;}
    onChange(Math.max(min,Math.min(max,n)));
  };
  const stepBy=(direction:-1|1)=>{
    if(min===-1&&direction===1&&value===-1){onChange(0);return;}
    if(min===-1&&direction===-1&&value===0){onChange(-1);return;}
    onChange(Math.max(min,Math.min(max,Number((value+direction*step).toFixed(3)))));
  };
  return <View style={{gap:7,marginTop:9}}>
    <View style={{flexDirection:'row',alignItems:'center',gap:10}}>
      <Pressable accessibilityRole="button" accessibilityLabel="減少" onPress={()=>stepBy(-1)}
        style={{width:44,height:40,alignItems:'center',justifyContent:'center',borderRadius:8,backgroundColor:'#EDE9FE'}}>
        <Text style={{fontSize:22,color:'#6D28D9'}}>−</Text>
      </Pressable>
      <TextInput accessibilityLabel="手動輸入精確參數" keyboardType="numbers-and-punctuation"
        value={typed} selectTextOnFocus onChangeText={setTyped} onEndEditing={commit}
        style={{borderWidth:1,borderColor:'#BAA8DA',borderRadius:8,
          minWidth:80,padding:7,flex:1,textAlign:'center',fontSize:15,color:'#231942'}}/>
      <Pressable accessibilityRole="button" accessibilityLabel="增加" onPress={()=>stepBy(1)}
        style={{width:44,height:40,alignItems:'center',justifyContent:'center',borderRadius:8,backgroundColor:'#EDE9FE'}}>
        <Text style={{fontSize:22,color:'#6D28D9'}}>＋</Text>
      </Pressable>
    </View>
    <Text style={{fontSize:11,color:'#64748B'}}>範圍 {min} ～ {max}；長按數值可直接輸入，離開欄位套用至上方預覽。</Text>
    {min===-1?<Pressable accessibilityRole="button" accessibilityLabel="沿用原有設定"
      onPress={()=>onChange(-1)}><Text style={{color:'#6D28D9',fontWeight:'700'}}>−1：沿用外層框架設定</Text></Pressable>:null}
  </View>;
}
/** D panel operates ONLY on the current frame's in-memory draft. */
export function FrameEffectsToolDetails({field}:{field:string}){
  const maintenance=useMaintenance();
  const theme=useThemeRuntime();
  const session=maintenance.session;
  if(!session||session.scope!=='frame')return <Text style={{color:theme.palette.textSecondary}}>請從外層框架右上角的扳手開啟框架工程。</Text>;
  if(!(field in DEFAULT_FRAME_EFFECTS))return <Text>此細節尚未接線。</Text>;
  const key=field as keyof FrameEffects;
  const fx=normalizeFrameEffects(session.draft.effects);
  const current=fx[key];
  const change=(next:unknown)=>maintenance.patchFrame({effects:normalizeFrameEffects({...fx,[key]:next,
    ...(key==='gradientDirection'?{gradientAngle:null}:{})})});
  if(key==='outerGlowEnabled')return <View style={{gap:8,marginTop:9}}>
    <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center'}}>
      <Text style={{color:theme.palette.text,fontWeight:'700'}}>C｜外側柔光暈（獨立於內緣光圈）</Text>
      <Switch accessibilityLabel="外側柔光暈開關" value={fx.outerGlowEnabled} onValueChange={change}/>
    </View>
    {fx.outerGlowEnabled?<>
      <ColorPalettePicker label="外側光暈顏色" value={fx.outerGlowColor}
        onChange={color=>maintenance.patchFrame({effects:normalizeFrameEffects({...fx,outerGlowColor:color})})}
        profitColorEnabled={fx.outerGlowProfitColor}
        onProfitColorChange={enabled=>maintenance.patchFrame({effects:normalizeFrameEffects({...fx,outerGlowProfitColor:enabled})})}/>
      {([['outerGlowOpacity','透明度（獨立）',0,.8,.05],
          ['outerGlowSpread','向外擴散',0,32,1],
          ['outerGlowSoftness','柔邊範圍',0,48,1]] as const).map(([name,label,min,max,step])=><View key={name}>
        <Text style={{color:theme.palette.text,fontSize:12,fontWeight:'700'}}>{label}：{name==='outerGlowOpacity'?Math.round(fx[name]*100)+'%':fx[name]+' dp'}</Text>
        <NumericDetail value={fx[name]} onChange={value=>maintenance.patchFrame({effects:normalizeFrameEffects({...fx,[name]:value})})}
          min={min} max={max} step={step}/>
      </View>)}
    </>:null}
  </View>;
  if(key==='gradientAngle')return <View style={{gap:8,marginTop:9}}>
    <Text style={{color:theme.palette.text,fontWeight:'700'}}>任意角度：{fx.gradientAngle===null?'沿用水平／垂直':fx.gradientAngle+'°'}</Text>
    <NumericDetail value={fx.gradientAngle??(fx.gradientDirection==='vertical'?90:0)}
      onChange={change} min={0} max={359} step={1}/>
    <Pressable accessibilityRole="button" accessibilityLabel="恢復水平或垂直漸層"
      onPress={()=>change(null)}><Text style={{color:theme.palette.primary,fontWeight:'700'}}>恢復水平／垂直方向</Text></Pressable>
  </View>;
  if(key==='imageIndex')return <View style={{marginTop:9,flexDirection:'row',flexWrap:'wrap',gap:8}}>
    {THEME_BACKGROUNDS.map((uri,index)=><Pressable accessibilityRole="button" key={index}
      accessibilityLabel={'選用框架內建背景 '+(index+1)}
      onPress={()=>maintenance.patchFrame({effects:normalizeFrameEffects({
        ...fx,backgroundMode:'image',imageSource:'builtIn',imageIndex:index,
      })})}
      style={{borderWidth:fx.imageSource==='builtIn'&&fx.imageIndex===index?3:1,
        borderColor:fx.imageSource==='builtIn'&&fx.imageIndex===index?theme.palette.primary:theme.palette.border,
        borderRadius:8,padding:3}}>
      <Image source={{uri}} style={{width:54,height:54,borderRadius:5}} resizeMode="cover"/>
      <Text style={{fontSize:11,textAlign:'center',color:theme.palette.text}}>{index+1}</Text>
    </Pressable>)}
  </View>;
  if(key==='imageUri')return <FrameImagePicker currentUri={fx.imageUri} onPicked={uri=>
    maintenance.patchFrame({effects:normalizeFrameEffects({
      ...fx,backgroundMode:'image',imageSource:'custom',imageUri:uri,
    })})}/>;

  if(typeof current==='boolean')return <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginTop:9}}>
    <Text style={{color:theme.palette.text,fontWeight:'600'}}>{current?'開啟':'關閉'}</Text>
    <Switch value={current} onValueChange={change}/>
  </View>;
  const variants=options[key];
  if(variants)return <View style={{flexDirection:'row',flexWrap:'wrap',gap:8,marginTop:9}}>
    {variants.map(([value,label])=><Pressable key={value} accessibilityRole="button"
      accessibilityLabel={label} onPress={()=>change(value)} style={{borderWidth:1,borderRadius:8,
        borderColor:theme.palette.primary,padding:9,backgroundColor:current===value?theme.palette.primary:theme.palette.surface}}>
      <Text style={{color:current===value?'#FFFFFF':theme.palette.text}}>{label}</Text>
    </Pressable>)}
  </View>;
  if(typeof current==='string'){
    const profitFlag=colorProfitFlag[key];
    return <ColorPalettePicker label={field} value={current} onChange={change}
      {...(profitFlag?{profitColorEnabled:Boolean(fx[profitFlag]),
        onProfitColorChange:(checked:boolean)=>maintenance.patchFrame({effects:normalizeFrameEffects({
          ...fx,[profitFlag]:checked,
        })})}:{})}/>;
  }
  const range=limits[key];
  if(typeof current==='number'&&range){
    return <NumericDetail value={current} onChange={change}
      min={range[0]} max={range[1]} step={range[2]}/>;
  }
  return <Text style={{color:theme.palette.textSecondary}}>此項目尚未介接。</Text>;
}
