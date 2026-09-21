# Work_Project_Rules.md

## TF Asset / ETF 財務管家 — GO 強化工作規則

更新日期：2026-09-21  
適用專案：TF Asset / ETF 財務管家  
狀態：LOCKED / MANDATORY

> 本文件用來補強既有 GO 指令流程。
> 目標是避免再次發生「功能尚未完整完成，卻因 CI / APK 成功而提前宣告 ALL PASS」的情況。
> 若本文件與較寬鬆的舊流程描述衝突，採用本文件較嚴格的規則。
>
> **GO 固定讀取順序：先讀 `ERROR_LESSONS.md`，再讀本檔 `Work_Project_Rules.md`。本檔屬於 ERROR_LESSONS 之後的第二層強化 Gate，不得提前、跳過或交換順序。**

---

## 1. 原始更新清單＝唯一完成基準

- GO 啟動後，第一次確認的更新清單立即鎖定為本次 Release Checklist。
- 不可因後續修改、CI、版本升級、APK 成功、對話中斷而刪除、縮減或跳過項目。
- 每一項只能處於：
  - 未開始
  - 進行中
  - PASS
  - FAIL
  - BLOCKED／阻斷
  - 未證實
- 只要還有一項不是「經驗證 PASS」，就禁止宣告 ALL PASS。

---

## 2. 禁止用「有程式碼」代替「功能完成」

以下證據只能證明 CODE 存在，不能直接證明功能完成：

- 函式存在
- Component 存在
- 變數存在
- UI 字串存在
- 設定欄位存在
- 檔案存在
- `includes()`
- regex / source text match

Source Contract Test 只能作為 Smoke Gate，不能作為最終 Feature PASS。

---

## 3. 每個項目必須先定義 Acceptance Criteria

修改前必須先確認「怎樣才算真的完成」。

例如「AI 浮動窗可縮放」至少要驗證：

- 使用者可實際操作 Resize
- 寬度確實改變
- 高度確實改變
- Min / Max 正常
- 不超出畫面
- 儲存後可保留
- 不破壞拖曳
- 不破壞縮小／關閉

Acceptance Criteria 未全部成立，一律不得 PASS。

---

## 4. 每項功能必須通過四層驗證

每個功能至少要分開驗證：

1. **CODE PASS**
   - 程式確實存在。

2. **RUNTIME PASS**
   - 功能真正接入 Runtime / Store / Data Flow。

3. **UI PASS**
   - 使用者操作入口真的能觸發。

4. **RESULT PASS**
   - 執行結果符合需求。

A～D 任一缺失，都不得標示 Feature PASS。

---

## 5. 完成狀態必須分級

固定使用以下狀態：

- CODE PASS
- RUNTIME PASS
- UI PASS
- BUILD PASS
- RELEASE PASS

只有 **RELEASE PASS** 才能稱為：

**GO ALL PASS**

---

## 6. Build PASS ≠ Feature PASS

以下成功都只代表 Build / CI 層面通過：

- TypeScript PASS
- Unit Test PASS
- Hard Gate PASS
- Expo Doctor PASS
- Gradle PASS
- GitHub Action PASS
- APK 成功產出

以上任何一項都不得自動把功能清單項目改成 PASS。

---

## 7. APK 出來 ≠ Release 完成

APK 產生成功只能證明「可建置」。

不能因此推論：

- 拖曳正常
- Resize 正常
- 手勢正常
- 色盤不閃退
- Widget 正常
- Monitor 正常
- AI 回答正確
- API 資料正確
- UI 沒有重疊
- 全部頁面已套用
- Native 功能已正確連接

---

## 8. 測試不得只靠字串比對

`includes()`、regex、檔案存在性測試只能作為 Smoke Gate。

核心功能必須盡量增加：

- 行為測試
- Runtime 測試
- Data Flow 測試
- State Transition 測試
- 邏輯輸入輸出測試

涉及以下功能時，純文字 Gate 一律不得作為最終 PASS：

- Drag
- Resize
- Pinch
- Gesture
- Overlay
- Widget
- Monitor
- Crash
- Native Android

---

## 9. 全局／所有頁面功能必須逐頁驗證

若需求包含：

- 全局
- 所有頁面
- 各頁面
- 首頁／庫存／股息／記帳／試算
- 全部元件

必須建立 Coverage Matrix。

不可因為：

「共用 Model 改了」

就直接推論全部頁面都完成。

---

## 10. Changed Files Coverage Gate

完成每項後必須反查實際 Changed Files。

如果需求理論上應影響：

- Screen
- Runtime
- Native
- Widget
- Monitor
- Editor
- Shared component

但對應位置完全沒有修改時，必須確認是否真的由共用架構自動涵蓋。

若無法證明：

**FAIL / 未證實**

禁止用「應該有套到」作為 PASS 理由。

---

## 11. 每完成一項後必須做完整性確認

單項測試 PASS 後，還不能直接進下一項。

必須再檢查：

