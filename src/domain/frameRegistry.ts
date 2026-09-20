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
  settings: [
    { key:'general', title:'一般設定', description:'顯示、通知與個人偏好' },
    { key:'accounting', title:'帳務設定', description:'券商與帳務允許參數' },
    { key:'market', title:'市場與行情', description:'行情來源、排程、狀態與快取' },
    { key:'plugins', title:'外掛設定', description:'Widget 與 Floating Monitor' },
    { key:'system', title:'系統設定', description:'背景、通知與權限' },
    { key:'backup', title:'資料備份', description:'備份、還原、匯入匯出' },
    { key:'disclaimer', title:'免責聲明', description:'版本、隱私與法律資訊' },
  ],
};
