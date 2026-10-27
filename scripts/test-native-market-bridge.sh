#!/usr/bin/env bash
set -euo pipefail
compiler_dir="${RUNNER_TEMP:-/tmp}/tf-kotlin-2.2.0"
mkdir -p "$compiler_dir"
if [ ! -x "$compiler_dir/kotlinc/bin/kotlinc" ]; then
  curl --fail --location --retry 3 --silent --show-error https://github.com/JetBrains/kotlin/releases/download/v2.2.0/kotlin-compiler-2.2.0.zip -o "$compiler_dir/compiler.zip"
  unzip -q -o "$compiler_dir/compiler.zip" -d "$compiler_dir"
fi
curl --fail --location --retry 3 --silent --show-error https://repo.maven.apache.org/maven2/org/json/json/20250517/json-20250517.jar -o "$compiler_dir/json.jar"
compile_cp="$compiler_dir/json.jar:$compiler_dir/kotlinc/lib/kotlinx-coroutines-core-jvm.jar"
"$compiler_dir/kotlinc/bin/kotlinc" \
  native/android/SaiEtfMarketModels.kt native/android/SaiEtfMarketArbitrator.kt \
  native/android/SaiEtfProviderCircuitBreaker.kt native/android/SaiEtfMemoryMarketStore.kt \
  native/android/SaiEtfMarketDataCenter.kt native/android/SaiEtfMarketRestoreAdapter.kt native/android/SaiEtfRuntimeQuoteMapper.kt \
  scripts/native/V402MarketBridgeTest.kt -classpath "$compile_cp" -include-runtime -d "$compiler_dir/bridge-test.jar"
java -cp "$compiler_dir/bridge-test.jar:$compile_cp" V402MarketBridgeTestKt

"$compiler_dir/kotlinc/bin/kotlinc" \
  native/android/SaiEtfMarketModels.kt native/android/SaiEtfMarketArbitrator.kt \
  native/android/SaiEtfProviderCircuitBreaker.kt native/android/SaiEtfMemoryMarketStore.kt \
  native/android/SaiEtfMarketDataCenter.kt native/android/SaiEtfMarketRestoreAdapter.kt scripts/native/V412AfterHoursStabilityTest.kt \
  -classpath "$compile_cp" -include-runtime -d "$compiler_dir/v412-after-hours-test.jar"
java -cp "$compiler_dir/v412-after-hours-test.jar:$compile_cp" V412AfterHoursStabilityTestKt

node --import tsx scripts/v4_0_2-market-data-flow.test.ts
"$compiler_dir/kotlinc/bin/kotlinc" \
  native/android/TfAssetMarketPresentation.kt native/android/SaiEtfTradingCalendar.kt scripts/native/V404AndroidStubs.kt \
  scripts/native/V404DatabaseStub.kt scripts/native/V404PresentationTest.kt \
  -classpath "$compile_cp" -include-runtime -d "$compiler_dir/presentation-test.jar"
java -cp "$compiler_dir/presentation-test.jar:$compile_cp" com.tfasset.app.V404PresentationTestKt

"$compiler_dir/kotlinc/bin/kotlinc" \
  native/android/TfAssetMarketPresentation.kt native/android/SaiEtfTradingCalendar.kt scripts/native/V404AndroidStubs.kt \
  scripts/native/V411PresentationStabilityTest.kt \
  -classpath "$compile_cp" -include-runtime -d "$compiler_dir/stability-test.jar"
java -cp "$compiler_dir/stability-test.jar:$compile_cp" com.tfasset.app.V411PresentationStabilityTestKt

"$compiler_dir/kotlinc/bin/kotlinc" \
  native/android/TfAssetMarketPresentation.kt native/android/SaiEtfTradingCalendar.kt \
  scripts/native/V404AndroidStubs.kt scripts/native/V418CalendarTest.kt \
  -classpath "$compile_cp" -include-runtime -d "$compiler_dir/calendar-test.jar"
java -cp "$compiler_dir/calendar-test.jar:$compile_cp" com.tfasset.app.V418CalendarTestKt

