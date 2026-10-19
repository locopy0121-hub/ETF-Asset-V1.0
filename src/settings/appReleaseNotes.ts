/** Current-package release notes; update in the same commit as every version bump. */
export const APP_RELEASE_NOTES={
 version:'5.0.27',androidVersionCode:50027,headline:'新聞廣告過濾後深色背景文字修復',
 changes:[
  {id:'news-ad-dark-contrast',title:'廣告過濾後低對比文章文字轉白',detail:'App 內建新聞閱讀器啟用廣告過濾時，偵測深色背景與難以辨識的正文、標題及巢狀文字，將其顏色調整為白色，改善閱讀清晰度。'},
  {id:'news-native-background',title:'支援深色與透明網頁背景',detail:'將內建 WebView 的背景色納入可讀性判斷，避免網站使用透明背景時，黑灰色新聞文字疊在 App 深色佈景上而無法看清。'},
  {id:'news-reversible-theme',title:'保留淺色原文與恢復原樣式',detail:'淺色文章不強制變白；關閉廣告過濾、切換閱讀模式或恢復原網頁時，還原原本的內文樣式，並處理延遲載入的文章段落。'},
 ],
 notice:'目前為 QA 驗收版本；深色新聞與廣告過濾顯示已增加自動化回歸測試，實際網站在 Android WebView 的字體效果仍須真機確認。Live、Widget、Mini 及其他功能不宣稱本版已完成全面驗收。',
} as const;
