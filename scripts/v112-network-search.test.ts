import assert from 'node:assert/strict';
import {formatNetworkResults,parseDuckDuckGo,parseWikipedia} from '../src/ai/networkSearch';

const duck=parseDuckDuckGo({
  Heading:'ETF',
  AbstractText:'Exchange-traded fund summary',
  AbstractURL:'https://example.com/etf',
  AbstractSource:'Example',
  RelatedTopics:[{Text:'Taiwan ETF reference',FirstURL:'https://example.com/tw-etf'}],
});
assert.equal(duck.length,2);
assert.equal(duck[0]?.source,'Example');
assert.match(formatNetworkResults(duck,{showSources:true,detail:'concise'}),/Example/);

const wiki=parseWikipedia(['0050',['元大台灣50'],['台灣 ETF'],['https://zh.wikipedia.org/wiki/0050']]);
assert.equal(wiki.length,1);
assert.equal(wiki[0]?.source,'Wikipedia');
assert.match(formatNetworkResults(wiki,{showSources:false,detail:'balanced'}),/元大台灣50/);

console.log('v1.1.2 network search parser PASS');
