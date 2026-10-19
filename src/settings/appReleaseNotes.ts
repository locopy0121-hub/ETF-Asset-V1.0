/** Current-package release notes; update in the same commit as every version bump. */
export const APP_RELEASE_NOTES={
 version:'5.0.28',androidVersionCode:50028,headline:'動畫效果完整擴充與錯誤版本基底修正',
 changes:[
  {id:'motion-catalog',title:'新增 42 種動畫效果',detail:'基本、進場、退場、強調、數值、視覺、互動、行情事件動畫，依分類選擇並支援預覽。'},
  {id:'motion-parameters',title:'動畫時間、強度與觸發條件',detail:'新增 100–1200 ms 動畫時間、0–100% 強度、循環設定、首次顯示與行情變動等觸發條件；原有設定自動相容。'},
  {id:'motion-home-wall',title:'首頁行情欄位與頁面編輯工作台整合',detail:'首頁持股行情欄位與一般頁面框架可使用新增動畫目錄及預覽。受保護的 Monitor、Mini 與 Widget 設定子面板保持既有特效選項；新增動畫未全部開放至這些入口。'},
  {id:'motion-source-correction',title:'修正動畫擴充來源版本',detail:'從 TF Asset V5.0.27 延續為 V5.0.28，保留持股／自選行情牆、新聞修正及既有 UI；非舊版 V5.0.1 基底。'},
 ],
 notice:'本版為 QA 測試版本。Android 桌面 Widget 的 RemoteViews 不支援完整 React Native 動畫；Monitor／Mini／Widget 原有的受保護編輯子面板未新增 42 種動畫選項。新增效果需 Android 真機驗收；動畫預設停用，持股、行情、帳務及設定主頁維持原樣。',
} as const;
