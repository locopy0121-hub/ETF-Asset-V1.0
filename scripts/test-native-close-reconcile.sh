#!/usr/bin/env bash
set -euo pipefail
compiler_dir="${RUNNER_TEMP:-/tmp}/tf-kotlin-2.2.0"
if [ ! -x "$compiler_dir/kotlinc/bin/kotlinc" ] || [ ! -f "$compiler_dir/streamdeps/okhttp-4.12.0.jar" ]; then
  bash scripts/test-native-market-bridge.sh
fi
compile_cp="$compiler_dir/json.jar:$compiler_dir/kotlinc/lib/kotlinx-coroutines-core-jvm.jar"
stream_cp="$compile_cp"
for jar in "$compiler_dir"/streamdeps/*-*.jar; do stream_cp="$stream_cp:$jar"; done
core=(native/android/SaiEtfMarketModels.kt native/android/SaiEtfMarketArbitrator.kt native/android/SaiEtfProviderCircuitBreaker.kt native/android/SaiEtfMemoryMarketStore.kt native/android/SaiEtfMarketDataCenter.kt)
close=(native/android/TfAssetFugleRestQuoteProvider.kt native/android/TfAssetFugleLiveQuoteSink.kt native/android/TfAssetFugleSessionCloseReconciler.kt native/android/TfAssetMarketSchedulePolicy.kt native/android/SaiEtfTradingCalendar.kt)
"$compiler_dir/kotlinc/bin/kotlinc" "${core[@]}" "${close[@]}" scripts/native/V458CloseReconcileTest.kt \
  -classpath "$compile_cp" -include-runtime -d "$compiler_dir/v458-close.jar"
java -cp "$compiler_dir/v458-close.jar:$compile_cp" com.tfasset.app.saietf.V458CloseReconcileTestKt
"$compiler_dir/kotlinc/bin/kotlinc" native/android/TfAssetMarketOwner.kt \
  scripts/native/V458OwnerAndroidStubs.kt scripts/native/V458OwnerHandlerStubs.kt scripts/native/V458OwnerRuntimeStub.kt scripts/native/V458OwnerSurfaceStubs.kt scripts/native/V458OwnerCloseTest.kt \
  -include-runtime -d "$compiler_dir/v458-owner.jar"
java -jar "$compiler_dir/v458-owner.jar"
"$compiler_dir/kotlinc/bin/kotlinc" "${core[@]}" "${close[@]}" \
  native/android/SaiEtfMarketDataProviderV2.kt native/android/SaiEtfMarketRestoreAdapter.kt native/android/SaiEtfRuntimeQuoteMapper.kt \
  native/android/SaiEtfFugleWebSocketProvider.kt native/android/SaiEtfFugleStreamingController.kt native/android/TfAssetMarketFlowDiagnostics.kt \
  native/android/SaiEtfMarketPersistenceController.kt native/android/TfAssetOfficialCloseReconciler.kt native/android/SaiEtfMarketRuntime.kt \
  scripts/native/V458RuntimeAndroidStubs.kt scripts/native/V458RuntimeDependencies.kt scripts/native/V458RuntimeScheduleStub.kt scripts/native/V458RuntimeCloseTest.kt \
  -classpath "$stream_cp" -include-runtime -d "$compiler_dir/v458-runtime.jar"
java -cp "$compiler_dir/v458-runtime.jar:$stream_cp" com.tfasset.app.saietf.V458RuntimeCloseTestKt

"$compiler_dir/kotlinc/bin/kotlinc" "${core[@]}" native/android/SaiEtfMarketPersistenceController.kt \
  scripts/native/V458RuntimeAndroidStubs.kt scripts/native/V458RuntimeDependencies.kt scripts/native/V458PersistenceOrderTest.kt \
  -classpath "$compile_cp" -include-runtime -d "$compiler_dir/v458-persist.jar"
java -cp "$compiler_dir/v458-persist.jar:$compile_cp" com.tfasset.app.saietf.V458PersistenceOrderTestKt
