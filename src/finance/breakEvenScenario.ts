import {calculateBuyScenario,type CanonicalLedgerSnapshot} from './canonicalLedger';
import type {TradeMode} from '../types/etf';

type Scenario=ReturnType<typeof calculateBuyScenario>;
export type BreakEvenResult=Readonly<{
  status:'invalid'|'already'|'reachable'|'impossible'|'limit';
  additionalShares:number;
  scenario:Scenario|null;
}>;

/**
 * Minimum additional shares that can cover the position's NET liquidation
 * loss at a hypothetical exit price. Fees/tax/rounding are delegated to the
 * locked Canonical scenario calculator. No Ledger writes are made.
 */
export function calculateBreakEvenPurchase(input:{
  holding:CanonicalLedgerSnapshot['holdings'][number];
  buyPrice:number;
  exitPrice:number;
  tradeMode:TradeMode;
  brokerProfileId?:string;
}):BreakEvenResult{
  const {holding,buyPrice,exitPrice,tradeMode,brokerProfileId}=input;
  if(!Number.isFinite(buyPrice)||buyPrice<=0||!Number.isFinite(exitPrice)||exitPrice<=0||
     !Number.isFinite(holding.totalShares)||holding.totalShares<=0){
    return {status:'invalid',additionalShares:0,scenario:null};
  }
  const step=tradeMode==='ROUND_LOT'?1000:1;
  const cap=Math.floor(1_000_000_000/step);
  const evaluate=(units:number)=>calculateBuyScenario({
    holding,currentPrice:exitPrice,addPrice:buyPrice,addShares:units*step,tradeMode,
    ...(brokerProfileId?{brokerProfileId}:{}),
  });
  const initial=evaluate(0);
  if(initial.cashUnrealizedProfit>=0)return {status:'already',additionalShares:0,scenario:initial};
  // Buying at the same or a higher price than the eventual sale cannot
  // recover an existing net loss: extra round trips only add non-negative fees.
  if(exitPrice<=buyPrice)return {status:'impossible',additionalShares:0,scenario:initial};
  let low=0,high=1;
  while(high<cap&&evaluate(high).cashUnrealizedProfit<0){
    low=high;
    high=Math.min(cap,high*2);
  }
  if(evaluate(high).cashUnrealizedProfit<0)return {status:'limit',additionalShares:0,scenario:null};
  while(low+1<high){
    const mid=Math.floor((low+high)/2);
    if(evaluate(mid).cashUnrealizedProfit>=0)high=mid;else low=mid;
  }
  return {status:'reachable',additionalShares:high*step,scenario:evaluate(high)};
}

/** Minimum additional shares needed to attain an arbitrary NET profit target
 * at the user's hypothetical exit price. Uses the same immutable Canonical
 * purchase/sale settlement as the existing break-even calculator. */
export function calculateTargetProfitPurchase(input:{
  holding:CanonicalLedgerSnapshot['holdings'][number];
  buyPrice:number;
  exitPrice:number;
  targetNetProfit:number;
  tradeMode:TradeMode;
  brokerProfileId?:string;
}):BreakEvenResult{
  const {holding,buyPrice,exitPrice,targetNetProfit,tradeMode,brokerProfileId}=input;
  if(!Number.isFinite(targetNetProfit)||targetNetProfit<0||
    !Number.isFinite(buyPrice)||buyPrice<=0||!Number.isFinite(exitPrice)||exitPrice<=0||
    !Number.isFinite(holding.totalShares)||holding.totalShares<=0)
    return {status:'invalid',additionalShares:0,scenario:null};
  const step=tradeMode==='ROUND_LOT'?1000:1;
  const cap=Math.floor(1_000_000_000/step);
  const evaluate=(units:number)=>calculateBuyScenario({
    holding,currentPrice:exitPrice,addPrice:buyPrice,addShares:units*step,tradeMode,
    ...(brokerProfileId?{brokerProfileId}:{}),
  });
  const initial=evaluate(0);
  if(initial.cashUnrealizedProfit>=targetNetProfit)
    return {status:'already',additionalShares:0,scenario:initial};
  // A purchase at or above the assumed liquidation price cannot increase
  // final net proceeds after buying and selling fees / transaction taxes.
  if(exitPrice<=buyPrice)return {status:'impossible',additionalShares:0,scenario:initial};
  let low=0,high=1;
  while(high<cap&&evaluate(high).cashUnrealizedProfit<targetNetProfit){
    low=high;high=Math.min(high*2,cap);
  }
  if(evaluate(high).cashUnrealizedProfit<targetNetProfit)
    return {status:'limit',additionalShares:0,scenario:null};
  while(low+1<high){
    const mid=Math.floor((low+high)/2);
    if(evaluate(mid).cashUnrealizedProfit>=targetNetProfit)high=mid;else low=mid;
  }
  return {status:'reachable',additionalShares:high*step,scenario:evaluate(high)};
}
