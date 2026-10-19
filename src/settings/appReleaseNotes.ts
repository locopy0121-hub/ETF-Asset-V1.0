/** Current-package release notes; update in the same commit as every version bump. */
export const APP_RELEASE_NOTES={
 version:'5.0.28',androidVersionCode:50028,headline:'動畫效果完整擴充與錯誤版本基底修正',
 changes:[
  {id:'motion-catalog',title:'新增 42 種動畫效果',detail:'基本、進場、退場、強調、數值、視覺、互動、行情事件動畫，依分類選擇並支援預覽。'},
  {id:'motion-parameters',title:'動畫時間、強度與觸發條件',detail:'新增 100–1200 ms 動畫時間、0–100% 強度、循環設定、首次顯示與行情變動等觸發條件；原有設定自動相容。'},
  {id:'motion-home-wall',title:'行情牆與編輯工作台整合',detail:'首頁持股行情欄位、Mini、Widget 編輯器與頁面框架可選擇動畫，已載入的數值不因畫面效果改寫。'},
  {id:'motion-source-correction',title:'修正動畫擴充來源版本',detail:'從 TF Asset V5.0.27 延續為 V5.0.28，保留持股／自選行情牆、新聞修正及既有 UI；非舊版 V5.0.1 基底。'},
 ],
 notice:'本版為 QA 測試版本。Android 桌面 Widget 的 RemoteViews 不支援完整 React Native 動畫；實際可播放特效仍需原生端驗收。所有畫面動效預設停用，保留既有持股、行情與設定主頁。',
} as const;
