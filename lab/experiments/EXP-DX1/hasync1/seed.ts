import assert from "node:assert/strict";
import { deepOwnFacts, deepPopulation, deepShape } from "../../../bench/lib/deep-world.ts";
import type { Fact } from "../../../bench/lib/world.ts";
import {
  immutable,
  type DatomicClient,
  type Input,
  type Receipt,
} from "../../../../packages/datomic/test/ha1-account.ts";
import { hash } from "../ha1/common.ts";
import { drop } from "../ha1/one-backup.ts";
import { requestIndex, type Account } from "../ha1/one-db.ts";
import type { SyncPair } from "./pair.ts";
import { deepRow, editHistory, shouldEdit, type History } from "./v2/history.ts";

type Layout = "legacy" | "lean";
type TripleRow = Input["rows"][number];
export type Checkpoint = {
  key: string;
  layout: Layout;
  basis: Awaited<ReturnType<DatomicClient["basis"]>>;
  cluster: string;
  manifest: string;
  bytes: number;
  people: number;
  facts: number;
  seedMs: number;
  receipts: Receipt[];
  history?: History;
  seal: string;
};

function* frames(n: number) {
  let frame: Fact[] = [];
  for (let i = 0; i < n; i++) {
    const rows = deepOwnFacts(i);
    assert.equal(rows.length, deepShape(i).facts);
    assert(rows.length <= 2000);
    if (frame.length + rows.length > 2000) {
      yield frame;
      frame = [];
    }
    frame.push(...rows);
  }
  if (frame.length) yield frame;
}

export async function auditSeed(ac: Account, ledger: Receipt[]) {
  for (let i = 0; i < ledger.length; i += 256) {
    const batch = ledger.slice(i, i + 256);
    const v = await ac.r.request<{ database: string; operations: unknown[] }>(
      "POST",
      "/ha1/" + ac.db + "/operations",
      { ids: batch.map((r) => r.operationId) },
      20000,
    );
    assert.equal(v.database, ac.db);
    assert.deepEqual(v.operations.map(immutable), batch);
  }
  return ledger.length;
}

export async function buildCheckpoint(
  pair: SyncPair,
  layout: Layout,
  people: number,
  deadline: number,
  withHistory = false,
) {
  const start = performance.now();
  const { ac } = await pair.open({ lean: layout === "lean", writeTimeout: 15000 });
  const generator = frames(people);
  const results: Receipt[] = [];
  const editable: { row: TripleRow; receipt: Receipt }[] = [];
  let seq = 0;
  let facts = 0;
  const lanes = Array.from({ length: 4 }, async () => {
    for (;;) {
      const block = generator.next();
      if (block.done) return;
      assert(performance.now() < deadline, "Seed exceeded campaign allocation");
      const k = seq++;
      const op = ac.key + "-deep-" + k;
      const tx = op + "/tx",
        stamp = 500000 + k;
      const rows = block.value.map((r, i) => deepRow(r, op + "/" + i, tx, stamp));
      const input: Input = {
        operationId: op,
        attemptId: op + "/first",
        sourceK: null,
        scopeWide: false,
        assignRecordTime: layout === "lean",
        position: 1,
        span: 1,
        rows,
        newIds: rows.map((r) => r.id),
        claims: [{ commandId: op + "/claim", txId: tx, timestamp: stamp }],
      };
      const r = immutable(await ac.w.transact(ac.db, input));
      assert.equal(r.operationId, op);
      results[k] = r;
      if (withHistory)
        for (const row of rows.filter(shouldEdit))
          editable.push({ row: { ...row, recorded_position: Number(r.position.v) }, receipt: r });
      facts += rows.length;
      if (k % 64 === 0)
        pair.s.e.log("seed-progress", { frames: k, facts, ms: performance.now() - start });
    }
  });
  const work = await Promise.allSettled(lanes);
  for (const v of work) if (v.status === "rejected") throw v.reason;
  const model = deepPopulation(people);
  assert.equal(facts, model.facts);
  assert.equal(results.filter(Boolean).length, seq);
  assert.equal(new Set(results.map((r) => r.position.v)).size, seq);
  if (withHistory) assert.equal(editable.length, Math.ceil(people / 5));
  const history = withHistory ? await editHistory(pair.s.e, ac, editable, deadline) : undefined;
  const all = [...results, ...(history?.receipts ?? [])];
  await auditSeed(ac, all);
  const indexed = await requestIndex(ac);
  const basis = await ac.w.basis(ac.db);
  pair.s.e.write("seed-ledger", { layout, model, results, indexed, basis });
  const out = "/base/" + layout;
  // [DX-HASYNC1] Why: reused inputs must be a consistent PostgreSQL snapshot with checked files and replayable WAL. Rejected: copying a live PGDATA directory.
  const cmd =
    drop +
    'install -d -m 700 -o postgres -g postgres "$1"; ' +
    '"$drop" postgres pg_basebackup -U postgres --checkpoint=fast -D "$1" -X stream --manifest-checksums=SHA256; ' +
    'pg_verifybackup "$1" >/dev/null; sha256sum "$1/backup_manifest"; du -sk "$1"; ' +
    'if test -n "$2"; then chown -R "$2:$3" "$1"; fi';
  const shell = await pair.s.exec(
    "pg",
    "sh",
    "-ceu",
    cmd,
    "capture",
    out,
    String(pair.base?.ownerUid ?? ""),
    String(pair.base?.ownerGid ?? ""),
  );
  const [manifest, , kb] = shell.split(/\s+/);
  assert(manifest && /^[a-f0-9]{64}$/.test(manifest));
  assert(kb && /^\d+$/.test(kb));
  const bytes = Number(kb) * 1024;
  const checkpoint: Checkpoint = {
    key: ac.key,
    layout,
    basis,
    cluster: pair.cluster,
    manifest,
    bytes,
    people,
    facts,
    seedMs: performance.now() - start,
    receipts: all,
    ...(history ? { history } : {}),
    seal: hash(JSON.stringify({ receipts: all, history: history ?? null })),
  };
  return checkpoint;
}
