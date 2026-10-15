import assert from 'node:assert/strict';
import {DEFAULT_MONITOR_CONFIG,MONITOR_FIELDS} from '../src/monitor/monitorDomain';
import {buildSharedSnapshot} from '../src/finance/sharedSnapshotAdapter';
import {calculateCanonicalLedgerSnapshot} from '../src/finance/canonicalLedger';

async function run(){
  assert.ok(MONITOR_FIELDS.includes('volume' as never),'Monitor must offer actual cumulative volume');
  const {MONITOR_MODELS,applyMonitorModel,monitorMarketFieldText}=await import('../src/monitor/monitorModels');
  assert.equal(MONITOR_MODELS.length,10);
  assert.equal(new Set(MONITOR_MODELS.map(x=>x.id)).size,10);
  const original={...DEFAULT_MONITOR_CONFIG,selectedSymbols:['0050'],normalLayout:{x:31,y:42,width:340,height:500}};
  for(const model of MONITOR_MODELS){
    const next=applyMonitorModel(original,model.id);
    assert.equal(next.template,'market-wall');assert.equal(next.model,model.id);
    assert.deepEqual(next.selectedSymbols,original.selectedSymbols);assert.deepEqual(next.normalLayout,original.normalLayout);
    assert.deepEqual(next.miniColumns,original.miniColumns);assert.deepEqual(next.miniStyle,original.miniStyle);
    assert.ok(next.normalWall.fields.some(x=>x.field==='volume'));
    assert.ok(next.normalWall.fields.some(x=>x.field==='previousClose'));
  }
  assert.equal(applyMonitorModel(original,'volume').normalWall.fields.find(x=>x.field==='volume')?.enabled,true);
  assert.equal(applyMonitorModel(original,'reference').normalWall.fields.find(x=>x.field==='previousClose')?.enabled,true);
  const canonical=calculateCanonicalLedgerSnapshot({initialCash:0,entries:[],quotes:[]});
  const holding={symbol:'0050',name:'元大台灣50',price:113.5,previousClose:112.4,quoteVerified:true,shares:124,avgCost:110,marketValue:14074,pnl:434,roi:3.18,comprehensivePnl:434};
  const make=(volume:number|null)=>buildSharedSnapshot({canonical,holdings:[holding as never],generatedAt:1000,quoteSourceTimes:[{symbol:'0050',sourceQuoteAt:1000,volume}]});
  const row=make(140553).holdings[0]!;
  assert.equal(row.volume,140553);assert.equal(row.marketValue,14074);assert.equal(row.pnl,434);
  assert.equal(monitorMarketFieldText(row,'volume'),'140,553');
  assert.equal(monitorMarketFieldText(row,'previousClose'),'112.40');
  assert.equal(monitorMarketFieldText({...row,previousCloseKnown:false} as never,'previousClose'),'--','Unknown previous close must not be presented as confirmed');
  const unknown=buildSharedSnapshot({canonical,holdings:[{...holding,previousCloseKnown:false} as never],generatedAt:1000});
  assert.equal(unknown.holdings[0]!.previousCloseKnown,false);
  assert.equal(monitorMarketFieldText(unknown.holdings[0]!,'previousClose'),'--');
  assert.equal(monitorMarketFieldText(make(0).holdings[0]!,'volume'),'0');
  assert.equal(monitorMarketFieldText(make(null).holdings[0]!,'volume'),'--');
  assert.equal(monitorMarketFieldText(make(-1).holdings[0]!,'volume'),'--');
  console.log('V4.0.56 ten holding models, isolated preset application, source volume/null/zero and immutable finance values PASS');
}
run().catch(error=>{console.error(error);process.exitCode=1});