"$compiler_dir/kotlinc/bin/kotlinc" \
  native/android/SaiEtfMarketModels.kt native/android/SaiEtfMarketArbitrator.kt \
  native/android/SaiEtfProviderCircuitBreaker.kt native/android/SaiEtfMemoryMarketStore.kt \
  native/android/SaiEtfMarketDataCenter.kt native/android/TfAssetFugleRestQuoteProvider.kt native/android/TfAssetFugleLiveQuoteSink.kt scripts/native/V447SubscriptionTest.kt \
  -classpath "$compile_cp" -include-runtime -d "$compiler_dir/v447-subscription-test.jar"
java -cp "$compiler_dir/v447-subscription-test.jar:$compile_cp" com.tfasset.app.saietf.V447SubscriptionTestKt

mkdir -p "$compiler_dir/streamdeps"
for dependency in \
  org/jetbrains/kotlinx/kotlinx-serialization-core-jvm/1.9.0/kotlinx-serialization-core-jvm-1.9.0.jar \
  org/jetbrains/kotlinx/kotlinx-serialization-json-jvm/1.9.0/kotlinx-serialization-json-jvm-1.9.0.jar \
  com/squareup/okhttp3/okhttp/4.12.0/okhttp-4.12.0.jar \
  com/squareup/okio/okio-jvm/3.6.0/okio-jvm-3.6.0.jar; do
  curl --fail --location --retry 3 --silent --show-error "https://repo.maven.apache.org/maven2/$dependency" -o "$compiler_dir/streamdeps/${dependency##*/}"
