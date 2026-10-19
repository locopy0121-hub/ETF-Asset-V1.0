/** SSOT for current packaged release explanation. Update every version. */
export const APP_RELEASE_NOTES={
 version:'5.0.23',androidVersionCode:50023,headline:'首頁自選橫向滑動依實際容器寬度調整',
 changes:[
  {id:'measured-horizontal',title:'橫向行情卡量測修正',detail:'首頁持股與自選混合模式下，純自選橫向卡片依實際顯示區域寬度計算，不再只使用螢幕寬度回退值。'},
  {id:'snap-resize',title:'滑動步距同步更新',detail:'當容器尺寸改變或縮放時，重新計算卡片寬度與滑動步距，減少在窄卡片或旋轉畫面出現裁切及錯位。'},
  {id:'regression',title:'新增容器量測回歸測試',detail:'加入實際渲染的寬度、滑動間距、尺寸變更與無效量測測試，繼續保護獨立自選清單偏好。'},
 ],
 notice:'目前為 QA 驗收版本；首頁持股與純自選仍是不同滑動區塊，真機手勢、效能和共同滑動軌道仍待驗收，不能視為正式 Release PASS。',
} as const;
