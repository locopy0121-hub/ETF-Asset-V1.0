/** Current-package release notes; update in the same commit as every version bump. */
export const APP_RELEASE_NOTES={
 version:'5.0.33',androidVersionCode:50033,headline:'損益色輪連續拖曳與調色盤互動修護',
 changes:[
  {id:'palette-stable-drag',title:'色輪拖曳時維持同一手勢處理器',detail:'修正選色過程每次 HSV 更新都重建 PanResponder 的問題，保持手勢連續且使用最新色輪尺寸與亮度。'},
  {id:'palette-interaction-tests',title:'補上調色盤真正開關與儲存互動回歸',detail:'在 React 測試執行時驗證調色盤開啟、父層重新渲染不關閉、選色確認寫入、取消不寫入、Android 返回關閉以及拖曳穩定性。'},
  {id:'palette-protected-page',title:'保留控制中心原有結構與統一損益色設定',detail:'設定頁僅更新版本識別；既有損益顏色選項、背景選色元件、設定儲存與受保護分類不更動。'},
 ],
 notice:'本版為 QA 驗收版；Android 真機色輪觸控、調色盤呈現及安裝更新仍須驗證。控制中心原有分類、版面和設定資料結構維持不變。',
} as const;
