/** SSOT for current packaged release explanation. Update every version. */
export const APP_RELEASE_NOTES={
 version:'5.0.25',androidVersionCode:50025,headline:'整合行情牆橫向量測與自選操作保護',
 changes:[
  {id:'unify-horizontal',title:'持股與自選橫向卡片量測整合',detail:'延續已驗證的實際容器寬度與滑動步距計算，持股及純自選卡片在同一版 QA APK 中同時保留修正。'},
  {id:'read-only-actions',title:'首頁混合行情牆禁止直接移除自選',detail:'首頁查看持股與自選行情時隱藏具有刪除效果的自選按鈕，避免誤觸；獨立自選清單仍可管理標的。'},
  {id:'regression',title:'並行修正合併回歸驗證',detail:'同版測試實際持股卡片量測、混合自選卡片的非破壞性操作、獨立自選移除及既有版本資訊一致性。'},
 ],
 notice:'目前為 QA 驗收版本；持股與自選仍是不同滑動軌道，Android 真機的手勢、Live、Widget 和 Mini 跨介面操作仍待驗證，不宣稱正式 Release PASS。',
} as const;
