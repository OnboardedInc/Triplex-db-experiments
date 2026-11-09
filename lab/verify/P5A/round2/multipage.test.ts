import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { memoryComposition } from "../../../bench/lib/memory.ts";
import { seedW0 } from "../../../bench/lib/w0-seed.ts";
import { trafficArm } from "../../../bench/lib/w0-traffic.ts";
import { sha256 } from "../../../bench/lib/w0-world.ts";

const raw = path.join("/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VP5A/round2", "multipage-" + randomUUID());
fs.mkdirSync(raw, { recursive: true });
fs.writeFileSync("lab/verify/P5A/round2/multipage-attempt.json", JSON.stringify({ raw }, null, 2));
const report: any = { acceptance: false, testSha256: sha256(fs.readFileSync(new URL(import.meta.url))), results: [] };
for (const wrongDelivery of [false, true]) {
  test(`three-page two-worker traffic ${wrongDelivery ? "refuses second-page wrong delivery" : "qualifies correct worlds and counts"}`, async () => {
    const scope = randomUUID(), comp = memoryComposition("xtdb", scope), dir = path.join(raw, wrongDelivery ? "wrong-second-page" : "positive");
    fs.mkdirSync(dir);
    await seedW0(comp, 150, path.join(dir, "seed.ndjson"));
    let publications = 0, injected = false;
    // [CX-VP5A-R2] Why: independent publication state must remain correct after earlier pages and across workers. Rejected: testing only the first single-page frame.
    const observed = { ...comp, publishOutbox: async (records: readonly any[]) => {
      const result = await comp.publishOutbox(records);
      publications++;
      if (wrongDelivery && publications === 2) {
        assert.ok(result.deliveries.length);
        injected = true;
        return { ...result, deliveries: result.deliveries.map((d, i) => i ? d : { ...d, payload: '{"changed":true}' }) };
      }
      return result;
    } };
    let result: any;
    try {
      result = await trafficArm({ comp: observed, scope, N: 150, dir, id: "multiple", seed: "multipage-review", durationS: 2,
        traceOffsetS: 120, workers: 2, controllerOn: false, sweep: true, release: "R2" });
    } catch (e) { result = { error: String(e) }; }
    const counts = await comp.storeCounts();
    report.results.push({ wrongDelivery, publications, injected, result, counts });
    fs.writeFileSync(path.join(raw, "observations.json"), JSON.stringify(report, null, 2));
    fs.writeFileSync(path.join(dir, "tail-commands.json"), JSON.stringify(comp.commandLog!().slice(-6), null, 2));
    if (wrongDelivery) { assert.equal(injected, true); assert.match(result.error, /G5 deliveries/); }
    else { assert.equal(result.sweepComplete, true); assert.equal(result.semantic.outputs, 150); assert.equal(result.semantic.publications, 3);
      assert.deepEqual(result.semantic.counts.end, result.semantic.counts.expected); assert.equal(result.trace.offered, result.trace.committed); }
  });
}
