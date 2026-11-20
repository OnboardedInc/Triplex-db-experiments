import assert from "node:assert/strict";
import { W0, V_W0 } from "../../../bench/lib/w0-world.ts";
import { readDeepWorlds, deepGroups } from "../../../bench/lib/deep-activation.ts";
import { publishChanged } from "../../../bench/lib/w0-replica.ts";
import { readOutboxAt } from "../../../bench/lib/w0-outbox-state.ts";
import { pageRoots } from "../../../bench/lib/w0-page-outbox.ts";
import { pageWireState } from "../../../bench/lib/w0-page-check.ts";
import type { CompositionHandle } from "../../../bench/lib/composition.ts";
import type { DomainOracle } from "../../../bench/lib/w0-gates.ts";
import type { Account } from "../scale1/tenants.ts";
import { query, event } from "./bench-rung.ts";
import { iso } from "./v3.ts";
import { evaluate } from "./model.ts";
import { referenceTraffic, type ReferenceSave } from "./reference-traffic.ts";
import { hash } from "./store.ts";
export async function pageReference(
  rc: CompositionHandle,
  comp: CompositionHandle,
  t: Account,
  ids: string[],
  oracle: DomainOracle,
  save: () => Promise<ReferenceSave>,
  loaded = false,
  seed?: { position: number; worlds: W0.World[] },
  readWorlds = readDeepWorlds,
  repeatReads = true,
) {
  const reports = [];
  let seq = 0;
  for (const [n, rel] of [W0.R1, W0.R2, W0.R3].entries()) {
    const start = performance.now(),
      marker = await comp.transact(
        [
          {
            op: "assert",
            entityId: "page-offer:" + n,
            attribute: "page/reference",
            value: { type: "string", value: rel.hash },
            validFrom: 0,
          },
        ],
        {
          actor: "page-reference",
          commandId: "page-reference:" + n,
          preconditions: [{ _tag: "EntityState", entityId: "page-offer:" + n, tripleIds: [] }],
        },
      );
    assert(
      marker.ok &&
        marker.value.triples.length === 1 &&
        marker.value.triples[0]!.value.value === rel.hash,
    );
    const position = marker.value.position,
      basis = { tx: position, validTime: iso(V_W0) },
      version = seq++;
    await event(oracle, { seq: version, basis, doc: rel.doc });
    // [DX-ACT2] Why: freeze the reference at its actual offer, read every native deep world and commit its existing page guards, while a real later source save enters the same account. Rejected: timing records precomputed from the next release.
    const active = n
      ? referenceTraffic(rc, t, rel, position, oracle, save, loaded, readWorlds, repeatReads)
      : undefined;
    let traffic: Awaited<ReturnType<NonNullable<typeof active>["finish"]>> | undefined;
    let end: number, elapsed: number, receipts: number;
    const hashes: string[] = [];
    try {
      const records: W0.EvaluationRecord[] = [];
      if (n === 0 && seed) {
        // [DX-ACT2] Why: R1 is the already active bootstrap release. Both publishers use the same verified seed before any live write. Rejected: reading the complete unchanged deep seed a second time; R2 and R3 still pull every native world after Publish.
        assert(seed.position < position);
        assert.deepEqual(
          seed.worlds.map((w) => w.subject),
          ids,
        );
        for (const w of seed.worlds) records.push(W0.recordOf(evaluate(w, rel, basis)));
      } else {
        for (const group of deepGroups(t.first, t.people)) {
          active?.check();
          const worlds = await readWorlds(rc, group, { position, validAt: V_W0 }, t.key);
          for (const w of worlds) records.push(W0.recordOf(evaluate(w, rel, basis)));
        }
      }
      const pub = await publishChanged(comp, records, {
        layout: "page-cut",
        frameSize: 64,
        roster: { subjects: ids, release: rel.hash, basis: records[0]!.basis },
      });
      end = await comp.currentPosition();
      elapsed = performance.now() - start;
      receipts = pub.responses.length;
    } finally {
      traffic = await active?.finish();
    }
    for (let i = 0; i < ids.length; i += 128) {
      const batch = ids.slice(i, i + 128),
        [actual, expected] = await Promise.all([
          readOutboxAt(rc, pageRoots(batch), end),
          query(oracle, "read", { seq: version, subjects: batch }),
        ]);
      assert.deepEqual(
        expected.map((x: any) => x.subject),
        batch,
      );
      for (const [j, id] of batch.entries()) {
        const wire = hash(pageWireState(actual.rows, id));
        assert.equal(wire, expected[j].state);
        hashes.push(wire);
      }
    }
    let livePosition = 0;
    for (const w of traffic?.saved ?? []) {
      if (!livePosition) livePosition = w.p;
      assert(w.p > position);
      const b = { tx: w.tx, validTime: basis.validTime },
        output = evaluate(w.worldAfter, rel, b);
      await publishChanged(comp, [W0.recordOf(output)], { layout: "page-cut", frameSize: 64 });
      await query(oracle, "event", {
        seq: seq++,
        basis: b,
        doc: rel.doc,
        subject: w.subject,
        worldAfter: w.worldAfter,
      });
      const actual = await readOutboxAt(rc, pageRoots([w.subject]), await comp.currentPosition()),
        expected = await query(oracle, "read", { seq: seq - 1, subjects: [w.subject] });
      assert.equal(hash(pageWireState(actual.rows, w.subject)), expected[0].state);
    }
    if (n)
      assert(
        livePosition > position && livePosition <= end,
        "reference save did not enter the measured sweep",
      );
    reports.push({
      release: rel.hash,
      people: ids.length,
      position,
      end,
      livePosition,
      elapsed,
      receipts,
      liveReads: traffic?.reads ?? 0,
      liveSaves: traffic?.saved.length ?? 0,
      burst: traffic?.burst ?? 0,
      steady: traffic?.steady ?? 0,
      digest: hash(hashes),
    });
  }
  return reports;
}
