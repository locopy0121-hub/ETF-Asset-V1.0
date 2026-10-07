import assert from 'node:assert/strict';
import {hasUsableTwseQuote,resolveTwseCurrentPrice,resolveTwseLivePrice} from '../src/market/twseQuoteParser';

const row={c:'0050',n:'元大台灣50',z:'-',pz:'112.90',b:'112.35_112.30_',a:'112.40_112.45_',y:'112.90',d:'20261002',t:'09:46:10'};
assert.equal(resolveTwseCurrentPrice(row),112.35);
assert.equal(resolveTwseLivePrice(row).kind,'bid');
assert.equal(hasUsableTwseQuote({c:'0050',z:'-',pz:'112.90',b:'',a:'',y:'112.90'}),false);
assert.equal(resolveTwseCurrentPrice({c:'0050',z:'113.10',b:'113.00_',a:'113.15_',y:'112.90'}),113.10);
assert.equal(resolveTwseLivePrice({c:'0050',z:'-',b:'',a:'112.40_',y:'112.90'}).kind,'ask');
console.log('TWSE LIVE PRICE PARSER INTEGRITY: PASS');
