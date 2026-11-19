import assert from "node:assert/strict";
import path from "node:path";
import { ReplicaThread } from "../../../bench/lib/replica-thread.ts";
import { SpillThread } from "../../../bench/lib/spill-thread.ts";
import { R, observe } from "../../../bench/lib/observe.ts";
import { V_W0 } from "../../../bench/lib/w0-world.ts";
import type { Basis } from "../../../bench/lib/composition.ts";
import { Account, rootOf } from "./account.ts";
import { DeepProjectionIndex } from "../../../bench/lib/deep-projection-index.ts";
import { policyWorld } from "../../../bench/lib/deep-activation.ts";
import { canonical } from "../../../bench/lib/w0-world.ts";
// [DX-INT1] Why: exercise the real sender's off-thread receipt capture, on the same cut as an original deep-account receipt.
// Rejected: declaring worker compatibility from a composition name or a successful RPC alone.
export async function receiptProof(a: Account, dir: string) {
  const p = a.head,
    last = a.db.prepare("SELECT instant FROM tx WHERE p=?").get(p)!;
  assert(last);
  const time = Number(last.instant);
  const basis = { recordedPosition: p, recordedAt: time, validAt: V_W0 } as Basis & {
    recordedPosition: number;
  };
  const cacheFile = path.join(dir, "regular-deep-policy.sqlite");
  const projection = new DeepProjectionIndex(cacheFile, a.binding, policyWorld);
  const fetched: string[] = [];
  try {
    const pinned = { position: p, validAt: V_W0 };
    await projection.catchUp(a.comp, pinned);
    const observed = await projection.worlds(
      {
        ...a.comp,
        sweepPage: async (roots, cut, between) => {
          fetched.push(...roots);
          return a.comp.sweepPage(roots, cut, between);
        },
      },
      [a.first, a.first + 1],
      pinned,
    );
    assert.deepEqual(fetched, [rootOf("deep", a.first)]);
    for (const i of [a.first, a.first + 1])
      assert.equal(canonical(observed.get(i)), canonical(a.oracleWorld(i, p)));
  } finally {
    projection.close();
  }
  const spill = new SpillThread(path.join(dir, "sender-spill"), 32 * 1024 ** 2);
  const thread = await ReplicaThread.open(
    {
      scope: a.comp.scopeName,
      composition: "reach-touched",
      roots: [],
      initial: { position: p, instant: time },
      feed: "legacy",
      historyBytes: 2 * 1024 ** 2,
      worldCacheBytes: 1 * 1024 ** 2,
      fallbackThread: "worker",
      peer: "reader",
      receiptSpill: spill.connect(),
    },
    a.comp,
  );
  let log;
  try {
    const rows = await thread.pull(rootOf(a.shape, a.first), {
      recordedPosition: p,
      validAt: V_W0,
    } as Basis);
    a.verify(a.first, p, V_W0, rows);
    thread.captureReceipt({
      subject: a.first,
      basis,
      start: performance.timeOrigin + performance.now(),
      commitTraceId: "off",
    });
    const drain = await thread.drainReceiptCaptures();
    assert.equal(drain.retained, 1);
  } finally {
    await thread.close();
    log = await spill.finish();
  }
  assert.equal(log.length, 1);
  const row = [...log][0]!,
    expected = observe({
      triples: a.expected(a.first, p, V_W0),
      entities: 0,
      roundTrips: 0,
      depth: 0,
      route: "intent",
      language: "original rows",
      waitedMs: 0,
    });
  assert.equal(row[R.error], null);
  assert.equal(row[R.subject], a.first);
  assert.equal(row[R.basisPosition], p);
  assert.equal(row[R.digest], expected.digest);
  assert.equal(row[R.facts], expected.facts);
  assert.equal(row[R.stamp], expected.stamp);
  return {
    scope: a.comp.scopeName,
    position: p,
    subject: a.first,
    digest: expected.digest,
    facts: expected.facts,
    retained: log.length,
    fullWorldReads: fetched.length,
    certifiedWorlds: 1,
    route: row[R.route],
  };
}
