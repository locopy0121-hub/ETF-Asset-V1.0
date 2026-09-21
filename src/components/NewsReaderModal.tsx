import {Linking,Modal,Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';

import type {AiNewsItem} from '../ai/AiNewsRuntime';
import {colors,radius,spacing} from '../theme/tokens';

export function NewsReaderModal({item,onClose}:{item:AiNewsItem|null;onClose:()=>void}){
  if(!item)return null;
  const published=new Date(item.publishedAt);
  const publishedText=Number.isNaN(published.getTime())?item.publishedAt:published.toLocaleString('zh-TW');
  return <Modal visible animationType="slide" onRequestClose={onClose}>
    <View style={styles.root}>
      <View style={styles.header}>
        <View style={{flex:1}}>
          <Text style={styles.kicker}>App 內新聞閱讀</Text>
          <Text numberOfLines={1} style={styles.symbol}>{item.symbol} {item.name}</Text>
        </View>
        <Pressable onPress={onClose} style={styles.close}><Text style={styles.closeText}>×</Text></Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.meta}>{item.source} · {publishedText}</Text>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>AI 重點摘要</Text>
          <Text style={styles.summary}>{item.summary}</Text>
        </View>
        <Text style={styles.note}>此視窗保留在 TF Asset 內閱讀新聞重點；需要查看媒體完整原文時，再由你主動選擇外部瀏覽器。</Text>
        {item.url?<Pressable onPress={()=>void Linking.openURL(item.url)} style={styles.external}><Text style={styles.externalText}>使用外部瀏覽器查看完整原文</Text></Pressable>:null}
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
