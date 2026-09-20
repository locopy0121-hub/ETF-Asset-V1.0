# Phase 5 — EAS Authorization Gate

Purpose: validate GitHub Actions → EXPO_TOKEN → EAS authorization **without starting an APK build**.

PASS conditions:
- GitHub Actions can read `EXPO_TOKEN`.
- `eas-cli whoami --non-interactive` succeeds.

Status: RUNNING
