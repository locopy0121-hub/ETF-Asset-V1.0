import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useMemo, useRef, useState } from 'react';
import { PanResponder, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { useAiNewsRuntime } from '../ai/AiNewsRuntime';
import { answerAiQuestion, type AiAssistantAction } from '../ai/aiAssistant';
import { dividendEventToLedger } from '../ai/dividendAssistant';
import { useFinance } from '../finance/FinanceRuntime';
import { useSettingsRuntime } from '../settings/SettingsRuntime';
import { deriveAiUiState } from '../settings/settingsControlBehavior';
import { colors, radius, spacing } from '../theme/tokens';
import { useThemeRuntime } from '../theme/ThemeRuntime';
import { AiQuestionBox } from './AiQuestionBox';

type Mode='open'|'minimized'|'closed';
type Point=Readonly<{x:number;y:number}>;
const STORAGE_KEY='@tf-asset/global-floating-ai-v1';
const CARD_WIDTH=360;
const CARD_HEIGHT=430;
const clamp=(value:number,min:number,max:number)=>Math.max(min,Math.min(max,value));

export function GlobalFloatingAi({collapseSignal=0,onExpandedChange}:{collapseSignal?:number;onExpandedChange?:(expanded:boolean)=>void}={}){
  const finance=useFinance();
  const ai=useAiNewsRuntime();
  const theme=useThemeRuntime();
  const aiSettings=useSettingsRuntime();
  const {width,height}=useWindowDimensions();
  const [mode,setMode]=useState<Mode>('minimized');
  const [position,setPosition]=useState<Point>({x:12,y:120});
  const dragStart=useRef<Point>({x:12,y:120});
  const seenCollapse=useRef(collapseSignal);

  useEffect(()=>{let alive=true;AsyncStorage.getItem(STORAGE_KEY).then(raw=>{
    if(!alive||!raw)return;
    const saved=JSON.parse(raw) as Partial<Point>&{mode?:Mode};
    const maxX=Math.max(8,width-Math.min(CARD_WIDTH,width-16)-8);
    const maxY=Math.max(56,height-110);
    setPosition({x:clamp(Number(saved.x)||12,8,maxX),y:clamp(Number(saved.y)||120,56,maxY)});
    if(saved.mode==='open'||saved.mode==='minimized'||saved.mode==='closed')setMode(saved.mode);
  }).catch(()=>{});return()=>{alive=false;};},[]);

  const panelWidth=Math.min(CARD_WIDTH,width-16);
  const maxX=Math.max(8,width-panelWidth-8);
  const maxY=Math.max(56,height-(mode==='open'?CARD_HEIGHT:70));
  const safePosition={x:clamp(position.x,8,maxX),y:clamp(position.y,56,maxY)};

  useEffect(()=>{if(safePosition.x!==position.x||safePosition.y!==position.y)setPosition(safePosition);},[width,height,mode]);

  const persist=(point:Point,nextMode=mode)=>AsyncStorage.setItem(STORAGE_KEY,JSON.stringify({...point,mode:nextMode})).catch(()=>{});
  const changeMode=(next:Mode)=>{setMode(next);void persist(safePosition,next);};
  // This floating View is not an RN Modal, so top-level Android back must collapse it.
  useEffect(()=>{onExpandedChange?.(mode==='open');return ()=>onExpandedChange?.(false);},[mode,onExpandedChange]);
  useEffect(()=>{
    if(collapseSignal===seenCollapse.current)return;
    seenCollapse.current=collapseSignal;
    if(mode==='open')changeMode('minimized');
  },[collapseSignal,mode]);

  const responder=useMemo(()=>PanResponder.create({
    onStartShouldSetPanResponder:()=>true,
    onMoveShouldSetPanResponder:(_,g)=>Math.abs(g.dx)>3||Math.abs(g.dy)>3,
    onPanResponderGrant:()=>{dragStart.current=safePosition;},
    onPanResponderMove:(_,g)=>setPosition({
      x:clamp(dragStart.current.x+g.dx,8,maxX),
      y:clamp(dragStart.current.y+g.dy,56,maxY),
    }),
    onPanResponderRelease:(_,g)=>{
      const next={
        x:clamp(dragStart.current.x+g.dx,8,maxX),
        y:clamp(dragStart.current.y+g.dy,56,maxY),
      };
      setPosition(next);
      void persist(next);
    },
  }),[safePosition.x,safePosition.y,maxX,maxY,mode]);

  const ask=(question:string)=>answerAiQuestion(question,finance.holdings,finance.snapshot.portfolio,ai.items,finance.entries);
  const runAction=(action:AiAssistantAction)=>{if(action.kind==='addDividend')finance.addDividend(dividendEventToLedger(action.event));};

  if(!deriveAiUiState(aiSettings.prefs.ai,'home').showFloatingAi)return null;

  if(mode==='closed'){
    return <Pressable
      accessibilityRole="button"
      accessibilityLabel="開啟全局 AI 助理"
      onPress={()=>changeMode('open')}
      style={[styles.fab,{left:safePosition.x,top:safePosition.y,backgroundColor:theme.palette.primary}]}
    ><Text style={styles.fabText}>AI</Text></Pressable>;
  }

  if(mode==='minimized'){
    return <View style={[styles.minimized,{left:safePosition.x,top:safePosition.y,width:Math.min(190,panelWidth),backgroundColor:theme.palette.surface,borderColor:theme.palette.border}]}>
      <View {...responder.panHandlers} style={styles.dragHandle}><Text style={[styles.dragText,{color:theme.palette.text}]}>⋮⋮ AI 助理</Text></View>
      <Pressable onPress={()=>changeMode('open')} style={styles.miniAction}><Text style={[styles.miniActionText,{color:theme.palette.primary}]}>展開</Text></Pressable>
      <Pressable onPress={()=>changeMode('closed')} style={styles.closeAction}><Text style={[styles.closeText,{color:theme.palette.textSecondary}]}>×</Text></Pressable>
    </View>;
  }

  return <View style={[styles.panel,{left:safePosition.x,top:safePosition.y,width:panelWidth,maxHeight:CARD_HEIGHT,backgroundColor:theme.palette.surface,borderColor:theme.palette.border}]}>
    <View {...responder.panHandlers} style={[styles.header,{backgroundColor:theme.palette.surfaceMuted,borderBottomColor:theme.palette.border}]}>
      <View style={{flex:1}}>
        <Text style={[styles.title,{color:theme.palette.text}]}>AI 助理</Text>
        <Text style={[styles.subtitle,{color:theme.palette.textSecondary}]}>全局浮動 · 財務資料／股息更新／行情／新聞整理</Text>
      </View>
      <Pressable onPress={()=>changeMode('minimized')} style={[styles.headerAction,{backgroundColor:theme.palette.surface}]}><Text style={[styles.headerActionText,{color:theme.palette.primary}]}>−</Text></Pressable>
      <Pressable onPress={()=>changeMode('closed')} style={[styles.headerAction,{backgroundColor:theme.palette.surface}]}><Text style={[styles.headerActionText,{color:theme.palette.primary}]}>×</Text></Pressable>
    </View>
    <View style={styles.body}>
      <AiQuestionBox
        title="直接詢問目前 App 資料"
        suggestions={['你可以做什麼？','更新持股股息日','目前持股市值？','最近持股有什麼新聞？']}
        onAsk={ask}
        onAction={runAction}
      />
      <View style={[styles.statusRow,{borderTopColor:theme.palette.border}]}>
        <Text style={[styles.statusText,{color:theme.palette.textSecondary}]}>持股 {finance.holdings.length} 檔 · 新聞 {ai.items.length} 則</Text>
        <Pressable disabled={ai.refreshing} onPress={()=>void ai.refresh()}><Text style={[styles.refreshText,{color:theme.palette.primary}]}>{ai.refreshing?'更新中':'更新新聞'}</Text></Pressable>
      </View>
    </View>
  </View>;
}

const styles=StyleSheet.create({
  panel:{position:'absolute',zIndex:9999,height:CARD_HEIGHT,backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border,borderRadius:radius.lg,overflow:'hidden',elevation:16},
  header:{flexDirection:'row',alignItems:'center',gap:8,paddingHorizontal:12,paddingVertical:10,backgroundColor:colors.surfaceMuted,borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:colors.border},
  title:{fontSize:13,fontWeight:'900',color:colors.text},
  subtitle:{fontSize:9,color:colors.textSecondary,marginTop:2},
  headerAction:{width:30,height:30,borderRadius:15,alignItems:'center',justifyContent:'center',backgroundColor:colors.surface},
  headerActionText:{fontSize:18,fontWeight:'900',color:colors.primary},
  body:{flex:1,padding:spacing.md,gap:8},
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
  fab:{position:'absolute',zIndex:9999,width:52,height:52,borderRadius:26,backgroundColor:colors.primary,alignItems:'center',justifyContent:'center',elevation:12},
  fabText:{fontSize:16,fontWeight:'900',color:'#FFFFFF'},
});
