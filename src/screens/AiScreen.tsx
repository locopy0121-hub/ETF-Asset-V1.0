import {useMemo,useState} from 'react';
import {Linking,Pressable,StyleSheet,Text,TextInput,View} from 'react-native';
import {AiQuestionBox} from '../components/AiQuestionBox';
import {FrameCard} from '../components/FrameCard';
import {PageShell} from '../components/PageShell';
import {PageGearButton} from '../components/PageGearButton';
import {PageEditorStack} from '../components/PageEditorStack';
import {PageFrameSettingsModal} from '../components/PageFrameSettingsModal';
import {PAGE_FRAMES} from '../domain/frameRegistry';
import {useAiNewsRuntime} from '../ai/AiNewsRuntime';
import {usePageEditor} from '../editor/pageEditor';
import {useFinance} from '../finance/FinanceRuntime';
import {colors,radius,spacing} from '../theme/tokens';

const date=(value:string)=>{const d=new Date(value);return Number.isNaN(d.getTime())?value:d.toLocaleDateString('zh-TW',{month:'2-digit',day:'2-digit'});};
export function AiScreen(){
  const ai=useAiNewsRuntime();
  const finance=useFinance();
  const editor=usePageEditor('ai');
  const [settingsOpen,setSettingsOpen]=useState(false);
  const [query,setQuery]=useState('');
  const holdingsOnly=editor.displayConfig.newsHoldingsOnly??true;
  const newsCount=Math.max(1,Math.min(10,Number(editor.displayConfig.newsVisibleCount??10)));
  const holdingSymbols=useMemo(()=>new Set(finance.holdings.map(x=>x.symbol.toUpperCase())),[finance.holdings]);
  const items=useMemo(()=>ai.items.filter(item=>!holdingsOnly||holdingSymbols.has(item.symbol.toUpperCase())).filter(item=>{const q=query.trim().toLowerCase();return !q||item.symbol.toLowerCase().includes(q)||item.name.toLowerCase().includes(q)||item.title.toLowerCase().includes(q)||item.summary.toLowerCase().includes(q);}).slice(0,newsCount),[ai.items,holdingsOnly,holdingSymbols,query,newsCount]);
  const ask=(question:string)=>{const q=question.toLowerCase();const symbol=finance.holdings.find(h=>q.includes(h.symbol.toLowerCase())||q.includes(h.name.toLowerCase()));const related=(symbol?ai.items.filter(item=>item.symbol===symbol.symbol):ai.items).slice(0,3);if(q.includes('新聞')||q.includes('消息'))return related.length?related.map((item,index)=>`${index+1}. ${item.symbol} ${item.title}（${item.source}）`).join('\n'):'目前沒有符合條件的新聞。';if(q.includes('市值')||q.includes('資產'))return `目前持股市值 NT$ ${Math.round(finance.snapshot.portfolio.totalMarketValue).toLocaleString('zh-TW')}；含息總損益 NT$ ${Math.round(finance.snapshot.portfolio.totalPnl).toLocaleString('zh-TW')}。`;if(symbol)return related.length?`${symbol.symbol} ${symbol.name} 最近整理到：\n${related.map(item=>`• ${item.title}`).join('\n')}`:`${symbol.symbol} ${symbol.name} 目前沒有已取得的相關新聞。`;return related.length?`依目前持股與已取得新聞，最近重點：\n${related.map(item=>`• ${item.symbol} ${item.title}`).join('\n')}`:'目前尚無可整理的新聞資料。';};
  return <><PageShell title="AI 助理" subtitle="持股新聞智慧整理；行情與金融數值仍只讀 Finance Core" actions={<PageGearButton onPress={()=>setSettingsOpen(true)}/>}>
    <PageEditorStack pageKey="ai" frames={[{key:'ai-news',element:
      <FrameCard title="AI 持股新聞">
        <View style={styles.row}><View style={{flex:1}}><Text style={styles.note}>自動依目前持股抓取網路新聞，保留來源與新聞日期，再產生重點摘要。</Text>{ai.lastError?<Text style={styles.error}>{ai.lastError}</Text>:null}</View>
        <Pressable style={[styles.refresh,ai.refreshing&&styles.disabled]} disabled={ai.refreshing} onPress={()=>void ai.refresh()}><Text style={styles.refreshText}>{ai.refreshing?'更新中':'更新新聞'}</Text></Pressable></View>
        <TextInput value={query} onChangeText={setQuery} placeholder="搜尋 ETF、名稱或新聞關鍵字" placeholderTextColor={colors.textSecondary} style={styles.search}/>
        <Text style={styles.updated}>最近更新：{ai.lastUpdatedAt?new Date(ai.lastUpdatedAt).toLocaleString('zh-TW'):'尚未更新'}</Text>
        {items.map(item=><Pressable key={item.id} accessibilityRole="link" disabled={!item.url} onPress={()=>void Linking.openURL(item.url)} style={({pressed})=>[styles.item,pressed&&styles.pressed,!item.url&&styles.disabled]}>
          <View style={styles.badge}><Text style={styles.badgeText}>{item.symbol}</Text></View>
          <View style={{flex:1}}><Text style={styles.title}>{item.title}</Text><Text style={styles.summary}>{item.summary}</Text><Text style={styles.meta}>{item.name} · {item.source} · {date(item.publishedAt)} · 點擊開啟原文</Text></View>
        </Pressable>)}
        <AiQuestionBox title="AI 持股問答" suggestions={['最近持股有什麼新聞？','目前持股市值？']} onAsk={ask}/>
        {!items.length?<Text style={styles.empty}>尚無符合目前顯示條件的新聞資料，按「更新新聞」取得最新持股相關資訊。</Text>:null}
      </FrameCard>
    }]}/>
  </PageShell><PageFrameSettingsModal visible={settingsOpen} pageKey="ai" title="AI 助理" frames={PAGE_FRAMES.ai} onClose={()=>setSettingsOpen(false)}/></>;
}
const styles=StyleSheet.create({
  row:{flexDirection:'row',gap:10,alignItems:'center'},note:{fontSize:11,lineHeight:17,color:colors.textSecondary},error:{fontSize:10,color:colors.loss,marginTop:4},
  refresh:{paddingHorizontal:12,paddingVertical:9,borderRadius:radius.pill,backgroundColor:colors.primary},refreshText:{fontSize:10,fontWeight:'900',color:'#FFF'},disabled:{opacity:.45},
  item:{flexDirection:'row',gap:10,paddingVertical:11,borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:colors.border},badge:{minWidth:48,paddingHorizontal:8,paddingVertical:5,borderRadius:radius.pill,backgroundColor:colors.surfaceMuted,alignSelf:'flex-start'},badgeText:{fontSize:10,fontWeight:'900',color:colors.primary,textAlign:'center'},
  search:{minHeight:42,borderWidth:1,borderColor:colors.border,borderRadius:radius.md,paddingHorizontal:11,color:colors.text,fontSize:12,backgroundColor:colors.surface},updated:{fontSize:9,color:colors.textSecondary},pressed:{opacity:.65},
  title:{fontSize:12,fontWeight:'900',lineHeight:18,color:colors.text},summary:{fontSize:10,lineHeight:16,color:colors.textSecondary,marginTop:4},meta:{fontSize:9,color:colors.textSecondary,marginTop:4},empty:{fontSize:11,color:colors.textSecondary,paddingVertical:12}
});
