/** Diagnostic counters only. No subscriptions, quote values, React updates or persistence. */
let applied=0,lastVersion=0;
export function markMarketFlowApplied(version:number){applied++;lastVersion=version;}
export function marketFlowMetrics(){return {appApplied:applied,appVersion:lastVersion};}
