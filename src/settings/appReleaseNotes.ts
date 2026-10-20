/** Current-package release notes; update in the same commit as every version bump. */
export const APP_RELEASE_NOTES={
 version:'5.0.36',androidVersionCode:50036,headline:'全局元件行情動畫應用',
 changes:[
  {id:'target-motion',title:'動畫由固定行情欄位擴充至各頁實際元件',detail:'在頁面編輯與維護工程師的已掛載元件上加入共用的 42 種動畫選擇。文字、數值與卡片等元件可各自設定，不需要預先寫死行情欄位。'},
  {id:'target-motion-save',title:'動畫設定納入個體／同類連動與重設',detail:'持久化原始 42 種動畫代碼、觸發條件、速度、時長、強度與循環設定；預設不啟用，允許個別重設與明確指定同類元件跨頁樣式同步。'},
  {id:'target-motion-runtime',title:'動畫套用至已掛載真實元件',detail:'僅在選擇動畫後為元件掛接視覺動畫，不改行情、財務計算、布局尺寸及原生資料來源；舊有行情牆與框架動畫仍保留。'},
 ],
 notice:'本版為 QA 驗收版；React Native 已掛載 A 元件可個別應用動畫。未接入此元件路徑的 Android 原生 Widget、Floating Monitor、特定圖表與其手勢互動需逐項真機驗證，不能視為全局 Release PASS。',
} as const;
