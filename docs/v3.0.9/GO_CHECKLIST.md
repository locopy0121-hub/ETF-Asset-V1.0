# TF Asset V3.0.9 GO｜鎖定資訊置頂與工程師新增元件安全刪除

基底：V3.0.8 PR #54 HEAD `5d0f615b4c7dc8f27003056b0597d547cfb838af`。
修改前原始碼備份：`backup-v3.0.8-20260925-pre-v3.0.9`。
開發分支：`go-v3.0.9-20260925-safe-engineer-delete`。備份分支不等於 Android 手機帳務資料備份。

## 本次 10 項鎖定 Checklist

- [x] CODE 01｜單一全 App 中央元件庫新增不可覆寫 `createdBy:maintenance-engineer` 實例來源；v3 歷史 `i-` ID 經合法模板驗證後安全遷移。
- [x] CODE 02｜資料唯讀資訊固定放在維護工程師工作台所有技能之前，顯示目前對象、帳務原始值和鎖定欄位。
- [x] CODE 03｜保留唯一 16 大中央技能書，將刪除功能列為「刪除工程師新增元件」。只展示已驗證來源的當前框架獨立實例。
- [x] CODE 04｜刪除前顯示二次確認；確認後只從暫存工作區移除，可取消還原；按套用才正式儲存。
- [x] CODE 05｜Runtime 再次強制核對工程師來源、當前框架、當前實例 ID；系統內建框架、原有 KPI、行情、股息、圖表、按鈕、其他畫面不可刪除；一般屬性修改不得偽造來源欄位。
- [x] CODE 06｜版本獨立遞增 App／備份 3.0.9、Android 30009、iOS build 30009；前代回歸鍊完整保留。
- [ ] CI 07｜TypeScript、v1~v3.0.8 回歸、v3.0.9 安全刪除專項、Expo Doctor 全 PASS。
- [ ] BACKEND 08｜Node／Redis／PostgreSQL 完整整合測試 PASS。
- [ ] APK 09｜QA APK 3.0.9／30009；ZIP、badging、SHA256、非空及 Artifact 驗證 PASS。
- [ ] DEVICE 10｜實機確認唯讀資訊置頂、刪除確認、取消還原、套用後重啟不復活、內建元件沒有刪除入口、外部帳務資料備份可選取。

## 待後續逐版驗證

「全能維護工程師」應向每種元件呈現完整可選的視覺與布局技能，而不是以元件類型封鎖能力。V3.0.9 先建立最重要的資料鎖定資訊可見性與刪除權限；跨所有內建 UI 元件的漸層、遮罩、陰影、動畫、行為等仍需真實 native adapter 逐項接入，不能將顯示選單視作 PASS。V3.0.8 已實作的框架背景圖片／三色漸層維持可用。

## 永久鎖定

`src/finance/canonicalLedger.ts`、`src/utils/etfCalculators.ts`、`docs/finance/CORE_LOCK.md` 未修改。實際成交、費稅、持股、股息、現金、行情及圖表資料源唯讀。原八大項及先前未完成項目保持追蹤，不因本輪新增功能而誤報已驗收。
