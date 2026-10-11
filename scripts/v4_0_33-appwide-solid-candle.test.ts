import assert from 'node:assert/strict';
import {readFileSync,readdirSync,statSync} from 'node:fs';
import {join,relative} from 'node:path';
import {solidCandleAppearance} from '../src/domain/candleAppearance';
const colors={gain:'#E13744',loss:'#1B9448'};
const red=solidCandleAppearance(16.89,16.96,colors);
const green=solidCandleAppearance(16.96,16.87,colors);
const flat=solidCandleAppearance(16.87,16.87,colors);
assert.deepEqual(red,{bodyFill:colors.gain,bodyBorder:colors.gain,wick:colors.gain,volume:colors.gain});
assert.deepEqual(green,{bodyFill:colors.loss,bodyBorder:colors.loss,wick:colors.loss,volume:colors.loss});
assert.equal(flat.bodyFill,colors.gain,'keep existing flat-candle semantics');
assert.ok([red,green,flat].every(x=>x.bodyFill!=='transparent'&&x.bodyFill===x.wick&&x.bodyFill===x.bodyBorder));
const custom=solidCandleAppearance(1,2,{gain:'#FF1234',loss:'#00AA89'});
assert.equal(custom.bodyFill,'#FF1234','preserve system-configured candle colors');
const chart=readFileSync('src/components/OfficialCandleChart.tsx','utf8');
assert.match(chart,/solidCandleAppearance\(candle\.open,candle\.close,colors\)/);
assert.match(chart,/backgroundColor:candlePaint\.bodyFill,borderColor:candlePaint\.bodyBorder/);
assert.match(chart,/backgroundColor:candlePaint\.volume/);
assert.match(chart,/wick.*backgroundColor:tone/);
assert.doesNotMatch(chart,/backgroundColor:(?:positive|isUp|up)\s*\?\s*['"]transparent['"]/, 'no hollow positive K bodies');
const stock=readFileSync('src/screens/StockChartScreen.tsx','utf8');
const research=readFileSync('src/screens/MarketResearchScreen.tsx','utf8');
assert.match(stock,/<OfficialCandleChart candles=\{candles\}/,'stock / holdings historical chart uses shared candle');
assert.match(research,/<OfficialCandleChart key=/,'market research K charts use shared candle');
const editor=readFileSync('src/domain/chartEditor.ts','utf8');
assert.match(editor,/id:'candlestick'/,'chart editor candlestick option stays native and shared');
const mini=readFileSync('src/components/MiniHoldingChart.tsx','utf8');
assert.doesNotMatch(mini,/candlestick|drawCandle|wick/i,'mini chart modes are line/area/bars/cost, not OHLC; do not falsely change its styling');
// Regress potential copy-paste hollow-body renderers in all TS(X) App source files.
const walk=(folder:string):string[]=>readdirSync(folder).flatMap(name=>{
  const file=join(folder,name);
  return statSync(file).isDirectory()?walk(file):/\.(tsx|ts)$/.test(file)?[file]:[];
});
const otherFiles=walk('src').filter(path=>!path.endsWith('OfficialCandleChart.tsx'));
for(const p of otherFiles){
  const src=readFileSync(p,'utf8');
  assert.doesNotMatch(src,/(?:bodyFill|candleFill|candleBody|bodyColor)\s*[:=]\s*(?:positive|isUp|up)\s*\?\s*['"]transparent['"]/i,
    'additional hollow bullish candle in '+relative('.',p));
}
const app=JSON.parse(readFileSync('app.json','utf8')).expo;
assert.ok(Number(app.version.split('.')[2])>=33);assert.ok(app.android.versionCode>=40033);
assert.doesNotMatch(readFileSync('src/screens/SettingsScreen.tsx','utf8'),/solidCandleAppearance/,'settings is protected');
assert.doesNotMatch(readFileSync('src/finance/FinanceRuntime.tsx','utf8'),/solidCandleAppearance/,'financial SSOT is unchanged');
console.log('V4.0.33 app-wide red/green solid OHLC bodies, wicks, volume, theme and original settings protected: PASS');
