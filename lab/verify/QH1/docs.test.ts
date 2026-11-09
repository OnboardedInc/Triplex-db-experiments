// [EXP-P4N] Why (step c'): per-owner documents in current.db must give exactly the answers of the row route at every basis, through commits,
// retractions, shared-entity changes and an erasure counter bump. The replay below is the mutation replay of BRIEF 5.3: at least 2,000 commands on
// hot owners, each followed by pulls at the basis before it, at it and at older bases, a document worker against a row-route worker fed identical
// frames, compared by full-field digest. P4N_MUTANT removes one guard of the document path (nocheck: the lastChange equality; fillpast: the
// "current only" fill condition; erz: the erasure counter); each mutant must fail this file with the marker P4N_DOC_MISMATCH.
// Rejected: comparing only the final state (a stale document is invisible there) and counting hits as evidence of correctness.
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { it, expect } from "vitest";
import { Option } from "effect";
import { sqliteWorker } from "../../../packages/qlever/src/broker/sqlite-worker.js";
import { h1Rows, wholePullTuples } from "../../../packages/qlever/src/broker/h1.js";
import { HostLog } from "../../../packages/qlever/src/broker/log.js";
import { append, fresh, row } from "./helpers.js";
import { openWorker } from "./worker-client.js";
const D = createRequire(new URL("../../../packages/qlever/package.json", import.meta.url))(
  "better-sqlite3",
);
const mutant = process.env.P4N_MUTANT;
const mutated = (() => {
  let s = sqliteWorker;
  const swap = (a: string, b: string) => {
    if (!s.includes(a)) throw Error("mutant pattern absent: " + a);
    s = s.replace(a, b);
  };
  if (mutant === "nocheck") swap("d.pd===l&&", "");
  if (mutant === "fillpast") swap("if(cdb&&l<=b){", "if(cdb){");
  if (mutant === "erz") swap("d.erz===z&&", "");
  return s;
})();
const plain = (t: any) => ({
  id: t.id,
  entityId: t.entityId,
  attribute: t.attribute,
  value: t.value,
  recordedAt: t.recordedAt,
  validFrom: t.validFrom,
  validTo: Option.getOrNull(t.validTo),
  createdBy: Option.getOrNull(t.createdBy),
  entityType: Option.getOrNull(t.entityType),
  schemaVersion: Option.getOrNull(t.schemaVersion),
  txId: Option.getOrNull(t.txId),
});
const digest = (answer: any) => {
  const w = wholePullTuples(answer);
  const triples = [...h1Rows(w.tuples, { validAt: 1000 }, w.dict).values()].flat().map(plain);
  triples.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return JSON.stringify({
    triples,
    entities: [...answer.entities].sort(),
    owners: [...answer.owners].sort(),
  });
};
const ref = (r: any, target: string) => ({
  ...r,
  value_type: "ref",
  value_number: null,
  value_string: target,
});
const pull = (c: any, basis: number, root: string) =>
  c.call("wholePull", { basis, roots: [root] }).then(digest);

it("mutation replay: 2,100 commands on hot owners, pulls before, at and after each, documents equal the row route", async () => {
  const A = await openWorker(mutated, { docs: true }),
    B = await openWorker(sqliteWorker);
  let id = 0;
  const prev = new Map<number, any>();
  let hits = 0;
  try {
    const initial: any[] = [];
    for (let i = 0; i < 6; i++) {
      initial.push(
        ref(row(++id, `s:${i}`, 1024), `s:${i}/c:0`),
        ref(row(++id, `s:${i}/c:0`, 1024), `shared:${i % 2}`),
        row(++id, `shared:${i % 2}`, 1024),
      );
    }
    await A.append(initial);
    await B.append(initial);
    const COMMANDS = Number(process.env.P4N_COMMANDS ?? 2100);
    for (let k = 1; k <= COMMANDS; k++) {
      const pos = (k + 1) * 1024,
        i = k % 6;
      const rows: any[] = [{ ...row(++id, `s:${i}`, pos), attribute: ":x/v", value_number: k }];
      if (k % 3 === 0 && prev.has(i))
        rows.push({
          ...prev.get(i),
          retracted_position: pos,
          retracted_at: 100,
          retract_tx_id: "tx:" + pos,
        });
      if (k % 7 === 0)
        rows.push({
          ...row(++id, `shared:${i % 2}`, pos),
          attribute: ":x/shared",
          value_number: k,
        });
      if (k % 11 === 0)
        rows.push({ ...row(++id, `s:${i}/c:0`, pos), attribute: ":x/child", value_number: k });
      prev.set(i, rows[0]);
      await A.append(rows);
      await B.append(rows);
      // before the commit, at it, and older: the first two must fall back (L > b) or serve exactly, the rest are older cuts
      const bases = [pos - 1024, pos, ...(k > 5 ? [pos - 5 * 1024] : [])];
      for (const root of [`s:${i}`, `s:${(i + 1) % 6}`])
        for (const b of bases) {
          const a = await pull(A, b, root),
            r = await pull(B, b, root);
          expect(a, `P4N_DOC_MISMATCH command ${k} root ${root} basis ${b}`).toEqual(r);
        }
    }
    const stats = await A.call("docStats");
    hits = stats.hit;
    // The replay only means something if every document branch was taken.
    expect(stats.hit).toBeGreaterThan(1000);
    expect(stats.stale).toBeGreaterThan(100);
    expect(stats.behind).toBeGreaterThan(100);
    expect(stats.fills).toBeGreaterThan(100);
    expect(stats.fillErrors).toBe(0);
  } finally {
    await A.close();
    await B.close();
  }
  expect(hits).toBeGreaterThan(0);
}, 900000);

