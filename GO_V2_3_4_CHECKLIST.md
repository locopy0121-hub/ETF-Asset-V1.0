# GO V2.3.4｜逐檔行情來源對帳（2026-09-25）

基底：PR #42 V2.3.3 HEAD `117714583c6f48aa188225214e409f9a4abb309f`；修改前原始碼備份 `backup-v2.3.3-20260925-pre-go-v234`（精確同 SHA，不含手機帳務）。
工作分支：`go-v2.3.4-20260925-market-source-audit`。此輪僅續修原八大項第 04 項的**診斷與逐檔來源透明度**；不宣稱修復所有報價覆蓋、遠端部署或 Widget／Monitor 實機。

- [x] 已由 GitHub 驗證 V2.3.3 PR #42 latest Actions #36020804472：quality、Redis/PostgreSQL、原生 QA APK 三 job SUCCESS，Artifact 10816762368，APK badging 2.3.3／20303，unzip 通過。Android DEVICE 未驗。
- [x] GitHub 原始碼備份建立且核對；不可變三個金融核心檔、FinanceRuntime、Ledger 寫入均不修改。
- [ ] A01（CODE）：設定第三大項逐檔顯示已核實成交／官方收盤／本次缺漏但舊資料仍可參考／完全無可信報價；查詢時間與交易所原始時間分列，明確區分持股與報價清單。
- [ ] A02（TEST）：零價、未核實假種子、來源時間未來日期、同代號去重及缺失報價不得顯示虛假即時成功；歷史回歸照跑。
- [ ] A03（CI）：TypeScript、歷史測試、Node Redis/PostgreSQL 整合測試及 SHA 鎖定門檻。
- [ ] A04（APK）：V2.3.4／20304 QA APK、unzip、SHA256、badging、GitHub Artifact。此項完成後才可提供新版本測試下載。
- [ ] A05（DEVICE）：Android 實機逐檔比對 0050／00878／00919／00929／00713 等、Widget 與 App、錯誤狀態、備份 SAF，仍待使用者真機；不可由 CI 推為 PASS。

**未完成／不得冒稱**：外部遠端後端部署、原八大項 03/04/05/06/07/08 全面實機、缺漏 ETF 行情覆蓋、外部備份實際存活、真正 LLM 摘要及正式 Release。V2.3.4 純報價診斷，不更動買賣費稅、股數、現金、帳務 Ledger，不使用 360。
