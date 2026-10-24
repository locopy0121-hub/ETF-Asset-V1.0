#!/usr/bin/env bash
set -euo pipefail
compiler_dir="${RUNNER_TEMP:-/tmp}/tf-kotlin-2.2.0"
if [ ! -x "$compiler_dir/kotlinc/bin/kotlinc" ] || [ ! -f "$compiler_dir/json.jar" ]; then bash scripts/test-native-market-bridge.sh; fi
"$compiler_dir/kotlinc/bin/kotlinc" native/android/TfAssetMonitorQuoteLists.kt native/android/TfAssetMonitorFields.kt scripts/native/V461WatchlistTest.kt -classpath "$compiler_dir/json.jar" -include-runtime -d "$compiler_dir/v461-watchlist.jar"
java -cp "$compiler_dir/v461-watchlist.jar:$compiler_dir/json.jar" com.tfasset.app.V461WatchlistTestKt
