import {financialTone} from '../../theme/financialTone';
import type {DashboardKpi} from './DashboardProfitAnalysis';
import type {DashboardProfitRow} from './DashboardProfitDetail';

/**
 * One read-only presentation adapter for both HomeScreen and its live editor.
 * Accepts only fields from the current canonical Finance Snapshot.
 * Never calculates ledger P&L and never uses test/mock values.
 */
export type HomeProfitSnapshot=Readonly<{
  realizedNetPnL:number;
  totalPnl:number;
  totalUnrealizedProfit:number;
  totalMarketValue:number;
  totalPriceUnrealizedProfit:number;
}>;

export function homeProfitPresentation(
  portfolio:HomeProfitSnapshot,
  valuationComplete:boolean,
  money:(value:number)=>string,
):Readonly<{kpis:readonly DashboardKpi[];rows:readonly DashboardProfitRow[]}>{
  const kpis:DashboardKpi[]=[
    {key:'realizedNetPnL',label:'已實現損益',value:money(portfolio.realizedNetPnL),
      caption:'歷史賣出',tone:financialTone(portfolio.realizedNetPnL),glyph:'↗'},
    {key:'totalPnl',label:'投資總報酬（含息）',
      value:valuationComplete?money(portfolio.totalPnl):'待核對',
      caption:'未實現＋已實現＋股息',
      tone:financialTone(portfolio.totalPnl,valuationComplete),glyph:'%'},
    {key:'totalUnrealizedProfit',label:'淨清算未實現',
      value:valuationComplete?money(portfolio.totalUnrealizedProfit):'待核對',
      caption:'估計清算後',
      tone:financialTone(portfolio.totalUnrealizedProfit,valuationComplete),glyph:'▥'},
    {key:'totalMarketValue',label:'持股市值',
      value:valuationComplete?money(portfolio.totalMarketValue):'待核對',
      caption:'持股行情＋股數',glyph:'◔'},
  ];
  const rows:DashboardProfitRow[]=[
    {key:'price',label:'純價差未實現',
      value:valuationComplete?money(portfolio.totalPriceUnrealizedProfit):'待核對',
      tone:financialTone(portfolio.totalPriceUnrealizedProfit,valuationComplete)},
    {key:'net',label:'淨清算未實現',
      value:valuationComplete?money(portfolio.totalUnrealizedProfit):'待核對',
      tone:financialTone(portfolio.totalUnrealizedProfit,valuationComplete)},
    {key:'realized',label:'已實現損益',
      value:money(portfolio.realizedNetPnL),tone:financialTone(portfolio.realizedNetPnL)},
    {key:'total',label:'投資總報酬（含息）',
      value:valuationComplete?money(portfolio.totalPnl):'待核對',
      tone:financialTone(portfolio.totalPnl,valuationComplete)},
  ];
  return {kpis,rows};
}
