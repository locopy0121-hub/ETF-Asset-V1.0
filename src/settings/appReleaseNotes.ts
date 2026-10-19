/** SSOT for current packaged release explanation. Update every version. */
export const APP_RELEASE_NOTES={
 version:'5.0.24',androidVersionCode:50024,headline:'持股橫向行情卡使用實際容器寬度',
 changes:[
  {id:'measured-holding',title:'持股橫向卡片寬度修正',detail:'首頁選擇橫向滑動時，持股卡片以實際可見容器的寬度計算，避免與已修正的純自選卡片寬度不一致。'},
  {id:'snap-holding',title:'持股滑動步距與尺寸變更同步',detail:'框架縮放或手機方向改變時，同步更新持股單卡大小與滑動定位；忽略無效的零寬量測。'},
  {id:'regression-holding',title:'新增實際卡片行為驗證',detail:'使用真實 HoldingQuoteCollection 元件測試初始寬度、容器縮放、無效量測及雙欄分頁互不干擾。'},
 ],
 notice:'目前為 QA 驗收版本；持股與純自選仍為兩條獨立滑動區域，共用滑動軌道及真機拖曳／旋轉／窄版實測仍待完成，不宣稱正式 Release PASS。',
} as const;
