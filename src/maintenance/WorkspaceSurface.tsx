import {createContext,type PropsWithChildren,useCallback,useContext,useMemo,useRef,useState} from 'react';
import {ScrollView,StyleSheet,View,type LayoutChangeEvent} from 'react-native';
import {useThemeRuntime} from '../theme/ThemeRuntime';
import {DEFAULT_WORKSPACE,type PositionedRect,type WorkspaceConfig} from './workspaceModel';

type Bounds=Readonly<{width:number;height:number}>;
type RectRegistry=Readonly<Record<string,PositionedRect>>;
type WorkspaceContextValue=Readonly<{
  config:WorkspaceConfig;bounds:Bounds;boxes:RectRegistry;scrollEpoch:number;
  measure:(target:View,callback:(rect:PositionedRect,bounds:Bounds)=>void)=>void;
  report:(id:string,rect:PositionedRect|null)=>void;
}>;
const WorkspaceContext=createContext<WorkspaceContextValue|null>(null);
export function useWorkspace(){return useContext(WorkspaceContext);}
export function WorkspaceSurface({children,config=DEFAULT_WORKSPACE,active=false}:PropsWithChildren<{
  config?:WorkspaceConfig;active?:boolean;
}>){
  const theme=useThemeRuntime();
  const stage=useRef<View|null>(null);
  const [viewport,setViewport]=useState<Bounds>({width:0,height:0});
  const [bounds,setBounds]=useState<Bounds>({width:0,height:0});
  const [boxes,setBoxes]=useState<RectRegistry>({});
  const [scrollEpoch,setScrollEpoch]=useState(0);
  const onStageLayout=(ev:LayoutChangeEvent)=>{
    const {width,height}=ev.nativeEvent.layout;
    setBounds(previous=>previous.width===width&&previous.height===height?previous:{width,height});
  };
  const onViewportLayout=(ev:LayoutChangeEvent)=>{
    const {width,height}=ev.nativeEvent.layout;
    setViewport(previous=>previous.width===width&&previous.height===height?previous:{width,height});
  };
  const report=useCallback((id:string,rect:PositionedRect|null)=>{
    setBoxes(previous=>{
      if(rect===null){if(!(id in previous))return previous;const next={...previous};delete next[id];return next;}
      const old=previous[id];
      return old&&old.x===rect.x&&old.y===rect.y&&old.width===rect.width&&old.height===rect.height?
        previous:{...previous,[id]:rect};
    });
  },[]);
  const measure=useCallback((target:View,callback:(rect:PositionedRect,bounds:Bounds)=>void)=>{
    if(!stage.current)return;
    stage.current.measureInWindow((spaceX,spaceY,spaceW,spaceH)=>{
      target.measureInWindow((x,y,w,h)=>{
        if(w<=0||h<=0||spaceW<=0||spaceH<=0)return;
        callback({x:Math.round(x-spaceX),y:Math.round(y-spaceY),width:Math.round(w),height:Math.round(h)},
          {width:Math.round(spaceW),height:Math.round(spaceH)});
      });
    });
  },[]);
  const context=useMemo<WorkspaceContextValue>(()=>({config,bounds,boxes,scrollEpoch,measure,report}),
    [config,bounds,boxes,scrollEpoch,measure,report]);
  // An editing-only logical canvas is allowed to be larger than a phone's viewport.
  // OFF mode always uses the pre-3.0.4 responsive width/flow, never a 1020dp mobile card.
  const virtualWidth=active&&config.width>0?config.width:0;
  const virtualHeight=active&&config.height>0?config.height:0;
  const gridLines=active&&config.showGrid&&bounds.width>0&&bounds.height>0?{
    x:Array.from({length:Math.min(120,Math.max(0,Math.floor(bounds.width/config.gridSize)-1))},(_,i)=>(i+1)*config.gridSize),
    y:Array.from({length:Math.min(120,Math.max(0,Math.floor(bounds.height/config.gridSize)-1))},(_,i)=>(i+1)*config.gridSize),
  }:null;
  const content=<WorkspaceContext.Provider value={context}>
    <View ref={stage} onLayout={onStageLayout} collapsable={false}
      style={[styles.stage,virtualWidth?{width:virtualWidth}:{width:'100%'},
        virtualHeight?{minHeight:virtualHeight}:null]}>
      {children}
      {active&&(config.showAxes||gridLines)?<View pointerEvents="none" style={StyleSheet.absoluteFill}>
        {gridLines?.x.map(n=><View key={'x'+n} style={[styles.gridLine,{left:n,top:0,bottom:0,width:1,backgroundColor:theme.palette.primary,opacity:.08}]}/>)}
        {gridLines?.y.map(n=><View key={'y'+n} style={[styles.gridLine,{top:n,left:0,right:0,height:1,backgroundColor:theme.palette.primary,opacity:.08}]}/>)}
        {config.showAxes?<><View style={[styles.axisVertical,{left:bounds.width/2,borderColor:theme.palette.primary}]}/>
          <View style={[styles.axisHorizontal,{top:bounds.height/2,borderColor:theme.palette.primary}]}/></>:null}
      </View>:null}
    </View>
  </WorkspaceContext.Provider>;
  return <View onLayout={onViewportLayout} style={styles.viewport}>
    {active&&virtualWidth>viewport.width&&viewport.width>0?
      <ScrollView horizontal nestedScrollEnabled showsHorizontalScrollIndicator
        scrollEventThrottle={100} onScroll={()=>setScrollEpoch(v=>v+1)}
        contentContainerStyle={{minHeight:virtualHeight||undefined}}>{content}</ScrollView>:content}
  </View>;
}
const styles=StyleSheet.create({
  viewport:{width:'100%'},stage:{position:'relative'},
  gridLine:{position:'absolute'},axisVertical:{position:'absolute',top:0,bottom:0,borderLeftWidth:1.5,borderStyle:'dashed',opacity:.85},
  axisHorizontal:{position:'absolute',left:0,right:0,borderTopWidth:1.5,borderStyle:'dashed',opacity:.85},
});
