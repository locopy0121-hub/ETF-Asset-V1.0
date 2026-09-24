import {Linking,Modal,Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';

import type {AiNewsItem} from '../ai/AiNewsRuntime';
import {colors,radius,spacing} from '../theme/tokens';
import {useThemeRuntime} from '../theme/ThemeRuntime';

export function NewsReaderModal({item,onClose}:{item:AiNewsItem|null;onClose:()=>void}){
  const theme=useThemeRuntime();
  if(!item)return null;
  const published=new Date(item.publishedAt);
  const publishedText=Number.isNaN(published.getTime())?item.publishedAt:published.toLocaleString('zh-TW');
  return <Modal visible animationType="slide" onRequestClose={onClose}>
    <View style={[styles.root,{backgroundColor:theme.palette.background}]}>
      <View style={[styles.header,{backgroundColor:theme.palette.surface,borderBottomColor:theme.palette.border}]}>
        <View style={{flex:1}}>
          <Text style={[styles.kicker,{color:theme.palette.primary}]}>App 內新聞閱讀</Text>
          <Text numberOfLines={1} style={[styles.symbol,{color:theme.palette.text}]}>{item.symbol} {item.name}</Text>
        </View>
        <Pressable onPress={onClose} style={[styles.close,{backgroundColor:theme.palette.surfaceMuted}]}><Text style={[styles.closeText,{color:theme.palette.textSecondary}]}>×</Text></Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title,{color:theme.palette.text}]}>{item.title}</Text>
        <Text style={[styles.meta,{color:theme.palette.textSecondary}]}>{item.source} · {publishedText}</Text>
        <View style={[styles.summaryCard,{backgroundColor:theme.palette.surface,borderColor:theme.palette.border}]}>
          <Text style={[styles.summaryLabel,{color:theme.palette.primary}]}>{item.summaryStatus==='article'?'新聞正文重點整理':'新聞正文尚未取得'}</Text>
          <Text style={[styles.summary,{color:theme.palette.text}]}>{item.summaryStatus==='article'&&item.summary?item.summary:'目前來源未提供可可靠擷取的新聞正文，不能把標題重新排列當成 AI 摘要。可自行開啟原文查閱。'}</Text>
        </View>
        <Text style={[styles.note,{color:theme.palette.textSecondary}]}>此視窗保留在 TF Asset 內閱讀新聞重點；需要查看媒體完整原文時，再由你主動選擇外部瀏覽器。</Text>
        {item.url?<Pressable onPress={()=>void Linking.openURL(item.url)} style={[styles.external,{backgroundColor:theme.palette.surfaceMuted,borderColor:theme.palette.border}]}><Text style={[styles.externalText,{color:theme.palette.primary}]}>使用外部瀏覽器查看完整原文</Text></Pressable>:null}
      </ScrollView>
    </View>
  </Modal>;
}

const styles=StyleSheet.create({
  root:{flex:1,backgroundColor:colors.background},
  header:{paddingTop:54,paddingHorizontal:spacing.lg,paddingBottom:spacing.md,backgroundColor:colors.surface,borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:colors.border,flexDirection:'row',alignItems:'center',gap:12},
  kicker:{fontSize:10,fontWeight:'900',color:colors.primary},symbol:{fontSize:15,fontWeight:'900',color:colors.text,marginTop:3},
  close:{width:38,height:38,borderRadius:19,alignItems:'center',justifyContent:'center',backgroundColor:colors.surfaceMuted},closeText:{fontSize:22,fontWeight:'900',color:colors.textSecondary},
  content:{padding:spacing.lg,gap:spacing.md,paddingBottom:48},
  title:{fontSize:22,lineHeight:31,fontWeight:'900',color:colors.text},
  meta:{fontSize:11,color:colors.textSecondary},
  summaryCard:{padding:spacing.lg,borderRadius:radius.lg,backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border,gap:8},
  summaryLabel:{fontSize:11,fontWeight:'900',color:colors.primary},summary:{fontSize:14,lineHeight:23,color:colors.text},
  note:{fontSize:11,lineHeight:18,color:colors.textSecondary},
  external:{alignSelf:'flex-start',paddingHorizontal:14,paddingVertical:10,borderRadius:radius.pill,backgroundColor:colors.surfaceMuted,borderWidth:1,borderColor:colors.border},
  externalText:{fontSize:11,fontWeight:'900',color:colors.primary},
});
