-- V3.2.36 multi-source quote migration. Market data only; private Ledger remains outside this DB.
ALTER TABLE market_quotes ADD COLUMN IF NOT EXISTS volume BIGINT CHECK(volume>=0);
ALTER TABLE market_quotes DROP CONSTRAINT IF EXISTS market_quotes_source_check;
ALTER TABLE market_quotes ADD CONSTRAINT market_quotes_source_check
  CHECK(source IN('TWSE_MIS','FUGLE','SHIOAJI','YAHOO','TWSE_DAILY','TPEX_DAILY'));

ALTER TABLE market_quote_history ADD COLUMN IF NOT EXISTS volume BIGINT CHECK(volume>=0);
ALTER TABLE market_quote_history DROP CONSTRAINT IF EXISTS market_quote_history_source_check;
ALTER TABLE market_quote_history ADD CONSTRAINT market_quote_history_source_check
  CHECK(source IN('TWSE_MIS','FUGLE','SHIOAJI','YAHOO','TWSE_DAILY','TPEX_DAILY'));
