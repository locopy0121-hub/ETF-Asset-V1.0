/** Current-package release notes; update in the same commit as every version bump. */
export const APP_RELEASE_NOTES={
 version:'5.0.32',androidVersionCode:50032,headline:'鎖屏停更與盤後節能',
 changes:[
  {id:'power-session',title:'盤後與休市停止行情自動更新',detail:'沿用交易日曆與時段排程，結束交易後停止富果 LIVE 訂閱與背景行情服務；僅顯示最後已核實快取，不將過期價格誤標為最新成交。'},
  {id:'power-screen',title:'鎖定螢幕時暫停行情連線',detail:'盤中鎖屏立即暫停 WebSocket 報價與背景 Headless 行情工作；解鎖後仍在交易時段才嘗試重新接收 LIVE。'},
  {id:'power-widget',title:'Widget 與 Mini 降低背景耗電',detail:'Widget 行情有效期提醒不主動喚醒手機；浮動行情窗合併過量重繪，畫面非前景時停止裝飾性循環動畫。'},
  {id:'power-gate',title:'節能狀態與行情來源驗收測試',detail:'新增交易中、鎖屏、解鎖、盤後的原生政策與控制器回歸；不變更財務庫存數據及受保護設定頁結構。'},
 ],
 notice:'V5.0.32 為 QA 安裝驗收版。手機鎖屏與喚醒、Android 背景啟動限制、浮動窗與 Widget 的真機 LIVE 恢復、實際耗電與 APK 覆蓋安裝仍須驗證。重新開啟 App 可觸發前景恢復；盤後僅保留先前已核實行情，無新行情時不能視為已同步今日官方收盤。',
} as const;
