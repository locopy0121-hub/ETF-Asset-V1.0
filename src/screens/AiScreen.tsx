import {useState} from 'react';
import {Pressable,StyleSheet,Text,View} from 'react-native';

import {useAiNewsRuntime} from '../ai/AiNewsRuntime';
import {type AiAssistantAction} from '../ai/aiAssistant';
import {answerWithGemini,type GeminiDiagnostic} from '../ai/geminiAssistant';
import {dividendEventToLedger} from '../ai/dividendAssistant';
import {AiQuestionBox} from '../components/AiQuestionBox';
import {FrameCard} from '../components/FrameCard';
import {PageEditorStack} from '../components/PageEditorStack';
import {PageFrameSettingsModal} from '../components/PageFrameSettingsModal';
import {PageGearButton} from '../components/PageGearButton';
import {PageShell} from '../components/PageShell';
import {PAGE_FRAMES} from '../domain/frameRegistry';
import {usePageEditor} from '../editor/pageEditor';
import {useFinance} from '../finance/FinanceRuntime';
import {colors,radius,spacing} from '../theme/tokens';

export function AiScreen(){
  const ai=useAiNewsRuntime();
  const finance=useFinance();
  const editor=usePageEditor('ai');
  const [settingsOpen,setSettingsOpen]=useState(false);
  const [geminiDiagnostic,setGeminiDiagnostic]=useState<GeminiDiagnostic|null>(null);
  const ask=(question:string)=>answerWithGemini(
    question,
    finance.holdings,
    finance.snapshot.portfolio,
    ai.items,
    finance.entries,
    finance.quotes,
    setGeminiDiagnostic,
  );
  const runAction=(action:AiAssistantAction)=>{if(action.kind==='addDividend')finance.addDividend(dividendEventToLedger(action.event));};
  const newsCount=Math.max(1,Math.min(10,Number(editor.displayConfig.newsVisibleCount??10)));
  const holdingsOnly=editor.displayConfig.newsHoldingsOnly??true;

  return <><PageShell pageKey="ai" title="AI 助理" subtitle="Gemini AI × TF Asset 即時資料中心；新聞只是其中一個資料來源" actions={<PageGearButton onPress={()=>setSettingsOpen(true)}/>}>
    <PageEditorStack pageKey="ai" frames={[{key:'ai-news',element:
      <FrameCard title="AI 財務管家">
        <View style={styles.overview}>
          <View style={styles.overviewTile}><Text style={styles.overviewLabel}>持股</Text><Text style={styles.overviewValue}>{finance.holdings.length} 檔</Text></View>
          <View style={styles.overviewTile}><Text style={styles.overviewLabel}>帳務</Text><Text style={styles.overviewValue}>{finance.entries.length} 筆</Text></View>
          <View style={styles.overviewTile}><Text style={styles.overviewLabel}>新聞</Text><Text style={styles.overviewValue}>{ai.items.length} 則</Text></View>
        </View>
        <View style={styles.capabilityPanel}>
          <Text style={styles.capabilityTitle}>Gemini 已接入</Text>
          <Text style={styles.capabilityText}>資產配置 · 持股排行 · 最近交易 · 單檔成本／損益 · 股息更新 · 持股新聞</Text>
        </View>
        <View style={styles.diagnosticPanel}>
          <Text style={styles.diagnosticTitle}>Gemini 連線／格式診斷</Text>
          <Text style={styles.diagnosticLine}>Endpoint：{geminiDiagnostic?.endpoint??'https://etf-butler-ai.locopy0121.workers.dev/'}</Text>
          <Text style={styles.diagnosticLine}>Method：POST · Content-Type：application/json</Text>
          <Text style={styles.diagnosticLine}>Request keys：{geminiDiagnostic?.requestKeys.join(', ')??'provider, app, locale, message, prompt, instruction, snapshot'}</Text>
          <Text style={styles.diagnosticLine}>Payload：{geminiDiagnostic?geminiDiagnostic.payloadBytes+' bytes':'尚未送出'}</Text>
          <Text style={[styles.diagnosticLine,geminiDiagnostic?.status&&geminiDiagnostic.status>=400?styles.error:null]}>HTTP：{geminiDiagnostic?.status??'尚未取得'}{geminiDiagnostic?.statusText?' '+geminiDiagnostic.statusText:''}</Text>
          <Text style={styles.diagnosticLine}>Response Content-Type：{geminiDiagnostic?.responseContentType??'—'}</Text>
          <Text style={styles.diagnosticBody} selectable>{geminiDiagnostic?.responseBodyPreview||'送出一個問題後，這裡會顯示 Worker 回傳的錯誤本文前 1,800 字；不顯示持股、帳務或完整 Snapshot 內容。'}</Text>
        </View>
        <AiQuestionBox
          title="直接詢問或下達資料整理指令"
          suggestions={['你可以做什麼？','目前資產配置？','哪一檔賺最多？','最近 5 筆交易？','目前持股市值？','目前損益？','更新持股股息日','最近持股有什麼新聞？']}
          onAsk={ask}
          onAction={runAction}
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
    }]}/>
  </PageShell><PageFrameSettingsModal visible={settingsOpen} pageKey="ai" title="AI 助理" frames={PAGE_FRAMES.ai} onClose={()=>setSettingsOpen(false)}/></>;
}

const styles=StyleSheet.create({
  overview:{flexDirection:'row',gap:8},
  overviewTile:{flex:1,paddingVertical:10,paddingHorizontal:10,borderRadius:radius.md,backgroundColor:colors.surfaceMuted},
  overviewLabel:{fontSize:9,fontWeight:'800',color:colors.textSecondary},
  overviewValue:{fontSize:15,fontWeight:'900',color:colors.text,marginTop:2},
  capabilityPanel:{padding:10,borderRadius:radius.md,borderWidth:StyleSheet.hairlineWidth,borderColor:colors.border,backgroundColor:'#F8FBFF'},
  capabilityTitle:{fontSize:10,fontWeight:'900',color:colors.primary},
  capabilityText:{fontSize:10,lineHeight:16,color:colors.textSecondary,marginTop:3},
  diagnosticPanel:{padding:10,borderRadius:radius.md,borderWidth:StyleSheet.hairlineWidth,borderColor:colors.border,backgroundColor:'#FFFDF7',gap:3},
  diagnosticTitle:{fontSize:10,fontWeight:'900',color:colors.text},
  diagnosticLine:{fontSize:9,lineHeight:14,color:colors.textSecondary},
  diagnosticBody:{fontSize:9,lineHeight:14,color:colors.text,marginTop:3,padding:7,borderRadius:radius.sm,backgroundColor:colors.surfaceMuted},
  source:{flexDirection:'row',alignItems:'center',gap:spacing.sm,paddingTop:spacing.md,borderTopWidth:StyleSheet.hairlineWidth,borderTopColor:colors.border},
  sourceTitle:{fontSize:11,fontWeight:'900',color:colors.text},sourceText:{fontSize:10,lineHeight:16,color:colors.textSecondary,marginTop:3},
  error:{fontSize:10,color:colors.loss,marginTop:3},
  refresh:{paddingHorizontal:11,paddingVertical:8,borderRadius:radius.pill,backgroundColor:colors.primary},
  refreshText:{fontSize:10,fontWeight:'900',color:'#FFFFFF'},disabled:{opacity:.45},
});
