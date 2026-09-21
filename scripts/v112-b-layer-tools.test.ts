import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {normalizePageDisplayConfig} from '../src/editor/editorModel';

const ledger=normalizePageDisplayConfig('ledger',{
  ledgerListVisibleCount:100,
  ledgerShowRecentSymbols:false,
  ledgerShowSuggestions:false,
  ledgerShowFeeTax:false,
});
assert.equal(ledger.ledgerListVisibleCount,100);
assert.equal(ledger.ledgerShowRecentSymbols,false);
assert.equal(ledger.ledgerShowSuggestions,false);
assert.equal(ledger.ledgerShowFeeTax,false);

const portfolio=normalizePageDisplayConfig('portfolio',{
  quoteStyle:'quote',
  holdingColumns:2,
  holdingScrollMode:'horizontal',
  holdingPrimaryField:'marketValue',
  portfolioTableRowHeight:68,
  calculatorPanelHeightPct:80,
  calculatorShowCurrentHolding:false,
  calculatorShowFeeBreakdown:false,
});
assert.equal(portfolio.holdingColumns,2);
assert.equal(portfolio.holdingScrollMode,'horizontal');
assert.equal(portfolio.holdingPrimaryField,'marketValue');
assert.equal(portfolio.portfolioTableRowHeight,68);
assert.equal(portfolio.calculatorPanelHeightPct,80);
assert.equal(portfolio.calculatorShowCurrentHolding,false);
assert.equal(portfolio.calculatorShowFeeBreakdown,false);

const ledgerScreen=readFileSync('src/screens/LedgerScreen.tsx','utf8');
const portfolioScreen=readFileSync('src/screens/PortfolioScreen.tsx','utf8');
const modal=readFileSync('src/components/PageFrameSettingsModal.tsx','utf8');

assert.match(ledgerScreen,/ledgerListVisibleCount/);
assert.match(ledgerScreen,/ledgerShowRecentSymbols/);
assert.match(ledgerScreen,/ledgerShowSuggestions/);
assert.match(ledgerScreen,/ledgerShowFeeTax/);
assert.match(portfolioScreen,/portfolioTableRowHeight/);
assert.match(portfolioScreen,/calculatorPanelHeightPct/);
assert.match(portfolioScreen,/calculatorShowCurrentHolding/);
assert.match(portfolioScreen,/calculatorShowFeeBreakdown/);
assert.match(portfolioScreen,/holdingColumns/);
assert.match(portfolioScreen,/holdingScrollMode/);
assert.match(modal,/LedgerQuickEntryEditor/);
assert.match(modal,/LedgerListEditor/);
assert.match(modal,/PortfolioToolsEditor/);
assert.match(modal,/試算仍直接呼叫 V3\.7\.8 Canonical Core/);

console.log('v1.1.2 ledger portfolio calculator B-layer PASS');
