/** Current-package release notes; update in the same commit as every version bump. */
export const APP_RELEASE_NOTES={
 version:'5.0.31',androidVersionCode:50031,headline:'備份還原資料保護修復',
 changes:[
  {id:'motion-category-switch',title:'切換卡片時顯示已儲存的動畫分類',detail:'同一個動畫選擇器接續編輯其他卡片或欄位時，依新的動畫效果切換分類，不再沿用上一張卡片的分類。'},
  {id:'motion-category-browse',title:'手動瀏覽動畫分類不覆寫設定',detail:'瀏覽分類只變更列表顯示，不會更改保存的動畫；必須選取特效或調整參數才會更新，模擬行情預覽也不改寫任何實際報價。'},
  {id:'motion-picker-regression',title:'新增動畫分類切換互動測試',detail:'檢查切換編輯對象、套用效果、保存舊值、預覽隔離及恢復「無」效果，並延續前版完整回歸。'},
 ],
 notice:'本版為 QA 驗收版。Android 真機的動畫播放及編輯操作仍須確認；系統設定首頁及 Monitor／Mini／Widget 受保護編輯面板均未改動，42 種動畫尚未於所有原生介面開放。',
} as const;
