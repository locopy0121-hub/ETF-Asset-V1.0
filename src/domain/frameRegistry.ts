import type { MainPageKey } from './pageRegistry';

export type PageFrameDefinition = {
  key: string;
  title: string;
  description: string;
};

export const PAGE_FRAMES: Record<MainPageKey, readonly PageFrameDefinition[]> = {
  home: [
    { key:'asset-dashboard', title:'資產儀表板', description:'總資產、今日損益與股息摘要' },
    { key:'market-news', title:'市場新聞', description:'市場資訊快速掃描' },
    { key:'holding-quotes', title:'持股行情模塊', description:'即時行情、漲跌與持股損益' },
    { key:'pnl-detail', title:'損益明細', description:'今日、本月、今年與含息損益' },
  ],
  ledger: [
    { key:'quick-entry', title:'快速建檔', description:'買進、賣出、股息與其他' },
    { key:'ledger-list', title:'交易紀錄', description:'搜尋、篩選與帳務明細' },
    { key:'monthly-summary', title:'月度摘要', description:'買進、賣出、股息與現金流' },
  ],
  portfolio: [
    { key:'holding-dashboard', title:'持股分析儀表板', description:'市值、成本、損益、含息報酬' },
    { key:'allocation', title:'資產配置', description:'持股與資產分類占比' },
    { key:'holding-view', title:'持股檢視', description:'清單模式與行情牆模式共用框架' },
  ],
  dividend: [
    { key:'dividend-summary', title:'股息摘要', description:'本月、年度、月平均' },
    { key:'dividend-calendar', title:'股息月曆', description:'必要主框架與事件狀態' },
    { key:'dividend-list', title:'股息清單', description:'日期、標的、金額、狀態' },
    { key:'annual-trend', title:'年度趨勢', description:'1–12 月股息趨勢' },
  ],
  ai: [
    { key:'ai-news', title:'AI 持股新聞', description:'網路新聞、來源、日期與智慧摘要' },
  ],
  settings: [
    { key:'system', title:'系統設定', description:'行情、背景、權限、診斷與通知' },
    { key:'accounting', title:'帳務系統', description:'公式、券商費率、交易預設與核心狀態' },
    { key:'data', title:'資料系統', description:'ETF 基礎資料、資料概況與完整性' },
    { key:'backup', title:'備份與還原', description:'備份、匯出、匯入、還原與安全清除' },
    { key:'monitor', title:'即時監控器', description:'Floating Monitor 模式、模板與刷新' },
    { key:'display', title:'顯示與格式', description:'字體、金額、百分比、日期與損益色' },
    { key:'app', title:'App 管理', description:'預設設定、版本、更新與診斷資訊' },
    { key:'legal', title:'法律與資訊', description:'免責、行情、試算與關於 TF Asset' },
  ],
};
