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
  native/android/SaiEtfMarketDataCenter.kt native/android/SaiEtfRuntimeQuoteMapper.kt \
  scripts/native/V402MarketBridgeTest.kt -classpath "$compile_cp" -include-runtime -d "$compiler_dir/bridge-test.jar"
java -cp "$compiler_dir/bridge-test.jar:$compile_cp" V402MarketBridgeTestKt

"$compiler_dir/kotlinc/bin/kotlinc" \
  native/android/SaiEtfMarketModels.kt native/android/SaiEtfMarketArbitrator.kt \
  native/android/SaiEtfProviderCircuitBreaker.kt native/android/SaiEtfMemoryMarketStore.kt \
  native/android/SaiEtfMarketDataCenter.kt scripts/native/V412AfterHoursStabilityTest.kt \
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
