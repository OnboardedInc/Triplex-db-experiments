import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { openComposition } from "../../../bench/lib/composition.ts";
import { W0, canonical } from "../../../bench/lib/w0-world.ts";
import { generateTrace, traceDigest } from "../../../bench/lib/trace.ts";
import { percentile } from "../../../bench/lib/w0-traffic.ts";
import { DomainOracle } from "../../../bench/lib/w0-gates.ts";
import { Account } from "./account.ts";
import { Objects, hash } from "./store.ts";
import { Window } from "./v3.ts";
export const physical = async (): Promise<[number, number]> => {
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
    process.send!({ type: "storage", id });
  });
};
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
  const summaries = [];
  for (const indexed of [false, true]) {
    const c = await openComposition(
        "reach",
        "datomic",
        attempt.scope + "-price-" + Number(indexed),
      ),
      a = new Account(
        new Objects(c, "daily"),
        hash([attempt.nonce, indexed]),
        path.join(dir, "fixture-keys-" + Number(indexed)),
      ),
      oracle = new DomainOracle();
    try {
      const start = performance.now(),
        seed = await a.bootstrap(census, worlds, basis, indexed),
        bootstrapMs = performance.now() - start;
      const w = await Window.open(c, a, "cost"),
        measure = await physical(),
        samples: {
          seq: number;
          facts: number;
          ms: number;
          bytes: number;
          writes: number;
          position: number;
          burst: boolean;
        }[] = [],
        expected = new Map<string, W0.Fact[]>(),
        claimed = new Set<number>();
      for (const e of selected) {
        const at = performance.now(),
          saved = await w.apply(e),
          ms = performance.now() - at;
        if (e.resend) {
          assert(claimed.has(e.seq) && saved.retry);
          continue;
        }
        assert(!saved.retry && !claimed.has(e.seq));
        claimed.add(e.seq);
        const subject = W0.placementId(e.subject),
          state = expected.get(subject) ?? [...worlds[e.subject]!.facts],
          logicalTx = basis.tx + claimed.size;
        for (const edit of saved.edits) {
          if (!edit.append) {
            for (let j = state.length - 1; j >= 0; j--)
              if (state[j]!.e === edit.e && state[j]!.a === edit.a) state.splice(j, 1);
          }
          for (const v of edit.values) state.push({ e: edit.e, a: edit.a, v, tx: logicalTx });
        }
        expected.set(subject, state);
        samples.push({
          seq: e.seq,
          facts: e.facts,
          ms,
          bytes: saved.bytes,
          writes: saved.operations,
          position: saved.position,
          burst: e.burst,
        });
      }
      const after = await physical(),
        facts = samples.reduce((n, s) => n + s.facts, 0),
        total = (k: "ms" | "bytes" | "writes") => samples.reduce((n, s) => n + s[k], 0),
        cut = await c.currentPosition(),
        b = (await a.head(cut)).value.basis;
      for (const [s, facts] of expected) {
        const out = await a.readAt(s, cut);
        assert.equal(
          W0.outputJson(out.output),
          await oracle.call("evaluate", { basis: b, world: { subject: s, facts }, release: "R1" }),
        );
      }
      const summary = {
        indexed,
        trace: traceDigest(selected),
        receipts: claimed.size,
        duplicates: selected.length - claimed.size,
        facts,
        checkedPeople: expected.size,
        bootstrapMs,
        bootstrapBytes: seed.bytes,
        requestBytesPerFact: total("bytes") / facts,
        operationsPerFact: total("writes") / facts,
        msPerFact: total("ms") / facts,
        dbBytesPerFact: (after[0] - measure[0]) / facts,
        walBytesPerFact: (after[1] - measure[1]) / facts,
        ...Object.fromEntries(
          [
            ["all", samples],
            ["5-10", samples.filter((s) => s.facts <= 10)],
            ["11-25", samples.filter((s) => s.facts > 10 && s.facts <= 25)],
            ["26-50", samples.filter((s) => s.facts > 25)],
          ].map(([name, x]: any) => [
            name,
            {
              n: x.length,
              p50: percentile(
                x.map((s: any) => s.ms),
                0.5,
              ),
              p99: percentile(
                x.map((s: any) => s.ms),
                0.99,
              ),
            },
          ]),
        ),
      };
      fs.writeFileSync(
        path.join(dir, "daily-" + Number(indexed) + ".json"),
        JSON.stringify({ attempt: attempt.nonce, seed, summary, samples }) + "\n",
        { flag: "wx" },
      );
      summaries.push(summary);
    } finally {
      oracle.close();
      await c.close();
    }
  }
  assert(
    summaries[0]!.trace === summaries[1]!.trace && summaries[0]!.facts === summaries[1]!.facts,
  );
  fs.writeFileSync(
    path.join(dir, "price.json"),
    JSON.stringify({ nonce: attempt.nonce, summaries }) + "\n",
    { flag: "wx" },
  );
}
