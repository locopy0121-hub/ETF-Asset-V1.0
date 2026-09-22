import {useMemo,useRef,useState} from 'react';
import {Pressable,ScrollView,StyleSheet,Text,TextInput,View} from 'react-native';

import type {AiAssistantAction,AiAssistantAnswer} from '../ai/aiAssistant';
import {colors,radius,spacing} from '../theme/tokens';
import {useThemeRuntime} from '../theme/ThemeRuntime';

type Message=Readonly<{id:string;role:'user'|'assistant';text:string;actions?:readonly AiAssistantAction[]}>;

export function AiQuestionBox({
  title='AI 問答',
  placeholder='輸入你想問的問題…',
  suggestions=[],
  onAsk,
  onAction,
}:{
  title?:string;
  placeholder?:string;
  suggestions?:readonly string[];
  onAsk:(question:string)=>string|AiAssistantAnswer|Promise<string|AiAssistantAnswer>;
  onAction?:(action:AiAssistantAction)=>void|Promise<void>;
}){
  const theme=useThemeRuntime();
  const [input,setInput]=useState('');
  const [messages,setMessages]=useState<Message[]>([]);
  const [asking,setAsking]=useState(false);
  const [confirming,setConfirming]=useState<string|null>(null);
  const scrollRef=useRef<ScrollView|null>(null);
  const visible=useMemo(()=>messages.slice(-20),[messages]);

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
    if(!onAction)return;
    if(confirming!==action.id){setConfirming(action.id);return;}
    setConfirming(null);
    await onAction(action);
    setMessages(current=>[...current,{id:'ok-'+Date.now(),role:'assistant',text:action.event.symbol+' '+action.event.name+' 股息紀錄已新增。'}]);
  };

  return <View style={styles.root}>
    <Text style={[styles.title,{color:theme.palette.text}]}>{title}</Text>
    {suggestions.length?<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.suggestions}>{suggestions.map(item=><Pressable key={item} onPress={()=>void submit(item)} style={[styles.chip,{backgroundColor:theme.palette.surfaceMuted}]}><Text style={[styles.chipText,{color:theme.palette.primary}]}>{item}</Text></Pressable>)}</ScrollView>:null}
    <ScrollView
      ref={scrollRef}
      style={[styles.threadViewport,{borderColor:theme.palette.border,backgroundColor:theme.palette.surface}]}
      contentContainerStyle={styles.thread}
      keyboardShouldPersistTaps="handled"
      nestedScrollEnabled
      onContentSizeChange={()=>scrollRef.current?.scrollToEnd({animated:true})}
    >
      {visible.length?visible.map(message=><View key={message.id} style={[styles.bubble,message.role==='user'?{backgroundColor:theme.palette.primary}:{backgroundColor:theme.palette.surfaceMuted}]}>
        <Text style={[styles.message,{color:message.role==='user'?'#FFFFFF':theme.palette.text}]}>{message.text}</Text>
        {message.role==='assistant'&&message.actions?.length?<View style={styles.actions}>{message.actions.map(action=><View key={action.id} style={styles.actionLine}>
          <Pressable onPress={()=>void runAction(action)} style={[styles.actionButton,confirming===action.id&&styles.confirmButton]}><Text style={styles.actionText}>{confirming===action.id?'確認新增':action.label}</Text></Pressable>
          {confirming===action.id?<Pressable onPress={()=>setConfirming(null)} style={styles.cancelAction}><Text style={styles.cancelActionText}>取消</Text></Pressable>:null}
        </View>)}</View>:null}
      </View>):<Text style={[styles.empty,{color:theme.palette.textSecondary}]}>可直接從這裡發問。AI 會先判斷意圖，再使用目前 App 的持股、帳務、股息、行情或新聞資料。</Text>}
    </ScrollView>
    <View style={styles.inputRow}>
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
    </View>
  </View>;
}

const styles=StyleSheet.create({
  root:{height:310,gap:spacing.sm},
  title:{fontSize:13,fontWeight:'900',color:colors.text},
  suggestions:{gap:6,paddingRight:8},
  chip:{paddingHorizontal:10,paddingVertical:7,borderRadius:radius.pill,backgroundColor:colors.surfaceMuted},
  chipText:{fontSize:10,fontWeight:'800',color:colors.primary},
  threadViewport:{flex:1,minHeight:100,borderWidth:StyleSheet.hairlineWidth,borderColor:colors.border,borderRadius:radius.md,backgroundColor:colors.surface},
  thread:{gap:7,padding:8,paddingBottom:12},
  bubble:{maxWidth:'94%',paddingHorizontal:11,paddingVertical:9,borderRadius:radius.md},
  user:{alignSelf:'flex-end',backgroundColor:colors.primary},
  assistant:{alignSelf:'flex-start',backgroundColor:colors.surfaceMuted},
  message:{fontSize:11,lineHeight:17,color:colors.text},
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
