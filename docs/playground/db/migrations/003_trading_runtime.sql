CREATE TABLE IF NOT EXISTS trading_runtime (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  enabled INTEGER NOT NULL DEFAULT 0,
  model_endpoint TEXT,
  model_name TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS trading_runs (
  id TEXT PRIMARY KEY,
  strategy_id TEXT NOT NULL REFERENCES strategies(id),
  scheduled_for TEXT NOT NULL,
  status TEXT NOT NULL,
  reason TEXT NOT NULL,
  signal_json TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(strategy_id, scheduled_for)
);
CREATE INDEX IF NOT EXISTS idx_trading_runs_status ON trading_runs(status, created_at);
CREATE TABLE IF NOT EXISTS spot_orders (
  client_order_id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL REFERENCES trading_runs(id),
  symbol TEXT NOT NULL,
  side TEXT NOT NULL,
  quote_order_qty TEXT NOT NULL,
  exchange_order_id TEXT,
  status TEXT NOT NULL,
  exchange_json TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