it("an erasure counter bump (PRAGMA user_version) invalidates every document, even when the rows changed in place", async () => {
  const A = await openWorker(mutated, { docs: true }),
    B = await openWorker(sqliteWorker);
  try {
    const initial = [row(1, "s:0", 1024), row(2, "s:1", 1024)];
    await A.append(initial);
    await B.append(initial);
    expect(await pull(A, 1024, "s:0")).toEqual(await pull(B, 1024, "s:0"));
    expect(await pull(A, 1024, "s:0")).toEqual(await pull(B, 1024, "s:0"));
    expect((await A.call("docStats")).hit).toBe(1);
    // Simulated erasure: the value is replaced in place (no position moves) and the store's erasure counter is bumped.
    for (const c of [A, B]) {
      const raw = new D(path.join(c.dir, "broker.db"));
      raw.exec("UPDATE facts SET v=999 WHERE o=(SELECT eid FROM ents WHERE name='s:0')");
      raw.pragma("user_version=7");
      raw.close();
    }
    const stale = (await A.call("docStats")).stale;
    const a = await pull(A, 1024, "s:0"),
      b = await pull(B, 1024, "s:0");
    expect(a, "P4N_DOC_MISMATCH after erasure bump").toEqual(b);
    expect(
      (await A.call("docStats")).stale,
      "P4N_DOC_MISMATCH erasure counter ignored",
    ).toBeGreaterThan(stale);
    expect(await pull(A, 1024, "s:0")).toEqual(b);
  } finally {
    await A.close();
    await B.close();
  }
}, 120000);

it("documents survive a broker restart (no epoch in the key), a deleted current.db is rebuilt, a corrupt name key is a miss", async () => {
  const dir = fresh();
  const open = async () => (await HostLog.open(dir, { minFreeBytes: 0, currentDocs: true })).log;
  let log = await open();
  await append(log, [row(1, "s:0", 2048), row(2, "s:0/a", 2048)]);
  const first = digest(await log.wholePull(2048, ["s:0"]));
  await log.wholePull(2048, ["s:0"]);
  const warm = await log.docStats();
  expect(warm.fills).toBeGreaterThan(0);
  expect(warm.hit).toBeGreaterThan(0);
  await log.close();
  log = await open(); // new epoch, same documents
  const again = digest(await log.wholePull(2048, ["s:0"]));
  const afterRestart = await log.docStats();
  expect(again).toBe(first);
  expect(afterRestart.hit).toBeGreaterThan(0);
  expect(fs.existsSync(path.join(dir, "current.db"))).toBe(true);
  await log.close();
  fs.rmSync(path.join(dir, "current.db"));
  fs.rmSync(path.join(dir, "current.db-wal"), { force: true });
  fs.rmSync(path.join(dir, "current.db-shm"), { force: true });
  log = await open();
  expect(digest(await log.wholePull(2048, ["s:0"]))).toBe(first);
  const rebuilt = await log.docStats();
  expect(rebuilt.absent).toBeGreaterThan(0);
  expect(rebuilt.fills).toBeGreaterThan(0);
  await log.close();
}, 120000);
