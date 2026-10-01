import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const read=(p:string)=>fs.readFileSync(p,'utf8');

function collectText(dir:string):string{
  let out='';
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
    const full=path.join(dir,entry.name);
    if(entry.isDirectory())out+=collectText(full);
    else if(/\.(?:ts|tsx|js|jsx|kt)$/.test(entry.name))out+=read(full)+'\n';
  }
  return out;
}

function main(){
  const pkg=JSON.parse(read('package.json')) as {version:string;scripts:Record<string,string>};
  const app=JSON.parse(read('app.json')) as {expo:{version:string;android:{versionCode:number};ios:{buildNumber:string}}};
  assert.equal(pkg.version,'3.2.37');
  assert.equal(app.expo.version,'3.2.37');
  assert.equal(app.expo.android.versionCode,30237);
  assert.equal(app.expo.ios.buildNumber,'30237');

  const sources=read('server/src/sources.mjs');
  assert.match(sources,/SOURCE_PRIORITY=\{FUGLE:10,TWSE_MIS:20,SHIOAJI:30,YAHOO:40/);
  assert.match(sources,/Primary path: authenticated server-side WebSocket/);
  assert.match(sources,/fugleRestCacheMs/);
  assert.match(sources,/this\.fugleStream\?\.latest/);
  assert.match(sources,/P1: Fugle WebSocket\/REST bootstrap/);
  assert.match(sources,/P2: TWSE MIS/);
  assert.match(sources,/P3: Shioaji/);
  assert.match(sources,/P4: Yahoo/);
  assert.match(sources,/if\(source==='YAHOO'\)baseHeaders\.Referer/);
  assert.match(sources,/if\(source==='TWSE_MIS'\)baseHeaders\.Referer/);
  assert.doesNotMatch(sources,/source==='YAHOO'\?'https:\/\/finance\.yahoo\.com\/'/,
    'provider headers must not use a shared spoofed Referer');

  const stream=read('server/src/fugleStream.mjs');
  for(const token of [
    'wss://api.fugle.tw/marketdata/v1.0/stock/streaming',
    "event:'auth'",
    "channel:'trades'",
    "event==='heartbeat'",
    "row.isTrial===true",
    "heartbeat timeout",
    "scheduleReconnect",
    "handshakeTimeout:7_000",
  ]) assert.ok(stream.includes(token),'Fugle transport missing '+token);
  assert.match(stream,/1_000\*2\*\*Math\.min\(this\.reconnectAttempt,6\)/);
  assert.match(stream,/Math\.min\(60_000/);

  const env=read('server/.env.example');
  assert.match(env,/FUGLE_API_KEY=/);
  assert.match(env,/FUGLE_WS_URL=wss:\/\/api\.fugle\.tw\/marketdata\/v1\.0\/stock\/streaming/);
  assert.match(env,/FUGLE_REST_CACHE_MS=15000/);
  assert.match(env,/never place the key in the APK/);

  const appSide=collectText('src')+collectText('native');
  assert.ok(!appSide.includes('FUGLE_API_KEY'),'Fugle API key name leaked into APK-side source');
  assert.ok(!appSide.includes('server-only-key'),'test/server secret leaked into APK-side source');

  const jobs=read('server/src/jobs.mjs');
  assert.match(jobs,/this\.sources\.start\?\.\(this\.staticSymbols\)/);
  assert.match(jobs,/this\.sources\.stop\?\.\(\)/);

  const serverTests=read('server/test/multisource.test.mjs');
  assert.match(serverTests,/Fugle is primary/);
  assert.match(serverTests,/three Fugle 429 failures open circuit and fail over to MIS/);
  const streamTests=read('server/test/fugle-stream.test.mjs');
  assert.match(streamTests,/authenticates, subscribes and stores real trades/);
  assert.match(streamTests,/trial packets must never replace an actual trade/);

  for(const core of ['src/finance/canonicalLedger.ts','src/utils/etfCalculators.ts','docs/finance/CORE_LOCK.md'])
    assert.ok(read(core).length>0,'immutable finance core missing: '+core);

  console.log('V3.2.37 Fugle-primary server transport / failover / credential boundary PASS');
}
main();
