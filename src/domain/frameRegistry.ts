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
    {key:'news-reader',title:'新聞閱讀器',description:'業務視窗獨立外觀設定，原始資料維持唯讀'},
    {key:'purchase-pnl-modal',title:'購買損益統計',description:'業務視窗獨立外觀設定，原始資料維持唯讀'},
    {key:'app-navigation',title:'底部導覽列',description:'全 App 共用導覽外觀'},
    {key:'floating-ai',title:'浮動 AI 視窗',description:'浮動面板與按鈕外觀，不讀取對話原值'},
  ],
  ledger: [
    { key:'page-header', title:'頁面頂部表頭', description:'TF Asset 品牌、標題、副標及右側按鈕區' },
    { key:'quick-entry', title:'快速建檔', description:'買進、賣出、股息與其他' },
    { key:'ledger-list', title:'交易紀錄', description:'搜尋、篩選與帳務明細' },
    { key:'monthly-summary', title:'月度摘要', description:'買進、賣出、股息與現金流' },
    {key:'trade-detail-modal',title:'交易完整明細',description:'業務視窗獨立外觀設定，原始資料維持唯讀'},
    {key:'date-picker-modal',title:'交易日期選擇',description:'業務視窗獨立外觀設定，原始資料維持唯讀'},
    {key:'confirm-entry-modal',title:'確認入帳',description:'業務視窗獨立外觀設定，原始資料維持唯讀'},
  ],
  portfolio: [
    { key:'page-header', title:'頁面頂部表頭', description:'TF Asset 品牌、標題、副標及右側按鈕區' },
    { key:'holding-dashboard', title:'持股分析儀表板', description:'市值、成本、損益、含息報酬' },
    { key:'allocation', title:'資產配置', description:'持股與資產分類占比' },
    { key:'holding-view', title:'持股檢視', description:'清單模式與行情牆模式共用框架' },
    { key:'holding-detail-header', title:'個股資訊表頭', description:'個股名稱、代號、返回與編輯入口；與庫存主頁表頭獨立保存' },
    { key:'holding-detail-quote', title:'個股即時行情', description:'即時價格、漲跌、來源、圖表樣式、資料來源與歷史圖表' },
    { key:'holding-detail-info', title:'個股持股資訊', description:'持有股數、純成交均價、含費成本均價與目前市值' },
    { key:'holding-detail-constituents', title:'ETF 成分股', description:'成分股名稱、代號、權重、資料日期、來源與完整清單' },
    { key:'holding-detail-pnl', title:'個股損益拆解', description:'純價差、淨清算、已實現與含息總損益' },
    { key:'holding-detail-dividend', title:'個股股息資訊', description:'累積淨股息與持股占比' },
    { key:'holding-detail-history', title:'個股交易與股息紀錄', description:'此標的歷史買賣與股息摘要' },
    { key:'holding-detail-calculator', title:'個股試算入口', description:'導向既有正式試算核心的說明區' },
    {key:'chart-header',title:'專業圖表表頭',description:'專業圖表頁獨立設定，不改帳務與原始行情'},
    {key:'chart-search',title:'圖表查詢',description:'專業圖表頁獨立設定，不改帳務與原始行情'},
    {key:'chart-holdings',title:'圖表持股選擇',description:'專業圖表頁獨立設定，不改帳務與原始行情'},
    {key:'chart-canvas',title:'專業行情圖表',description:'專業圖表頁獨立設定，不改帳務與原始行情'},
    {key:'chart-style',title:'圖表樣式',description:'專業圖表頁獨立設定，不改帳務與原始行情'},
    {key:'chart-range',title:'圖表時間區間',description:'專業圖表頁獨立設定，不改帳務與原始行情'},
    {key:'chart-sources',title:'圖表資料來源',description:'專業圖表頁獨立設定，不改帳務與原始行情'},
    {key:'chart-note',title:'圖表說明',description:'專業圖表頁獨立設定，不改帳務與原始行情'},
    {key:'calculator-modal',title:'持股試算',description:'業務視窗獨立外觀設定，原始資料維持唯讀'},
  ],
  market: [
    {key:'page-header',title:'市場資訊中心表頭',description:'市場頁主標題與入口'},
    {key:'market-index',title:'台股加權指數',description:'官方加權指數、實際走勢、最新公告及統計'},
    {key:'market-search',title:'標的搜尋',description:'股票與 ETF 代號名稱搜尋'},
    {key:'market-summary',title:'即時行情',description:'統一行情中心行情及來源'},
    {key:'market-chart',title:'技術圖表',description:'分時走勢、歷史日週月 K 線及指標'},
    {key:'market-details',title:'標的研究',description:'官方基本資料、ETF 成分、法人、折溢價與新聞'},
  ],
  dividend: [
    { key:'page-header', title:'頁面頂部表頭', description:'TF Asset 品牌、標題、副標及右側按鈕區' },
    { key:'dividend-summary', title:'股息摘要', description:'本月、年度、月平均' },
    { key:'dividend-ai', title:'股息 AI 問答', description:'獨立 AI 問答框架，與股息摘要各自排序、尺寸及顯示' },
    { key:'dividend-calendar', title:'股息月曆', description:'必要主框架與事件狀態' },
    { key:'dividend-list', title:'股息清單', description:'日期、標的、金額、狀態' },
    { key:'annual-trend', title:'年度趨勢', description:'1–12 月股息趨勢' },
    {key:'dividend-entry-modal',title:'新增股息',description:'業務視窗獨立外觀設定，原始資料維持唯讀'},
    {key:'dividend-date-modal',title:'股息日期選擇',description:'業務視窗獨立外觀設定，原始資料維持唯讀'},
  ],
  ai: [
    { key:'page-header', title:'頁面頂部表頭', description:'TF Asset 品牌、標題、副標及右側按鈕區' },
    { key:'ai-news', title:'AI 財務管家', description:'本機資產概況、AI 問答與新聞來源狀態' },
  ],
  settings: [
    { key:'system', title:'系統設定', description:'Android 權限、背景執行、效能、診斷與工程模式' },
    { key:'accounting', title:'帳務設定', description:'公式、券商費率、交易預設、現金核對與核心狀態' },
    { key:'data', title:'行情與資料中心', description:'統一行情、更新排程、ETF 資料、行情牆與資料完整性' },
    { key:'backup', title:'備份與資料安全', description:'備份、匯出、匯入、還原、驗證與安全保護' },
    { key:'monitor', title:'Widget／即時監控器', description:'桌面 Widget、Floating Monitor、Mini、模板與刷新' },
    { key:'display', title:'介面與主題', description:'頁面標題、主題、背景、App Icon、格式、滑動與損益色' },
    { key:'notifications', title:'通知與提醒', description:'除息、配息、行情、更新失敗、備份、聲音與震動' },
    { key:'ai', title:'AI 與智慧功能', description:'AI 助理、浮動入口與智慧功能顯示控制' },
    { key:'app', title:'App 管理', description:'偏好重設、版本、Build 與更新資訊' },
    { key:'legal', title:'法律、資訊與關於', description:'免責、行情、試算、資料說明與關於 TF Asset' },
  ],
};
