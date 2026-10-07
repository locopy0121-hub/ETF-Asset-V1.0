import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=(path:string)=>fs.readFileSync(path,'utf8');
const runtime=read('src/market/MarketRuntime.tsx');
const settings=read('src/screens/SettingsScreen.tsx');

assert.match(runtime,/live:\s*\{\s*enabled:\s*true,\s*start:\s*'09:00',\s*end:\s*'13:30',\s*refreshSeconds:\s*1\s*\}/,
  '盤中預設更新頻率必須是 1 秒');
assert.match(runtime,/const clampSeconds=\(value:number\)=>Math\.max\(1,/,
  '行情更新頻率不得低於 1 秒');
assert.match(settings,/label="盤中更新頻率"[\s\S]*?min=\{1\}[\s\S]*?step=\{1\}/,
  '盤中排程設定 UI 必須允許 1 秒為最低值');

assert.match(runtime,/void refresh\(\{silent:true\}\);[\s\S]*?\},\[hydrated,trackedSymbols,refresh\]\);/,
  'App 啟動／追蹤標的完成 hydration 後必須立即取得行情');
assert.match(runtime,/if\(next==='active'&&configRef\.current\.refreshOnForeground\)void refresh\(\{force:true,silent:true\}\)/,
  'App 回到前景時必須立即強制刷新');

assert.match(runtime,/const tick=\(\)=>\{[\s\S]*?resolveMarketPhase\(configRef\.current\)[\s\S]*?marketRefreshSeconds\(configRef\.current,currentPhase\)/,
  '排程器每次 tick 都必須以最新設定重新判斷目前交易時段');
assert.match(runtime,/const timer=setInterval\(tick,1000\)/,
  '排程 heartbeat 必須每秒檢查，避免 App 跨 09:00 還停留在舊 phase');
assert.ok(!runtime.includes('marketRefreshSeconds(config,phase);'),
  '不可再用 render 當下 phase 建立固定 timer，否則跨盤中邊界會漏啟動');
assert.match(runtime,/setPhase\(current=>current===currentPhase\?current:currentPhase\)/,
  '行情中心顯示狀態只在 phase 真正切換時更新，避免每秒無效重繪');
assert.match(runtime,/if\(now<nextDueAt\)return;[\s\S]*?nextDueAt=now\+seconds\*1000/,
  '一秒 heartbeat 不得讓盤後或其他設定頻率失效');

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
