// [DX-RPT1] The reporting copy's tables, functions and row-level security, installed idempotently in one transaction.
// Column types follow the store's own row columns (packages/datomic/src/rows.ts assertionColumns), so a row of
// rpt.facts equals the store's history row column for column. Doubles travel as text so -0 and every bit survive.
// Rejected: one schema per account (a million relations at 100,000 accounts); materialised wide tables (stale at
// valid-time edges with no save, and a table rewrite or backfill for every new attribute).

export const READER_ROLE = "rpt_reader";

export const schemaSql = String.raw`
CREATE SCHEMA IF NOT EXISTS rpt;
CREATE SCHEMA IF NOT EXISTS report;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '${READER_ROLE}') THEN CREATE ROLE ${READER_ROLE} NOLOGIN; END IF;
END $$;

CREATE TABLE IF NOT EXISTS rpt.feed_state (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  database text NOT NULL,
  epoch uuid NOT NULL,
  after_position bigint NOT NULL,
  last_journal_position bigint,
  last_recorded_at double precision,
  store_head_seen bigint,
  applied_at timestamptz NOT NULL DEFAULT now(),
  journals_applied bigint NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS rpt.account_state (
  account text PRIMARY KEY,
  fence_position bigint NOT NULL,
  rebuilt_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS rpt.facts (
  account text NOT NULL,
  entity text NOT NULL,
  kind text,
  attribute text NOT NULL,
  assertion_id text NOT NULL,
  value_type text NOT NULL,
  value_string text,
  value_number double precision,
  value_boolean boolean,
  value_datetime double precision,
  value_json jsonb,
  valid_from double precision NOT NULL,
  valid_to double precision,
  recorded_position bigint NOT NULL,
  recorded_at double precision NOT NULL,
  retracted_position bigint,
  retracted_at double precision,
  removed_position bigint,
  PRIMARY KEY (account, assertion_id),
  CHECK (value_type <> 'protected' OR (value_string IS NULL AND value_number IS NULL AND value_boolean IS NULL
                                       AND value_datetime IS NULL AND value_json IS NULL))
);
CREATE INDEX IF NOT EXISTS facts_entity ON rpt.facts (account, entity, attribute, recorded_position);
CREATE TABLE IF NOT EXISTS rpt.entities (
  account text NOT NULL,
  entity text NOT NULL,
  kind text,
  first_position bigint NOT NULL,
  PRIMARY KEY (account, entity)
);
CREATE INDEX IF NOT EXISTS entities_kind ON rpt.entities (account, kind, entity);
CREATE TABLE IF NOT EXISTS rpt.commits (
  account text NOT NULL,
  position bigint NOT NULL,
  tx_id text NOT NULL,
  recorded_at double precision,
  changes integer NOT NULL,
  PRIMARY KEY (account, position, tx_id)
);
CREATE TABLE IF NOT EXISTS rpt.kinds (
  kind text PRIMARY KEY,
  view_name text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending',
  reason text,
  generated_at timestamptz
);
CREATE TABLE IF NOT EXISTS rpt.columns (
  ordinal bigserial PRIMARY KEY,
  kind text NOT NULL,
  attribute text NOT NULL,
  value_type text NOT NULL,
  column_name text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  added_at_position bigint NOT NULL,
  UNIQUE (kind, attribute, value_type),
  UNIQUE (kind, column_name)
);
CREATE TABLE IF NOT EXISTS rpt.grants (
  role_name name PRIMARY KEY,
  account text NOT NULL
);

-- The one account the querying login may read. Readers see only their own row of rpt.grants (policy below), so the
-- function needs no elevated rights; the planner evaluates it once per query (STABLE, no arguments).
CREATE OR REPLACE FUNCTION rpt.my_account() RETURNS text LANGUAGE sql STABLE AS
$$ SELECT account FROM rpt.grants WHERE role_name = current_user $$;

-- The position a query answers at: the session's rpt.position, or the copy's watermark. Never above the watermark.
CREATE OR REPLACE FUNCTION rpt.at_position() RETURNS bigint LANGUAGE plpgsql STABLE AS $$
DECLARE w bigint; s text := nullif(current_setting('rpt.position', true), '');
BEGIN
  SELECT after_position INTO w FROM rpt.feed_state;
  IF w IS NULL THEN RAISE EXCEPTION 'NotYetReported: the reporting copy has no watermark yet'; END IF;
  IF s IS NULL THEN RETURN w; END IF;
  IF s !~ '^[0-9]{1,18}$' THEN RAISE EXCEPTION 'InvalidPosition: rpt.position must be a whole number'; END IF;
  IF s::bigint > w THEN
    RAISE EXCEPTION 'NotYetReported: position % is above the reporting copy''s watermark %', s, w;
  END IF;
  RETURN s::bigint;
END $$;

-- The valid-time instant a query answers at, in epoch milliseconds: the session's rpt.valid_at (a timestamp, or
-- milliseconds), or now().
CREATE OR REPLACE FUNCTION rpt.at_valid() RETURNS double precision LANGUAGE plpgsql STABLE AS $$
DECLARE s text := nullif(current_setting('rpt.valid_at', true), '');
BEGIN
  IF s IS NULL THEN RETURN (extract(epoch FROM now()) * 1000)::double precision; END IF;
  IF s ~ '^-?[0-9]+(\.[0-9]+)?$' THEN RETURN s::double precision; END IF;
  RETURN (extract(epoch FROM s::timestamptz) * 1000)::double precision;
END $$;

-- The newest position at or before a record time, from this account's own commits.
CREATE OR REPLACE FUNCTION rpt.position_at(at timestamptz) RETURNS bigint LANGUAGE sql STABLE AS
$$ SELECT coalesce(max(position), 0) FROM rpt.commits WHERE recorded_at <= extract(epoch FROM at) * 1000 $$;

CREATE OR REPLACE VIEW rpt.watermark AS
SELECT database, after_position AS position, to_timestamp(last_recorded_at / 1000.0) AS store_recorded_at,
       applied_at, store_head_seen, greatest(store_head_seen - after_position, 0) AS entries_behind_at_apply, epoch
FROM rpt.feed_state;

-- Every fact visible at the query's position and valid instant, all value columns plus one text rendering.
CREATE OR REPLACE VIEW rpt.facts_visible WITH (security_invoker = true) AS
SELECT f.account, f.entity, f.kind, f.attribute, f.assertion_id, f.value_type,
       CASE f.value_type
         WHEN 'string' THEN f.value_string WHEN 'ref' THEN f.value_string WHEN 'integer' THEN f.value_string
         WHEN 'blob' THEN f.value_string WHEN 'number' THEN f.value_number::text
         WHEN 'boolean' THEN f.value_boolean::text WHEN 'datetime' THEN to_timestamp(f.value_datetime / 1000.0)::text
         WHEN 'json' THEN f.value_json::text END AS value_text,
       f.value_string, f.value_number, f.value_boolean, f.value_datetime, f.value_json,
       f.valid_from, f.valid_to, f.recorded_position, f.recorded_at, f.removed_position
FROM rpt.facts f CROSS JOIN (SELECT rpt.at_position() AS p, rpt.at_valid() AS v OFFSET 0) b
WHERE f.recorded_position <= b.p AND (f.retracted_position IS NULL OR f.retracted_position > b.p)
  AND f.valid_from <= b.v AND (f.valid_to IS NULL OR f.valid_to > b.v);

ALTER TABLE rpt.facts ENABLE ROW LEVEL SECURITY;
ALTER TABLE rpt.entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE rpt.commits ENABLE ROW LEVEL SECURITY;
ALTER TABLE rpt.account_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE rpt.grants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS by_account ON rpt.facts;
DROP POLICY IF EXISTS by_account ON rpt.entities;
DROP POLICY IF EXISTS by_account ON rpt.commits;
DROP POLICY IF EXISTS by_account ON rpt.account_state;
DROP POLICY IF EXISTS own_grant ON rpt.grants;
CREATE POLICY by_account ON rpt.facts FOR SELECT TO ${READER_ROLE} USING (account = rpt.my_account());
CREATE POLICY by_account ON rpt.entities FOR SELECT TO ${READER_ROLE} USING (account = rpt.my_account());
CREATE POLICY by_account ON rpt.commits FOR SELECT TO ${READER_ROLE} USING (account = rpt.my_account());
CREATE POLICY by_account ON rpt.account_state FOR SELECT TO ${READER_ROLE} USING (account = rpt.my_account());
CREATE POLICY own_grant ON rpt.grants FOR SELECT TO ${READER_ROLE} USING (role_name = current_user);

REVOKE ALL ON ALL TABLES IN SCHEMA rpt FROM PUBLIC;
GRANT USAGE ON SCHEMA rpt, report TO ${READER_ROLE};
GRANT SELECT ON rpt.facts, rpt.entities, rpt.commits, rpt.account_state, rpt.grants, rpt.feed_state, rpt.kinds,
  rpt.columns, rpt.watermark, rpt.facts_visible TO ${READER_ROLE};
`;

/** A login for one account's dashboards. The password is the caller's; nothing is stored here. */
export const readerLoginSql = (role: string) => {
  if (!/^[a-z][a-z0-9_]{0,62}$/.test(role)) throw new TypeError("Reader role names are lower-case identifiers");
  return `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '${role}') THEN
    CREATE ROLE ${role} LOGIN IN ROLE ${READER_ROLE}; END IF; END $$;`;
};
