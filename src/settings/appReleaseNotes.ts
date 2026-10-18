/** SSOT for current packaged release explanation. Update every version. */
export const APP_RELEASE_NOTES={
 version:'5.0.22',androidVersionCode:50022,headline:'首頁混合行情牆滑動排列一致性',
 changes:[
  {id:'horizontal',title:'橫向滑動自選卡',detail:'首頁橫向滑動時，純自選卡沿用持股行情牆的單卡寬度計算及滑動步距，避免維持固定雙欄排列。'},
  {id:'paged',title:'雙欄分頁自選卡',detail:'純自選卡每頁兩張，依實際可見寬度同步分頁與滑動位置，最後一頁單卡不被強制放大。'},
  {id:'safe-preferences',title:'維持持股優先與偏好隔離',detail:'混合模式持股優先且代號去重，自選卡的排列不會寫入獨立自選清單的設定。'},
 ],
 notice:'目前為 QA 驗收版本；持股和自選仍是分開的滑動區域，共用滑動軌道及真機手勢驗收未完成，不宣稱正式 Release PASS。',
} as const;
