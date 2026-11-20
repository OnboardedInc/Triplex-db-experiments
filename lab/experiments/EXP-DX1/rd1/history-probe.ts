import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
import { openComposition } from "../../../bench/lib/composition.ts";
import { ReplicaReader, ReplicaReadHost } from "../../../bench/lib/replica-reads.ts";
import { canonicalWorld } from "../../../bench/lib/canonical.ts";
import { observe } from "../../../bench/lib/observe.ts";
import { ids } from "../../../bench/lib/world.ts";
import { inLocalSlot } from "./owned-local.ts";

async function probe(slot: string) {
  const attempt = randomUUID(), scope = `rd1-history-${attempt}`, root = ids.placement(0), stable = ids.placement(1);
  const runtime = await openComposition("reach", "datomic", scope);
  try {
    const put = async (value: string, predecessor?: string) => {
      const result = await runtime.transact([
        ...(predecessor ? [{ op: "retract", id: predecessor }] : []),
        { op: "assert", entityId: root, attribute: ":placement/rd1-value", value: { type: "string", value }, validFrom: 1 },
        ...(predecessor ? [] : [{ op: "assert", entityId: stable, attribute: ":placement/rd1-value", value: { type: "string", value: "first" }, validFrom: 1 }]),
      ], { commandId: `${attempt}-${value}`, actor: "probe" });
      if (!result.ok) throw Error(`Fixture transaction returned ${result.tag}: ${String(result.error)}`);
      assert.equal(result.value.triples.find(t => t.entityId === root)?.value.value, value);
      return result.value;
    };
    const original = await put("first");
    const basis = { recordedAt: original.instant, validAt: Date.now() };
    const native = new Map([[root, await runtime.pull(root, basis)], [stable, await runtime.pull(stable, basis)]]);
    const host = await ReplicaReadHost.open(scope, [root, stable], runtime, original, "inline", 8 * 1024 ** 2);
    try {
      assert(host.index.strictRecordClocks);
      const tight = new ReplicaReader(0, undefined, 0);
      tight.install(host.index.image());
      const closure = new ReplicaReader(0, undefined, 0, "closure");
      closure.install({ ...host.index.image(), historyCoverage: "closure" });
      const roomy = new ReplicaReader(8 * 1024 ** 2, host.index);
      let exchanges = 0;
      const read = async (reader: ReplicaReader, subject = root) => {
        const answer = await reader.pullAt(subject, basis, () => { exchanges++; return runtime.pull(subject, basis); }, undefined, false, original.position);
        const expected = native.get(subject)!;
        assert.equal(canonicalWorld(answer.triples), canonicalWorld(expected.triples));
        assert.deepEqual(observe(answer), observe(expected));
        assert.equal(answer.triples.find(t => t.entityId === subject)?.value.value, "first");
        return { route: answer.route, reason: answer.replicaFallbackReason ?? null };
      };
      const before = await read(tight);
      const unsubscribe = host.subscribe(delta => { tight.apply(delta); closure.apply(delta); });
      try {
        const oldId = original.triples.find(t => t.entityId === root)!.id;
        const replacement = await put("second", oldId);
        const deadline = performance.now() + 10_000;
        while (tight.index.position < replacement.position && performance.now() < deadline) await sleep(10);
        assert.equal(tight.index.position, replacement.position);
        assert.equal(tight.index.floor, replacement.position);
        assert(host.index.floor <= original.position);
        const evicted = await read(tight), retained = await read(roomy);
        assert.deepEqual([before.route, evicted.route, retained.route, exchanges], ["replica", "fallback", "replica", 1]);
        assert.equal(evicted.reason, "before-retained-clock");
        const globalStable = await read(tight, stable), closureStable = await read(closure, stable), closureChanged = await read(closure);
        assert.deepEqual([globalStable.route, closureStable.route, closureChanged.route], ["fallback", "replica", "fallback"]);
        assert.equal(closureChanged.reason, "missing-closure-entity");
        return { diagnostic: "exact time-only old cut after one real Datomic replacement", attempt, slot,
          source: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(), basis, original: original.position,
          replacement: replacement.position, before, evicted, retained, globalStable, closureStable, closureChanged, exchanges,
          historyBytes: { tight: tight.index.historyBytes, closure: closure.index.historyBytes, roomy: host.index.historyBytes },
          miss: tight.diagnostics.fallbackWitnesses[0], canonicalBytes: Buffer.byteLength(canonicalWorld(native.get(root)!.triples)) };
      } finally { unsubscribe(); }
    } finally { await host.close(); }
  } finally { await runtime.close(); }
}

const slot = process.argv[2];
if (!slot) throw Error("Use a local exclusive slot name, or 'prepared' with the owned native endpoint and TRIPLEX_TRACE_SLOT");
const result = slot === "prepared" ? await probe(process.env.TRIPLEX_TRACE_SLOT ?? (() => { throw Error("Missing owned slot"); })()) : await inLocalSlot(slot, probe);
console.log(JSON.stringify(result, null, 2));
