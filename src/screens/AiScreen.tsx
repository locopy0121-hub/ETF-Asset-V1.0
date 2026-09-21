import {useMemo,useState} from 'react';
import {Pressable,StyleSheet,Text,View} from 'react-native';
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
  const holdingsOnly=editor.displayConfig.newsHoldingsOnly??true;
  const newsCount=Math.max(1,Math.min(10,Number(editor.displayConfig.newsVisibleCount??10)));
  const holdingSymbols=useMemo(()=>new Set(finance.holdings.map(x=>x.symbol.toUpperCase())),[finance.holdings]);
  const items=useMemo(()=>ai.items.filter(item=>!holdingsOnly||holdingSymbols.has(item.symbol.toUpperCase())).slice(0,newsCount),[ai.items,holdingsOnly,holdingSymbols]);
  return <><PageShell title="AI 助理" subtitle="持股新聞智慧整理；行情與金融數值仍只讀 Finance Core" actions={<PageGearButton onPress={()=>setSettingsOpen(true)}/>}>
    <PageEditorStack pageKey="ai" frames={[{key:'ai-news',element:
      <FrameCard title="AI 持股新聞">
        <View style={styles.row}><View style={{flex:1}}><Text style={styles.note}>自動依目前持股抓取網路新聞，保留來源與新聞日期，再產生重點摘要。</Text>{ai.lastError?<Text style={styles.error}>{ai.lastError}</Text>:null}</View>
        <Pressable style={[styles.refresh,ai.refreshing&&styles.disabled]} disabled={ai.refreshing} onPress={()=>void ai.refresh()}><Text style={styles.refreshText}>{ai.refreshing?'更新中':'更新新聞'}</Text></Pressable></View>
        {items.map(item=><View key={item.id} style={styles.item}>
          <View style={styles.badge}><Text style={styles.badgeText}>{item.symbol}</Text></View>
          <View style={{flex:1}}><Text style={styles.title}>{item.title}</Text><Text style={styles.summary}>{item.summary}</Text><Text style={styles.meta}>{item.name} · {item.source} · {date(item.publishedAt)}</Text></View>
        </View>)}
        {!items.length?<Text style={styles.empty}>尚無符合目前顯示條件的新聞資料，按「更新新聞」取得最新持股相關資訊。</Text>:null}
      </FrameCard>
    }]}/>
  </PageShell><PageFrameSettingsModal visible={settingsOpen} pageKey="ai" title="AI 助理" frames={PAGE_FRAMES.ai} onClose={()=>setSettingsOpen(false)}/></>;
}
const styles=StyleSheet.create({
  row:{flexDirection:'row',gap:10,alignItems:'center'},note:{fontSize:11,lineHeight:17,color:colors.textSecondary},error:{fontSize:10,color:colors.loss,marginTop:4},
  refresh:{paddingHorizontal:12,paddingVertical:9,borderRadius:radius.pill,backgroundColor:colors.primary},refreshText:{fontSize:10,fontWeight:'900',color:'#FFF'},disabled:{opacity:.45},
  item:{flexDirection:'row',gap:10,paddingVertical:11,borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:colors.border},badge:{minWidth:48,paddingHorizontal:8,paddingVertical:5,borderRadius:radius.pill,backgroundColor:colors.surfaceMuted,alignSelf:'flex-start'},badgeText:{fontSize:10,fontWeight:'900',color:colors.primary,textAlign:'center'},
  title:{fontSize:12,fontWeight:'900',lineHeight:18,color:colors.text},summary:{fontSize:10,lineHeight:16,color:colors.textSecondary,marginTop:4},meta:{fontSize:9,color:colors.textSecondary,marginTop:4},empty:{fontSize:11,color:colors.textSecondary,paddingVertical:12}
});
