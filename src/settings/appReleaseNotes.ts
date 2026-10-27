/** Current-package release notes; update in the same commit as every version bump. */
export const APP_RELEASE_NOTES={
 version:'5.0.40',androidVersionCode:50040,headline:'ETF 今日持股與個股反查正式接續版號',
 changes:[
  {id:'v5040-increment',title:'版本正確接續至 V5.0.40',detail:'已安裝 V5.0.39 的下一個 QA APK 版號提升為 5.0.40（Android versionCode 50040），版本資訊、備份記錄及 Android 建置產物同步，不回退至舊版。'},
  {id:'v5040-etf',title:'保留 ETF 每日持股揭露與個股反查',detail:'ETF 成分股可查看權重與實際揭露日期；個股可反查已收錄 ETF 的持有狀況。可核實的股數才顯示，未有當日資料不得冒稱今日。'},
  {id:'v5040-heritage',title:'沿用 V5.0.39 全部資料安全修護',detail:'保留 V5.0.38 鎖屏／盤後節能、V5.0.37 圖表預覽及全局動畫、既有 Finance SSOT 與受保護控制中心，不另行變更這些業務實作。'},
  {id:'v5040-qa',title:'原有 ETF、圖表與 Android APK 品質回歸',detail:'重跑既有完整 CI 品質檢查、ETF 每日揭露與個股反查測試、Gradle 原生 APK 編譯與簽章／版號檢查，確保版本升級可實際生成安裝檔。'},
 ],
 notice:'本版為 V5.0.39 功能的 V5.0.40 QA 升版建置，並非新增今日 ETF 真實揭露來源。資料中心涵蓋範圍仍依設定及已索引快照，未收錄不代表沒有持股；PCF 不等於基金實際持倉。手機覆蓋安裝、真機鎖屏省電與各投信當日資料完整性仍待真機驗證。',
} as const;
