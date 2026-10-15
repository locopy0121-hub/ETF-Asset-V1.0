import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {calculateCanonicalLedgerSnapshot,calculateBuyScenario,freezeTradeEntry} from '../src/finance/canonicalLedger';
import {calculateBreakEvenPurchase} from '../src/finance/breakEvenScenario';

const buy=freezeTradeEntry({id:'b',date:'2026-10-01',kind:'buy',symbol:'00406A',
  name:'測試持股',tradeMode:'ODD_LOT',shares:2000,price:9.65,actualFee:20});
const snapshot=calculateCanonicalLedgerSnapshot({
  initialCash:25000,entries:[buy],
  quotes:[{symbol:'00406A',name:'測試持股',currentPrice:9.30,liquidationTradeMode:'ODD_LOT',dividendFrequency:4}],
});
const holding=snapshot.holdings[0]!;
const untouched=JSON.stringify({buy,snapshot});
function solve(exitPrice:number,tradeMode:'ODD_LOT'|'ROUND_LOT'='ODD_LOT'){
  return calculateBreakEvenPurchase({holding,buyPrice:9.30,exitPrice,tradeMode});
}
const impossible=solve(9.30);
assert.equal(impossible.status,'impossible','Buying at the unchanged exit price cannot erase prior loss');
assert.equal(impossible.additionalShares,0);
const odd=solve(9.55);
assert.equal(odd.status,'reachable');
assert.ok(odd.additionalShares>0);
assert.ok(odd.scenario!.addCashOutflow>=odd.scenario!.addTradeAmount);
assert.ok(odd.scenario!.cashUnrealizedProfit>=0,'Estimated net proceeds must cover full fee-inclusive cost');
const before=calculateBuyScenario({holding,currentPrice:9.55,addPrice:9.30,
  addShares:odd.additionalShares-1,tradeMode:'ODD_LOT'});
assert.ok(before.cashUnrealizedProfit<0,'Result must be minimum whole share, not a rounded estimate');
const round=solve(9.55,'ROUND_LOT');
assert.equal(round.status,'reachable');
assert.equal(round.additionalShares%1000,0);
assert.ok(round.scenario!.cashUnrealizedProfit>=0);
if(round.additionalShares>=1000){
  const previousLot=calculateBuyScenario({holding,currentPrice:9.55,addPrice:9.30,
    addShares:round.additionalShares-1000,tradeMode:'ROUND_LOT'});
  assert.ok(previousLot.cashUnrealizedProfit<0);
}
const already=solve(10.50);
assert.equal(already.status,'already');
assert.equal(already.scenario?.addCashOutflow,0);
assert.equal(already.additionalShares,0);
assert.equal(solve(0).status,'invalid');
assert.equal(solve(Number.NaN).status,'invalid');
assert.equal(JSON.stringify({buy,snapshot}),untouched,'Simulation must not mutate Canonical or Ledger');
const screen=readFileSync('src/screens/PortfolioScreen.tsx','utf8');
assert.match(screen,/calculateBreakEvenPurchase\(/);
assert.match(screen,/displayHolding\?\.quoteVerified===true/,'Only verified market prices are used');
assert.match(screen,/最低預估現金支出/);
assert.match(screen,/損益平衡反推/);
assert.match(screen,/ScrollView style=\{\{flexShrink:1\}\}/);
console.log('TF_ASSET_V5_0_4_BREAK_EVEN: scenario, minimal quantities, fees, invalid price, immutable ledger PASS');
