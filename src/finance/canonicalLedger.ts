import type { BrokerProfileId } from '../data/brokerProfiles';
import { resolveBrokerProfile, type BrokerProfile } from '../data/brokerProfiles';
import type { DividendFrequency, ETFItem, TradeMode, Transaction } from '../types/etf';
import {
  calculateActualPurchaseCost,
  calculateETFSummary,
  calculateNetDividend,
  calculatePortfolioSummary,
  calculatePurchaseCost,
  calculateSaleSettlement,
} from '../utils/etfCalculators';

export type LedgerTradeKind = 'buy' | 'sell';
export type LedgerKind = LedgerTradeKind | 'dividend' | 'other';

type LedgerBase = Readonly<{
  id: string;
  date: string;
  note?: string;
}>;

export type FrozenTradeLedgerEntry = LedgerBase & Readonly<{
  kind: LedgerTradeKind;
  symbol: string;
  name: string;
  tradeMode: TradeMode;
  shares: number;
  price: number;
  amount: number;
  calculatedFee: number;
  calculatedTax: number;
  actualFee: number;
  actualTax: number;
  brokerProfileId: BrokerProfileId;
}>;

export type DividendLedgerEntry = LedgerBase & Readonly<{
  kind: 'dividend';
  symbol: string;
  name: string;
  perShareAmount: number;
  sharesHeld: number;
}>;

export type OtherCashLedgerEntry = LedgerBase & Readonly<{
  kind: 'other';
  label: string;
  amount: number;
}>;

export type CanonicalLedgerEntry =
  | FrozenTradeLedgerEntry
  | DividendLedgerEntry
  | OtherCashLedgerEntry;

export type MarketQuoteInput = Readonly<{
  symbol: string;
  name: string;
  currentPrice: number;
  previousClose?: number;
  liquidationTradeMode: TradeMode;
  dividendFrequency: DividendFrequency;
  latestDividendPerShare?: number;
  brokerProfileId?: BrokerProfileId;
}>;

export type CanonicalLedgerSnapshot = Readonly<{
  cashBalance: number;
  totalAssets: number;
  portfolio: ReturnType<typeof calculatePortfolioSummary>;
  holdings: ReturnType<typeof calculateETFSummary>[];
}>;

const finiteNonNegative = (value: number) =>
  Number.isFinite(value) ? Math.max(0, value) : 0;

export function freezeTradeEntry(input: {
  id: string;
  date: string;
  kind: LedgerTradeKind;
  symbol: string;
  name: string;
  tradeMode: TradeMode;
  shares: number;
  price: number;
  actualFee?: number;
  actualTax?: number;
  brokerProfile?: BrokerProfile;
  brokerProfileId?: BrokerProfileId;
  note?: string;
}): FrozenTradeLedgerEntry {
  const profile = input.brokerProfile ?? resolveBrokerProfile(input.brokerProfileId);
  const tx: Transaction = {
    id: input.id,
    etfCode: input.symbol,
    type: input.kind === 'buy' ? 'BUY' : 'SELL',
    tradeMode: input.tradeMode,
    shares: finiteNonNegative(input.shares),
    price: finiteNonNegative(input.price),
    date: input.date,
    brokerProfile: profile,
  };

  if (input.kind === 'buy') {
    const estimate = calculatePurchaseCost(tx);
    const actualFee = input.actualFee == null ? estimate.commission : finiteNonNegative(input.actualFee);
    const frozen = calculateActualPurchaseCost({ ...tx, actualFee });
    return {
      id: input.id,
      date: input.date,
      kind: 'buy',
      symbol: input.symbol,
      name: input.name,
      tradeMode: input.tradeMode,
      shares: tx.shares,
      price: tx.price,
      amount: frozen.tradeAmount,
      calculatedFee: estimate.commission,
      calculatedTax: 0,
      actualFee,
      actualTax: 0,
      brokerProfileId: profile.id,
      ...(input.note ? { note: input.note } : {}),
    };
  }

  const estimated = calculateSaleSettlement(tx);
  const actualFee = input.actualFee == null ? estimated.commission : finiteNonNegative(input.actualFee);
  const actualTax = input.actualTax == null ? estimated.tax : finiteNonNegative(input.actualTax);
  const frozen = calculateSaleSettlement({ ...tx, actualFee, actualTax });
  return {
    id: input.id,
    date: input.date,
    kind: 'sell',
    symbol: input.symbol,
    name: input.name,
    tradeMode: input.tradeMode,
    shares: tx.shares,
    price: tx.price,
    amount: frozen.tradeAmount,
    calculatedFee: estimated.commission,
    calculatedTax: estimated.tax,
    actualFee,
    actualTax,
    brokerProfileId: profile.id,
    ...(input.note ? { note: input.note } : {}),
  };
}

export function toCanonicalTransaction(entry: FrozenTradeLedgerEntry): Transaction {
  return {
    id: entry.id,
    etfCode: entry.symbol,
    type: entry.kind === 'buy' ? 'BUY' : 'SELL',
    tradeMode: entry.tradeMode,
    shares: entry.shares,
    price: entry.price,
    date: entry.date,
    calculatedFee: entry.calculatedFee,
    calculatedTax: entry.calculatedTax,
    actualFee: entry.actualFee,
    actualTax: entry.actualTax,
    brokerProfile: resolveBrokerProfile(entry.brokerProfileId),
  };
}

