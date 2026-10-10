import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=(path:string)=>fs.readFileSync(path,'utf8');
const runtime=read('src/market/MarketRuntime.tsx');
const settings=read('src/screens/SettingsScreen.tsx');

assert.doesNotMatch(runtime,/marketRefreshSeconds/,'SaiETF 原生事件取代舊固定秒數定律');
assert.doesNotMatch(settings,/label="盤中更新頻率"/,'舊的自訂時段規則已退役');

assert.match(runtime,/void refresh\(\{silent:true\}\);[\s\S]*?\},\[hydrated,trackedSymbols,researchSymbols,refresh\]\);/,
  'App 啟動／追蹤標的完成 hydration 後必須立即取得行情');
assert.match(runtime,/if\(next==='active'\)\{[\s\S]*?updateNativeMarketSymbols\(combinedSymbols\(\)\)[\s\S]*?void refresh\(\{force:true,silent:true\}\)/,
  'App 回到前景時必須立即強制刷新');

assert.match(runtime,/subscribeUnifiedMarketData\(applySnapshot\)/,'原生行情事件直接通知 App');
assert.match(runtime,/setPhase\(snapshot\.phase\)/,'交易時段由 SaiETF 原生中心決定');
assert.doesNotMatch(runtime,/setInterval\(tick,1000\)/,'不再使用 JS 固定秒數 heartbeat');

const pkg=JSON.parse(read('package.json'));
const app=JSON.parse(read('app.json'));
assert.equal(pkg.version,app.expo.version,'package/app semantic versions must stay aligned');
assert.ok(Number(app.expo.android.versionCode)>=30217,'V3.2.17 scheduler regression requires build 30217 or newer');
assert.equal(app.expo.ios.buildNumber,String(app.expo.android.versionCode),'iOS/Android build identities must stay aligned');
assert.equal(pkg.scripts['test:v3_2_17'],
  'npm run test:v3_2_16 && tsx scripts/v3_2_17-live-market-scheduler.test.ts');

for(const core of ['src/finance/canonicalLedger.ts','src/utils/etfCalculators.ts','docs/finance/CORE_LOCK.md'])
  assert.ok(read(core).length>0,'immutable finance core missing: '+core);

console.log('V3.2.17 live 1-second market scheduler regression PASS');
