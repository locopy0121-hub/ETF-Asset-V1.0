/** Current-package release notes; update in the same commit as every version bump. */
export const APP_RELEASE_NOTES={
 version:'5.0.38',androidVersionCode:50038,headline:'基於 V5.0.37 圖表版的低耗電行情修護',
 changes:[
  {id:'power-lineage',title:'保留 V5.0.37 圖表與全局動畫',detail:'以已通過 CI 的 V5.0.37 圖表預覽同步分支為版本基底，只移植原生行情節能邏輯，不退回舊版調色盤、卡片編輯或圖表功能。'},
  {id:'screen-locked',title:'手機鎖定時停止原生即時行情',detail:'盤中偵測螢幕關閉及鎖定後，暫停富果 WebSocket 並停止 Headless JS 背景服務；解鎖且仍在交易日與有效時段時才嘗試恢復訂閱。'},
  {id:'afterhours-cache',title:'盤後與休市改為快取唯讀',detail:'收盤、假日及鎖定狀態不主動請求 REST 行情或背景交易資料，保留最後有來源時間的有效快取，不把舊行情標示為即時。'},
  {id:'widget-lowpower',title:'Widget、Mini 與原生快取節能',detail:'Widget 有效期提示改用不喚醒裝置的 Alarm，浮動監控畫面合併重繪並暫停背景呼吸動畫；五秒資料寫入工作隨即時訂閱停止。'},
  {id:'regression',title:'新增鎖屏與完整版本回歸驗證',detail:'執行盤中／鎖定／解鎖／盤後原生市場擁有者測試、既有財務與備份檢查，並沿用 V5.0.37 圖表預覽及全局動畫功能測試。'},
 ],
 notice:'本版為 QA 驗收版。Android 真機鎖屏與重新喚醒、Android 12+ 背景服務限制、桌面 Widget／Mini LIVE 恢復、實際電量消耗及 APK 覆蓋安裝簽章均需驗證；盤後資料維持最後已核實快取，並非保證當日官方最終收盤數據。',
} as const;
