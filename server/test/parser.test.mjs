import test from 'node:test';
import assert from 'node:assert/strict';
import {misTrade,misSourceTime,officialClose,chooseNewer,positive} from '../src/parser.mjs';
import {isSession,officialDay} from '../src/clock.mjs';

const session=Date.parse('2026-09-24T10:15:10+08:00');
const row={c:'0050',n:'元大台灣50',d:'20260924',t:'10:15:09',z:'112.45',y:'111.20'};
test('MIS preserves actual exchange seconds rather than HTTP receipt time',()=>{
  const quote=misTrade(row,session);
  assert.equal(quote.currentPrice,112.45);
  assert.equal(quote.sourceQuoteAt,session-1000);
  assert.equal(quote.quality,'trade');
  assert.equal(quote.source,'TWSE_MIS');
});
test('MIS rejects a book-only response, zeros, invalid timestamps and future data',()=>{
  assert.equal(misTrade({...row,z:'-',pz:'112.30',b:'112.20',a:'112.50'},session),null);
  assert.equal(misTrade({...row,z:'0'},session),null);
  assert.equal(misTrade({...row,d:'20260230'},session),null);
  assert.equal(misTrade({...row,t:'99:33:33'},session),null);
  assert.equal(misTrade({...row,t:'-'},session),null);
  assert.equal(misSourceTime(row,session-123_000),null);
  assert.equal(misTrade({...row,tlong:String(session+500_000)},session)?.sourceQuoteAt,session-1000);
  assert.equal(positive('1,234.56'),1234.56);
});
test('the two official close endpoints use ROC dates and require session end',()=>{
  const after=Date.parse('2026-09-24T15:00:00+08:00');
  const before=Date.parse('2026-09-24T10:15:00+08:00');
  const twse={Code:'0050',Name:'元大台灣50',Date:'1150924',ClosingPrice:'113.00'};
  const otc={SecuritiesCompanyCode:'00713',CompanyName:'元大高息低波',Date:'1150924',Close:'53.35'};
  assert.equal(officialDay('115/09/24'),'2026-09-24');
  assert.equal(officialDay('1150230'),null);
  assert.equal(officialClose(twse,'TWSE_DAILY',before),null);
  assert.equal(officialClose(twse,'TWSE_DAILY',after)?.quality,'official_close');
  assert.equal(officialClose(otc,'TPEX_DAILY',after)?.currentPrice,53.35);
  assert.equal(officialClose({...otc,Date:'1150925'},'TPEX_DAILY',after),null);
});
test('new trade wins tied official close; old data cannot replace newer',()=>{
  const close={sourceQuoteAt:1000,quality:'official_close',currentPrice:22};
  const trade={sourceQuoteAt:1000,quality:'trade',currentPrice:23};
  assert.equal(chooseNewer(close,trade),trade);
  assert.equal(chooseNewer(trade,close),trade);
  assert.equal(chooseNewer(trade,{...trade,sourceQuoteAt:900}),trade);
});
test('Taipei dayparts are explicit and do not assume server timezone',()=>{
  assert.equal(isSession(Date.parse('2026-09-24T09:05:00+08:00')),true);
  assert.equal(isSession(Date.parse('2026-09-24T08:55:00+08:00')),false);
  assert.equal(isSession(Date.parse('2026-09-26T09:05:00+08:00')),false);
});
