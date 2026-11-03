CREATE TABLE IF NOT EXISTS mcp_oauth_pending (
  state_hash TEXT PRIMARY KEY,
  verifier_encrypted TEXT NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS mcp_oauth_token (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  token_encrypted TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);
