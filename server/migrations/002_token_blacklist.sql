-- Migration 002: Token blacklist for revocation

CREATE TABLE IF NOT EXISTS token_blacklist (
  jti VARCHAR(255) PRIMARY KEY,
  user_id UUID NOT NULL,
  revoked_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL,
  reason VARCHAR(50)
);

CREATE INDEX IF NOT EXISTS idx_blacklist_expires ON token_blacklist(expires_at);

CREATE TABLE IF NOT EXISTS user_token_revocations (
  user_id UUID PRIMARY KEY,
  revoked_at TIMESTAMP NOT NULL DEFAULT NOW()
);
