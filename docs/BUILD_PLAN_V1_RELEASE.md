# TF Asset V1.0.0｜GitHub-only 正式建置規劃生成書

## 執行原則

本次正式建置嚴格採 **GitHub-only** 流程，不使用本機電腦、不依賴 Android Studio / PowerShell。

Hard Gate 規則：
- 每一階段必須 PASS 才能進入下一階段。
- 任一階段 FAIL，立即停留於該階段修正，不跳關。
- 不以「看起來正常」取代 GitHub Actions / EAS 的實際結果。
- Finance Core、UI、Widget、Floating Monitor 不允許在 Release 階段臨時改邏輯。
- APK 必須由雲端產生並通過檔案完整性驗證後，才可宣告 Release PASS。

## Phase 0 — Build Plan Freeze
- 鎖定本建置規劃。
- 核對 main HEAD、版本、CI 與 Release Workflow。
- 本階段不執行 APK Build。
PASS：規劃檔提交 main，建置目標鎖定 V1.0.0 / Android versionCode 10000。

## Phase 1 — Source / Version Preflight
檢查 package.json、app.json、Android package/versionCode、eas.json preview APK 與 main source。
PASS：全部版本與建置設定一致。

## Phase 2 — Static / Finance Hard Gate
檢查 TypeScript、Canonical Finance Core Gate、Finance Golden Tests，並確認 UI / Widget / Monitor 不自行重算金融公式。
PASS：全綠。

## Phase 3 — UI / Architecture Hard Gate
檢查 Main Product UI、Shared Holding Quote Module、Widget Domain、Floating Monitor Domain、Shared Snapshot、A→B→C→D→E 相鄰關係層、Normal/Mini Layout 隔離。
PASS：UI Architecture Gate + Plugin Architecture Gate 全綠。

## Phase 4 — Expo Environment Gate
檢查 expo install --check、expo-doctor、Node / Expo SDK 對齊。
PASS：Expo dependency check 與 Expo Doctor 全 PASS。

## Phase 5 — EAS Authorization Gate
檢查 GitHub Actions 可讀 EXPO_TOKEN、eas-cli whoami 成功。
PASS：EAS 回傳有效登入帳號。
FAIL：Token 空值、無效或權限不足時立即停止，不進 APK Build。

## Phase 6 — Android Cloud APK Build
執行 EAS preview / Android APK / non-interactive cloud build。
PASS：EAS build status = finished，取得 build URL。

## Phase 7 — APK Artifact Validation
下載 APK、檢查大小、ZIP/APK 結構完整性、SHA-256、GitHub Actions Artifact 上傳。
PASS：Artifact 成功存在 GitHub Actions。

## Phase 8 — Release Report
輸出 Commit SHA、CI Run ID、Release Run ID、EAS Build、APK Artifact、SHA-256、各 Gate 結果。

最終 PASS：**Phase 0–7 全部 PASS，才可宣告 TF Asset V1.0.0 正式建置完成。**
