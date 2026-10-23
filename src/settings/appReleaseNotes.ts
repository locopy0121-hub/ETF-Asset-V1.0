/** Current-package release notes; update in the same commit as every version bump. */
export const APP_RELEASE_NOTES={
 version:'5.0.39',androidVersionCode:50039,headline:'ETF 每日持股與個股反查 ETF 持有狀況',
 changes:[
  {id:'etf-today',title:'ETF 持股清單標示今日揭露狀況',detail:'在市場 ETF 持股頁展示各個股權重、可核實股數、持股資料日期及來源。僅資料日期確實為今日才顯示今日揭露；未更新時清楚標示非今日。'},
  {id:'etf-stock',title:'個股反查哪些 ETF 持有',detail:'點擊 ETF 成分股可反查已建立索引或已下載 ETF 的持有權重、股數與各 ETF 揭露日期，並可返回 ETF 明細。未涵蓋全市場時明示覆蓋限制。'},
  {id:'etf-source',title:'ETF 資料中心公開持股查詢',detail:'伺服器新增不會觸發爬蟲的唯讀個股反查端點，只統計已儲存的最新 ETF 快照；原有股數欄位在真實來源提供時才保存及顯示。'},
  {id:'etf-regression',title:'資料來源、日期與完整性保護',detail:'新增持股反查、資料日期、重複來源、權重區間、無效股數與部分揭露回歸檢查；沿用 V5.0.38 鎖屏節能、V5.0.37 圖表預覽與財務核心。'},
 ],
 notice:'本版為 QA 驗收版。ETF 可能延遲數日公布或僅揭露部分成分；PCF 申購買回組合不等於基金實際持倉。未設定 ETF 資料中心時僅能反查已下載 ETF；股數缺少來源時不顯示。後端服務須配置且有既有 ETF 快照，才能反查較大範圍。真機 UI、各投信來源可用性及安裝覆蓋仍需驗收。',
} as const;
