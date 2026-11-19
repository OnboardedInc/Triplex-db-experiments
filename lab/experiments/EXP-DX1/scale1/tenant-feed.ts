import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { createHash } from "node:crypto";
import type { Account } from "./tenants.ts";
export function installTenantViews(file: string, accounts: readonly Account[]) {
  const db = new DatabaseSync(file);
  try {
    db.exec(
      "PRAGMA busy_timeout=5000; BEGIN IMMEDIATE; CREATE TABLE tenant_roster(account TEXT PRIMARY KEY, first_id INTEGER UNIQUE, upper_id INTEGER UNIQUE);",
    );
    const put = db.prepare("INSERT INTO tenant_roster VALUES(?,?,?)");
    for (const a of accounts) put.run(a.key, a.first, a.first + a.people);
    db.exec(
      `CREATE VIEW tenant_feed AS SELECT r.account, CAST(e.position AS INTEGER) position, CAST(e.subject AS INTEGER) subject FROM affected e JOIN tenant_roster r ON CAST(e.subject AS INTEGER)>=r.first_id AND CAST(e.subject AS INTEGER)<r.upper_id WHERE e.consumer='dependency-index' AND e.epoch='0' AND e.subject=CAST(CAST(e.subject AS INTEGER) AS TEXT) AND e.position=CAST(CAST(e.position AS INTEGER) AS TEXT); COMMIT`,
    );
  } finally {
    db.close();
  }
}
// [DX-SCALE1] Why: each account can resume its view of the durable affected rows by source position. A single physical checkpoint makes these views visible atomically with each source delivery. Rejected: attributing a shared lag by timestamp proximity or by recomputing effects from planned writes.
export function tenantFeedAt(
  file: string,
  accounts: readonly Account[],
  source: string,
  high: number,
  after: number,
) {
  const db = new DatabaseSync(file, { readOnly: true });
  try {
    const ck = db
      .prepare("SELECT source,token FROM checkpoints WHERE consumer='dependency-index'")
      .get();
    assert(ck?.source === source && Number(ck.token) >= high && high >= after);
    assert.deepEqual(
      db
        .prepare("SELECT account,first_id,upper_id FROM tenant_roster ORDER BY first_id")
        .all()
        .map((r) => [r.account, r.first_id, r.upper_id]),
      accounts.map((a) => [a.key, a.first, a.first + a.people]),
    );
    const matched = new Map<number, Map<number, string>>(),
      digest = createHash("sha256");
    const rows = db.prepare(
      "SELECT account,position,subject FROM tenant_feed WHERE position>? AND position<=? ORDER BY position,subject",
    );
    for (const r of rows.iterate(after, high)) {
      const pos = Number(r.position),
        s = Number(r.subject),
        account = String(r.account);
      const group = matched.get(pos) ?? new Map<number, string>();
      assert(!group.has(s));
      group.set(s, account);
      matched.set(pos, group);
      digest.update(JSON.stringify([account, pos, s]) + "\n");
    }
    return { matched, sha256: digest.digest("hex"), checkpoint: Number(ck.token), after, high };
  } finally {
    db.close();
  }
}
