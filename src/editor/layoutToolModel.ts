import type {MainPageKey} from '../domain/pageRegistry';

export type LayoutToolTargetKind='frame'|'card'|'text'|'value'|'chart'|'data'|'table'|'calendar'|'form'|'button'|'badge'|'list'|'layout';
export type LayoutToolProfile=Readonly<{label:string;kinds:readonly LayoutToolTargetKind[]}>;

const DEFAULT:LayoutToolProfile={label:'一般模組',kinds:['frame','card','text','value','data']};

const PROFILES:Readonly<Record<string,LayoutToolProfile>>={
  'home:asset-dashboard':{label:'資產儀表板',kinds:['frame','card','text','value','chart','layout']},
  'home:profit-analysis':{label:'損益分析',kinds:['frame','card','text','value','layout']},
  'home:pnl-detail':{label:'損益明細',kinds:['frame','card','text','value','data']},
  'home:dashboard-quick-actions':{label:'快捷功能',kinds:['frame','button','text','layout']},
  'home:market-news':{label:'市場新聞',kinds:['frame','list','card','text','data']},
  'home:holding-quotes':{label:'持股行情牆',kinds:['frame','card','text','value','chart','badge','data']},
  'ledger:quick-entry':{label:'快速建檔',kinds:['frame','form','text','button','data']},
  'ledger:ledger-list':{label:'交易紀錄',kinds:['frame','table','text','data','layout']},
  'ledger:monthly-summary':{label:'月度摘要',kinds:['frame','card','text','value','data']},
  'portfolio:holding-dashboard':{label:'持股分析儀表板',kinds:['frame','card','text','value','chart','layout']},
  'portfolio:allocation':{label:'資產配置',kinds:['frame','chart','text','data']},
  'portfolio:holding-view':{label:'持股檢視',kinds:['frame','table','card','text','value','chart','badge','data']},
  'portfolio:holding-detail-quote':{label:'個股即時行情',kinds:['frame','card','text','value','chart','data']},
  'portfolio:holding-detail-info':{label:'個股持股資訊',kinds:['frame','card','text','value','data']},
  'portfolio:holding-detail-pnl':{label:'個股損益拆解',kinds:['frame','card','text','value','data']},
  'portfolio:holding-detail-dividend':{label:'個股股息資訊',kinds:['frame','card','text','value','data']},
  'portfolio:holding-detail-history':{label:'個股歷史紀錄',kinds:['frame','list','text','data']},
  'dividend:dividend-summary':{label:'股息摘要',kinds:['frame','card','text','value','data']},
  'dividend:dividend-calendar':{label:'股息月曆',kinds:['frame','calendar','card','text','badge','data']},
  'dividend:dividend-list':{label:'股息清單',kinds:['frame','list','card','text','value','badge','data']},
  'dividend:annual-trend':{label:'年度趨勢',kinds:['frame','chart','text','data']},
  'ai:ai-news':{label:'AI 持股新聞',kinds:['frame','list','card','text','data']},
};

export const layoutToolProfile=(page:MainPageKey,frameKey:string):LayoutToolProfile=>
  PROFILES[page+':'+frameKey]??(frameKey.includes('header')?{label:'頁面表頭',kinds:['frame','text','button','layout']}:DEFAULT);

export const layoutKindLabel=(kind:LayoutToolTargetKind):string=>({
  frame:'框架',card:'卡片',text:'文字',value:'數值',chart:'圖表',data:'資料顯示',table:'表格／清單',
  calendar:'月曆',form:'表單',button:'按鈕',badge:'標籤',list:'清單',layout:'佈局',
}[kind]);
