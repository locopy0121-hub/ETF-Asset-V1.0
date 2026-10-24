#!/usr/bin/env bash
set -euo pipefail
compiler_dir="${RUNNER_TEMP:-/tmp}/tf-kotlin-2.2.0"
if [ ! -x "$compiler_dir/kotlinc/bin/kotlinc" ] || [ ! -f "$compiler_dir/json.jar" ]; then
  bash scripts/test-native-market-bridge.sh
fi
"$compiler_dir/kotlinc/bin/kotlinc" native/android/TfAssetMonitorAutoFit.kt scripts/native/V460MonitorAutoFitTest.kt -classpath "$compiler_dir/json.jar" -include-runtime -d "$compiler_dir/v460-math.jar"
java -cp "$compiler_dir/v460-math.jar:$compiler_dir/json.jar" com.tfasset.app.V460MonitorAutoFitTestKt
"$compiler_dir/kotlinc/bin/kotlinc" native/android/TfAssetMonitorAutoFit.kt native/android/TfAssetMonitorAutoFitLayout.kt scripts/native/v460/*.kt -classpath "$compiler_dir/json.jar" -include-runtime -d "$compiler_dir/v460-layout.jar"
java -cp "$compiler_dir/v460-layout.jar:$compiler_dir/json.jar" com.tfasset.app.LayoutTestKt
