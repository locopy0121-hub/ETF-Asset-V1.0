/** Current-package release notes; update in the same commit as every version bump. */
export const APP_RELEASE_NOTES={
 version:'5.0.26',androidVersionCode:50026,headline:'首頁自選股票直達市場標的',
 changes:[
  {id:'research-route',title:'首頁自選卡片直達指定股票',detail:'從首頁的自選股票卡片開啟市場頁時，連同代號與名稱傳遞，直接載入該股票的行情與圖表，不再只切換到空白市場頁。'},
  {id:'selection-validation',title:'標的識別與一般導航隔離',detail:'點擊前檢查股票代號格式，從底部導覽直接進入市場頁時不沿用先前從首頁點選的股票。'},
  {id:'market-source-safety',title:'沿用唯一行情與帳務資料來源',detail:'股票詳細行情仍由原有市場 Runtime 訂閱，本版只修正導覽選取，不修改報價、成本、持股、備份及自選清單內容。'},
 ],
 notice:'目前為 QA 驗收版本；導覽操作及市場頁實際載入需 Android 真機確認。Live、Widget、Mini 與跨區滑動仍有其他待驗事項，不能宣稱正式 Release PASS。',
} as const;
