// [CX-VHS01] Why: seed a fresh W0 1k store through real Triples writes, then account for every dbstat page. Rejected: adopting the builder's database or projecting 1k's unpurged tail as the 10k total.
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { createHash } from "node:crypto";
import { Effect, Layer, ManagedRuntime } from "effect";
import { Triples } from "@triplex-build/triplex";
import {
  Runtime,
  StorageAdapter,
  QueryExecutor,
  DatabaseScope,
  Capabilities,
} from "@triplex-build/triplex/runtime";
import { it, expect } from "vitest";
import { HostBroker } from "../../../../packages/qlever/src/broker/broker.ts";
import { makeQleverStorageAdapter } from "../../../../packages/qlever/src/QleverStorageAdapter.ts";
import { makeQleverQueryExecutor } from "../../../../packages/qlever/src/QleverQueryExecutor.ts";
import { seedCommands } from "../../../bench/lib/w0-seed.ts";
import { W0, V_W0, many, triplexValue } from "../../../bench/lib/w0-world.ts";
const Database = createRequire(
  new URL("../../../../packages/qlever/package.json", import.meta.url),
)("better-sqlite3");
it("self-seeded real W0 1k accounts for facts, journal, dictionaries and frames", async () => {
  const out = process.env.VHS01_OUT!;
  if (!out) throw Error("bound runner required");
  const dir = path.join(out, "seed-1k");
  fs.mkdirSync(dir);
  const broker = await HostBroker.open({
    dir,
    scopeKey: "vhs01-offline",
    minFreeBytes: 5 * 1024 ** 3,
    frameRetention: { tailFrames: 1024 },
  });
  const client: any = {
    query: async () => [],
    update: async () => {
      throw Error("offline");
    },
    command: async () => {
      throw Error("offline");
    },
    cancel: async () => {},
    close: async () => {},
  };
  const adapter: any = makeQleverStorageAdapter(client, "vhs01-offline", { broker });
  const managed = ManagedRuntime.make(
    Runtime.define({
      name: "vhs01-seed",
      storage: Layer.succeed(StorageAdapter, adapter),
      queries: Layer.succeed(
        QueryExecutor,
        makeQleverQueryExecutor(client, "vhs01-offline", { sourceView: adapter.sourceView }),
      ),
    }).layer({
      scope: DatabaseScope.test("vhs01-offline"),
      capabilities: Capabilities.none,
      deterministic: { startTime: V_W0 - 10000000, seed: "vhs01-offline" },
    }),
  );
  const T = await managed.runPromise(Effect.service(Triples)),
    log = (broker as any).log;
  const latest = new Map<string, string>(),
    pending: any[] = [],
    digest = createHash("sha256");
  let assertions = 0,
    retractions = 0,
    commands = 0,
    journalCount = 0,
    readback = 0;
  async function flush() {
    const stat = fs.statfsSync(dir);
    if (stat.bavail * stat.bsize < 5 * 1024 ** 3 + 64 * 1024 ** 2) throw Error("disk floor");
    const batch = pending.splice(0);
    // [CX-VHS01] Why: nested receipt positions bind in the returned value at the outer commit. Rejected: inspecting placeholder receipts captured as callback side effects.
    const expected: any[] = await managed.runPromise(
      adapter.withTransaction(
        Effect.gen(function* () {
          const returned: any[] = [];
          for (const c of batch) {
            const ops: any[] = [];
            for (const [e, a, v] of c.rows) {
              const key = e + "\0" + a;
              if (!many.has(a) && c.validFrom <= V_W0 && latest.has(key))
                ops.push({ op: "retract", id: latest.get(key) });
              ops.push({
                op: "assert",
                entityId: e,
                attribute: a,
                value: triplexValue(a, v),
                validFrom: c.validFrom,
                ...(a === "payRateCents" &&
                c.validFrom <= V_W0 &&
                W0.plan(W0.rung(1000), Number(e.slice(4))).raise
                  ? { validTo: Date.parse("2026-11-16T00:00:00Z") }
                  : {}),
              });
            }
            const r: any = yield* T.transact(ops, {
              commandId: "p5:seed:" + c.position,
              actor: "p5-seed",
            });
            for (const t of r.triples)
              if (!many.has(t.attribute)) latest.set(t.entityId + "\0" + t.attribute, t.id);
            returned.push({ c, ops, r });
          }
          return returned;
        }),
      ),
    );
    const ids = expected.flatMap(({ r, ops }) => [
      ...r.triples.map((t: any) => t.id),
      ...ops.filter((o: any) => o.op === "retract").map((o: any) => o.id),
    ]);
    const observed = new Map(
      (await log.pool[0].request("readback", ids)).map((r: any) => [r.id, r]),
    );
    for (const { c, ops, r } of expected) {
      expect(broker.claim("p5:seed:" + c.position)).toEqual({ txId: r.txId, position: r.position });
      let j = 0;
      for (const op of ops) {
        if (op.op === "retract") {
          const actual: any = observed.get(op.id);
          expect(actual.retracted_position).toBe(r.position);
          expect(actual.retract_tx_id).toBe(r.txId);
          retractions++;
          continue;
        }
        const t = r.triples[j++],
          actual: any = observed.get(t.id);
        expect(actual.entity_id).toBe(op.entityId);
        expect(actual.attribute).toBe(op.attribute);
        expect(actual.tx_id).toBe(r.txId);
        expect(actual.recorded_position).toBe(r.position);
        const k = op.value.type,
          channel = k === "integer" || k === "ref" ? "value_string" : "value_" + k;
        expect(actual[channel]).toEqual(
          k === "boolean"
            ? Number(op.value.value)
            : k === "json"
              ? JSON.stringify(op.value.value)
              : op.value.value,
        );
        assertions++;
        readback++;
      }
      commands++;
      journalCount += 4 + new Set(c.rows.map((x: any) => x[0])).size + ops.length;
      digest.update(
        JSON.stringify({
          c,
          position: r.position,
          tx: r.txId,
          ids: r.triples.map((t: any) => t.id),
        }) + "\n",
      );
    }
    if (commands % 6400 === 0) console.log(JSON.stringify({ commands, assertions, retractions }));
  }
  try {
    for (const c of seedCommands(1000)) {
      pending.push(c);
      if (pending.length === 64) await flush();
    }
    if (pending.length) await flush();
    expect(commands).toBe(W0.populationBasis(W0.rung(1000)).tx);
    while (log.purgeFrames().removed) {}
  } finally {
    await managed.dispose();
    await broker.close();
  }
  const db = new Database(path.join(dir, "broker.db"), { readonly: true });
  const counts = Object.fromEntries(
    ["facts", "history", "journal", "txs", "claims", "operations", "frames", "ents"].map((t) => [
      t,
      db.prepare("SELECT count(*) n FROM " + t).get().n,
    ]),
  );
  const dbstat = db
    .prepare(
      "SELECT name,sum(pgsize) bytes,sum(payload) payload FROM dbstat GROUP BY name ORDER BY name",
    )
    .all();
  const pageSize = db.pragma("page_size", { simple: true }),
    pages = db.pragma("page_count", { simple: true }),
    free = db.pragma("freelist_count", { simple: true });
  const allocated: number = dbstat.reduce((s: number, r: any) => s + r.bytes, 0),
    logical = pages * pageSize;
  const fallback =
    db.prepare("SELECT count(*) n FROM facts WHERE x IS NOT NULL").get().n +
    db.prepare("SELECT count(*) n FROM journal WHERE x IS NOT NULL").get().n +
    db.prepare("SELECT count(*) n FROM history WHERE x IS NOT NULL").get().n;
  const ids = db.prepare("SELECT typeof(id) type,count(*) n FROM facts GROUP BY typeof(id)").all();
  db.close();
  const result = {
    commands,
    assertions,
    retractions,
    journalExpected: journalCount,
    readback,
    counts,
    pageSize,
    pages,
    freePages: free,
    allocated,
    logical,
    bytesPerAssertion: logical / assertions,
    dbstat,
    fallback,
    factIdStorage: ids,
    witnessSha256: digest.digest("hex"),
  };
  fs.writeFileSync(path.join(out, "seed-accounting.json"), JSON.stringify(result, null, 2));
  expect(counts.facts + counts.history).toBe(assertions);
  expect(counts.journal).toBe(journalCount);
  expect(counts.claims).toBe(commands);
  expect(logical).toBe(allocated + free * pageSize);
  expect(fallback).toBe(0);
});
