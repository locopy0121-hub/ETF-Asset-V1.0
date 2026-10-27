/** Current-package release notes; update in the same commit as every version bump. */
export const APP_RELEASE_NOTES={
 version:'5.0.41',androidVersionCode:50041,headline:'TWSE 收盤價一次核對與全局行情同步修護',
 changes:[
  {id:'v5041-close',title:'收盤後一次性 TWSE MIS 官方價格核對',detail:'交易日 13:32 後、手機解鎖且 App 在前景時核對當日 TWSE MIS 實際成交價；錯過收盤的手機於下次開啟補核對。不恢復盤後輪詢、鎖屏更新或背景常駐服務。'},
  {id:'v5041-sync',title:'個股價格同步寫入原生行情中心',detail:'官方報價經 SaiETF 原生仲裁與來源時間戳驗證後同步至個股詳情、首頁持股、自選行情與資產估值；K 線依舊使用官方日歷史。'},
  {id:'v5041-guard',title:'保持盤中 Fugle LIVE 與帳務核心不變',detail:'盤中仍由 Fugle WebSocket 訂閱；拒絕前一交易日與無效官方報價；保留不可變 Finance Core、既有控制中心 UI 與省電政策。'},
  {id:'v5041-build',title:'接續 V5.0.41 原生 QA APK 建置',detail:'Android 版號遞增至 50041；加入收盤價原生仲裁與跨頁行情測試，並執行 GitHub Actions Gradle APK 編譯、簽章與產物驗證。'},
 ],
 notice:'本版為 V5.0.41 QA 驗收版。TWSE MIS 當日價格需依交易所回傳時間與原生來源仲裁確認；無法核實時保留最後有效報價並等待下次前景補核對。手機覆蓋安裝、真機收盤與鎖屏省電行為仍待真機驗證。',
} as const;
