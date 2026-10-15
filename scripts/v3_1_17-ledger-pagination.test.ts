import assert from 'node:assert/strict';
import {LEDGER_PAGE_SIZES,clampLedgerPage,ledgerPageCount,ledgerPageSlice} from '../src/finance/ledgerPagination';

assert.deepEqual(LEDGER_PAGE_SIZES,[10,20,50]);
const rows=Array.from({length:57},(_,index)=>({id:index+1}));
assert.equal(ledgerPageCount(rows.length,10),6);
assert.equal(ledgerPageCount(rows.length,20),3);
assert.equal(ledgerPageCount(rows.length,50),2);
assert.equal(clampLedgerPage(99,rows.length,20),3);
assert.equal(clampLedgerPage(-5,rows.length,20),1);
assert.deepEqual(ledgerPageSlice(rows,1,10).map(row=>row.id),[1,2,3,4,5,6,7,8,9,10]);
assert.deepEqual(ledgerPageSlice(rows,6,10).map(row=>row.id),[51,52,53,54,55,56,57]);
assert.deepEqual(ledgerPageSlice(rows,2,50).map(row=>row.id),[51,52,53,54,55,56,57]);
// Regression: records beyond the previous hard-coded first 20 are reachable through paging.
assert.equal(ledgerPageSlice(rows,3,20)[0]?.id,41);
assert.equal(ledgerPageSlice(rows,3,20).at(-1)?.id,57);
console.log('V3.1.17 ledger pagination gate PASS');