- 是否只有 UI 沒接 Runtime
- 是否只有 Runtime 沒入口
- 是否改 A 壞 B
- 是否漏跨頁
- 是否漏 Native
- 是否破壞既有功能
- 是否只滿足測試而沒滿足需求

完整性確認 PASS 後才可進下一項。

- **單項正式 PASS 後必須自動接續下一項，不得等待使用者再次下達 GO、確認或提醒。**
- **只有 FAIL／BLOCKED／未證實時才停留在原項；一旦完成修正、重驗、完整性確認並轉為 PASS，就立即進入下一項，直到整份 Release Checklist 全數完成。**

---

## 12. FAIL 原地阻斷

任何項目 FAIL：

- 不得進下一項
- 不得先標部分 PASS 然後跳過
- 不得進正式 Action
- 必須原地修正
- 修正後重新完整驗證
- 必要時執行 Regression Gate

直到 PASS 才能繼續。

---

## 13. 前面已 PASS 的功能可能需要重驗

若後續修改可能影響前面已 PASS 功能：

- 前面項目必須重新 Regression 驗證
- PASS 不代表永久免驗證
- 不得因先前曾經 PASS 就跳過重驗

---

## 14. Final Checklist Reconciliation

全部程式修改完成後、正式 Action 前：

必須重新拿：

**最初 Release Checklist**

對照：

**目前最終程式**

逐項確認：

- 原始需求是否真的完成
- 是否有漏做
- 是否有部分完成
- 是否被後來修改破壞
- 是否只有測試存在
- 是否仍待驗證
- 是否仍有未證實項目

這一步正式稱為：

**Final Checklist Reconciliation**

只要任何一項不是 PASS：

**禁止進正式 Action。**

---

## 15. Action 前 Release Completeness Gate

正式 GitHub Action 前必須確認：

- 原始清單全部 PASS
- 0 個 FAIL
- 0 個 BLOCKED
- 0 個未開始
- 0 個未證實
- 0 個部分完成
- Final Checklist Reconciliation PASS
- Finance Core PASS
- Boundary PASS
- Version Identity PASS

任一條件不符：

**Action 強制阻斷。**

---

## 16. 正式 APK 與 QA / 驗收 APK 必須分離

若功能尚未全部完成，但開發過程需要產 APK：

只能標示：

- TEST
- QA
- Preview
- 驗收版

不得標示：

- 正式完成版
- Release PASS
- GO ALL PASS

正式 Release APK 必須來自完整 GO 流程最後一次 Action。

---

## 17. Action PASS 不得反向修改功能狀態

GitHub Action 成功後：

- 不得把尚未驗證的功能改成 PASS
- 不得因 APK 成功而補標功能完成
- 不得省略原始 Release Checklist 的未完成項目

Action PASS 只代表 Build Gate PASS。

---

## 18. ALL PASS 必須提供證據表

最終報告不得只寫：

**ALL PASS**

每一項至少要能提供：

- 原始需求項目
- 修改檔案
- Acceptance Criteria
- 驗證方式
- 驗證結果
- 對應測試
- Runtime 狀態
- UI 狀態
- Build 狀態
- 是否仍需真機驗收

沒有證據的 PASS 視同無效。

---

## 19. 禁止自動補腦

以下描述一律不能作為 PASS 判據：

- 應該
- 理論上
- 看起來
- 可能
- 共用元件應該有涵蓋
- CI 過了所以應該正常
- APK 出來所以應該沒問題

證據不足時只能標記：

**未證實**

---

## 20. 對話中斷不得改變 Release Checklist

若發生：

- 對話卡住
- 換對話
- ChatGPT 重新接手
- Action 中斷

重新接手後必須：

1. 恢復原始 Release Checklist
2. 找到最後一個真正 PASS 的項目
3. 從下一個未完成項目續接

禁止：

- 從頭亂跑
- 換專案
- 跳版本
- 忘記清單
- 只看最新 Commit
- 把 Build 當完成

---

## 21. 使用者追加需求不得吃掉原需求

GO 執行途中若追加新需求：

- 加入目前 Release Checklist
- 不得取代原始項目
- 不得刪除尚未完成項目

若追加內容會影響前面 PASS 項目：

前面項目必須重新 Regression 驗證。

---

## 22. 跨頁能力必須用 Coverage Matrix 驗證

若功能聲稱：

- 首頁有
- 庫存有
- 股息有
- 記帳有
- 試算有
- Widget 有
- Monitor 有

則必須逐一驗證各 Surface：

| Surface | CODE | RUNTIME | UI | RESULT |
|---|---|---|---|---|
| Home |  |  |  |  |
| Portfolio |  |  |  |  |
| Dividend |  |  |  |  |
| Ledger |  |  |  |  |
| Calculator |  |  |  |  |
| Widget |  |  |  |  |
| Monitor |  |  |  |  |

沒有逐項證據，不得稱為「全局完成」。

---

## 23. Native / Widget / Monitor 不能只靠 JS 端推論

涉及：

- Android Widget
- Floating Monitor
- Overlay Service
- Native Receiver / Service
- Shared Snapshot

