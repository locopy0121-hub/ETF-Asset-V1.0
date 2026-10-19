/** Current-package release notes; update in the same commit as every version bump. */
export const APP_RELEASE_NOTES={
 version:'5.0.29',androidVersionCode:50029,headline:'動畫前景／背景生命週期與數值顯示安全修正',
 changes:[
  {id:'motion-foreground-state',title:'所有動畫尊重 App 前景／背景狀態',detail:'單次進場、行情變動及循環動畫均在 App 退至背景或進入 inactive 時停止；回到前景時不重播已過期的單次更新，僅依目前效果條件繼續。'},
  {id:'motion-number-foreground',title:'數值過渡動畫於背景回復最新文字',detail:'數字滾動、遞增、遞減及漸變等效果在 App 不可見時停止過渡，以當前行情文字為準；降低動態效果設定同樣不啟動過渡。'},
  {id:'motion-lifecycle-qa',title:'動畫狀態切換行為回歸',detail:'加入執行中的動畫 Hook 模擬測試，檢查退背景停止、回前景、降低動態效果、數字更新及監聽器清理；不變更行情來源或帳務資料。'},
 ],
 notice:'本版為 QA 驗收版。自動測試不等於 Android 真機實際動畫驗收。Monitor／Mini／Widget 受保護設定子面板維持既有項目，並未宣稱完整開放 42 種效果；桌面 RemoteViews 的動態效果仍有限制。',
} as const;
