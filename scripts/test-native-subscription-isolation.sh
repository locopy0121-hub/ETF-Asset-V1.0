#!/usr/bin/env bash
set -euo pipefail
compiler_dir="${RUNNER_TEMP:-/tmp}/tf-kotlin-2.2.0"
if [ ! -x "$compiler_dir/kotlinc/bin/kotlinc" ] || [ ! -f "$compiler_dir/json.jar" ]; then bash scripts/test-native-market-bridge.sh; fi
compile_cp="$compiler_dir/json.jar:$compiler_dir/kotlinc/lib/kotlinx-coroutines-core-jvm.jar"
for jar in "$compiler_dir"/streamdeps/*-*.jar; do compile_cp="$compile_cp:$jar"; done
"$compiler_dir/kotlinc/bin/kotlinc" native/android/SaiEtfMarketModels.kt native/android/SaiEtfMarketDataProviderV2.kt native/android/SaiEtfFugleWebSocketProvider.kt native/android/TfAssetMarketFlowDiagnostics.kt scripts/native/V462SubscriptionIsolationTest.kt -classpath "$compile_cp" -include-runtime -d "$compiler_dir/v462-isolation.jar"
java -cp "$compiler_dir/v462-isolation.jar:$compile_cp" com.tfasset.app.saietf.V462SubscriptionIsolationTestKt
