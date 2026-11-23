import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { ReplicaThread } from "../../../bench/lib/replica-thread.ts";
import { SpillThread } from "../../../bench/lib/spill-thread.ts";
import { R, observe } from "../../../bench/lib/observe.ts";
import { V_W0, W0, canonical } from "../../../bench/lib/w0-world.ts";
import { pageRoots } from "../../../bench/lib/w0-page-outbox.ts";
import { pageWireState } from "../../../bench/lib/w0-page-check.ts";
import type { Basis, CompositionHandle } from "../../../bench/lib/composition.ts";
import { Account, rootOf, seedFacts } from "./account.ts";
import { DeepProjectionIndex } from "../../../bench/lib/deep-projection-index.ts";
import { keyFor } from "../scale1/tenants.ts";
import { DeepActivation, policyWorld } from "../../../bench/lib/deep-activation.ts";

// [DX-INT1] Why: run SCALE1's ordinary activation entry on certified transaction-feed data and compare both published cuts to its full-world Python oracle.
// Rejected: proving only the population experiment's separate paged workload.
export async function regularDeepProof(comp: CompositionHandle, dir: string, scoped = false) {
  assert.equal(await comp.currentPosition(), 0);
  fs.mkdirSync(dir);
  const size = 6;
  const tenant = scoped ? { index: 1, key: keyFor(1), first: 254, people: size } : undefined;
  const firstPerson = tenant?.first ?? 0;
  const neighbor = scoped
    ? { index: 0, key: keyFor(0), first: firstPerson - 1, people: 1 }
    : undefined;
  if (neighbor) {
    const receipt = await comp.transact(
      seedFacts("deep", neighbor.first, neighbor.first, neighbor),
      { actor: "import", commandId: "neighbor-seed" },
    );
    assert(receipt.ok && receipt.value.position === 1);
  }
  const seed = await comp.transact(
    Array.from({ length: size }, (_, i) =>
      seedFacts("deep", firstPerson + i, firstPerson, tenant),
    ).flat(),
    {
      actor: "import",
      commandId: "regular-deep-seed",
    },
  );
  assert(seed.ok);
  const cut = seed.value.position;
  const scope = comp.scopeName!;
  const sources: string[] = [];
  const handle = {
    ...comp,
    sweepPage: async (...args: Parameters<typeof comp.sweepPage>) => {
      sources.push(...args[0].filter((root) => root.startsWith("pl:")));
      return comp.sweepPage(...args);
    },
  };
  const act = new DeepActivation(dir, size, scope, firstPerson, "ead90", tenant);
  const imported = await act.finishImport(handle, { position: cut, validAt: seed.value.instant });
  assert(
    imported &&
      imported.through === cut &&
      imported.certifiedImports === size &&
      imported.diskBytes > 0,
  );
  const before = comp.touchedUsage?.();
  const first = await act.execute(handle, "R1", () => {});
  const second = await act.execute(handle, "R2", () => {});
  assert.deepEqual(sources, []);
  for (const result of [first, second]) {
    assert.equal(result.projection?.certifiedImports, 0);
    assert.equal(result.sourceWorldPulls, 0);
  }
  assert.deepEqual(first.selection, { full: size, candidates: 0, excluded: 0 });
  assert.deepEqual(second.selection, { full: 0, candidates: size, excluded: 0 });
  assert.equal(comp.touchedUsage?.().admissions, before?.admissions);
  const verified = await act.verify(comp, first, second);
  assert.equal(verified.guardComparisons, size * 2);
  if (neighbor) {
    const subject = W0.placementId(neighbor.first),
      basis = { position: verified.finalPosition, validAt: second.cut.validAt };
    const page = await comp.sweepPage(pageRoots([subject]), basis);
    assert.deepEqual(page.reportedBasis, basis);
    assert(page.rows.some((row) => row.entityId === pageRoots([subject])[0]));
    assert.deepEqual(pageWireState(page.rows, subject), { items: [], pending: [], subjects: [] });
  }
  return {
    scope,
    seed: cut,
    firstPerson,
    neighbor: neighbor?.key,
    pages: first.coverage.pages,
    imported,
    sourcePulls: sources.length,
    selections: [first.selection, second.selection],
    ...verified,
  };
}
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
  // [DX-AGE1] Why: the independent digest uses the expected triples.
  // Rejected: adding transport counters to the narrowed observer input.
  const row = [...log][0]!,
    expected = observe({ triples: a.expected(a.first, p, V_W0) });
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
