import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {normalizePageDisplayConfig} from '../src/editor/editorModel';

const quote=normalizePageDisplayConfig('home',{
  quoteStyle:'quote',
  holdingPrimaryField:'price',
  holdingColumns:2,
  holdingScrollMode:'horizontal',
});
assert.equal(quote.quoteStyle,'quote');
assert.equal(quote.holdingPrimaryField,'price');
assert.equal(quote.holdingColumns,2);
assert.equal(quote.holdingScrollMode,'horizontal');
assert.equal(quote.holdingLayoutMode,'paged2');

const chart=normalizePageDisplayConfig('home',{
  quoteStyle:'chart',
  holdingPrimaryField:'price',
  holdingColumns:3,
  holdingScrollMode:'horizontal',
});
assert.equal(chart.holdingColumns,1);
assert.equal(chart.holdingScrollMode,'horizontal');
assert.equal(chart.holdingLayoutMode,'horizontal');

const modal=readFileSync('src/components/PageFrameSettingsModal.tsx','utf8');
const home=readFileSync('src/screens/HomeScreen.tsx','utf8');
const collection=readFileSync('src/components/HoldingQuoteCollection.tsx','utf8');
assert.match(modal,/目前顯示狀態/);
assert.match(modal,/圖表模式固定單欄/);
assert.match(modal,/holdingScrollMode/);
assert.match(home,/主要資料/);
assert.match(home,/橫向滑動/);
assert.match(collection,/FlatList/);
assert.match(collection,/maxToRenderPerBatch/);
assert.match(collection,/effectiveColumns:HoldingColumnCount=style==='chart'\?1/);

console.log('v1.1.2 home holding layout PASS');