必須確認對應 Native 程式與資料同步路徑。

只修改 React Native / TypeScript 不得自動宣稱 Native 功能完成。

---

## 24. 真機／手勢型功能必須標示驗收層級

涉及：

- Drag
- Resize
- Pinch
- Double Tap
- Long Press
- Overlay
- Widget
- Mini
- Monitor
- Color Picker Crash
- Screen Boundary

若目前只能做到自動測試，必須明確標示：

**Automated PASS / Device Validation Pending**

不得把「尚待真機驗收」寫成 RELEASE PASS。

---

## 25. GO 最高硬規則

### 清單沒全 PASS，不准正式 Action。

### Item FAIL，不准進下一 Item。

### CODE PASS，不代表 Feature PASS。

### RUNTIME PASS，不代表 UI PASS。

### UI PASS，不代表 RESULT PASS。

### Build PASS，不代表 Feature PASS。

### Action PASS，不代表 Release PASS。

### APK 出來，不代表 GO 完成。

### 沒有證據，不准標 PASS。

### 對話卡住，不准遺失原始 Checklist。

### 只有原始 Checklist 全部完成、逐項驗證完成、Final Checklist Reconciliation PASS、GitHub Action PASS、APK / Artifact 驗證 PASS，才能宣告：

# GO ALL PASS

---

## 26. GO 自動接續與正式 Action 邊界（LOCKED）

以下規則為 GO 執行的強制流程，禁止自行變形、提前、跳項或以其他流程取代：

### 26.1 固定執行順序

**GO → 列出本次目的清單 → 讀 `ERROR_LESSONS.md` → 讀 `Work_Project_Rules.md` → 前置 Gate → 單項修改 → 重驗 → 完整性確認 → PASS 後自動下一項 → 直到最後一項 → Final Checklist Reconciliation → 全項 PASS → 才能正式 GitHub Release Action → 每 15 秒查 Log → Error 原地修護並重跑 → Artifact／APK／版本／package 驗證 → 最終交付。**

### 26.2 單項狀態與自動接續

- 單項未完成「修改 → 重驗 → 完整性確認」三階段，不得標示 PASS。
- 單項未 PASS，禁止進入下一項。
- 單項正式 PASS 後，**必須自動接續下一項**，不得等待使用者再次輸入 GO、確認或提醒。
- 只有 **FAIL／BLOCKED／未證實** 才停留在原項。
- FAIL 必須原地修護、重驗、完整性確認，直到 PASS 才可繼續。
- 不得以「先做下一項、之後補回來」的方式跨關。

### 26.3 正式 GitHub Release Action 的硬性限制

- **Release Checklist 尚未全數 PASS 前，禁止啟動正式 GitHub Release Action。**
- QA／Preview／驗收 APK、PR CI、分支 quality workflow，均不得稱為「正式 Release Action」。
- Build PASS、CI PASS、GitHub Action PASS、APK 產出，均不得反向推論 Feature PASS。
- 只有在：
  1. 原始 Release Checklist 全項 PASS；
  2. 0 FAIL；
  3. 0 BLOCKED；
  4. 0 未證實；
  5. Final Checklist Reconciliation PASS；
  6. Finance Core PASS；
  7. Boundary PASS；
  8. Version Identity PASS；
  
  全部成立後，才允許啟動正式 GitHub Release Action。

### 26.4 正式 Action 後的持續監控

- 正式 GitHub Release Action 啟動後，必須每 15 秒讀取一次狀態與 Log。
- 發現任何 error／failed step／build failure：
  - 立即讀取實際錯誤；
  - 原地修護；
  - 重驗；
  - 重新啟動正式 Action；
  - 再次進入每 15 秒監控循環。
- 不得因前一次 Action 曾成功就略過本次 Log／Artifact 驗證。

### 26.5 最終回報必備統計

每次 GO 進度回報與最終回報都必須包含：

- 已完成項目數；
- 未完成項目數；
- 未完成／未證實項目清單；
- 是否存在 FAIL；
- 是否存在 BLOCKED；
- 是否已允許正式 Release Action。

禁止只回報「已完成什麼」而省略「尚未完成什麼」。

### 26.6 專案與 Scope 邊界

- 不得換專案。
- 不得混入 V5／舊 360／其他專案元件，除非使用者明確要求。
- 不得擅自擴張 scope。
- 使用者要求修 A，就先完成 A；發現 B 有問題只回報，除非使用者明確追加，否則不得自行修改 B。
- 對話中斷、工具中斷、Action 中斷，都不得改變原始 Release Checklist 與 GO 執行順序。

### 26.7 GO 最終硬規則

**單項沒 PASS，不准下一項。**  
**單項 PASS，立即自動下一項。**  
**FAIL／BLOCKED，原地修。**  
**Checklist 沒全 PASS，不准正式 Release Action。**  
**Build／CI／APK 不得冒充 Feature PASS。**  
**每次回報都要列完成數、未完成數與未完成清單。**  
**只有全部 Checklist 完成並通過 Final Checklist Reconciliation，才能進正式 Release Action。**

