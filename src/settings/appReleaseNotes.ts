/** Current-package release notes; update in the same commit as every version bump. */
export const APP_RELEASE_NOTES={
 version:'5.0.34',androidVersionCode:50034,headline:'調色盤小螢幕操作與亮度控制修護',
 changes:[
  {id:'palette-scroll-small-screen',title:'調色盤內容支援小螢幕垂直捲動',detail:'調色盤內的色輪、系統損益色、經典色票及亮度條改由可捲動內容承載，避免較短 Android 螢幕裁切底部控制項。'},
  {id:'palette-scroll-footer-space',title:'保留亮度條底部可操作空間',detail:'捲動區底部增加留白並移除內容的固定 flex 高度，防止色盤最後一列遭系統導航列或視窗高度限制遮擋。'},
  {id:'palette-scroll-interaction-gate',title:'維持色輪拖曳與開關儲存互動回歸',detail:'加入 React Runtime 捲動容器驗證，並繼續檢查開啟、取消、完成、返回、父層重繪及色輪手勢處理器不重建。'},
 ],
 notice:'本版為 QA 驗收版，Android 真機不同顯示尺寸下的捲動與亮度條操作仍須實測。受保護控制中心僅更新版本識別，既有設定資料及行情核心未變更。',
} as const;
