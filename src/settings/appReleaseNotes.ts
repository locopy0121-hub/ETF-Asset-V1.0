/** SSOT for current packaged release explanation; update on every version. */
export const APP_RELEASE_NOTES={
 version:'5.0.24',androidVersionCode:50024,headline:'首頁混合行情牆自選資料安全保護',
 changes:[
  {id:'home-read-only',title:'首頁自選卡移除操作保護',detail:'首頁選擇持股與自選的混合行情牆時，不再顯示可直接刪除自選項目的操作，避免查閱報價時誤觸變更清單。'},
  {id:'independent-edit',title:'保留獨立自選管理功能',detail:'單獨查看自選清單時仍能使用移除操作；首頁純自選行情卡仍可開啟標的行情。'},
  {id:'regression',title:'資料與顯示回歸測試',detail:'新增混合模式不得出現移除按鈕、獨立自選管理仍可操作的實際元件行為測試，保留原有去重與滑動排列。'},
 ],
 notice:'本版為 QA 驗收版；手機上的實際觸控、Live、Mini、Widget、跨區共用滑動軌道仍有待驗證，不代表正式 Release PASS。',
} as const;
