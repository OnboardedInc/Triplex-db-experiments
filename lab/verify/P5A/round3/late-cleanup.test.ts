import assert from "node:assert/strict";
import fs from "node:fs";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { memoryComposition } from "../../../bench/lib/memory.ts";
import { W0, V_W0, triplexValue, sha256 } from "../../../bench/lib/w0-world.ts";
import { fingerprintSweep, readW0Fingerprint, freezeMemoryG0, FingerprintRefusal } from "../../../bench/lib/w0-fingerprint.ts";
const scope = randomUUID(), comp = memoryComposition("xtdb", scope, 0, () => V_W0);
const r = await comp.transact(Array.from({ length: 50 }, (_, i) => ({ op: "assert", entityId: W0.placementId(i), attribute: "weeklyMinutes", value: triplexValue("weeklyMinutes", 2400), validFrom: V_W0 })), { commandId: "late-cleanup-fixture" });
assert.ok(r.ok);
const basis = { position: r.value.position, validAt: V_W0 }, expected = { ...await readW0Fingerprint(comp, 50, basis, new AbortController().signal), N: 50 };
const input: any = { endpoint: comp.backend.url, scope, basis, expected, counts: await comp.storeCounts() };
input.pin = await freezeMemoryG0(comp, input);
const report: any = { acceptance: false, classification: "OFFLINE-LIFECYCLE-FIXTURE", testSha256: sha256(fs.readFileSync(new URL(import.meta.url))), cases: [] };
const turn = () => new Promise(r => setImmediate(r));
for (const rejects of [false, true]) {
  test(`late-open close await ${rejects ? "rejects" : "waits then completes"} without reopening admission`, async () => {
    let opened!: () => void, closeReleased!: () => void, started = 0, finished = 0;
    const openLatch = new Promise<void>(r => { opened = r; }), closeLatch = new Promise<void>(r => { closeReleased = r; });
    const controller = new AbortController();
    // [CX-VP5A-R3] Why: the post-refusal acquire continuation also awaits closeOnce; a slow/rejected late close must never revive a grant. Rejected: testing only immediately successful closes.
    const pending = fingerprintSweep({ ...input, signal: controller.signal }, async () => {
      queueMicrotask(() => controller.abort()); await openLatch;
      return { endpoint: input.endpoint, scope, comp, close: async () => { started++; await closeLatch; finished++; if (rejects) throw Error("late cleanup rejection"); } };
    });
    let refusal: any; try { await pending; } catch (e) { refusal = e; }
    assert.ok(refusal instanceof FingerprintRefusal); assert.equal(started, 0);
    opened(); await turn(); await turn();
    assert.equal(started, 1); assert.equal(finished, 0);
    closeReleased(); await turn(); await turn();
    assert.equal(started, 1); assert.equal(finished, 1);
    report.cases.push({ rejects, refusal: String(refusal), started, finished });
    fs.writeFileSync("lab/verify/P5A/round3/late-cleanup.json", JSON.stringify(report, null, 2));
  });
}
