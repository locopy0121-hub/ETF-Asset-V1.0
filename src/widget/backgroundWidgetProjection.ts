import {calculateCanonicalLedgerSnapshot,validateLedgerSequence,type CanonicalLedgerEntry} from '../finance/canonicalLedger';
import {migrateLegacyOpeningCash,isGeneratedLegacyReversal} from '../finance/cashAudit';
import {ensureLedgerQuoteCoverage} from '../finance/runtimeQuoteCoverage';
import {projectHoldingQuotes} from '../finance/holdingProjection';
import {buildSharedSnapshot} from '../finance/sharedSnapshotAdapter';
import {marketRowsToRuntimeQuotes} from '../market/unifiedMarketAdapter';
import {marketValuationQuoteFromRow,applyMarketClosedDates} from '../market/marketCenterViews';
import {omitRegressedTransportQuotes} from '../market/saiEtfSnapshotContract';
import type {RuntimeQuote} from '../finance/financeSeed';
import type {UnifiedMarketSnapshot} from '../native/TfAssetNativeBridge';

export function buildBackgroundWidgetSnapshot(raw:unknown,native:UnifiedMarketSnapshot,previous:readonly RuntimeQuote[]=[],now=Date.now()){
  if(Array.isArray(native.closedDates))applyMarketClosedDates(native.closedDates,native.holidayNames);
  if(!raw||typeof raw!=='object')return null;
  const state=raw as {schema?:number;initialCash?:number;cashConfigured?:boolean;entries?:CanonicalLedgerEntry[]};
  if(![1,2,3,4].includes(Number(state.schema))||!Array.isArray(state.entries))return null;
  const normalized=migrateLegacyOpeningCash(Number.isFinite(state.initialCash)?state.initialCash!:0,state.entries,
    {forceOpeningCashZero:state.cashConfigured!==true,removeGeneratedLegacyReversals:true});
  if(validateLedgerSequence(normalized.entries).length)return null;
  const quotes=marketRowsToRuntimeQuotes(omitRegressedTransportQuotes(native,previous),previous,now);
  const valuationQuotes=quotes.filter(row=>marketValuationQuoteFromRow(row,{now})===row);
  const canonical=calculateCanonicalLedgerSnapshot({initialCash:normalized.initialCash,entries:normalized.entries,quotes:ensureLedgerQuoteCoverage(normalized.entries,valuationQuotes)});
  const ledgerNames=new Map(normalized.entries.flatMap(row=>'symbol' in row?[[row.symbol,row.name] as const]:[]));
  const holdings=projectHoldingQuotes({snapshot:canonical,quotes,now,version:native.version,ledgerNames});
  const generatedAt=quotes.reduce((at,row)=>Math.max(at,row.sourceQuoteAt??0),0)||null;
  return buildSharedSnapshot({canonical,holdings,generatedAt,quoteSourceTimes:quotes,marketDataVersion:native.version,valuationComplete:holdings.every(row=>row.quoteVerified===true),cashConfigured:state.cashConfigured===true||normalized.entries.some(row=>row.kind==='other'&&!isGeneratedLegacyReversal(row))});
}