export function calculateLedgerCashFlow(entry: CanonicalLedgerEntry): number {
  if (entry.kind === 'buy') {
    return -(entry.amount + entry.actualFee);
  }
  if (entry.kind === 'sell') {
    return Math.max(0, entry.amount - entry.actualFee - entry.actualTax);
  }
  if (entry.kind === 'dividend') {
    return calculateNetDividend({
      id: entry.id,
      etfCode: entry.symbol,
      paymentDate: entry.date,
      perShareAmount: entry.perShareAmount,
      sharesHeld: entry.sharesHeld,
    });
  }
  return Number.isFinite(entry.amount) ? entry.amount : 0;
}

export function buildETFItems(
  entries: readonly CanonicalLedgerEntry[],
  quotes: readonly MarketQuoteInput[],
): ETFItem[] {
  return quotes.map(quote => {
    const trades = entries
      .filter((entry): entry is FrozenTradeLedgerEntry =>
        (entry.kind === 'buy' || entry.kind === 'sell') && entry.symbol === quote.symbol,
      )
      .map(toCanonicalTransaction);

    const dividends = entries
      .filter((entry): entry is DividendLedgerEntry =>
        entry.kind === 'dividend' && entry.symbol === quote.symbol,
      )
      .map(entry => ({
        id: entry.id,
        etfCode: entry.symbol,
        paymentDate: entry.date,
        perShareAmount: entry.perShareAmount,
        sharesHeld: entry.sharesHeld,
      }));

    const brokerProfile = resolveBrokerProfile(quote.brokerProfileId);

    return {
      etfCode: quote.symbol,
      name: quote.name,
      currentPrice: finiteNonNegative(quote.currentPrice),
      liquidationTradeMode: quote.liquidationTradeMode,
      dividendFrequency: quote.dividendFrequency,
      ...(quote.latestDividendPerShare == null
        ? {}
        : { latestDividendPerShare: finiteNonNegative(quote.latestDividendPerShare) }),
      transactions: trades,
      dividendRecords: dividends,
      brokerProfile,
    };
  });
}

export function calculateCanonicalLedgerSnapshot(input: {
  initialCash: number;
  entries: readonly CanonicalLedgerEntry[];
  quotes: readonly MarketQuoteInput[];
}): CanonicalLedgerSnapshot {
  const items = buildETFItems(input.entries, input.quotes);
  const portfolio = calculatePortfolioSummary(items);
  const cashBalance = input.entries.reduce(
    (cash, entry) => cash + calculateLedgerCashFlow(entry),
    Number.isFinite(input.initialCash) ? input.initialCash : 0,
  );

  return {
    cashBalance,
    totalAssets: portfolio.totalMarketValue + cashBalance,
    portfolio,
    holdings: portfolio.etfSummaries,
  };
}


export function calculateBuyScenario(input: {
  holding: CanonicalLedgerSnapshot['holdings'][number];
  currentPrice: number;
  addPrice: number;
  addShares: number;
  tradeMode: TradeMode;
  brokerProfileId?: BrokerProfileId;
}) {
  const profile=resolveBrokerProfile(input.brokerProfileId);
  const purchase=calculatePurchaseCost({
    id:'scenario-buy',
    etfCode:input.holding.etfCode,
    type:'BUY',
    tradeMode:input.tradeMode,
    shares:finiteNonNegative(input.addShares),
    price:finiteNonNegative(input.addPrice),
    date:'scenario',
    brokerProfile:profile,
  });
  const newShares=input.holding.totalShares+finiteNonNegative(input.addShares);
  const newTradeCost=input.holding.totalTradeCost+purchase.tradeAmount;
  const newInvestmentCost=input.holding.totalInvestmentCost+purchase.settlementAmount;
  const averageTradePrice=newShares>0?newTradeCost/newShares:0;
  const averageCostPerShare=newShares>0?newInvestmentCost/newShares:0;
  const currentMarketValue=Math.floor(newShares*finiteNonNegative(input.currentPrice));
  const liquidation=calculateSaleSettlement({
    id:'scenario-sell',
    etfCode:input.holding.etfCode,
    type:'SELL',
    tradeMode:input.tradeMode,
    shares:newShares,
    price:finiteNonNegative(input.currentPrice),
    date:'scenario',
    brokerProfile:profile,
  });
  const netLiquidationValue=liquidation.settlementAmount;
  return {
    addTradeAmount:purchase.tradeAmount,
    addCommission:purchase.commission,
    addCashOutflow:purchase.settlementAmount,
    newShares,
    newTradeCost,
    newInvestmentCost,
    averageTradePrice,
    averageCostPerShare,
    currentMarketValue,
    netLiquidationValue,
    priceUnrealizedProfit:currentMarketValue-newTradeCost,
    cashUnrealizedProfit:netLiquidationValue-newInvestmentCost,
  };
}
