import assert from 'node:assert/strict';
import {selectNewsForEnrichment} from '../src/ai/newsCoverage';
// Simulate a busy ETF with 45 new stories; other holdings still need news slots.
const newest=[...Array.from({length:45},(_,i)=>({symbol:'0050',id:'A'+i})),...Array.from({length:5},(_,i)=>({symbol:'00878',id:'B'+i})),...Array.from({length:5},(_,i)=>({symbol:'00919',id:'C'+i}))];
const feed=selectNewsForEnrichment(newest,40);
assert.equal(feed.length,40);
assert.equal(new Set(feed.map(x=>x.symbol)).size,3);
assert.equal(feed.filter(x=>x.symbol==='00878').length,5);
assert.equal(feed.filter(x=>x.symbol==='00919').length,5);
assert.equal(feed[0]!.id,'A0');
assert.equal(feed[1]!.id,'B0');
assert.equal(feed[2]!.id,'C0');
assert.deepEqual(selectNewsForEnrichment([],40),[]);
console.log('R5 fair held-ETF news feed behavior: PASS');
