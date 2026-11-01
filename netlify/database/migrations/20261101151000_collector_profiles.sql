-- Identity UUIDs remain private. Public responses project game fields only.
CREATE TABLE collector_profiles (
  id UUID PRIMARY KEY,
  display_name VARCHAR(24) NOT NULL CHECK (char_length(display_name) BETWEEN 2 AND 24),
  avatar TEXT NOT NULL CHECK (avatar IN ('gremlin', 'crackling', 'puddle', 'beast')),
  published BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE scan_receipts (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  image_hash CHAR(64) NOT NULL CHECK (image_hash ~ '^[a-f0-9]{64}$'),
  created_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL CHECK (expires_at > created_at AND expires_at <= created_at + INTERVAL '30 minutes'),
  UNIQUE (id, user_id, image_hash)
);
CREATE INDEX scan_receipts_owner_expiry ON scan_receipts (user_id, expires_at);

CREATE TABLE collector_captures (
  user_id UUID NOT NULL REFERENCES collector_profiles(id),
  image_hash CHAR(64) NOT NULL CHECK (image_hash ~ '^[a-f0-9]{64}$'),
  receipt_id UUID NOT NULL UNIQUE,
  awarded_xp INTEGER NOT NULL CHECK (awarded_xp IN (60, 70, 80, 90, 100, 110)),
  prepared_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, image_hash),
  FOREIGN KEY (receipt_id, user_id, image_hash) REFERENCES scan_receipts(id, user_id, image_hash),
  CHECK (prepared_at <= created_at)
);

-- Photos, coordinates, factual report text, email addresses and passwords are not stored.
