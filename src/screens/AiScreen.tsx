import {useState} from 'react';
import {Pressable,StyleSheet,Text,View} from 'react-native';

import {useAiNewsRuntime} from '../ai/AiNewsRuntime';
import {answerAiQuestion,type AiAssistantAction,type AiConversationTurn} from '../ai/aiAssistant';
import {dividendEventToLedger} from '../ai/dividendAssistant';
import {AiQuestionBox} from '../components/AiQuestionBox';
import {EtfScreener} from '../components/EtfScreener';
import {FrameCard} from '../components/FrameCard';
import {PageEditorStack} from '../components/PageEditorStack';
import {PageFrameSettingsModal} from '../components/PageFrameSettingsModal';
import {PageGearButton} from '../components/PageGearButton';
import {PageShell} from '../components/PageShell';
import {PAGE_FRAMES} from '../domain/frameRegistry';
import {usePageEditor} from '../editor/pageEditor';
import {useFinance} from '../finance/FinanceRuntime';
import {useMarketRuntime} from '../market/MarketRuntime';
import {useSettingsRuntime} from '../settings/SettingsRuntime';
import {colors,radius,spacing} from '../theme/tokens';

export function AiScreen(){
  const ai=useAiNewsRuntime();
  const finance=useFinance();
  const market=useMarketRuntime();
  const settings=useSettingsRuntime();
  const editor=usePageEditor('ai');
  const [settingsOpen,setSettingsOpen]=useState(false);
  const ask=(question:string,conversation:readonly AiConversationTurn[])=>answerAiQuestion(question,finance.holdings,finance.snapshot.portfolio,ai.items,finance.entries,{
    networkSearchEnabled:settings.prefs.ai.networkSearch,
    showSources:settings.prefs.ai.showSources,
    showDates:settings.prefs.ai.showDates,
    responseDetail:settings.prefs.ai.responseDetail,
    conversation:settings.prefs.ai.useHistory?conversation:[],
  });
  const runAction=(action:AiAssistantAction)=>{if(action.kind==='addDividend')finance.addDividend(dividendEventToLedger(action.event));};
  const newsCount=Math.max(1,Math.min(10,Number(editor.displayConfig.newsVisibleCount??10)));
  const holdingsOnly=editor.displayConfig.newsHoldingsOnly??true;

  return <><PageShell title="AI 助理" subtitle="財務資料與 App 操作型助理；新聞只是其中一個資料來源" actions={<PageGearButton onPress={()=>setSettingsOpen(true)}/>}>
    <PageEditorStack pageKey="ai" frames={[
      {key:'etf-screener',element:<FrameCard title="ETF 搜尋／篩選"><EtfScreener catalog={market.catalog}/></FrameCard>},
      {key:'ai-news',element:
      <FrameCard title="AI 財務管家">
        <AiQuestionBox
          title="直接詢問或下達資料整理指令"
          suggestions={['你可以做什麼？','更新持股股息日','目前持股市值？','目前損益？','最近持股有什麼新聞？']}
          onAsk={ask}
          onAction={runAction}
          useHistory={settings.prefs.ai.useHistory}
          confirmBeforeAction={settings.prefs.ai.confirmBeforeWrite}
        />
        <View style={styles.source}>
          <View style={{flex:1}}>
            <Text style={styles.sourceTitle}>新聞資料來源狀態</Text>
            <Text style={styles.sourceText}>AI 持股新聞目前 {ai.items.length} 則 · 顯示上限 {newsCount} · {holdingsOnly?'僅持股相關':'全部相關'}。對話內新聞以文字摘要播送，不以新聞卡片取代 AI 回答。</Text>
            {ai.lastError?<Text style={styles.error}>{ai.lastError}</Text>:null}
          </View>
          <Pressable disabled={ai.refreshing} onPress={()=>void ai.refresh()} style={[styles.refresh,ai.refreshing&&styles.disabled]}><Text style={styles.refreshText}>{ai.refreshing?'更新中':'更新新聞'}</Text></Pressable>
        </View>
      </FrameCard>
      }
    ]}/>
  </PageShell><PageFrameSettingsModal visible={settingsOpen} pageKey="ai" title="AI 助理" frames={PAGE_FRAMES.ai} onClose={()=>setSettingsOpen(false)}/></>;
}

const styles=StyleSheet.create({
  source:{flexDirection:'row',alignItems:'center',gap:spacing.sm,paddingTop:spacing.md,borderTopWidth:StyleSheet.hairlineWidth,borderTopColor:colors.border},
  sourceTitle:{fontSize:11,fontWeight:'900',color:colors.text},sourceText:{fontSize:10,lineHeight:16,color:colors.textSecondary,marginTop:3},
  error:{fontSize:10,color:colors.loss,marginTop:3},
  refresh:{paddingHorizontal:11,paddingVertical:8,borderRadius:radius.pill,backgroundColor:colors.primary},
  refreshText:{fontSize:10,fontWeight:'900',color:'#FFFFFF'},disabled:{opacity:.45},
});
