# TF Asset V1.0.4

## Release scope

- Settings Control Center reorganized into 8 top-level sections.
- Added persistent Settings Runtime for notification, display, and trade-default preferences.
- Added persistent Floating Monitor and Android Widget settings runtimes.
- Added local backup, export, import validation, restore-with-safety-backup, and safe finance clear workflow.
- Preserved the full broker / recurring-fee settings controls and zero-fee support.
- Preserved Canonical Finance Core and V3.7.8 finance golden behavior.
- Market update controls remain the settings UI baseline.
- Version advanced to 1.0.4, Android versionCode 10004, iOS buildNumber 5.

## Release gates

- Project boundary / V5 contamination gate
- Canonical finance golden tests
- Ledger / calculator / portfolio / broker / market runtime tests
- Widget / Floating Monitor architecture tests
- V1.0.4 Settings Control Center contract
- TypeScript
- Expo dependency check
- Expo Doctor
- GitHub-only release APK identity and badging validation

## Pre-release verification

- V1.0.4 CI / Hard Gates: ALL PASS before APK Action.
