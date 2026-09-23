# GO 第四輪 V2.1.11 開發 QA

來源：PR #27 V2.1.10 Actions #35839335058 quality / APK PASS；Artifact 10741007433。
工作前備份：backup-v2.1.10-20260923-pre-go-v2111 -> 8eec3eaa49c218361527d037409c99076579e4f2。

| 項目 | 狀態 |
| --- | --- |
| R4-01 AI 新聞取得本文的 8 篇配額，按不同持股輪流分配 | CODE 已實作；單元測試及真機待驗 |
| R4-02 實際新聞擷取：部分 Google RSS 連結可能非本文、付費牆不可繞過 | NO PASS；未宣稱全文全面成功 |
| R4-03 同步 V2.1.11 / 20111，舊 Gate + R4 測試 + QA APK | 待 CI 與 APK 證據 |
| R4-04 ETF 官方分類、配息頻率、Widget、360、圖表與歷史 U/G/N/T/C/D/R1-R3 | NO PASS 繼續結轉 |

**Immutable Core** 不修改。開發 QA APK 非正式 Release；CI 不代替真機驗收。完整歷史範圍見 UPDATE.md 與先前版本 Checklist。
