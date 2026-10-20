/** Current-package release notes; update in the same commit as every version bump. */
export const APP_RELEASE_NOTES={
 version:'5.0.32',androidVersionCode:50032,headline:'損益調色盤開啟與重繪穩定性修復',
 changes:[
  {id:'profit-color-modal-stability',title:'修護損益調色盤無法保持開啟',detail:'調色盤原生視窗改由 App 層級的共用宿主持有，控制中心行情或設定重新渲染時不會立即關閉視窗。'},
  {id:'profit-color-shared-settings',title:'保留獲利虧損中性色與既有設定',detail:'維持獲利／上漲、虧損／下跌、平盤／中性三組顏色的直接選色與集中儲存，不變更控制中心版面或行情核心。'},
  {id:'profit-color-regression',title:'加入調色盤元件身分與版本建置回歸檢查',detail:'檢查兩個損益色入口與共用調色盤宿主、色盤開關事件及完成確認流程，並確保 APK 版本與檔案名稱相符。'},
 ],
 notice:'本版為 QA 驗收版；Android 真機仍需驗證調色盤開關、操作及安裝更新。控制中心原有分類、版面和設定資料結構維持不變。',
} as const;
