import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {calculateCanonicalLedgerSnapshot,calculateBuyScenario,freezeTradeEntry} from '../src/finance/canonicalLedger';
import {calculateTargetProfitPurchase,calculateBreakEvenPurchase} from '../src/finance/breakEvenScenario';
import {DEFAULT_HOLDING_WALL_CONFIG} from '../src/domain/uiModels';
import {createInitialDisplayState,mergeDisplayState} from '../src/editor/editorModel';
import {PAGE_FRAMES} from '../src/domain/frameRegistry';
import {resolvePreviewFrameKeys,supportsCardContentEditor} from '../src/editor/previewCoverage';

const tx=freezeTradeEntry({id:'goal1',date:'2026-10-01',kind:'buy',symbol:'00406A',
  name:'試算標的',tradeMode:'ODD_LOT',shares:2000,price:9.65,actualFee:20});
const snapshot=calculateCanonicalLedgerSnapshot({initialCash:50000,entries:[tx],
  quotes:[{symbol:'00406A',name:'試算標的',currentPrice:9.30,liquidationTradeMode:'ODD_LOT',dividendFrequency:4}]});
const holding=snapshot.holdings[0]!,original=JSON.stringify(snapshot);
const goal=(targetNetProfit:number,tradeMode:'ODD_LOT'|'ROUND_LOT'='ODD_LOT')=>
  calculateTargetProfitPurchase({holding,buyPrice:9.30,exitPrice:9.55,tradeMode,targetNetProfit});
const zero=goal(0),old=calculateBreakEvenPurchase({holding,buyPrice:9.30,exitPrice:9.55,tradeMode:'ODD_LOT'});
assert.equal(zero.status,'reachable');assert.equal(zero.additionalShares,old.additionalShares);
const target=goal(3000);
assert.equal(target.status,'reachable');assert.ok(target.additionalShares>old.additionalShares);
assert.ok(target.scenario!.cashUnrealizedProfit>=3000);
const previous=calculateBuyScenario({holding,currentPrice:9.55,addPrice:9.30,
  addShares:target.additionalShares-1,tradeMode:'ODD_LOT'});
assert.ok(previous.cashUnrealizedProfit<3000,'minimum integer shares after actual fees');
assert.ok(target.scenario!.addCashOutflow>=target.scenario!.addTradeAmount);
const lot=goal(3000,'ROUND_LOT');assert.equal(lot.status,'reachable');assert.equal(lot.additionalShares%1000,0);
if(lot.additionalShares>=1000){
  const before=calculateBuyScenario({holding,currentPrice:9.55,addPrice:9.30,
    addShares:lot.additionalShares-1000,tradeMode:'ROUND_LOT'});
  assert.ok(before.cashUnrealizedProfit<3000);
}
assert.equal(calculateTargetProfitPurchase({holding,buyPrice:9.30,exitPrice:9.30,
  targetNetProfit:3000,tradeMode:'ODD_LOT'}).status,'impossible');
assert.equal(goal(-1).status,'invalid');assert.equal(goal(Number.NaN).status,'invalid');
assert.equal(calculateTargetProfitPurchase({holding,buyPrice:9.30,exitPrice:10.50,
  targetNetProfit:0,tradeMode:'ODD_LOT'}).status,'already');
assert.equal(JSON.stringify(snapshot),original,'scenario cannot mutate official holdings');
const newKeys=['previousClose','volume','quoteTime','shares','avgCost','weight',
  'cumulativeDividend','realizedPnl','pricePnl','comprehensivePnl'];
const defaults=DEFAULT_HOLDING_WALL_CONFIG.fields;
for(const key of newKeys){
  const field=defaults.find(row=>row.field===key);
  assert.ok(field,'missing market wall field '+key);assert.equal(field?.enabled,false,'avoid resetting user layouts');
}
const oldConfig={home:{holdingWall:{...DEFAULT_HOLDING_WALL_CONFIG,
  fields:defaults.filter(x=>!newKeys.includes(x.field))}}};
const restored=mergeDisplayState(oldConfig);
for(const key of newKeys)assert.ok(restored.home.holdingWall?.fields.some(f=>f.field===key),'old backups retain newly registered optional fields: '+key);
assert.equal(createInitialDisplayState().home.holdingWall?.fields.length,defaults.length);
const read=(p:string)=>readFileSync(p,'utf8');
const screen=read('src/screens/PortfolioScreen.tsx'),wall=read('src/components/HoldingQuoteModule.tsx');
for(const term of ['calculateTargetProfitPurchase','最低需加碼股數','需要準備的現金','預計賣出價下淨損益'])
  assert.ok(screen.includes(term),'missing portfolio user action '+term);
for(const key of newKeys)assert.ok(wall.includes(key),'missing real quote-field renderer '+key);
assert.ok(read('src/finance/holdingProjection.ts').includes('valuationQuote?.volume'),'volume must be real source data');
assert.ok(wall.includes('成交量待取得'),'must not invent unsupported volume');
const editor=read('src/components/PageLayoutToolWorkbench.tsx');
assert.ok(editor.includes('readCardStaticText'),'static descriptions must have edit entry');
assert.ok(editor.includes("frame-title:"),'all mounted card titles must be selectable');
assert.ok(read('src/components/PageEditorStack.tsx').includes('applyCardContentAppearance'),'real screen must consume saved overrides');
assert.ok(read('src/components/FrameCard.tsx').includes('titleVisual'),'real card header must consume saved style');
const mounted={
  home:['asset-dashboard','profit-analysis','pnl-detail','dashboard-quick-actions','market-news','holding-quotes'],
  ledger:['quick-entry','ledger-list','monthly-summary'],
  portfolio:['holding-dashboard','allocation','holding-view'],
  market:['market-index','market-search','market-watchlist','market-summary','market-chart','market-details'],
  dividend:['dividend-summary','dividend-ai','dividend-calendar','dividend-agenda','dividend-list','annual-trend'],
  ai:['ai-news'],
} as const;
for(const [page,keys] of Object.entries(mounted) as [keyof typeof mounted,readonly string[]][]){
  const actual=resolvePreviewFrameKeys(page,PAGE_FRAMES[page].map(f=>f.key),keys);
  for(const key of keys)assert.ok(actual.includes(key),'missing '+page+' frame '+key);
}
assert.equal(supportsCardContentEditor('settings','system'),false,'system settings remain protected');
const pkg=JSON.parse(read('package.json')),app=JSON.parse(read('app.json')).expo;
assert.equal(pkg.version,'5.0.7');assert.equal(app.version,pkg.version);assert.equal(app.android.versionCode,50007);
console.log('V5.0.7 target-net-profit solver / quote-field hydration / cross-page content wiring PASS');
