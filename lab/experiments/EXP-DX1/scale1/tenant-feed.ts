import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { createHash } from "node:crypto";
import type { Account } from "./tenants.ts";

export function installTenantViews(file: string, accounts: readonly Account[]) {
  const db = new DatabaseSync(file);
  try {
    db.exec("PRAGMA busy_timeout=5000; BEGIN IMMEDIATE");
    assert.equal(
      db.prepare("SELECT count(*) n FROM affected").get()!.n,
      0,
      "Installing a tenant router requires a fresh consumer",
    );
    db.exec(`CREATE TABLE tenant_roster(account TEXT PRIMARY KEY, first_id INTEGER UNIQUE, upper_id INTEGER UNIQUE, last_effect INTEGER NOT NULL DEFAULT 0);
      CREATE TABLE tenant_effect(account TEXT NOT NULL,position INTEGER NOT NULL,subject INTEGER NOT NULL,PRIMARY KEY(account,position,subject)) WITHOUT ROWID;`);
    const put = db.prepare("INSERT INTO tenant_roster(account,first_id,upper_id) VALUES(?,?,?)");
    for (const a of accounts) put.run(a.key, a.first, a.first + a.people);
    // [DX-SCALE1] Why: tenant effects and cursors advance inside the existing durable source transaction and recover with it after a crash. Rejected: copying a feed asynchronously and treating the original checkpoint as proof that the account can already read its changes.
    db.exec(`CREATE TRIGGER tenant_route AFTER INSERT ON affected
      WHEN NEW.consumer='dependency-index' AND NEW.epoch='0' BEGIN
        SELECT CASE WHEN NEW.subject<>CAST(CAST(NEW.subject AS INTEGER) AS TEXT)
          OR NEW.position<>CAST(CAST(NEW.position AS INTEGER) AS TEXT)
          OR (SELECT count(*) FROM tenant_roster WHERE CAST(NEW.subject AS INTEGER)>=first_id AND CAST(NEW.subject AS INTEGER)<upper_id)<>1
          THEN RAISE(ABORT,'Unroutable tenant feed member') END;
        INSERT INTO tenant_effect SELECT account,CAST(NEW.position AS INTEGER),CAST(NEW.subject AS INTEGER) FROM tenant_roster
          WHERE CAST(NEW.subject AS INTEGER)>=first_id AND CAST(NEW.subject AS INTEGER)<upper_id;
        UPDATE tenant_roster SET last_effect=max(last_effect,CAST(NEW.position AS INTEGER))
          WHERE CAST(NEW.subject AS INTEGER)>=first_id AND CAST(NEW.subject AS INTEGER)<upper_id;
      END; COMMIT`);
  } finally {
    db.close();
  }
}
export function readTenantFeed(
  db: DatabaseSync,
  key: string,
  source: string,
  after: number,
  through: number,
) {
  const checkpoint = db
    .prepare("SELECT source,token FROM checkpoints WHERE consumer='dependency-index'")
    .get();
  const owner = db
    .prepare("SELECT first_id,upper_id,last_effect FROM tenant_roster WHERE account=?")
    .get(key);
  assert(
    owner &&
      checkpoint?.source === source &&
      Number(checkpoint.token) >= through &&
      Number.isSafeInteger(through) &&
      Number.isSafeInteger(after) &&
      through >= after &&
      after >= 0,
  );
  const rows = db
    .prepare(
      "SELECT position,subject FROM tenant_effect WHERE account=? AND position>? AND position<=? ORDER BY position,subject",
    )
    .all(key, after, through);
  for (const r of rows)
    assert(
      Number(r.subject) >= Number(owner.first_id) &&
        Number(r.subject) < Number(owner.upper_id) &&
        Number(r.position) <= Number(owner.last_effect),
    );
  return { rows, position: Number(checkpoint.token), lastEffect: Number(owner.last_effect) };
}
// [DX-SCALE1] Why: compare every committed primary with its named account's actual durable effects and cursor in a single SQLite snapshot. Rejected: timestamp matching or reconstructing a tenant cursor from planned writes.
export function tenantFeedAt(
  file: string,
  accounts: readonly Account[],
  source: string,
  high: number,
  after: number,
) {
  const db = new DatabaseSync(file, { readOnly: true });
  try {
    db.exec("BEGIN");
    assert.deepEqual(
      db
        .prepare("SELECT account,first_id,upper_id FROM tenant_roster ORDER BY first_id")
        .all()
        .map((r) => [r.account, r.first_id, r.upper_id]),
      accounts.map((a) => [a.key, a.first, a.first + a.people]),
    );
    const matched = new Map<number, Map<number, string>>(),
      digest = createHash("sha256"),
      cursors: Record<string, number> = {};
    let checkpoint = 0;
    for (const a of accounts) {
      const view = readTenantFeed(db, a.key, source, after, high);
      checkpoint = view.position;
      cursors[a.key] = view.lastEffect;
      for (const r of view.rows) {
        const pos = Number(r.position),
          s = Number(r.subject);
        const group = matched.get(pos) ?? new Map<number, string>();
        assert(!group.has(s));
        group.set(s, a.key);
        matched.set(pos, group);
        digest.update(JSON.stringify([a.key, pos, s]) + "\n");
      }
    }
    return { matched, cursors, sha256: digest.digest("hex"), checkpoint, after, high };
  } finally {
    db.close();
  }
}
