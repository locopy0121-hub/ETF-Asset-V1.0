# Phase 6 — Release Gate

Target: **TF Asset V1.0.0**

This document defines the release gate. It must not be marked PASS until the GitHub Actions release workflow has completed successfully.

## Required checks

1. Version freeze: package 1.0.0 / Expo 1.0.0 / Android versionCode 10000.
2. TypeScript.
3. Canonical Finance Core tests.
4. Main UI architecture tests.
5. Widget / Floating Monitor boundary tests.
6. Expo dependency check.
7. Expo Doctor.
8. EAS authorization.
9. Android preview APK cloud build.
10. APK ZIP integrity, minimum-size validation and SHA-256.
11. Upload validated APK as a GitHub Actions artifact.

Status: **RUNNING — release workflow trigger requested**
