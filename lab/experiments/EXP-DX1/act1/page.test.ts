import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import test from "node:test";
import { DomainOracle, emptyWireState, wireRecord } from "../../../bench/lib/w0-gates.ts";
import { W0, canonical, sha256 } from "../../../bench/lib/w0-world.ts";
import { pageAddress } from "../../../bench/lib/w0-page-outbox.ts";
import { publishChanged } from "../../../bench/lib/w0-replica.ts";
import type { OutboxStore } from "../../../bench/lib/w0-outbox.ts";
import { open, observe } from "./check.ts";

const make = (
  id: number,
  tx: number,
  payload?: string,
  time = W0.POPULATION_VALID_TIME,
): W0.EvaluationRecord => {
  const subject = W0.placementId(id);
  return {
    subject,
    basis: { tx: BigInt(tx), validTime: time },
    release: W0.R1.hash,
    workItems:
      payload === undefined
        ? []
        : [
            {
              id: "wi-" + subject,
              key: "",
              kind: "notify",
              rule: "MINWAGE",
              version: "v-" + tx,
              payload: canonical({ payload }),
            },
          ],
  };
};
const layout = "page-cut" as const;
const opts = (rows: W0.EvaluationRecord[], roster = rows.map((r) => r.subject)) => ({
  layout,
  frameSize: 256,
  roster: {
    subjects: roster,
    basis: rows[0]!.basis,
    release: W0.R1.hash,
  },
});
async function oracleFold(
  oracle: DomainOracle,
  state: Map<string, any>,
  rows: W0.EvaluationRecord[],
) {
  for (const r of rows) {
    const answer = JSON.parse(
      await oracle.call("publish", {
        state: state.get(r.subject) ?? emptyWireState(),
        evaluations: [wireRecord(r)],
      }),
    );
    assert.ok(answer.state);
    state.set(r.subject, answer.state);
  }
}
async function states(store: OutboxStore, ids: string[], cut: number, expected: Map<string, any>) {
  assert.deepEqual(
    await observe(store, ids, cut, layout),
    ids.map((id) => expected.get(id) ?? emptyWireState()),
  );
}
test("partial pages, sparse membership, a newer live winner and lost page ACK survive restart", async (t) => {
  const scope = "act1-pages-" + randomUUID(),
    oracle = new DomainOracle(),
    model = new Map<string, any>();
  let store = await open(scope);
  const subjects = [0, 1, 255, 256, 257],
    ids = subjects.map(W0.placementId);
  const first = subjects.map((i) => make(i, 10, i === 1 ? undefined : "A"));
  const next = subjects.map((i) => make(i, 20, i === 1 ? undefined : i === 255 ? "B" : "A"));
  try {
    await publishChanged(store, first, opts(first));
    await oracleFold(oracle, model, first);
    const initial = await store.currentPosition(),
      before = structuredClone(model);
    let ack: any;
    const failAfter = {
      ...store,
      transact: async (...args: Parameters<OutboxStore["transact"]>) => {
        const result = await store.transact(...args);
        assert.ok(result.ok);
        ack = result.value;
        throw Error("lost page ACK");
      },
    };
    await assert.rejects(publishChanged(failAfter, next, opts(next)), /lost page ACK/);
    await store.close();
    store = await open(scope);
    await oracleFold(oracle, model, next.slice(0, 3));
    await states(store, ids, ack.position, model);
    await states(store, ids, initial, before);
    const live = [
      make(0, 15, "late"),
      make(2, 15, "outsider"),
      make(1, 30, "C"),
      make(256, 15, "late"),
    ];
    for (const r of live) {
      await publishChanged(store, [r], { layout });
      await oracleFold(oracle, model, [r]);
    }
    const other = await open("act1-other-" + randomUUID());
    try {
      await publishChanged(other, [live[0]!], { layout });
      const independent = new Map();
      await oracleFold(oracle, independent, [live[0]!]);
      await states(other, [ids[0]!], await other.currentPosition(), independent);
    } finally {
      await other.close();
    }
    let retry: any;
    if (process.env.DX_ACT1_NATIVE === "1" || process.env.DX_ACT1_SQLITE_DIR) {
      const raw = execFileSync(
        process.execPath,
        ["--experimental-strip-types", "lab/experiments/EXP-DX1/act1/deliver-held.ts"],
        {
          input: canonical({
            scope,
            nonce: scope,
            layout,
            records: next,
            roster: opts(next).roster,
          }),
          encoding: "utf8",
          timeout: 90000,
        },
      );
      retry = JSON.parse(raw);
    } else retry = await publishChanged(store, next, opts(next));
    assert.equal(retry.responses[0].txId, ack.txId);
    assert.equal(retry.responses[0].retry, true);
    assert.equal(retry.responses[0].deliveries.length, 1);
    assert.equal(retry.coverage.roster, sha256(canonical(ids)));
    assert.equal(retry.coverage.pages, 2);
    await oracleFold(oracle, model, next.slice(3));
    await states(store, [...ids, live[1]!.subject], await store.currentPosition(), model);
    const head = await store.currentPosition();
    const again = await publishChanged(store, next, opts(next));
    assert.equal(await store.currentPosition(), head);
    assert.deepEqual(again.coverage, retry.coverage);
    t.diagnostic(
      canonical({
        scope,
        initial,
        head,
        roster: ids,
        original: ack.txId,
        completion: again.coverage,
        states: [...model],
      }),
    );
  } finally {
    await store.close();
    oracle.close();
  }
});
test("live same-page edits invalidate a stalled sweep including an equal-basis body replacement", async (t) => {
  const scope = "act1-fence-" + randomUUID(),
    a = await open(scope),
    b = await open(scope),
    oracle = new DomainOracle(),
    model = new Map();
  try {
    const old = [make(0, 10, "A"), make(1, 10, "A")];
    await publishChanged(a, old, opts(old));
    await oracleFold(oracle, model, old);
    const update = [make(0, 20, "B"), make(1, 20, "A")];
    const ready = Promise.withResolvers<void>(),
      release = Promise.withResolvers<void>();
    let attempts = 0;
    const delayed = {
      ...a,
      transact: async (...args: Parameters<OutboxStore["transact"]>) => {
        if (!attempts++) {
          ready.resolve();
          await release.promise;
        }
        return a.transact(...args);
      },
    };
    const pending = publishChanged(delayed, update, opts(update));
    const live = [make(1, 30, "C"), make(1, 30, "D")];
    try {
      await Promise.race([
        ready.promise,
        pending.then(() => {
          throw Error("race was not staged");
        }),
      ]);
      for (const r of live) {
        await publishChanged(b, [r], { layout });
        await oracleFold(oracle, model, [r]);
      }
    } finally {
      release.resolve();
    }
    const result = await pending;
    assert.ok(attempts >= 2);
    await oracleFold(oracle, model, update);
    await states(
      b,
      old.map((r) => r.subject),
      await b.currentPosition(),
      model,
    );
    const again = make(1, 30, "C");
    await publishChanged(b, [again], { layout, eventId: "next-equal-basis" });
    await oracleFold(oracle, model, [again]);
    await states(a, [again.subject], await a.currentPosition(), model);
    t.diagnostic(canonical({ scope, attempts, receipts: result.coverage, states: [...model] }));
  } finally {
    await a.close();
    await b.close();
    oracle.close();
  }
});
test("coverage cannot close over a duplicate, foreign range, different release or cut", async () => {
  const s = await open("act1-invalid-" + randomUUID());
  try {
    const rows = [make(0, 20), make(1, 20), make(256, 20)],
      o = opts(rows);
    for (const wrong of [
      [rows[0], rows[0], rows[2]],
      [rows[0], rows[1], make(256, 21)],
      [rows[0], rows[1], { ...rows[2], release: W0.R2.hash }],
    ])
      await assert.rejects(publishChanged(s, wrong as W0.EvaluationRecord[], o), /roster|range/);
    await assert.rejects(
      publishChanged(s, rows, opts(rows, [rows[0]!.subject, rows[0]!.subject, rows[2]!.subject])),
      /roster/,
    );
    assert.notEqual(pageAddress("pl:s1").page, pageAddress(W0.placementId(1)).page);
  } finally {
    await s.close();
  }
});
test("128 and 256 member writes use bounded native reads at a single position", async () => {
  const s = await open("act1-bounds-" + randomUUID());
  try {
    const reads: { n: number; p: number }[] = [];
    const strict = {
      ...s,
      sweepPage: async (...args: Parameters<OutboxStore["sweepPage"]>) => {
        assert.ok(args[0].length <= 64);
        reads.push({ n: args[0].length, p: args[1].position });
        return s.sweepPage(...args);
      },
    };
    const rows = Array.from({ length: 256 }, (_, i) => make(i, 10, "A"));
    const g = await publishChanged(strict, rows, { layout: "guard-fact", frameSize: 128 });
    assert.equal(g.commits, 2);
    const r = await publishChanged(strict, rows, opts(rows));
    assert.equal(r.commits, 1);
    reads.length = 0;
    const next = rows.map((_, i) => make(i, 20, "A"));
    const result = await publishChanged(strict, next, opts(next));
    assert.equal(result.changed, 256);
    assert.ok(result.responses[0].bodies === 0 && result.responses[0].timing.operations === 2);
    assert.equal(new Set(reads.map((x) => x.p)).size, 1);
    assert.equal(reads.length, 5);
  } finally {
    await s.close();
  }
});
