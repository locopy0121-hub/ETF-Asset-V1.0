import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { colors, radius, spacing } from '../theme/tokens';

type Message = Readonly<{ id:string; role:'user'|'assistant'; text:string }>;

export function AiQuestionBox({
  title='AI 問答',
  placeholder='輸入你想問的問題…',
  suggestions=[],
  onAsk,
}:{
  title?:string;
  placeholder?:string;
  suggestions?:readonly string[];
  onAsk:(question:string)=>string|Promise<string>;
}){
  const [input,setInput]=useState('');
  const [messages,setMessages]=useState<Message[]>([]);
  const [asking,setAsking]=useState(false);
  const visible=useMemo(()=>messages.slice(-6),[messages]);

  const submit=async(raw?:string)=>{
    const question=(raw??input).trim();
    if(!question||asking)return;
    const user:Message={id:`u-${Date.now()}`,role:'user',text:question};
    setMessages(current=>[...current,user]);
    setInput('');
    setAsking(true);
    try{
      const text=await onAsk(question);
      const answer:Message={id:`a-${Date.now()}`,role:'assistant',text:text||'目前沒有可整理的資料。'};
      setMessages(current=>[...current,answer]);
    }catch(error){
      const answer:Message={id:`e-${Date.now()}`,role:'assistant',text:`目前無法完成這個問題：${error instanceof Error?error.message:String(error)}`};
      setMessages(current=>[...current,answer]);
    }finally{
      setAsking(false);
    }
  };

  return <View style={styles.root}>
    <Text style={styles.title}>{title}</Text>
    {suggestions.length?<View style={styles.suggestions}>{suggestions.map(item=><Pressable key={item} onPress={()=>void submit(item)} style={styles.chip}><Text style={styles.chipText}>{item}</Text></Pressable>)}</View>:null}
    {visible.length?<View style={styles.thread}>{visible.map(message=><View key={message.id} style={[styles.bubble,message.role==='user'?styles.user:styles.assistant]}><Text style={[styles.message,message.role==='user'&&styles.userText]}>{message.text}</Text></View>)}</View>:<Text style={styles.empty}>可直接從這裡發問；回答會使用目前頁面的 App 資料與已取得的網路新聞。</Text>}
    <View style={styles.inputRow}>
      <TextInput
        value={input}
        onChangeText={setInput}
        editable={!asking}
        placeholder={placeholder}
        placeholderTextColor={colors.textSecondary}
        returnKeyType="send"
        onSubmitEditing={()=>void submit()}
        style={styles.input}
      />
      <Pressable disabled={asking||!input.trim()} onPress={()=>void submit()} style={[styles.send,(asking||!input.trim())&&styles.disabled]}><Text style={styles.sendText}>{asking?'整理中':'送出'}</Text></Pressable>
    </View>
  </View>;
}

const styles=StyleSheet.create({
  root:{gap:spacing.sm},
  title:{fontSize:13,fontWeight:'900',color:colors.text},
  suggestions:{flexDirection:'row',flexWrap:'wrap',gap:6},
  chip:{paddingHorizontal:10,paddingVertical:7,borderRadius:radius.pill,backgroundColor:colors.surfaceMuted},
  chipText:{fontSize:10,fontWeight:'800',color:colors.primary},
  thread:{gap:7},
  bubble:{maxWidth:'92%',paddingHorizontal:11,paddingVertical:9,borderRadius:radius.md},
  user:{alignSelf:'flex-end',backgroundColor:colors.primary},
  assistant:{alignSelf:'flex-start',backgroundColor:colors.surfaceMuted},
  message:{fontSize:11,lineHeight:17,color:colors.text},
  userText:{color:'#FFFFFF'},
  empty:{fontSize:10,lineHeight:16,color:colors.textSecondary},
  inputRow:{flexDirection:'row',gap:8,alignItems:'center'},
  input:{flex:1,minHeight:42,borderWidth:1,borderColor:colors.border,borderRadius:radius.md,paddingHorizontal:11,color:colors.text,fontSize:12,backgroundColor:colors.surface},
  send:{minHeight:42,paddingHorizontal:14,borderRadius:radius.md,backgroundColor:colors.primary,alignItems:'center',justifyContent:'center'},
  sendText:{fontSize:11,fontWeight:'900',color:'#FFFFFF'},
  disabled:{opacity:.4},
});
