import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useMemo, useRef, useState } from 'react';
import { PanResponder, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { useAiNewsRuntime } from '../ai/AiNewsRuntime';
import { answerAiQuestion, type AiAssistantAction, type AiConversationTurn } from '../ai/aiAssistant';
import { dividendEventToLedger } from '../ai/dividendAssistant';
import type { MainPageKey } from '../domain/pageRegistry';
import { useFinance } from '../finance/FinanceRuntime';
import { useSettingsRuntime } from '../settings/SettingsRuntime';
import { colors, radius, spacing } from '../theme/tokens';
import { AiQuestionBox } from './AiQuestionBox';

type Mode='open'|'minimized'|'closed';
type Point=Readonly<{x:number;y:number}>;
type Size=Readonly<{width:number;height:number}>;
const STORAGE_KEY='@tf-asset/global-floating-ai-v2';
const clamp=(value:number,min:number,max:number)=>Math.max(min,Math.min(max,value));

export function GlobalFloatingAi({activePage}:{activePage:MainPageKey}){
  const finance=useFinance();
  const ai=useAiNewsRuntime();
  const settings=useSettingsRuntime();
  const prefs=settings.prefs.ai;
  const {width,height}=useWindowDimensions();
  const [mode,setMode]=useState<Mode>('minimized');
  const [position,setPosition]=useState<Point>({x:12,y:120});
  const [panelSize,setPanelSize]=useState<Size>({width:prefs.panelWidth,height:prefs.panelHeight});
  const dragStart=useRef<Point>({x:12,y:120});
  const resizeStart=useRef<Size>({width:prefs.panelWidth,height:prefs.panelHeight});

  useEffect(()=>{setPanelSize({width:prefs.panelWidth,height:prefs.panelHeight});},[prefs.panelWidth,prefs.panelHeight]);

  useEffect(()=>{let alive=true;AsyncStorage.getItem(STORAGE_KEY).then(raw=>{
    if(!alive||!raw)return;
    const saved=JSON.parse(raw) as Partial<Point>&{mode?:Mode};
    setPosition({x:Number(saved.x)||12,y:Number(saved.y)||120});
    if(saved.mode==='open'||saved.mode==='minimized'||saved.mode==='closed')setMode(saved.mode);
  }).catch(()=>{});return()=>{alive=false;};},[]);

  const buttonSize=clamp(prefs.buttonSize,40,88);
  const panelWidth=Math.min(Math.max(280,panelSize.width),Math.max(280,width-16));
  const panelHeight=Math.min(Math.max(300,panelSize.height),Math.max(300,height-130));
  const activeWidth=mode==='open'?panelWidth:mode==='closed'?buttonSize:Math.min(190,Math.max(150,panelWidth));
  const activeHeight=mode==='open'?panelHeight:mode==='closed'?buttonSize:48;
  const maxX=Math.max(8,width-activeWidth-8);
  const maxY=Math.max(56,height-activeHeight-86);
  const safePosition={x:clamp(position.x,8,maxX),y:clamp(position.y,56,maxY)};

  useEffect(()=>{if(safePosition.x!==position.x||safePosition.y!==position.y)setPosition(safePosition);},[width,height,mode,panelWidth,panelHeight,buttonSize]);

  const persist=(point:Point,nextMode=mode)=>AsyncStorage.setItem(STORAGE_KEY,JSON.stringify({...point,mode:nextMode})).catch(()=>{});
  const snap=(point:Point)=>{
    if(!prefs.edgeSnap)return point;
    return {...point,x:point.x<=maxX/2?8:maxX};
  };
  const changeMode=(next:Mode)=>{
    const normalized=next==='open'&&!prefs.floatingPanelVisible?'closed':next;
    setMode(normalized);
    void persist(safePosition,normalized);
  };

  const responder=useMemo(()=>PanResponder.create({
    onStartShouldSetPanResponder:()=>!prefs.positionLocked,
    onMoveShouldSetPanResponder:(_,g)=>!prefs.positionLocked&&(Math.abs(g.dx)>3||Math.abs(g.dy)>3),
    onPanResponderGrant:()=>{dragStart.current=safePosition;},
    onPanResponderMove:(_,g)=>setPosition({
      x:clamp(dragStart.current.x+g.dx,8,maxX),
      y:clamp(dragStart.current.y+g.dy,56,maxY),
    }),
    onPanResponderRelease:(_,g)=>{
      const raw={
        x:clamp(dragStart.current.x+g.dx,8,maxX),
        y:clamp(dragStart.current.y+g.dy,56,maxY),
      };
      const next=snap(raw);
      setPosition(next);
      void persist(next);
    },
  }),[safePosition.x,safePosition.y,maxX,maxY,mode,prefs.positionLocked,prefs.edgeSnap]);

  const resizeResponder=useMemo(()=>PanResponder.create({
    onStartShouldSetPanResponder:()=>mode==='open',
    onMoveShouldSetPanResponder:(_,g)=>mode==='open'&&(Math.abs(g.dx)>2||Math.abs(g.dy)>2),
    onPanResponderGrant:()=>{resizeStart.current=panelSize;},
    onPanResponderMove:(_,g)=>{
      const next={
        width:clamp(resizeStart.current.width+g.dx,280,Math.max(280,width-16)),
        height:clamp(resizeStart.current.height+g.dy,300,Math.max(300,height-130)),
      };
      setPanelSize(next);
    },
    onPanResponderRelease:(_,g)=>{
      const next={
        width:clamp(resizeStart.current.width+g.dx,280,Math.max(280,width-16)),
        height:clamp(resizeStart.current.height+g.dy,300,Math.max(300,height-130)),
      };
      setPanelSize(next);
      settings.patchAi({panelWidth:next.width,panelHeight:next.height});
    },
  }),[mode,panelSize.width,panelSize.height,width,height,settings.patchAi]);

  const ask=(question:string,conversation:readonly AiConversationTurn[])=>answerAiQuestion(question,finance.holdings,finance.snapshot.portfolio,ai.items,finance.entries,{
    networkSearchEnabled:prefs.networkSearch,
    showSources:prefs.showSources,
    showDates:prefs.showDates,
    responseDetail:prefs.responseDetail,
    conversation:prefs.useHistory?conversation:[],
  });
  const runAction=(action:AiAssistantAction)=>{if(action.kind==='addDividend')finance.addDividend(dividendEventToLedger(action.event));};

  if(!prefs.enabled||!prefs.visiblePages.includes(activePage))return null;

  if(mode==='closed'||!prefs.floatingPanelVisible){
    if(!prefs.floatingButtonVisible)return null;
    return <Pressable
      accessibilityRole="button"
      accessibilityLabel="開啟全局 AI 助理"
      onPress={()=>changeMode('open')}
      {...(!prefs.positionLocked?responder.panHandlers:{})}
      style={[styles.fab,{left:safePosition.x,top:safePosition.y,width:buttonSize,height:buttonSize,borderRadius:buttonSize/2,opacity:prefs.buttonOpacity}]}
    >
      <Text style={[styles.fabText,{fontSize:Math.max(13,buttonSize*.31)}]}>AI</Text>
      {prefs.statusDotVisible?<View style={styles.statusDot}/>:null}
    </Pressable>;
  }

  if(mode==='minimized'){
    if(!prefs.floatingButtonVisible)return null;
    return <View style={[styles.minimized,{left:safePosition.x,top:safePosition.y,width:activeWidth,opacity:prefs.buttonOpacity}]}>
      <View {...(!prefs.positionLocked?responder.panHandlers:{})} style={styles.dragHandle}><Text style={styles.dragText}>{prefs.positionLocked?'🔒':'⋮⋮'} AI 助理</Text></View>
      <Pressable onPress={()=>changeMode('open')} style={styles.miniAction}><Text style={styles.miniActionText}>展開</Text></Pressable>
      <Pressable onPress={()=>changeMode('closed')} style={styles.closeAction}><Text style={styles.closeText}>×</Text></Pressable>
    </View>;
  }

  return <View style={[styles.panel,{left:safePosition.x,top:safePosition.y,width:panelWidth,height:panelHeight,opacity:prefs.panelOpacity}]}>
    <View {...(!prefs.positionLocked?responder.panHandlers:{})} style={styles.header}>
      <View style={{flex:1}}>
        <Text style={styles.title}>{prefs.positionLocked?'🔒 ':''}AI 助理</Text>
        <Text style={styles.subtitle}>全局浮動 · 財務資料／股息更新／行情／新聞整理</Text>
      </View>
      <Pressable onPress={()=>changeMode('minimized')} style={styles.headerAction}><Text style={styles.headerActionText}>−</Text></Pressable>
      <Pressable onPress={()=>changeMode('closed')} style={styles.headerAction}><Text style={styles.headerActionText}>×</Text></Pressable>
    </View>
    <View style={styles.body}>
      <AiQuestionBox
        title="直接詢問目前 App 資料"
        suggestions={prefs.proactiveHints?['你可以做什麼？','更新持股股息日','目前持股市值？','最近持股有什麼新聞？']:[]}
        onAsk={ask}
        onAction={runAction}
        useHistory={prefs.useHistory}
        confirmBeforeAction={prefs.confirmBeforeWrite}
      />
      <View style={styles.statusRow}>
        <Text style={styles.statusText}>持股 {finance.holdings.length} 檔 · 新聞 {ai.items.length} 則</Text>
        <Pressable disabled={ai.refreshing||!prefs.holdingsNews} onPress={()=>void ai.refresh()}><Text style={styles.refreshText}>{ai.refreshing?'更新中':prefs.holdingsNews?'更新新聞':'新聞已關閉'}</Text></Pressable>
      </View>
    </View>
    <View {...resizeResponder.panHandlers} accessibilityLabel="調整 AI 浮動視窗大小" style={styles.resizeHandle}><Text style={styles.resizeText}>↘</Text></View>
  </View>;
}

const styles=StyleSheet.create({
  panel:{position:'absolute',zIndex:9999,backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border,borderRadius:radius.lg,overflow:'hidden',elevation:16},
  header:{flexDirection:'row',alignItems:'center',gap:8,paddingHorizontal:12,paddingVertical:10,backgroundColor:colors.surfaceMuted,borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:colors.border},
  title:{fontSize:13,fontWeight:'900',color:colors.text},
  subtitle:{fontSize:9,color:colors.textSecondary,marginTop:2},
  headerAction:{width:30,height:30,borderRadius:15,alignItems:'center',justifyContent:'center',backgroundColor:colors.surface},
  headerActionText:{fontSize:18,fontWeight:'900',color:colors.primary},
  body:{flex:1,padding:spacing.md,gap:8,paddingBottom:18},
  statusRow:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8,paddingTop:6,borderTopWidth:StyleSheet.hairlineWidth,borderTopColor:colors.border},
  statusText:{fontSize:9,color:colors.textSecondary},
  refreshText:{fontSize:10,fontWeight:'900',color:colors.primary},
  minimized:{position:'absolute',zIndex:9999,height:48,borderRadius:radius.pill,backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border,flexDirection:'row',alignItems:'center',paddingHorizontal:8,elevation:12},
  dragHandle:{flex:1,paddingVertical:10,paddingHorizontal:6},
  dragText:{fontSize:11,fontWeight:'900',color:colors.text},
  miniAction:{paddingHorizontal:8,paddingVertical:6},
  miniActionText:{fontSize:10,fontWeight:'900',color:colors.primary},
  closeAction:{width:28,height:28,alignItems:'center',justifyContent:'center'},
  closeText:{fontSize:18,fontWeight:'900',color:colors.textSecondary},
  fab:{position:'absolute',zIndex:9999,backgroundColor:colors.primary,alignItems:'center',justifyContent:'center',elevation:12},
  fabText:{fontWeight:'900',color:'#FFFFFF'},
  statusDot:{position:'absolute',right:3,top:3,width:10,height:10,borderRadius:5,backgroundColor:colors.loss,borderWidth:2,borderColor:'#FFFFFF'},
  resizeHandle:{position:'absolute',right:0,bottom:0,width:34,height:34,alignItems:'center',justifyContent:'center',backgroundColor:colors.surfaceMuted,borderTopLeftRadius:radius.md},
  resizeText:{fontSize:18,fontWeight:'900',color:colors.primary},
});
