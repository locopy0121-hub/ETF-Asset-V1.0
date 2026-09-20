# Phase 6 — GitHub-only APK Build

Rule locked: **APK generation uses GitHub Actions only. No Expo Build, no EAS Build, no Expo prebuild.**

Pipeline:
1. Source hard gates
2. Create pure React Native 0.86.3 Android workspace on GitHub runner
3. Inject TF Asset source
4. Gradle assembleRelease
5. APK integrity validation
6. SHA-256
7. GitHub Actions Artifact

Status: REVALIDATING
