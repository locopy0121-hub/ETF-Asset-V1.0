import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {badgePresentationText} from '../src/domain/etfBadges';
import {quoteTickerCell} from '../src/domain/quoteTicker';
import {DEFAULT_HOLDING_WALL_CONFIG} from '../src/domain/uiModels';
import {mergeDisplayState} from '../src/editor/editorModel';

const read=(path:string)=>readFileSync(path,'utf8');
const app=JSON.parse(read('app.json')),pkg=JSON.parse(read('package.json'));
assert.ok(['2.3.2','2.3.3','2.3.4','2.3.5','2.3.6','3.0.1','3.0.2','3.0.3'].includes(pkg.version),'V2.3.2 market wall behavior must survive V2.3.4');
assert.equal(app.expo.version,pkg.version);
assert.equal(app.expo.android.versionCode,pkg.version.startsWith('3.0.')?30000+Number(pkg.version.split('.')[2]):20300+Number(pkg.version.split('.')[2]));
assert.equal(app.expo.ios.buildNumber,String(pkg.version.startsWith('3.0.')?30000+Number(pkg.version.split('.')[2]):20300+Number(pkg.version.split('.')[2])));

assert.equal(badgePresentationText('etfType','高股息型','季配'),'高股息');
assert.equal(badgePresentationText('etfType','市值型','半年配'),'市值');
assert.equal(badgePresentationText('etfType','主動式','月配'),'主動式');
for(const frequency of ['月配','季配','半年配','年配','不配息']){
  assert.equal(badgePresentationText('dividendType','市值型',frequency),frequency);
}
assert.equal(badgePresentationText('etfType',null,'月配'),'類別待確認');
assert.equal(badgePresentationText('dividendType','市值型',null),'配息待確認');

const valid={symbol:'0050',name:'元大台灣50',price:100,previousClose:98,previousCloseKnown:true,quoteVerified:true};
assert.equal(quoteTickerCell(valid,{showPrice:true,showChange:true}),'0050  元大台灣50  100.00  +2.04%');
assert.equal(quoteTickerCell({...valid,quoteVerified:false},{showPrice:true,showChange:true}),'0050  行情待取得');
assert.equal(quoteTickerCell({...valid,price:0},{showPrice:true,showChange:true}),'0050  行情待取得');
assert.equal(quoteTickerCell({...valid,previousCloseKnown:false},{showPrice:false,showChange:true}),'0050  元大台灣50');

const ticker={...DEFAULT_HOLDING_WALL_CONFIG.ticker!,enabled:true,direction:'right' as const,speed:65,itemGap:32};
const persisted=mergeDisplayState({home:{holdingWall:{...DEFAULT_HOLDING_WALL_CONFIG,ticker}}});
assert.equal(persisted.home.holdingWall?.ticker?.enabled,true);
assert.equal(persisted.home.holdingWall?.ticker?.direction,'right');
assert.equal(persisted.home.holdingWall?.ticker?.speed,65);
assert.equal(persisted.home.holdingWall?.ticker?.itemGap,32);

const settings=read('src/screens/SettingsScreen.tsx');
const prefs=read('src/settings/SettingsRuntime.tsx');
const module=read('src/components/HoldingQuoteModule.tsx');
const collection=read('src/components/HoldingQuoteCollection.tsx');
const tickerView=read('src/components/HoldingQuoteTicker.tsx');
assert.match(settings,/行情牆專用 A\/B 進階編輯/);
assert.match(settings,/統一行情資料中心／即時更新/);
assert.match(settings,/initialContentTab=\{marketEditorTab\}/);
assert.match(settings,/顯示來源時間與資料版本/);
assert.match(prefs,/marketCard:\{showQuoteMetadata:false\}/);
assert.match(module,/showQuoteMetadata\|\|item.quoteVerified===false/);
assert.match(collection,/HoldingQuoteTicker rows=\{rows\}/);
assert.match(tickerView,/useNativeDriver:true/);
assert.doesNotMatch(tickerView,/fetch\(|WebSocket|axios|Date\.now\(\)/,'Ticker must not poll or fabricate refresh time');
console.log('V2.3.2 ETF labels, 5 dividend frequencies, verified ticker, persisted AB settings and concise metadata: PASS');
