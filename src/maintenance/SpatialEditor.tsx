import {useEffect,useState} from 'react';
import {Pressable,Switch,Text,TextInput,View} from 'react-native';
import {useThemeRuntime} from '../theme/ThemeRuntime';
import {useMaintenance} from './MaintenanceRuntime';
import {displayPoint,enteredOffset,positionWarnings,positionedRect,type SnapMode,type WorkspaceConfig} from './workspaceModel';

const positive=(value:string,min:number,max:number)=>value.trim()===''?0:
  Number.isFinite(Number(value))&&Number(value)>=min&&Number(value)<=max?Number(value):null;
export function SpatialToolDetails({field}:{field:string}){
  const m=useMaintenance();
  const theme=useThemeRuntime();
  const s=m.session;
  const [widthInput,setWidthInput]=useState('');
  const [heightInput,setHeightInput]=useState('');
  const [xInput,setXInput]=useState('');
  const [yInput,setYInput]=useState('');
  const [error,setError]=useState('');
  const cfg=s?.draftWorkspace;
  const target=s?.scope==='target'?s.target:undefined;
  const g=target?.geometry;
  const style=g&&target?m.getTargetOverride(target.page,target.frameKey,target.id):{};
  const rect=g?positionedRect(g,style):null;
  const pointX=g&&rect&&cfg?displayPoint(rect.x,'x',g,cfg.origin):0;
  const pointY=g&&rect&&cfg?displayPoint(rect.y,'y',g,cfg.origin):0;
  const frameBounds=s?m.getWorkspaceBounds(s.page,s.frameKey):{width:0,height:0};
  useEffect(()=>{setWidthInput(cfg?.width?String(cfg.width):'');setHeightInput(cfg?.height?String(cfg.height):'');},
    [cfg?.width,cfg?.height]);
  useEffect(()=>{setXInput(String(Math.round(pointX*100)/100));setYInput(String(Math.round(pointY*100)/100));},
    [target?.id,pointX,pointY,cfg?.origin]);
  if(!s||!cfg)return null;
  const color=theme.palette.text,accent=theme.palette.primary,secondary=theme.palette.textSecondary;
  const lab=(label:string)=><Text style={{color,fontSize:12,fontWeight:'800',marginTop:8}}>{label}</Text>;
  const button=(label:string,action:()=>void,chosen=false)=><Pressable accessibilityRole="button"
    accessibilityLabel={label} key={label} onPress={action} style={{minHeight:44,minWidth:48,
      backgroundColor:chosen?accent:theme.palette.surface,borderColor:accent,borderWidth:1,
      borderRadius:8,paddingHorizontal:10,alignItems:'center',justifyContent:'center'}}>
    <Text style={{color:chosen?'#FFFFFF':accent,fontWeight:'800',fontSize:13}}>{label}</Text>
  </Pressable>;
  const numeric=(value:string,onChange:(v:string)=>void,hint:string)=><TextInput
    accessibilityLabel={hint} value={value} onChangeText={onChange}
    keyboardType="numeric" placeholder={hint} placeholderTextColor={secondary}
    style={{borderWidth:1,borderColor:theme.palette.border,borderRadius:8,minHeight:44,
      paddingHorizontal:12,color,fontSize:15,flexGrow:1,minWidth:85}}/>;
  const workspacePatch=(patch:Partial<WorkspaceConfig>)=>m.patchWorkspace(patch);
  if(field==='workspace:size')return <View style={{gap:8,marginTop:8}}>
    <Text style={{color:secondary,fontSize:12}}>實測工作區：{frameBounds.width} × {frameBounds.height} dp；空白為自適應，超寬工作區可水平捲動。</Text>
    {lab('工作區寬度 W（240–2400 dp）')}
    {numeric(widthInput,setWidthInput,'自適應寬度')}
    {lab('工作區高度 H（240–2400 dp）')}
    {numeric(heightInput,setHeightInput,'自適應高度')}
    {button('套用工作區尺寸',()=>{
      const width=positive(widthInput,240,2400),height=positive(heightInput,240,2400);
      if(width===null||height===null){setError('尺寸須為 240–2400 dp，或留空使用自適應。');return;}
      setError('');workspacePatch({width,height});
    })}
    <Text style={{color:secondary,fontSize:11}}>改變工作區尺寸不會自行重寫帳務，也不會強迫原有元件改排列。</Text>
    {error?<Text style={{color:theme.palette.loss}}>{error}</Text>:null}
  </View>;
  if(field==='workspace:guides')return <View style={{gap:12,marginTop:8}}>
    {(['showAxes','showGrid'] as const).map(k=><View key={k} style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center'}}>
      <Text style={{color}}>{k==='showAxes'?'顯示 XY 中心軸':'顯示輔助網格'}</Text>
      <Switch value={cfg[k]} onValueChange={value=>workspacePatch({[k]:value})}/>
    </View>)}
    {lab('座標原點')}
    <View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>
      {button('左上角 (0,0)',()=>workspacePatch({origin:'top-left'}),cfg.origin==='top-left')}
      {button('工作區中心 (0,0)',()=>workspacePatch({origin:'center'}),cfg.origin==='center')}
    </View>
    <Text style={{color:secondary}}>網格間距：{cfg.gridSize} dp</Text>
    <View style={{flexDirection:'row',gap:8}}>
      {button('−1 dp',()=>workspacePatch({gridSize:Math.max(2,cfg.gridSize-1)}))}
      {button('＋1 dp',()=>workspacePatch({gridSize:Math.min(80,cfg.gridSize+1)}))}
    </View>
    <Text style={{color:secondary,fontSize:11}}>基準線和網格只顯示定位參考，不會更動任何元件。</Text>
  </View>;
  if(field==='workspace:snapping')return <View style={{gap:9,marginTop:8}}>
    <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center'}}>
      <Text style={{color,fontWeight:'800'}}>智慧吸附（Mobile 預設關）</Text>
      <Switch value={cfg.snapEnabled} onValueChange={value=>workspacePatch({snapEnabled:value})}/>
    </View>
    <Text style={{color:secondary,fontSize:12}}>只對拖曳放手生效。XY ±1 dp 與手動輸入不使用吸附。</Text>
    <View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>
      {([['center','XY 中心線'],['grid','網格'],['edges','工作區邊界'],['siblings','兄弟元件']] as const)
        .map(([id,name])=>button(name,()=>workspacePatch({snapModes:cfg.snapModes.includes(id)?
          cfg.snapModes.filter(x=>x!==id):[...cfg.snapModes,id]}),cfg.snapModes.includes(id)))}
    </View>
    <Text style={{color:secondary}}>吸附感應距離：{cfg.snapThreshold} dp</Text>
    <View style={{flexDirection:'row',gap:8}}>
      {button('−1 dp',()=>workspacePatch({snapThreshold:Math.max(1,cfg.snapThreshold-1)}))}
      {button('＋1 dp',()=>workspacePatch({snapThreshold:Math.min(20,cfg.snapThreshold+1)}))}
    </View>
  </View>;
  if(field==='workspace:diagnostics'){
    const boxes=m.getFrameRects(s.page,s.frameKey);
    const conflicts=Object.entries(boxes).filter(([id,rect])=>id!==target?.id&&target?.geometry&&
      rect.x<(pointX+Number(g?.width??0))&&rect.x+rect.width>pointX);
    if(!target||!g||!rect)return <Text style={{color:secondary,marginTop:8}}>先選取一個真實元件，即可診斷其位置及邊界。</Text>;
    const warning=positionWarnings(rect,g,Object.entries(boxes).filter(([id])=>id!==target.id).map(([,box])=>box));
    return <View style={{gap:7,marginTop:8}}>
      <Text style={{color}}>實測工作區 {g.spaceWidth} × {g.spaceHeight} dp</Text>
      <Text style={{color}}>當前元件 X {rect.x} / Y {rect.y}，W {rect.width} / H {rect.height}</Text>
      <Text style={{color:warning.overflow?theme.palette.loss:theme.palette.gain}}>{warning.overflow?'⚠ 元件超出目前工作區':'✓ 未超出目前工作區'}</Text>
      <Text style={{color:warning.overlaps?theme.palette.loss:theme.palette.gain}}>{warning.overlaps?'⚠ 與 '+warning.overlaps+' 個已量測元件重疊':'✓ 與其他已量測元件無重疊'}</Text>
      <Text style={{color:secondary,fontSize:11}}>只對當前已安裝並回報實測位置的元件檢測，不強制改動使用者的位置。</Text>
    </View>;
  }
  if(!target||!g||!rect)return <Text style={{color:secondary,marginTop:8}}>請先點選畫面上的真實元件，等待讀取其座標，再進入此工具。</Text>;
  const current=style;
  const patch=(v:Record<string,unknown>)=>m.patchTarget(target.id,v);
  const move=(axis:'x'|'y',delta:number)=>patch({[axis==='x'?'offsetX':'offsetY']:
    (axis==='x'?(current.offsetX??0):(current.offsetY??0))+delta});
  const place=(x:number|null,y:number|null)=>{
    patch({...x!==null?{offsetX:enteredOffset(x,'x',g,current,cfg.origin)}:{},
      ...y!==null?{offsetY:enteredOffset(y,'y',g,current,cfg.origin)}:{}});
  };
  if(field==='target:xy')return <View style={{gap:9,marginTop:8}}>
    <Text style={{color:secondary,fontSize:12}}>目前實測座標（{cfg.origin==='center'?'中心原點':'左上原點'}）：X {pointX.toFixed(1)}，Y {pointY.toFixed(1)} dp</Text>
    {lab('X 座標')}
    <View style={{flexDirection:'row',alignItems:'center',gap:6}}>
      {button('X −1',()=>move('x',-1))}
      {numeric(xInput,setXInput,'輸入 X')}
      {button('X +1',()=>move('x',1))}
    </View>
    {lab('Y 座標')}
    <View style={{flexDirection:'row',alignItems:'center',gap:6}}>
      {button('Y −1',()=>move('y',-1))}
      {numeric(yInput,setYInput,'輸入 Y')}
      {button('Y +1',()=>move('y',1))}
    </View>
    {button('精確定位（套用輸入 X／Y）',()=>{
      const x=Number(xInput),y=Number(yInput);
      if(xInput.trim()===''||yInput.trim()===''||!Number.isFinite(x)||!Number.isFinite(y)||
        Math.abs(x)>5000||Math.abs(y)>5000){setError('請輸入有效的 X/Y 座標（−5000 至 5000 dp）。');return;}
      setError('');place(x,y);
    })}
    {lab('快捷對齊（不強制吸附）')}
    <View style={{flexDirection:'row',flexWrap:'wrap',gap:7}}>
      {button('靠左',()=>place(displayPoint(0,'x',g,cfg.origin),null))}
      {button('水平置中',()=>place(displayPoint((g.spaceWidth-rect.width)/2,'x',g,cfg.origin),null))}
      {button('靠右',()=>place(displayPoint(g.spaceWidth-rect.width,'x',g,cfg.origin),null))}
      {button('靠上',()=>place(null,displayPoint(0,'y',g,cfg.origin)))}
      {button('垂直置中',()=>place(null,displayPoint((g.spaceHeight-rect.height)/2,'y',g,cfg.origin)))}
      {button('靠下',()=>place(null,displayPoint(g.spaceHeight-rect.height,'y',g,cfg.origin)))}
    </View>
    {error?<Text style={{color:theme.palette.loss}}>{error}</Text>:null}
    <Text style={{color:secondary,fontSize:11}}>±1 一次僅移動 1 dp；手動輸入和快捷對齊不受吸附影響。取消本次編輯即可還原。</Text>
  </View>;
  if(field==='target:dimensions')return <View style={{gap:9,marginTop:8}}>
    <Text style={{color:secondary}}>實測尺寸：W {g.width} × H {g.height} dp</Text>
    {(['width','height'] as const).map(axis=><View key={axis} style={{gap:5}}>
      {lab(axis==='width'?'元件寬度 W':'元件高度 H')}
      <Text style={{color}}>目前：{current[axis]??g[axis]} dp</Text>
      <View style={{flexDirection:'row',gap:8}}>
        {button('−1',()=>patch({[axis]:Math.max(axis==='width'?28:24,(current[axis]??g[axis])-1)}))}
        {button('＋1',()=>patch({[axis]:Math.min(2400,(current[axis]??g[axis])+1)}))}
        {button('恢復自適應',()=>patch({[axis]:undefined}))}
      </View>
    </View>)}
    <Text style={{color:secondary,fontSize:11}}>長寬只改顯示容器；不足以顯示完整金額時，會由金額元件採用適寬字體處理。</Text>
  </View>;
  if(field==='target:anchors')return <View style={{gap:8,marginTop:8}}>
    <Text style={{color:secondary,fontSize:12}}>錨點以當前實測工作區作為基準。調整工作區寬高後，元件依錨點補償位置。</Text>
    {lab('X 軸錨點')}
    <View style={{flexDirection:'row',flexWrap:'wrap',gap:7}}>
      {(['free','left','center','right'] as const).map(axis=>button(
        ({free:'自由',left:'靠左',center:'中心',right:'靠右'} as const)[axis],
        ()=>patch({anchorX:axis,anchorBaseWidth:g.spaceWidth}),current.anchorX===axis))}
    </View>
    {lab('Y 軸錨點')}
    <View style={{flexDirection:'row',flexWrap:'wrap',gap:7}}>
      {(['free','top','center','bottom'] as const).map(axis=>button(
        ({free:'自由',top:'靠上',center:'中心',bottom:'靠下'} as const)[axis],
        ()=>patch({anchorY:axis,anchorBaseHeight:g.spaceHeight}),current.anchorY===axis))}
    </View>
  </View>;
  return null;
}
