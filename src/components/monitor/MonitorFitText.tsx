import {useEffect,useState,useRef} from 'react';
import {StyleSheet,Text,type LayoutChangeEvent,type TextProps} from 'react-native';
import {fitMonitorRowFont,type MonitorAutoFit,type MonitorFitCell} from '../../monitor/monitorAutoFit';
type Entry=Partial<MonitorFitCell>&{group:string;epoch:string};
export type MonitorFitController={options:MonitorAutoFit;epoch:string;size:(group:string)=>number;naturalHeight:(id:string)=>number|undefined;report:(id:string,group:string,patch:Partial<MonitorFitCell>,reserveWidth?:boolean)=>void;remove:(id:string)=>void;rootLayout:(e:LayoutChangeEvent)=>void};
export function useMonitorFit(options:MonitorAutoFit,signature:string):MonitorFitController{
 const [state,setState]=useState<{epoch:string;entries:Record<string,Entry>}>({epoch:'',entries:{}});const [width,setWidth]=useState(0);
 const epoch=signature+':'+Math.round(width);const activeEpoch=useRef(epoch);activeEpoch.current=epoch;
 const entries=state.epoch===epoch?state.entries:{};
 return {options,epoch,naturalHeight:id=>entries[id]?.naturalHeight,rootLayout:e=>setWidth(e.nativeEvent.layout.width),
  size:group=>fitMonitorRowFont(options,Object.values(entries).filter(e=>e.group===group&&e.width!=null&&e.height!=null&&e.naturalWidth!=null&&e.naturalHeight!=null) as MonitorFitCell[]),
  report:(id,group,patch,reserveWidth=false)=>{if(activeEpoch.current!==epoch)return;setState(state=>{const old=state.epoch===epoch?state.entries:{};const prev=old[id];const next={...prev,...patch,group,epoch};if(reserveWidth&&prev?.width!=null&&next.width!=null)next.width=Math.max(prev.width,next.width);if(JSON.stringify(prev)===JSON.stringify(next))return state;return {epoch,entries:{...old,[id]:next}};});},
  remove:id=>setState(state=>{if(!(id in state.entries))return state;const next={...state.entries};delete next[id];return {...state,entries:next};}),
 };
}

export function MonitorFitText({fit,group,cellKey,reserveWidth=false,reservedHeight=0,...props}:TextProps&{fit:MonitorFitController;group:string;cellKey:string;reserveWidth?:boolean;reservedHeight?:number}){
 const flat=StyleSheet.flatten(props.style)??{};
 const ratio=typeof flat.lineHeight==='number'&&typeof flat.fontSize==='number'&&flat.fontSize>0?Math.max(1,flat.lineHeight/flat.fontSize):1.2;
 const id=fit.epoch+':'+group+':'+cellKey+':'+String(props.children);
 const active=useRef(id);active.current=id;
 useEffect(()=>()=>{if(active.current===id)active.current='';fit.remove(id);},[id]);
 if(!fit.options.enabled)return <Text {...props}/>;
 const px=(v:unknown)=>typeof v==='number'?v:0;
 const top=px(flat.paddingTop??flat.paddingVertical??flat.padding),bottom=px(flat.paddingBottom??flat.paddingVertical??flat.padding);
 const left=px(flat.paddingLeft??flat.paddingHorizontal??flat.padding),right=px(flat.paddingRight??flat.paddingHorizontal??flat.padding);
 const gap=px(flat.marginTop)+px(flat.marginBottom);
 const fontSize=fit.size(group),max=fit.options.maxFontSize;
 // Grow only when the user minimum would otherwise clip vertically; long strings ellipsize at that minimum.
 const height=Math.max(fit.options.rowHeight-gap-reservedHeight,Math.max(fit.options.minFontSize*ratio,(fit.naturalHeight(id)??0)*fit.options.minFontSize/fit.options.maxFontSize)+top+bottom);
 return <>
  <Text key={id+':visible'} {...props} numberOfLines={1} ellipsizeMode="tail" onLayout={e=>{if(active.current!==id)return;fit.report(id,group,{width:Math.max(0,e.nativeEvent.layout.width-left-right),height:Math.max(0,height-top-bottom)},reserveWidth);props.onLayout?.(e);}} style={[props.style,{fontSize,lineHeight:Math.ceil(fontSize*ratio),height,minHeight:0}]} />
  <Text key={id+':measure'} accessible={false} importantForAccessibility="no-hide-descendants" pointerEvents="none" numberOfLines={1} onTextLayout={e=>{if(active.current!==id)return;const line=e.nativeEvent.lines[0];if(line)fit.report(id,group,{naturalWidth:line.width,naturalHeight:Math.max(line.height,max*ratio)});}} style={{position:'absolute',opacity:0,width:100000,fontSize:max,lineHeight:Math.ceil(max*ratio),fontWeight:flat.fontWeight,fontFamily:flat.fontFamily,fontStyle:flat.fontStyle,letterSpacing:flat.letterSpacing}}>{props.children}</Text>
 </>;
}
