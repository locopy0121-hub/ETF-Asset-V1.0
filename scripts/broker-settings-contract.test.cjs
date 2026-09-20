const fs=require('fs');
const assert=require('assert');

const settings=fs.readFileSync('src/screens/SettingsScreen.tsx','utf8');
const runtime=fs.readFileSync('src/finance/BrokerSettingsRuntime.tsx','utf8');
const ledger=fs.readFileSync('src/screens/LedgerScreen.tsx','utf8');
const app=fs.readFileSync('App.tsx','utf8');

assert.match(app,/BrokerSettingsRuntimeProvider/,'App must provide broker settings runtime');
assert.match(runtime,/AsyncStorage/,'broker settings must persist');
assert.match(runtime,/@tf-asset\/broker-fee-settings/,'broker settings storage key missing');
assert.match(runtime,/Number\.isFinite\(n\)\?Math\.max\(0,n\):fallback/,'zero must remain a valid numeric value');
assert.ok(!runtime.includes('Number(value)||'),'zero must never fall back through ||');
assert.match(runtime,/mode:'fixed'/,'recurring fixed mode missing');
assert.match(runtime,/mode:value\?\.mode==='variable'\?'variable':'fixed'/,'recurring variable mode missing');
assert.match(runtime,/commissionRate:0/,'fixed recurring fee must not depend on percentage commission');
assert.match(runtime,/minimumCommissionOddLot:recurring\.fixedFee/,'fixed recurring fee must map to exact configured amount');
assert.match(runtime,/commissionDiscount:recurring\.discount/,'variable recurring discount missing');
assert.match(runtime,/minimumCommissionOddLot:recurring\.minimumFee/,'variable recurring minimum missing');

assert.match(settings,/券商與手續費設定/,'accounting first item label missing');
assert.match(settings,/index===0\?'broker'/,'accounting first item must open broker settings panel');
for(const label of ['公定手續費率','電子下單折扣率','整股最低手續費','零股最低手續費','定期定額','固定單筆','非固定','固定單筆手續費','定期定額折扣率','定期定額最低手續費','ETF','0.1%','一般股票','0.3%','重設','更新設定']){
  assert.ok(settings.includes(label),'missing broker settings control: '+label);
}
assert.match(settings,/所有金額欄位允許 0 元/,'settings must explicitly allow zero fee');
assert.match(settings,/Number\.isFinite\(n\)&&n>=0\?n:fallback/,'settings parser must preserve zero');

assert.match(ledger,/TradePlan='ROUND_LOT'\|'ODD_LOT'\|'RECURRING'/,'ledger must distinguish recurring orders');
assert.match(ledger,/label:'零股'/,'ledger odd-lot mode missing');
assert.match(ledger,/label:'整股'/,'ledger round-lot mode missing');
assert.match(ledger,/label:'定期定額'/,'ledger recurring mode missing');
assert.match(ledger,/selectedBrokerProfile=tradePlan==='RECURRING'\?brokerSettings\.recurringProfile:brokerSettings\.activeProfile/,'ledger must select the configured fee profile');
assert.match(ledger,/brokerProfile:selectedBrokerProfile/,'ledger preview/commit must consume configured profile');

console.log('TF_ASSET_BROKER_SETTINGS_CONTRACT: PASS');
