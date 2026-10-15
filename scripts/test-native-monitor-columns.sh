#!/usr/bin/env bash
set -euo pipefail
compiler_dir="${RUNNER_TEMP:-/tmp}/tf-kotlin-2.2.0"
if [ ! -x "$compiler_dir/kotlinc/bin/kotlinc" ]; then bash scripts/test-native-market-bridge.sh; fi
"$compiler_dir/kotlinc/bin/kotlinc" native/android/TfAssetMonitorWallGeometry.kt scripts/native/V465MonitorWallGeometryTest.kt -include-runtime -d "$compiler_dir/v465-columns.jar"
java -cp "$compiler_dir/v465-columns.jar" com.tfasset.app.V465MonitorWallGeometryTestKt
