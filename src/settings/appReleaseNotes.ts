/**
 * SSOT for the currently packaged build's user-visible release explanation.
 * Each version bump MUST change this content and pass the version identity gate.
 */
export const APP_RELEASE_NOTES={
  version:'5.0.21',
  androidVersionCode:50021,
  headline:'版本資訊同步與更新明細',
  changes:[
    {id:'version-details',title:'版本資訊新增本版更新內容',detail:'在設定 → 版本資訊中逐項說明本次修改與用途，不必離開 App 查詢 GitHub 紀錄。'},
    {id:'updates-current',title:'更新資訊自動對應目前版本',detail:'修正更新資訊長期顯示 V3.2.49 的問題；兩個既有入口共用最新版說明。'},
    {id:'release-gate',title:'版本說明納入發行驗證',detail:'每次升版必須同步更新版本號、變更摘要及說明，版本不符或缺漏時阻擋 QA 建置。'},
  ],
  notice:'目前為 QA 驗收版本；設定頁實際操作仍須真機確認，其他歷史待驗項目不因 APK 建置成功而自動視為完成。',
} as const;
