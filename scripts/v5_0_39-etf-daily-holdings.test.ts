import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {localStockEtfOwners,validateStockEtfOwners,mergeStockEtfOwners,taipeiDisclosureDate} from '../src/market/etfStockOwnership';
import type {EtfConstituentSnapshot} from '../src/market/etfConstituents';
const at='2026-10-23';
const base:EtfConstituentSnapshot={
  symbol:'0050',asOf:at,fetchedAt:100,source:'元大投信',
  sourceUrl:'https://www.yuantaetfs.com/product/detail/0050/ratio',
  basis:'issuer_disclosed',complete:true,rows:[{symbol:'2330',name:'台積電',weight:58.12}],
};
const older:EtfConstituentSnapshot={
  ...base,symbol:'00878',asOf:'2026-10-22',source:'MoneyDJ 理財網',
  sourceUrl:'https://www.moneydj.com/ETF/X/Basic/Basic0007.xdjhtm?etfid=00878.TW',
  basis:'third_party_disclosed',complete:false,rows:[{symbol:'2330',name:'台積電',weight:4.5}],
};
const stocks=localStockEtfOwners('2330',[base,older],{'0050':'元大台灣50','00878':'國泰永續高股息'});
assert.equal(stocks.length,2);
assert.equal(stocks[0]!.asOf,at);
assert.equal(stocks[0]!.quantity,null,'missing shares cannot be invented from weight');
assert.equal(stocks[1]!.complete,false,'partial coverage must remain partial');
assert.equal(taipeiDisclosureDate(Date.parse('2026-10-22T17:00:00Z')),at);
assert.deepEqual(localStockEtfOwners('2454',[base,older]),[],'no fabricated stock owners');
assert.equal(validateStockEtfOwners({coverage:10,rows:[{...stocks[0],quantity:10000}]},'2330')?.rows[0]?.quantity,10000);
assert.equal(validateStockEtfOwners({coverage:10,rows:[{...stocks[0],weight:110}]},'2330'),null);
assert.equal(validateStockEtfOwners({coverage:10,rows:[{...stocks[0],sourceUrl:'http://evil.local/'}]},'2330'),null);
assert.equal(validateStockEtfOwners({coverage:301,rows:[]},'2330'),null);
assert.equal(validateStockEtfOwners({coverage:1,rows:[{...stocks[0],asOf:'2026-02-30'}]},'2330'),null);
assert.equal(validateStockEtfOwners({coverage:1,rows:[stocks[0],stocks[0]]},'2330'),null);
const merged=mergeStockEtfOwners(stocks,[{...stocks[0]!,asOf:'2026-10-20',weight:60}]);
assert.equal(merged[0]!.asOf,at,'older server data must not overwrite today cache');
const q=localStockEtfOwners('2330',[{...base,rows:[{symbol:'2330',name:'台積電',weight:5,quantity:133000}]}]);
assert.equal(q[0]?.quantity,133000);
const read=(path:string)=>readFileSync(path,'utf8');
const component=read('src/components/StockEtfOwnershipContent.tsx');
const research=read('src/screens/MarketResearchScreen.tsx');
const etf=read('src/components/EtfConstituentsContent.tsx');
const api=read('server/src/etfHoldings.mjs');
assert.match(component,/今日資料尚未核實/);
assert.match(component,/hydrateEtfConstituentCache/);
assert.match(component,/僅已下載／已追蹤清單/);
assert.match(research,/StockEtfOwnershipContent/);
assert.match(etf,/onSelectStock/);
assert.match(api,/GET|app\.get\('\/api\/v1\/etf\/stock\/:symbol\/owners'/);
console.log('V5.0.39 ETF daily disclosure/stock reverse lookup/date/quantity/coverage source guards PASS');
