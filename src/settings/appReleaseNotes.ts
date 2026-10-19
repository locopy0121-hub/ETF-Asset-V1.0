/** Current-package release notes; update in the same commit as every version bump. */
export const APP_RELEASE_NOTES={
 version:'5.0.25',androidVersionCode:50025,headline:'整合持股滑動與自選操作保護',
 changes:[
  {id:'unify-parallel-qa',title:'整合兩條 V5.0.24 QA 修正',detail:'以已通過 QA 的持股橫向容器量測為基底，併入另一條同版分支的首頁自選移除防誤觸保護，避免不同 APK 互相覆蓋成果。'},
  {id:'holding-viewport',title:'保留持股橫向量測',detail:'橫向持股卡片依目前可見容器寬度調整卡寬與滑動步距，保留零寬防護及雙欄分頁原有行為。'},
  {id:'watchlist-readonly',title:'首頁混合自選卡僅能查看',detail:'持股加自選的首頁混合行情牆不提供移除自選按鈕；獨立自選清單維持可移除功能，不修改原始持股、自選或報價資料。'},
  {id:'both-regressions',title:'合併回歸驗證',detail:'同一個建置驗證持股橫向量測、首頁自選操作隔離、獨立清單刪除與版本資訊一致性。'},
 ],
 notice:'此版本為 QA 驗收用途；持股與純自選的滑動區塊仍分開，真機手勢、即時 Live、Mini 和 Widget 未完成全面驗收，不可宣稱正式 Release PASS。',
} as const;
