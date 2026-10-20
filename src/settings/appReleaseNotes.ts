/** Current-package release notes; update in the same commit as every version bump. */
export const APP_RELEASE_NOTES={
 version:'5.0.35',androidVersionCode:50035,headline:'損益調色盤純黑選色修復',
 changes:[
  {id:'palette-black-hue-recovery',title:'純黑顏色也能直接使用色輪選色',detail:'修復色彩亮度為零時，拖曳或點擊任何色相都仍維持黑色的問題；使用色輪選色時自動恢復可見亮度。'},
  {id:'palette-dim-hue-preservation',title:'保留一般深色的原有亮度',detail:'只有完全零亮度才啟用恢復機制；深紅或其他非零亮度顏色切換色相時，維持使用者選定的明暗程度。'},
  {id:'palette-black-runtime-regression',title:'補上純黑與低亮度實際互動測試',detail:'在 React Runtime 測試執行色輪拖曳、確認儲存、取消、返回及重繪；並維持先前小螢幕捲動與受保護設定頁回歸檢查。'},
 ],
 notice:'本版為 QA 驗收版；色輪觸控及顏色保存需在 Android 真機驗收。控制中心僅同步版本識別，不變更受保護的既有設定、帳務或行情核心。',
} as const;
