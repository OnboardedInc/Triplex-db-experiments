// [EXP-SQL01] Why: independent schedules test whole commit groups, time cuts and exact rows. Rejected: counting ACKs as read proof.
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { Effect, Layer, ManagedRuntime } from "effect";
import { describe, it, expect } from "vitest";
import { EntityId, Triples, string } from "@triplex-build/triplex";
import { Capabilities, DatabaseScope, QueryExecutor, Runtime, StorageAdapter, type TripleRow } from "@triplex-build/triplex/runtime";
import { HostBroker } from "../../../packages/qlever/src/broker/broker.ts";
import { makeQleverStorageAdapter } from "../../../packages/qlever/src/QleverStorageAdapter.ts";
import { makeQleverQueryExecutor } from "../../../packages/qlever/src/QleverQueryExecutor.ts";
import { columns } from "../../../packages/qlever/src/rdf.ts";
import type { QleverClient } from "../../../packages/qlever/src/QleverClient.ts";
import type { QleverBrokerStorageAdapterService } from "../../../packages/qlever/src/broker/BrokerStorageAdapter.ts";
import { LogFeed } from "../../../packages/qlever/src/broker/feed.ts";
const base = path.resolve(import.meta.dirname, "data");
const fresh = (label: string) => path.join(base, label + "-" + randomUUID());
const out = (name: string, value: unknown) => fs.writeFileSync(path.join(import.meta.dirname, "evidence", (process.env.SQL01_ATTEMPT ? process.env.SQL01_ATTEMPT + "-" : "") + name + ".json"), JSON.stringify(value, null, 2));
const empty: QleverClient = { query: async () => [], update: async () => ({}), command: async () => ({}), cancel: async () => {}, close: async () => {} };
const outage: QleverClient = { ...empty, query: async (text) => {
  // [EXP-SQL01] Why: initialize checks connectivity before any fixture writes; fail only answer requests.
  // Rejected: failing initialize (never exercises the H1 outage route).
  if (text.includes("SELECT ?s WHERE")) return [];
  throw new TypeError("fetch failed");
} };
async function runtime(dir: string, client = empty) {
  const scope = "vsql01:" + randomUUID();
  const broker = await HostBroker.open({ dir, scopeKey: scope, minFreeBytes: 0 });
  const adapter = makeQleverStorageAdapter(client, scope, { broker }) as QleverBrokerStorageAdapterService;
  const layer = Runtime.define({ name: "vsql01", storage: Layer.succeed(StorageAdapter, adapter), queries: Layer.succeed(QueryExecutor, makeQleverQueryExecutor(client, scope, { sourceView: adapter.sourceView })) }).layer({ scope: DatabaseScope.test(scope), capabilities: Capabilities.none });
  const managed = ManagedRuntime.make(layer);
  // [EXP-SQL01] Why: the current Effect service is yielded; asEffect is not part of this API.
  // Rejected: changing the product service to accommodate an invalid verifier helper.
  const triples = await managed.runPromise(Effect.gen(function* () { return yield* Triples; }));
  return { broker, adapter, triples, run: <A, E>(e: Effect.Effect<A, E>) => managed.runPromise(e), close: async () => { await managed.dispose(); await broker.close(); } };
}
const ops = (entity: string, tag: string, n = 5) => Array.from({ length: n }, (_, i) => ({ op: "assert" as const, entityId: EntityId.make(entity), attribute: ":vsql/a" + i, value: string(tag + "-" + i) }));
const row = (id: string, value = id, entity = "hot"): TripleRow => ({ ...Object.fromEntries(columns.map(c => [c, null])), id, entity_id: entity, attribute: ":a" + id.split("-").at(-1), value_type: "string", value_string: value, recorded_position: -1, recorded_at: 1, valid_from: 0, entity_type: "Subject" }) as TripleRow;
const submit = (b: HostBroker, id: string, rows: TripleRow[], priors: TripleRow[] = []) => b.submit({ operationId: id, attemptId: id, sourceK: b.head(), reads: { entities: new Set<string>(), scopeWide: false }, claims: [{ commandId: id, txId: id, timestamp: 1 }], placeholders: [-1], rows, priors: new Map(priors.map(r => [r.id, r])), newIds: new Set(rows.filter(r => !priors.some(p => p.id === r.id)).map(r => r.id)) });
const ids = (rows: readonly TripleRow[]) => rows.map(r => r.id).sort();
describe("independent SQL01 review", () => {
  it("hot-subject schedule retains each ACKed five-row transaction", async () => {
    const dir = fresh("hot"), rt = await runtime(dir), rounds = [];
    try {
      for (let round = 0; round < 150; round++) {
        await rt.run(Effect.all(Array.from({ length: 32 }, (_, i) => rt.triples.transact(ops(`d${round}-${i}`, "d"))), { concurrency: "unbounded" }));
        const entity = "hot-" + round;
        const hot = await rt.run(Effect.all(Array.from({ length: 8 }, (_, i) => rt.triples.transact(ops(entity, "h" + i))), { concurrency: "unbounded" }));
        const basis = { validAt: Date.now() + 1, recordedPosition: Math.max(...hot.map(r => r.position)) };
        const actual = await rt.run(rt.adapter.getByEntity(entity, basis));
        const source = await rt.broker.fromLogAsync(0, { entities: [entity] }, () => true);
        const expected = source.filter(r => r.recorded_position <= basis.recordedPosition && r.valid_from <= basis.validAt);
        rounds.push({ round, basis, positions: hot.map(r => r.position), instants: hot.map(r => r.instant), rows: actual.length, expected: expected.length, sourceRows: source.length });
        if (actual.length !== 40 || ids(actual).join() !== ids(expected).join()) {
          out("hot-first-failure", { dir, rounds, actual, expected, source, receipts: hot });
          expect(actual).toHaveLength(40);
          expect(ids(actual)).toEqual(ids(expected));
        }
      }
    } finally { out("hot-schedules", { dir, rounds }); await rt.close(); }
  });

  it("source outage honors a recorded-time cut combined with a later position", async () => {
    const dir = fresh("recorded-cut"), rt = await runtime(dir, outage);
    try {
      const first = await rt.run(rt.triples.transact(ops("time-cut", "first", 40)));
      await new Promise(r => setTimeout(r, 5));
      const second = await rt.run(rt.triples.transact(first.triples.slice(0, 10).map(t => ({ op: "retract" as const, id: t.id }))));
      const basis = { validAt: Date.now() + 1, recordedAt: first.instant, recordedPosition: second.position };
      const actual = await rt.run(rt.adapter.getByEntity("time-cut", basis));
      const source = await rt.broker.fromLogAsync(0, { entities: ["time-cut"] }, () => true);
      const expected = source.filter(r => r.recorded_position <= basis.recordedPosition && r.recorded_at <= basis.recordedAt && (r.retracted_position === null || r.retracted_position > basis.recordedPosition || r.retracted_at! > basis.recordedAt));
      // [EXP-SQL01] Why: advance H past B using an unrelated commit, then repeat the identical request.
      // Rejected: changing the requested position (could explain a changed answer independently of routing).
      const third = await rt.run(rt.triples.transact(ops("unrelated", "advance", 1)));
      const belowH = rt.broker.purgeCurrent(third.position);
      const fallback = await rt.run(rt.adapter.getByEntity("time-cut", basis));
      out("recorded-cut", { dir, first, second, third, basis, actual, expected, belowH, fallback });
      expect(expected).toHaveLength(40);
      expect(fallback).toHaveLength(40);
      expect(ids(actual)).toEqual(ids(expected));
    } finally { await rt.close(); }
  });

  it("pinned hot replacements remain whole under concurrent writers, retention and WAL resets", async () => {
    const dir = fresh("overlap"), b = await HostBroker.open({ dir, scopeKey: "vsql01-overlap", minFreeBytes: 0 });
    const receipts: { basis: number; ids: string[] }[] = [];
    let done = false, reads = 0, violations: unknown[] = [], commitMs: number[] = [], maxWal = 0;
    const walSizes: number[] = [];
    try {
      const initial = Array.from({ length: 10 }, (_, j) => row("v0-" + j, "x".repeat(6000)));
      await submit(b, "initial", initial);
      receipts.push({ basis: b.head(), ids: ids(initial) });
      const pin = b.pinBasis(b.head(), "verifier straddles");
      let prior = await b.fromLogAsync(0, { entities: ["hot"] }, () => true);
      const readers = Array.from({ length: 32 }, async (_, client) => {
        let k = client;
        while (!done) {
          const wanted = receipts[(k++ * 17) % receipts.length]!;
          const pull = await b.pullAt(wanted.basis, { entities: ["hot"] });
          reads++;
          if (!pull.eligible || ids(pull.rows).join() !== wanted.ids.join()) violations.push({ wanted, pull });
          if (violations.length > 3) { done = true; break; }
        }
      });
      for (let i = 1; i <= 250 && !done; i++) {
        const next = Array.from({ length: 10 }, (_, j) => row("v" + i + "-" + j, "x".repeat(6000)));
        const t = performance.now();
        const d = await submit(b, "replace-" + i, [...prior.map(r => ({ ...r, retracted_position: -1, retracted_at: i + 1 })), ...next], prior);
        commitMs.push(performance.now() - t);
        expect(d.kind).toBe("committed");
        receipts.push({ basis: b.head(), ids: ids(next) });
        prior = (await b.pullAt(b.head(), { entities: ["hot"] })).rows;
        const wal = fs.statSync(path.join(dir, "broker.db-wal")).size;
        maxWal = Math.max(maxWal, wal); walSizes.push(wal);
        if (i % 13 === 0) b.purgeCurrent(b.head());
      }
      done = true; await Promise.all(readers);
      for (const wanted of receipts) expect(ids((await b.pullAt(wanted.basis, { entities: ["hot"] })).rows)).toEqual(wanted.ids);
      pin.release();
      expect(violations).toEqual([]);
    } finally {
      done = true;
      out("overlap", { dir, commits: receipts.length, reads, violations, commitMs, maxWal, walSizes, receipts });
      await b.close();
    }
  });

  it("feed cursor resumes across epoch-only prefixes and repeated restarts without skip/repeat", async () => {
    const dir = fresh("feed"), expected: number[] = [], seen: number[] = [], pages = [];
    let cursor: ReturnType<LogFeed["start"]> | undefined;
    for (let cycle = 0; cycle < 10; cycle++) {
      const b = await HostBroker.open({ dir, scopeKey: "vsql01-feed", minFreeBytes: 0 });
      try {
        if (cycle % 3 === 2) for (let j = 0; j < 15; j++) {
          const d = await submit(b, `feed-${cycle}-${j}`, [row(`feed-${cycle}-${j}`)]);
          expect(d.kind).toBe("committed"); expected.push(b.head());
          const retry = await submit(b, `feed-${cycle}-${j}`, [row("must-not-exist")]);
          expect(retry.kind === "committed" && retry.replayed).toBe(true);
        }
        const feed = new LogFeed(dir);
        cursor ??= feed.start();
        for (;;) {
          const p = feed.poll(cursor, { maxBytes: 1 });
          if (!p.resolutions.length) break;
          pages.push({ cycle, before: cursor, after: p.cursor, kinds: p.resolutions.map(r => r.kind) });
          for (const r of p.resolutions) if (r.kind === "commit") for (const t of r.transacts) seen.push(t.position);
          cursor = JSON.parse(JSON.stringify(p.cursor));
        }
      } finally { await b.close(); }
    }
    out("feed-restarts", { dir, expected, seen, pages, cursor });
    expect(seen).toEqual(expected); expect(new Set(seen).size).toBe(seen.length);
  });
});
