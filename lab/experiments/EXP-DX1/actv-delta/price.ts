import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { runtimeApi, REPO } from "../../../bench/lib/triplex.ts";
import { requestIndex } from "../../../bench/lib/maintenance.ts";
import { randomUUID } from "node:crypto";
import { openComposition } from "../../../bench/lib/composition.ts";
import { W0 } from "../../../bench/lib/w0-world.ts";
import { generateTrace, traceDigest } from "../../../bench/lib/trace.ts";
import { percentile } from "../../../bench/lib/w0-traffic.ts";
import { DomainOracle } from "../../../bench/lib/w0-gates.ts";
import { measured } from "./measure-lock.ts";
import { Account } from "./account.ts";
import { Objects, hash } from "./store.ts";
import { Window } from "./v3.ts";
export const physical = async (checkpoint = false): Promise<[number, number]> => {
  assert(process.send, "physical storage observer required");
  const id = randomUUID();
  return new Promise((ok, fail) => {
    const timer = setTimeout(() => {
      process.off("message", listen);
      fail(Error("storage observer timed out"));
    }, 30000);
    function listen(m: any) {
      if (m?.id !== id) return;
      clearTimeout(timer);
      process.off("message", listen);
      assert(m.data.every(Number.isSafeInteger));
      ok(m.data);
    }
    process.on("message", listen);
    process.send!({ type: "storage", id, checkpoint });
  });
};
async function settled(scope: string, position: number, phase: string) {
  const url = process.env.DATOMIC_URL;
  assert(url);
  const { DatomicClient } = await import(
    pathToFileURL(path.join(REPO, "packages/datomic/dist/index.js")).href
  );
  const client = new DatomicClient(url, 100000);
  const db = await client.create(runtimeApi.DatabaseScope.test(scope), "lean", true);
  assert(!db.created && db.layout === "lean");
  const before = await client.basis(db.db);
  assert.equal(Number(before.position.v), position);
  const job = await requestIndex(client, db.db, phase, () => performance.now(), 90000);
  const after = await client.basis(db.db);
  assert(
    job.completed &&
      Number(after.position.v) === position &&
      BigInt(job.requestedT) >= BigInt(before.t.v) &&
      BigInt(after.t.v) >= BigInt(job.requestedT),
  );
  return { scope, position, before: before.t.v, after: after.t.v, job };
}
export async function run(dir: string, attempt: any) {
  const N = 1000,
    r = W0.rung(N),
    worlds = [...W0.population(r)].map((p) => p.world),
    census = Array.from({ length: N }, (_, i) => W0.placementId(i));
  const basis = { ...W0.populationBasis(r), validTime: "2026-11-04T13:00:00.000000Z" },
    events = generateTrace({ seed: "DX-H2-frozen-v1", subjects: N, durationS: 180 });
  const selected = [];
  let count = 0;
  for (const e of events) {
    selected.push(e);
    if (!e.resend && ++count === 500) break;
  }
  assert(count === 500 && selected.some((e) => e.burst) && selected.some((e) => !e.burst));
  type Sample = {
    seq: number;
    facts: number;
    ms: number;
    bytes: number;
    writes: number;
    position: number;
    burst: boolean;
  };
  const isolated = process.env.DELTA_PRICE_ARM;
  if (isolated) assert(["on", "off"].includes(isolated) && process.env.DELTA_PRICE_CAMPAIGN);
  const barriers: Awaited<ReturnType<typeof settled>>[] = [],
    physicalCuts: { before: number[]; afterCommits: number[]; after: number[] }[] = [];
  const arms = await Promise.all(
    (isolated ? [isolated === "on"] : [false, true]).map(async (indexed) => {
      const c = await openComposition(
        "reach",
        "datomic",
        attempt.scope + "-price-" + Number(indexed),
      );
      const a = new Account(
        new Objects(c, "daily"),
        hash([attempt.nonce, indexed]),
        path.join(dir, "keys-" + Number(indexed)),
      );
      const started = performance.now(),
        seed = await a.bootstrap(census, worlds, basis, indexed);
      return {
        c,
        a,
        indexed,
        seed,
        bootstrapMs: performance.now() - started,
        w: await Window.open(c, a, "cost"),
        samples: [] as Sample[],
        blocks: [] as { block: number; facts: number; wal: number; db: number; order: number }[],
        claimed: new Set<number>(),
        expected: new Map<string, W0.Fact[]>(),
        duplicates: 0,
      };
    }),
  );
  const blocks: (typeof selected)[] = [];
  let block: typeof selected = [];
  for (const e of selected) {
    if (!e.resend && block.filter((x) => !x.resend).length === 50) {
      blocks.push(block);
      block = [];
    }
    block.push(e);
  }
  blocks.push(block);
  const summaries: {
    indexed: boolean;
    facts: number;
    receipts: number;
    duplicates: number;
    trace: string;
    walBytesPerFact: number;
    dbBytesPerFact: number;
    msPerFact: number;
  }[] = [];
  try {
    for (const [k, events] of (isolated ? [selected] : blocks).entries()) {
      await measured(async () => {
        const indexedFirst = process.env.DELTA_PRICE_ORDER === "indexed-first";
        const order = isolated ? [0] : (k % 2 === 1) !== indexedFirst ? [1, 0] : [0, 1];
        for (const [j, index] of order.entries()) {
          const arm = arms[index]!;
          if (isolated)
            barriers.push(await settled(arm.c.scopeName!, await arm.c.currentPosition(), "seed"));
          const before = await physical(!!isolated);
          let facts = 0;
          for (const e of events) {
            const at = performance.now(),
              saved = await arm.w.apply(e),
              ms = performance.now() - at;
            if (e.resend) {
              assert(arm.claimed.has(e.seq) && saved.retry);
              arm.duplicates++;
              continue;
            }
            assert(!saved.retry && !arm.claimed.has(e.seq));
            arm.claimed.add(e.seq);
            facts += e.facts;
            const subject = W0.placementId(e.subject),
              state = arm.expected.get(subject) ?? [...worlds[e.subject]!.facts],
              tx = basis.tx + arm.claimed.size;
            for (const edit of saved.edits) {
              if (!edit.append)
                for (let j = state.length - 1; j >= 0; j--)
                  if (state[j]!.e === edit.e && state[j]!.a === edit.a) state.splice(j, 1);
              for (const v of edit.values) state.push({ e: edit.e, a: edit.a, v, tx });
            }
            arm.expected.set(subject, state);
            arm.samples.push({
              seq: e.seq,
              facts: e.facts,
              ms,
              bytes: saved.bytes,
              writes: saved.operations,
              position: saved.position,
              burst: e.burst,
            });
          }
          const afterCommits = await physical();
          if (isolated)
            barriers.push(await settled(arm.c.scopeName!, await arm.c.currentPosition(), "saves"));
          const after = isolated ? await physical(true) : afterCommits;
          physicalCuts.push({ before, afterCommits, after });
          arm.blocks.push({
            block: k,
            facts,
            wal: after[1] - before[1],
            db: after[0] - before[0],
            order: j,
          });
        }
      });
      console.log(
        isolated ? "isolated physical arm" : "paired physical write blocks",
        k + 1,
        "of",
        isolated ? 1 : blocks.length,
      );
    }
    for (const arm of arms) {
      const { a, c, indexed, seed, blocks: measures, samples } = arm,
        oracle = new DomainOracle();
      try {
        const end = await c.currentPosition(),
          head = (await a.head(end)).value;
        for (const [s, facts] of arm.expected)
          assert.equal(
            W0.outputJson((await a.readAt(s, end)).output),
            await oracle.call("evaluate", {
              basis: head.basis,
              world: { subject: s, facts },
              release: "R1",
            }),
          );
        const facts = samples.reduce((n, x) => n + x.facts, 0),
          average = (k: "ms" | "bytes" | "writes") => samples.reduce((n, x) => n + x[k], 0) / facts;
        const summary = {
          indexed,
          firstArm: process.env.DELTA_PRICE_ORDER ?? "unindexed-first",
          trace: traceDigest(selected),
          facts,
          receipts: arm.claimed.size,
          duplicates: arm.duplicates,
          checkedPeople: arm.expected.size,
          bootstrapMs: arm.bootstrapMs,
          bootstrapBytes: seed.bytes,
          requestBytesPerFact: average("bytes"),
          operationsPerFact: average("writes"),
          msPerFact: average("ms"),
          walBytesPerFact: measures.reduce((n, x) => n + x.wal, 0) / facts,
          dbBytesPerFact: measures.reduce((n, x) => n + x.db, 0) / facts,
          p50: percentile(
            samples.map((x) => x.ms),
            0.5,
          ),
          p99: percentile(
            samples.map((x) => x.ms),
            0.99,
          ),
        };
        fs.writeFileSync(
          path.join(dir, "daily-" + Number(indexed) + ".json"),
          JSON.stringify({ attempt: attempt.nonce, seed, summary, measures, samples }) + "\n",
          { flag: "wx" },
        );
        summaries.push(summary);
      } finally {
        oracle.close();
      }
    }
    if (!isolated)
      assert.deepEqual(
        arms[0]!.samples.map((s) => [s.seq, s.facts, s.writes]),
        arms[1]!.samples.map((s) => [s.seq, s.facts, s.writes]),
      );
    assert(
      blocks.length === 10 &&
        summaries.every(
          (s) =>
            s.receipts === 500 &&
            s.trace === summaries[0]!.trace &&
            s.facts === summaries[0]!.facts,
        ),
    );
    fs.writeFileSync(
      path.join(dir, "price.json"),
      JSON.stringify({
        nonce: attempt.nonce,
        identity: attempt.identity,
        sources: attempt.sources,
        summaries,
        isolated: isolated ?? null,
        campaign: process.env.DELTA_PRICE_CAMPAIGN ?? null,
        barriers,
        physicalCuts,
      }) + "\n",
      { flag: "wx" },
    );
  } finally {
    await Promise.all(arms.map((a) => a.c.close()));
  }
}
