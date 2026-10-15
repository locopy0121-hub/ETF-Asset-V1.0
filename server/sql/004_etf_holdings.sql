-- Public constituent reference data only; private user holdings never enter here.
CREATE TABLE IF NOT EXISTS etfs (
  symbol varchar(8) PRIMARY KEY CHECK (symbol ~ '^00[0-9A-Z]{2,6}$'),
  name text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS etf_holding_snapshots (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  etf_symbol varchar(8) NOT NULL REFERENCES etfs(symbol) ON DELETE CASCADE,
  as_of date NOT NULL,
  source text NOT NULL,
  source_url text NOT NULL,
  basis text NOT NULL CHECK (basis IN ('issuer_disclosed','third_party_disclosed','pcf_estimated')),
  complete boolean NOT NULL,
  fetched_at timestamptz NOT NULL,
  UNIQUE(etf_symbol, as_of, source, basis)
);
CREATE INDEX IF NOT EXISTS etf_snapshot_latest_idx
  ON etf_holding_snapshots(etf_symbol, as_of DESC, complete DESC, fetched_at DESC);
CREATE TABLE IF NOT EXISTS etf_holdings (
  snapshot_id bigint NOT NULL REFERENCES etf_holding_snapshots(id) ON DELETE CASCADE,
  stock_symbol varchar(25) NOT NULL,
  stock_name text NOT NULL,
  weight numeric(9,6) NOT NULL CHECK(weight BETWEEN 0 AND 100),
  quantity numeric(24,6) CHECK(quantity >= 0),
  PRIMARY KEY(snapshot_id, stock_symbol)
);
CREATE INDEX IF NOT EXISTS etf_holdings_weight_idx ON etf_holdings(snapshot_id, weight DESC);
