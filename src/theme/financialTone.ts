import type {FinancialTone} from '../maintenance/workspaceModel';

/** Missing valuation and zero carry no positive or negative direction. */
export function financialTone(value:number,available=true):FinancialTone{
  return !available||!Number.isFinite(value)||value===0?'neutral':value>0?'gain':'loss';
}

/** Shared by actual page frames and settings previews; values remain canonical. */
export function portfolioFrameTone(page:string,key:string,portfolio:{totalPriceUnrealizedProfit:number;totalPnl:number},available:boolean):FinancialTone{
  if(page==='home'&&['asset-dashboard','profit-analysis','pnl-detail','holding-quotes'].includes(key))return financialTone(portfolio.totalPriceUnrealizedProfit,available);
  if(page==='portfolio'&&key==='holding-dashboard')return financialTone(portfolio.totalPnl,available);
  if(page==='portfolio'&&key==='holding-view')return financialTone(portfolio.totalPriceUnrealizedProfit,available);
  return 'neutral';
}
