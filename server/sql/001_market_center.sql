-- Market-only schema. The user's private Ledger MUST NOT enter this database.
CREATE TABLE IF NOT EXISTS market_meta (
  singleton BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK(singleton),
  version BIGINT NOT NULL DEFAULT 0,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO market_meta(singleton,version) VALUES(TRUE,0) ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS market_quotes (
  symbol VARCHAR(8) PRIMARY KEY CHECK (symbol ~ '^[0-9A-Z]{4,8}$'),
  name TEXT NOT NULL,
  price NUMERIC(18,4) NOT NULL CHECK(price>0),
  previous_close NUMERIC(18,4) CHECK(previous_close>0),
  source_at TIMESTAMPTZ NOT NULL,
  source VARCHAR(20) NOT NULL CHECK(source IN('TWSE_MIS','TWSE_DAILY','TPEX_DAILY')),
  quality VARCHAR(20) NOT NULL CHECK(quality IN('trade','official_close')),
  checked_at TIMESTAMPTZ NOT NULL,
  version BIGINT NOT NULL CHECK(version>=1)
);
CREATE TABLE IF NOT EXISTS market_quote_history (
  symbol VARCHAR(8) NOT NULL,
  source_at TIMESTAMPTZ NOT NULL,
  quality VARCHAR(20) NOT NULL,
  source VARCHAR(20) NOT NULL,
  price NUMERIC(18,4) NOT NULL CHECK(price>0),
  previous_close NUMERIC(18,4),
  name TEXT NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (symbol,source_at,quality)
);
CREATE INDEX IF NOT EXISTS market_quote_history_symbol_time ON market_quote_history(symbol,source_at DESC);
CREATE TABLE IF NOT EXISTS market_task_log (
  task TEXT NOT NULL,
  trading_day DATE NOT NULL,
  last_status TEXT NOT NULL,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  detail JSONB NOT NULL DEFAULT '{}'::jsonb,
  PRIMARY KEY(task,trading_day)
);
