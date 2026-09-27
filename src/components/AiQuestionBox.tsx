import {useMemo,useRef,useState} from 'react';
import {Linking,Pressable,ScrollView,StyleSheet,Text,TextInput,View} from 'react-native';

import type {AiAssistantAction,AiAssistantAnswer} from '../ai/aiAssistant';
import {colors,radius,spacing} from '../theme/tokens';
import {useThemeRuntime} from '../theme/ThemeRuntime';
import {InspectableTarget} from '../maintenance/InspectableTarget';
import {TARGET_APPEARANCE,type FrameMaintenanceContext,type InspectedTarget} from '../maintenance/inspectionModel';

type Message=Readonly<{id:string;role:'user'|'assistant';text:string;actions?:readonly AiAssistantAction[]}>;

export function AiQuestionBox({
  title='AI 問答',
  placeholder='輸入你想問的問題…',
  suggestions=[],
  onAsk,
  onAction,
  maintenance,
}:{
  title?:string;
  placeholder?:string;
  suggestions?:readonly string[];
  onAsk:(question:string)=>string|AiAssistantAnswer|Promise<string|AiAssistantAnswer>;
  onAction?:(action:AiAssistantAction)=>void|Promise<void>;
  maintenance?:FrameMaintenanceContext;
}){
  const theme=useThemeRuntime();
  const [input,setInput]=useState('');
  const [messages,setMessages]=useState<Message[]>([]);
  const [asking,setAsking]=useState(false);
  const [confirming,setConfirming]=useState<string|null>(null);
  const scrollRef=useRef<ScrollView|null>(null);
  const visible=useMemo(()=>messages.slice(-20),[messages]);
  const inspected=(id:string,kind:InspectedTarget['kind'],label:string,properties:InspectedTarget['properties'],base=TARGET_APPEARANCE):InspectedTarget=>({
    id,page:maintenance!.page,frameKey:maintenance!.frameKey,frameTitle:maintenance!.frameTitle,kind,label,properties,base,
  });

  const submit=async(raw?:string)=>{
    const question=(raw??input).trim();
    if(!question||asking)return;
    const user:Message={id:'u-'+Date.now(),role:'user',text:question};
    setMessages(current=>[...current,user]);
    setInput('');
    setAsking(true);
    try{
      const result=await onAsk(question);
      const normalized:AiAssistantAnswer=typeof result==='string'?{intent:'help',text:result}:result;
      const answer:Message={id:'a-'+Date.now(),role:'assistant',text:normalized.text||'目前沒有可整理的資料。',...(normalized.actions?.length?{actions:normalized.actions}:{})};
      setMessages(current=>[...current,answer]);
    }catch(error){
      const answer:Message={id:'e-'+Date.now(),role:'assistant',text:'目前無法完成這個問題：'+(error instanceof Error?error.message:String(error))};
      setMessages(current=>[...current,answer]);
    }finally{
      setAsking(false);
    }
  };

  const runAction=async(action:AiAssistantAction)=>{
    if(action.kind==='openDividend'){await submit(action.question);return;}
    if(action.kind==='openNews'){
      try{
        if(!/^https:\/\//i.test(action.url))throw new Error('新聞來源連結無效');
        await Linking.openURL(action.url);
      }catch(error){setMessages(current=>[...current,{id:'link-'+Date.now(),role:'assistant',text:'目前無法開啟新聞來源：'+(error instanceof Error?error.message:String(error))}]);}
      return;
    }
    if(!onAction)return;
    if(confirming!==action.id){setConfirming(action.id);return;}
    setConfirming(null);
    await onAction(action);
    setMessages(current=>[...current,{id:'ok-'+Date.now(),role:'assistant',text:action.event.symbol+' '+action.event.name+' 股息紀錄已新增。'}]);
  };

  const threadElement=(<ScrollView
      ref={scrollRef}
      style={[styles.threadViewport,{borderColor:theme.palette.border,backgroundColor:theme.palette.surface}]}
      contentContainerStyle={styles.thread}
      keyboardShouldPersistTaps="handled"
      nestedScrollEnabled
      onContentSizeChange={()=>scrollRef.current?.scrollToEnd({animated:true})}
    >
      {visible.length?visible.map(message=><View key={message.id} style={[styles.bubble,message.role==='user'?styles.user:styles.assistant,{backgroundColor:message.role==='user'?theme.palette.primary:theme.palette.surfaceMuted}]}>
        <Text style={[styles.message,{color:message.role==='user'?'#FFFFFF':theme.palette.text}]}>{message.text}</Text>
        {message.role==='assistant'&&message.actions?.length?<View style={styles.actions}>{message.actions.map(action=><View key={action.id} style={styles.actionLine}>
          <Pressable onPress={()=>void runAction(action)} style={[styles.actionButton,confirming===action.id&&styles.confirmButton]}><Text style={styles.actionText}>{confirming===action.id?'確認新增':action.label}</Text></Pressable>
          {confirming===action.id?<Pressable onPress={()=>setConfirming(null)} style={styles.cancelAction}><Text style={styles.cancelActionText}>取消</Text></Pressable>:null}
        </View>)}</View>:null}
      </View>):<Text style={[styles.empty,{color:theme.palette.textSecondary}]}>可直接從這裡發問。AI 會先判斷意圖，再使用目前 App 的持股、帳務、股息、行情或新聞資料。</Text>}
    </ScrollView>);
  const composerElement=(<View style={styles.inputRow}>
      <TextInput
        value={input}
        onChangeText={setInput}
        editable={!asking}
        placeholder={placeholder}
        placeholderTextColor={theme.palette.textSecondary}
        returnKeyType="send"
        onSubmitEditing={()=>void submit()}
        style={[styles.input,{borderColor:theme.palette.border,backgroundColor:theme.palette.surface,color:theme.palette.text}]}
      />
      <Pressable disabled={asking||!input.trim()} onPress={()=>void submit()} style={[styles.send,{backgroundColor:theme.palette.primary},(asking||!input.trim())&&styles.disabled]}><Text style={styles.sendText}>{asking?'處理中':'送出'}</Text></Pressable>
    </View>);
  return <View style={styles.root}>
    {maintenance?<InspectableTarget frame={maintenance} target={inspected('ai:prompt-title','text','AI 指令標題',[
      {name:'目前標題',value:title,readOnly:true},{name:'原字號',value:'13 px',readOnly:true},
    ],{...TARGET_APPEARANCE,fontSize:13,textColor:theme.palette.text,backgroundColor:theme.palette.surface,padding:0})}>
      {(appearance,customized,override)=><Text style={[styles.title,{color:theme.palette.text},customized&&{
        ...(override.fontSize!==undefined?{fontSize:appearance.fontSize}:{}),
        ...(override.textColor||override.textProfitColor!==undefined?{color:appearance.textColor}:{}),
        ...(override.align?{textAlign:appearance.align}:{}),
      }]}>{customized&&appearance.labelText?appearance.labelText:title}</Text>}
    </InspectableTarget>:<Text style={[styles.title,{color:theme.palette.text}]}>{title}</Text>}
    {suggestions.length?<ScrollView horizontal showsHorizontalScrollIndicator={false}
      style={styles.suggestionViewport} contentContainerStyle={styles.suggestions}>
      {suggestions.map((item,index)=>{
        const chip=(background=theme.palette.surfaceMuted,color=theme.palette.primary,fontSize=12)=><Pressable
          onPress={()=>void submit(item)} style={[styles.chip,{backgroundColor:background}]}>
          <Text style={[styles.chipText,{color,fontSize}]}>{item}</Text>
        </Pressable>;
        if(!maintenance)return <View key={item}>{chip()}</View>;
        return <InspectableTarget key={item} frame={maintenance} target={inspected('ai:quick-action:'+index,
          'action','快捷提問 '+item,[
            {name:'原文案',value:item,readOnly:true},{name:'原動作',value:'向 AI 發送這個預設問題',readOnly:true},
          ],{...TARGET_APPEARANCE,fontSize:12,textColor:theme.palette.primary,backgroundColor:theme.palette.surfaceMuted,padding:0})}>
          {(appearance,customized,override)=>chip(
            customized&&(override.backgroundColor||override.backgroundProfitColor!==undefined)?appearance.backgroundColor:theme.palette.surfaceMuted,
            customized&&(override.textColor||override.textProfitColor!==undefined)?appearance.textColor:theme.palette.primary,
            customized&&override.fontSize!==undefined?appearance.fontSize:12,
          )}
        </InspectableTarget>;
      })}
    </ScrollView>:null}
    {maintenance?<InspectableTarget frame={maintenance} target={inspected('ai:conversation','generic','AI 對話區域',[
      {name:'目前訊息數',value:String(visible.length),readOnly:true},
      {name:'對話視窗高度',value:'340 dp',readOnly:true},
      {name:'資料來源',value:'當前 AI 回答與使用者對話',readOnly:true},
    ],{...TARGET_APPEARANCE,backgroundColor:theme.palette.surface,padding:0})}>
      {()=>threadElement}
    </InspectableTarget>:threadElement}
    {maintenance?<InspectableTarget frame={maintenance} target={inspected('ai:composer','control','AI 輸入工具',[
      {name:'輸入提示',value:placeholder,readOnly:true},
      {name:'送出動作',value:'送交當前 AI 助理',readOnly:true},
      {name:'輸入框',value:'由當前裝置使用者輸入；對話內容不提供工程師讀取',readOnly:true},
    ],{...TARGET_APPEARANCE,padding:0,backgroundColor:theme.palette.surface})}>
      {()=>composerElement}
    </InspectableTarget>:composerElement}
  </View>;
}

const styles=StyleSheet.create({
  root:{gap:spacing.sm},
  title:{fontSize:13,fontWeight:'900',color:colors.text},
  suggestionViewport:{flexGrow:0,maxHeight:46},
  suggestions:{gap:6,paddingRight:8,alignItems:'center'},
  chip:{paddingHorizontal:12,paddingVertical:8,borderRadius:radius.pill,backgroundColor:colors.surfaceMuted,alignItems:'center',justifyContent:'center',minHeight:36},
  chipText:{fontSize:12,fontWeight:'800',color:colors.primary,includeFontPadding:false},
  threadViewport:{flexGrow:0,height:340,minHeight:240,borderWidth:StyleSheet.hairlineWidth,borderColor:colors.border,borderRadius:radius.md,backgroundColor:colors.surface},
  thread:{gap:7,padding:8,paddingBottom:12},
  bubble:{maxWidth:'94%',paddingHorizontal:11,paddingVertical:9,borderRadius:radius.md},
  user:{alignSelf:'flex-end',backgroundColor:colors.primary},
  assistant:{alignSelf:'flex-start',width:'94%',backgroundColor:colors.surfaceMuted},
  message:{fontSize:13,lineHeight:21,color:colors.text,flexShrink:1},
  userText:{color:'#FFFFFF'},
  empty:{fontSize:10,lineHeight:16,color:colors.textSecondary,padding:8},
  actions:{gap:6,marginTop:8},
  actionLine:{flexDirection:'row',alignItems:'center',gap:6},
  actionButton:{paddingHorizontal:10,paddingVertical:7,borderRadius:radius.pill,backgroundColor:colors.primary},
  confirmButton:{backgroundColor:colors.gain},
  actionText:{fontSize:10,fontWeight:'900',color:'#FFFFFF'},
  cancelAction:{paddingHorizontal:10,paddingVertical:7},
  cancelActionText:{fontSize:10,fontWeight:'800',color:colors.textSecondary},
  inputRow:{flexDirection:'row',gap:8,alignItems:'center'},
  input:{flex:1,minHeight:42,borderWidth:1,borderColor:colors.border,borderRadius:radius.md,paddingHorizontal:11,color:colors.text,fontSize:12,backgroundColor:colors.surface},
  send:{minHeight:42,paddingHorizontal:14,borderRadius:radius.md,backgroundColor:colors.primary,alignItems:'center',justifyContent:'center'},
  sendText:{fontSize:11,fontWeight:'900',color:'#FFFFFF'},
  disabled:{opacity:.4},
});
