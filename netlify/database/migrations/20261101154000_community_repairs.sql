-- Public pins are explicitly published by authenticated collectors; identity stays private.
ALTER TABLE collector_captures ADD CONSTRAINT collector_capture_receipt_owner UNIQUE (receipt_id, user_id);

CREATE TABLE road_issues (
  id UUID PRIMARY KEY,
  label VARCHAR(200) NOT NULL CHECK (char_length(label) BETWEEN 1 AND 200),
  latitude DOUBLE PRECISION NOT NULL CHECK (latitude BETWEEN 49.7 AND 61.1),
  longitude DOUBLE PRECISION NOT NULL CHECK (longitude BETWEEN -8.7 AND 2.1),
  defect_type TEXT NOT NULL CHECK (defect_type IN ('cracking', 'small', 'medium', 'large')),
  monster_profile JSONB NOT NULL CHECK (jsonb_typeof(monster_profile) = 'object'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'community_fixed')),
  confirmation_points INTEGER NOT NULL DEFAULT 0 CHECK (confirmation_points >= 0),
  confirmation_count INTEGER NOT NULL DEFAULT 0 CHECK (confirmation_count >= 0),
  report_count INTEGER NOT NULL DEFAULT 1 CHECK (report_count >= 1)
);
CREATE INDEX road_issues_status_created ON road_issues (status, created_at DESC);

CREATE TABLE road_issue_reports (
  issue_id UUID NOT NULL REFERENCES road_issues(id),
  user_id UUID NOT NULL REFERENCES collector_profiles(id),
  capture_receipt_id UUID NOT NULL UNIQUE,
  capture_xp INTEGER NOT NULL CHECK (capture_xp IN (60, 70, 80, 90, 100, 110)),
  reporter_ordinal INTEGER NOT NULL CHECK (reporter_ordinal >= 1),
  report_bonus INTEGER NOT NULL CHECK (
    (reporter_ordinal = 1 AND report_bonus = 60) OR
    (reporter_ordinal BETWEEN 2 AND 5 AND report_bonus = 20) OR
    (reporter_ordinal >= 6 AND report_bonus = 5)
  ),
  created_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (issue_id, user_id),
  UNIQUE (issue_id, reporter_ordinal),
  FOREIGN KEY (capture_receipt_id, user_id) REFERENCES collector_captures(receipt_id, user_id)
);

CREATE TABLE road_issue_repair_votes (
  issue_id UUID NOT NULL REFERENCES road_issues(id),
  user_id UUID NOT NULL,
  vote_weight INTEGER NOT NULL CHECK (vote_weight IN (1, 3)),
  created_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (issue_id, user_id)
);

CREATE TABLE collector_repair_rewards (
  issue_id UUID NOT NULL,
  user_id UUID NOT NULL,
  bonus_xp INTEGER NOT NULL CHECK (bonus_xp BETWEEN 60 AND 170),
  created_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (issue_id, user_id),
  FOREIGN KEY (issue_id, user_id) REFERENCES road_issue_reports(issue_id, user_id)
);
