/** Current-package release notes; update in the same commit as every version bump. */
export const APP_RELEASE_NOTES={
 version:'5.0.37',androidVersionCode:50037,headline:'圖表設定預覽與實際渲染同步修護',
 changes:[
  {id:'taiex-snapshot',title:'台股加權指數預覽共用正式圖表狀態',detail:'預覽訂閱正式指數卡的即時記憶體狀態，包含交易日、官方分時資料、三關價、日期區間及載入狀態；不在設定頁重複請求行情。'},
  {id:'preview-frame-style',title:'預覽框架版型與正式頁共用參數',detail:'設定預覽正式套用 framework layout/appearance 及真實裝置畫布寬度，修復緊湊／密集等樣式在預覽與正式頁不同步。'},
  {id:'chart-geometry',title:'同步繪圖區高度與三關價基準線',detail:'加權指數 SVG 圖表與左側關價數值改採相同可設定高度，修正調高／調低後圖形裁切及數值對線錯位。'},
  {id:'chart-parity-test',title:'新增圖表預覽回歸測試',detail:'驗證現場快照通知、持久化參數、預覽框架對齊及圖形高度，並保留既有市場、帳務與受保護設定頁回歸驗證。'},
 ],
 notice:'本版為 QA 驗收版。正式圖表與設定預覽之真機視覺對照、K 線手勢及不同螢幕寬度尚待逐項驗收，不能作為全局正式 Release PASS。',
} as const;
