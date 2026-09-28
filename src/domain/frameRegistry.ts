import type { MainPageKey } from './pageRegistry';

export type PageFrameDefinition = {
  key: string;
  title: string;
  description: string;
};

export const PAGE_FRAMES: Record<MainPageKey, readonly PageFrameDefinition[]> = {
  home: [
    { key:'page-header', title:'頁面頂部表頭', description:'TF Asset 品牌、標題、副標及右側按鈕區' },
    { key:'asset-dashboard', title:'資產總覽', description:'方案 C 主資產總覽與總資產金額' },
    { key:'profit-analysis', title:'損益分析', description:'已實現、含息、未實現與持股市值四宮格' },
    { key:'pnl-detail', title:'損益明細', description:'首頁損益摘要與查看更多入口' },
    { key:'dashboard-quick-actions', title:'快捷功能', description:'首頁常用功能快速入口' },
    { key:'market-news', title:'市場新聞', description:'市場資訊快速掃描' },
    { key:'holding-quotes', title:'持股行情模塊', description:'即時行情、漲跌與持股損益；行情牆內部設定保持原樣' },
  ],
  ledger: [
    { key:'page-header', title:'頁面頂部表頭', description:'TF Asset 品牌、標題、副標及右側按鈕區' },
    { key:'quick-entry', title:'快速建檔', description:'買進、賣出、股息與其他' },
    { key:'ledger-list', title:'交易紀錄', description:'搜尋、篩選與帳務明細' },
    { key:'monthly-summary', title:'月度摘要', description:'買進、賣出、股息與現金流' },
  ],
  portfolio: [
    { key:'page-header', title:'頁面頂部表頭', description:'TF Asset 品牌、標題、副標及右側按鈕區' },
    { key:'holding-dashboard', title:'持股分析儀表板', description:'市值、成本、損益、含息報酬' },
    { key:'allocation', title:'資產配置', description:'持股與資產分類占比' },
    { key:'holding-view', title:'持股檢視', description:'清單模式與行情牆模式共用框架' },
    { key:'holding-detail-header', title:'個股資訊表頭', description:'個股名稱、代號、返回與編輯入口；與庫存主頁表頭獨立保存' },
    { key:'holding-detail-quote', title:'個股即時行情', description:'即時價格、漲跌、來源、圖表樣式、資料來源與歷史圖表' },
    { key:'holding-detail-info', title:'個股持股資訊', description:'持有股數、純成交均價、含費成本均價與目前市值' },
    { key:'holding-detail-pnl', title:'個股損益拆解', description:'純價差、淨清算、已實現與含息總損益' },
    { key:'holding-detail-dividend', title:'個股股息資訊', description:'累積淨股息與持股占比' },
    { key:'holding-detail-history', title:'個股交易與股息紀錄', description:'此標的歷史買賣與股息摘要' },
    { key:'holding-detail-calculator', title:'個股試算入口', description:'導向既有正式試算核心的說明區' },
  ],
  dividend: [
    { key:'page-header', title:'頁面頂部表頭', description:'TF Asset 品牌、標題、副標及右側按鈕區' },
    { key:'dividend-summary', title:'股息摘要', description:'本月、年度、月平均' },
    { key:'dividend-calendar', title:'股息月曆', description:'必要主框架與事件狀態' },
    { key:'dividend-list', title:'股息清單', description:'日期、標的、金額、狀態' },
    { key:'annual-trend', title:'年度趨勢', description:'1–12 月股息趨勢' },
  ],
  ai: [
    { key:'page-header', title:'頁面頂部表頭', description:'TF Asset 品牌、標題、副標及右側按鈕區' },
    { key:'ai-news', title:'AI 持股新聞', description:'網路新聞、來源、日期與智慧摘要' },
  ],
  settings: [
    { key:'page-header', title:'頁面頂部表頭', description:'TF Asset 品牌、標題、副標及右側按鈕區' },
    { key:'system', title:'系統設定', description:'行情、背景、權限、診斷與通知' },
    { key:'accounting', title:'帳務系統', description:'公式、券商費率、交易預設與核心狀態' },
    { key:'data', title:'資料系統', description:'統一即時行情、ETF 標籤、行情牆 A/B 編輯與資料完整性' },
    { key:'backup', title:'備份與還原', description:'備份、匯出、匯入、還原與安全清除' },
    { key:'monitor', title:'即時監控器', description:'Floating Monitor 模式、模板與刷新' },
    { key:'display', title:'視覺與主題', description:'主題、背景、App Icon、字體、格式與損益色' },
    { key:'ai', title:'AI 控制', description:'AI 助理開關、浮動按鈕與顯示控制' },
    { key:'app', title:'App 管理', description:'預設設定、版本、更新與診斷資訊' },
    { key:'legal', title:'法律與資訊', description:'免責、行情、試算與關於 TF Asset' },
  ],
};