done
stream_cp="$compile_cp"
for jar in "$compiler_dir"/streamdeps/*-*.jar; do stream_cp="$stream_cp:$jar"; done
"$compiler_dir/kotlinc/bin/kotlinc" \
  native/android/SaiEtfMarketModels.kt native/android/SaiEtfMarketDataProviderV2.kt \
  native/android/SaiEtfFugleWebSocketProvider.kt native/android/TfAssetMarketFlowDiagnostics.kt scripts/native/V447SocketTest.kt \
  -classpath "$stream_cp" -include-runtime -d "$compiler_dir/v447-socket.jar"
java -cp "$compiler_dir/v447-socket.jar:$stream_cp" com.tfasset.app.saietf.V447SocketTestKt

"$compiler_dir/kotlinc/bin/kotlinc" \
  native/android/TfAssetMarketPresentation.kt native/android/SaiEtfTradingCalendar.kt \
  scripts/native/V404AndroidStubs.kt scripts/native/V447PresentationTest.kt \
  -classpath "$compile_cp" -include-runtime -d "$compiler_dir/v447-presentation.jar"
java -cp "$compiler_dir/v447-presentation.jar:$compile_cp" com.tfasset.app.V447PresentationTestKt

"$compiler_dir/kotlinc/bin/kotlinc" native/android/TfAssetSurfaceSnapshotPolicy.kt scripts/native/V448SurfaceSnapshotTest.kt \
  -classpath "$compile_cp" -include-runtime -d "$compiler_dir/v448-surface.jar"
java -cp "$compiler_dir/v448-surface.jar:$compile_cp" com.tfasset.app.V448SurfaceSnapshotTestKt

"$compiler_dir/kotlinc/bin/kotlinc" native/android/TfAssetMarketSchedulePolicy.kt native/android/SaiEtfTradingCalendar.kt scripts/native/V449MarketScheduleTest.kt \
  -classpath "$compile_cp" -include-runtime -d "$compiler_dir/v449-schedule.jar"
java -cp "$compiler_dir/v449-schedule.jar:$compile_cp" com.tfasset.app.V449MarketScheduleTestKt

"$compiler_dir/kotlinc/bin/kotlinc" native/android/SaiEtfFugleStreamingController.kt scripts/native/V449ControllerCoreStubs.kt scripts/native/V449ControllerProviderStub.kt scripts/native/V449ControllerTest.kt \
  -classpath "$compile_cp" -include-runtime -d "$compiler_dir/v449-controller.jar"
java -cp "$compiler_dir/v449-controller.jar:$compile_cp" com.tfasset.app.saietf.V449ControllerTestKt

"$compiler_dir/kotlinc/bin/kotlinc" native/android/SaiEtfMarketModels.kt native/android/TfAssetFugleRestQuoteProvider.kt scripts/native/V449RestScheduleTest.kt \
  -classpath "$compile_cp" -include-runtime -d "$compiler_dir/v449-rest-schedule.jar"
java -cp "$compiler_dir/v449-rest-schedule.jar:$compile_cp" com.tfasset.app.saietf.V449RestScheduleTestKt

"$compiler_dir/kotlinc/bin/kotlinc" native/android/TfAssetBackgroundSurfacePolicy.kt scripts/native/V454BackgroundSurfacesTest.kt \
  -include-runtime -d "$compiler_dir/v454-background-surfaces.jar"
java -jar "$compiler_dir/v454-background-surfaces.jar"

# Compile the real process-wide owner with Android/runtime doubles, not just source-smoke assertions.
"$compiler_dir/kotlinc/bin/kotlinc" \
  native/android/TfAssetMarketOwner.kt \
  scripts/native/V458OwnerRuntimeStub.kt scripts/native/V458OwnerSurfaceStubs.kt \
  scripts/native/V458OwnerHandlerStubs.kt scripts/native/V458OwnerAndroidStubs.kt \
  scripts/native/V458OwnerCloseTest.kt \
  -include-runtime -d "$compiler_dir/v5032-power-owner.jar"
java -jar "$compiler_dir/v5032-power-owner.jar"

"$compiler_dir/kotlinc/bin/kotlinc" native/android/TfAssetLatestSurfaceRenderQueue.kt scripts/native/V455RenderQueueTest.kt \
  -include-runtime -d "$compiler_dir/v455-render-queue.jar"
java -jar "$compiler_dir/v455-render-queue.jar"

"$compiler_dir/kotlinc/bin/kotlinc" native/android/TfAssetMonitorFields.kt scripts/native/V456MonitorFieldsTest.kt \
  -classpath "$compile_cp" -include-runtime -d "$compiler_dir/v456-monitor-fields.jar"
java -cp "$compiler_dir/v456-monitor-fields.jar:$compile_cp" com.tfasset.app.V456MonitorFieldsTestKt

"$compiler_dir/kotlinc/bin/kotlinc" \
  native/android/SaiEtfMarketModels.kt native/android/SaiEtfMarketDataProviderV2.kt \
  native/android/SaiEtfFugleWebSocketProvider.kt native/android/TfAssetMarketFlowDiagnostics.kt scripts/native/V457RecoveryTest.kt \
  -classpath "$stream_cp" -include-runtime -d "$compiler_dir/v457-recovery.jar"
java -cp "$compiler_dir/v457-recovery.jar:$stream_cp" com.tfasset.app.saietf.V457RecoveryTestKt

"$compiler_dir/kotlinc/bin/kotlinc" \
  native/android/TfAssetMarketPresentation.kt native/android/SaiEtfTradingCalendar.kt \
  scripts/native/V404AndroidStubs.kt scripts/native/V457QuoteClockTest.kt \
  -classpath "$compile_cp" -include-runtime -d "$compiler_dir/v457-clock.jar"
java -cp "$compiler_dir/v457-clock.jar:$compile_cp" com.tfasset.app.V457QuoteClockTestKt

# Real native arbitration: the last Fugle trade (2385) must yield to a newer
# same-day TWSE MIS closing trade (2400) on a single foreground reconciliation.
"$compiler_dir/kotlinc/bin/kotlinc" \
  native/android/SaiEtfMarketModels.kt native/android/SaiEtfMarketArbitrator.kt \
  native/android/SaiEtfProviderCircuitBreaker.kt native/android/SaiEtfMemoryMarketStore.kt \
  native/android/SaiEtfMarketDataCenter.kt native/android/TfAssetOfficialCloseReconciler.kt \
  scripts/native/V5041OfficialCloseTest.kt -classpath "$compile_cp" -include-runtime -d "$compiler_dir/v5041-close.jar"
java -cp "$compiler_dir/v5041-close.jar:$compile_cp" com.tfasset.app.saietf.V5041OfficialCloseTestKt
