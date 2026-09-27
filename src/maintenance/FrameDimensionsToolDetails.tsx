import {useEffect,useState} from 'react';
import {Pressable,Text,TextInput,View} from 'react-native';
import {useMaintenance} from './MaintenanceRuntime';
import {useThemeRuntime} from '../theme/ThemeRuntime';

const dimensions={width:{min:160,max:1600},height:{min:80,max:2400}} as const;
/** Parent-frame dimensions are independent of the editing canvas and child dimensions. */
export function FrameDimensionsToolDetails({axis}:{axis?:'width'|'height'}={}){
  const maint=useMaintenance(),theme=useThemeRuntime(),session=maint.session;
  const width=session?.draft.width,height=session?.draft.height;
  const [typed,setTyped]=useState({width:'',height:''});
  const [error,setError]=useState('');
  useEffect(()=>setTyped({width:width===undefined?'':String(width),height:height===undefined?'':String(height)}),[width,height,session?.page,session?.frameKey]);
  if(!session||session.scope!=='frame')return <Text>請先選取真正的父框架。</Text>;
  const setDimension=(axis:'width'|'height',value:number|undefined)=>{
    if(value===undefined){setError('');maint.clearFrameDimension(axis);return;}
    if(!Number.isFinite(value)||value<dimensions[axis].min||value>dimensions[axis].max){
      setError((axis==='width'?'寬度':'高度')+'超出有效範圍');return;
    }
    setError('');
    maint.patchFrame(axis==='height'?
      {height:value,...(session.draft.minHeight!==undefined&&session.draft.minHeight>value?{minHeight:value}:{})}:
      {width:value});
  };
  const numeric=(axis:'width'|'height')=>{
    const current=session.draft[axis],limits=dimensions[axis];
    return <View style={{gap:7,marginTop:10}} key={axis}>
      <Text style={{fontWeight:'800',color:theme.palette.text}}>{axis==='width'?'父框架實際寬度 W':'父框架實際高度 H'}（{limits.min}–{limits.max} dp）</Text>
      <Text style={{color:theme.palette.textSecondary,fontSize:12}}>{current===undefined?'自適應':current+' dp'}</Text>
      <View style={{flexDirection:'row',alignItems:'center',gap:6}}>
        {([-1,1] as const).map(delta=><Pressable accessibilityRole="button" accessibilityLabel={(axis==='width'?'寬度':'高度')+(delta<0?'減少':'增加')+' 1 dp'} key={delta}
          onPress={()=>setDimension(axis,Math.max(limits.min,Math.min(limits.max,(current??(axis==='width'?320:240))+delta)))}
          style={{borderWidth:1,borderColor:theme.palette.primary,borderRadius:8,minHeight:44,minWidth:42,alignItems:'center',justifyContent:'center'}}>
          <Text style={{color:theme.palette.primary,fontWeight:'900'}}>{delta<0?'−1':'+1'}</Text>
        </Pressable>).slice(0,1)}
        <TextInput value={typed[axis]} onChangeText={v=>setTyped(prev=>({...prev,[axis]:v}))} keyboardType="numeric"
          placeholder="自適應" placeholderTextColor={theme.palette.textSecondary} selectTextOnFocus
          accessibilityLabel={'輸入父框架'+(axis==='width'?'寬度':'高度')}
          style={{flex:1,borderWidth:1,borderRadius:8,borderColor:theme.palette.border,minHeight:44,paddingHorizontal:12,color:theme.palette.text}}/>
        <Pressable accessibilityRole="button" accessibilityLabel={'增加'+axis+' 1 dp'}
          onPress={()=>setDimension(axis,Math.max(limits.min,Math.min(limits.max,(current??(axis==='width'?320:240))+1)))}
          style={{borderWidth:1,borderColor:theme.palette.primary,borderRadius:8,minHeight:44,minWidth:42,alignItems:'center',justifyContent:'center'}}>
          <Text style={{color:theme.palette.primary,fontWeight:'900'}}>+1</Text>
        </Pressable>
      </View>
      <View style={{flexDirection:'row',gap:8}}>
        <Pressable accessibilityRole="button" onPress={()=>{
          const input=typed[axis].trim();if(!input){setDimension(axis,undefined);return;}
          const n=Number(input);setDimension(axis,n);
        }} style={{backgroundColor:theme.palette.primary,borderRadius:8,padding:10,flex:1,alignItems:'center'}}>
          <Text style={{color:'#FFFFFF',fontWeight:'800'}}>預覽此尺寸</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={()=>setDimension(axis,undefined)}
          style={{borderColor:theme.palette.border,borderWidth:1,borderRadius:8,padding:10,alignItems:'center'}}>
          <Text style={{color:theme.palette.text}}>恢復自適應</Text>
        </Pressable>
      </View>
    </View>;
  };
  return <View style={{marginTop:8,gap:7}}>
    <Text style={{color:theme.palette.textSecondary,fontSize:12}}>此處調整真正的父框架，而不是虛線畫布。指定高度只改父框架邊界，子元件維持尺寸與原位，不會擅自啟用內部捲動。內容超界時請使用工作區診斷調整。</Text>
    {(!axis||axis==='width')&&numeric('width')}{(!axis||axis==='height')&&numeric('height')}
    {!!error&&<Text style={{color:theme.palette.loss}}>{error}</Text>}
    <Text style={{color:theme.palette.textSecondary,fontSize:11}}>畫面上的變化為暫存預覽；取消還原，按工作台「儲存／套用」才持久化。</Text>
  </View>;
}
