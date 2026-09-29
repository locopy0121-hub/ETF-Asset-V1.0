-- V3.2.6 normalized quote metadata migration. Market cache only; Ledger is untouched.
ALTER TABLE market_quotes ADD COLUMN IF NOT EXISTS official_trade_price NUMERIC(18,4);
ALTER TABLE market_quotes ADD COLUMN IF NOT EXISTS price_type VARCHAR(24);
ALTER TABLE market_quotes ADD COLUMN IF NOT EXISTS is_fallback BOOLEAN;
ALTER TABLE market_quotes ADD COLUMN IF NOT EXISTS market VARCHAR(8);
ALTER TABLE market_quotes ADD COLUMN IF NOT EXISTS status_message TEXT;
UPDATE market_quotes SET
  price_type=COALESCE(price_type,CASE WHEN quality='trade' THEN 'REALTIME_TRADE' ELSE 'OFFICIAL_CLOSE' END),
  is_fallback=COALESCE(is_fallback,quality<>'trade'),
  market=COALESCE(market,'UNKNOWN'),
  status_message=COALESCE(status_message,CASE WHEN quality='trade' THEN '既有 TWSE 實際成交行情' ELSE '既有官方收盤行情' END),
  official_trade_price=CASE WHEN quality='trade' THEN COALESCE(official_trade_price,price) ELSE official_trade_price END;
ALTER TABLE market_quotes ALTER COLUMN price_type SET NOT NULL;
ALTER TABLE market_quotes ALTER COLUMN is_fallback SET NOT NULL;
ALTER TABLE market_quotes ALTER COLUMN market SET NOT NULL;
ALTER TABLE market_quotes ALTER COLUMN status_message SET NOT NULL;
ALTER TABLE market_quotes ALTER COLUMN is_fallback SET DEFAULT FALSE;
ALTER TABLE market_quotes ALTER COLUMN market SET DEFAULT 'UNKNOWN';
ALTER TABLE market_quotes ALTER COLUMN status_message SET DEFAULT '';
ALTER TABLE market_quotes DROP CONSTRAINT IF EXISTS market_quotes_source_check;
ALTER TABLE market_quotes ADD CONSTRAINT market_quotes_source_check
  CHECK(source IN('TWSE_MIS','YAHOO','TWSE_DAILY','TPEX_DAILY'));
ALTER TABLE market_quotes DROP CONSTRAINT IF EXISTS market_quotes_quality_check;
ALTER TABLE market_quotes ADD CONSTRAINT market_quotes_quality_check
  CHECK(quality IN('trade','backup_realtime','bid_ask','previous_close','official_close'));

ALTER TABLE market_quote_history ADD COLUMN IF NOT EXISTS official_trade_price NUMERIC(18,4);
ALTER TABLE market_quote_history ADD COLUMN IF NOT EXISTS price_type VARCHAR(24);
ALTER TABLE market_quote_history ADD COLUMN IF NOT EXISTS is_fallback BOOLEAN;
ALTER TABLE market_quote_history ADD COLUMN IF NOT EXISTS market VARCHAR(8);
ALTER TABLE market_quote_history ADD COLUMN IF NOT EXISTS status_message TEXT;
