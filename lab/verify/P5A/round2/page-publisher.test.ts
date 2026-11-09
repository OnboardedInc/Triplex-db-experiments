import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { memoryComposition } from "../../../bench/lib/memory.ts";
import { seedW0 } from "../../../bench/lib/w0-seed.ts";
import { TrafficOracle } from "../../../bench/lib/w0-traffic-oracle.ts";
import { runW0Sweep, subjectList } from "../../../bench/lib/sweep.ts";
import { W0, V_W0, sha256 } from "../../../bench/lib/w0-world.ts";

const raw = path.join("/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VP5A/round2", "page-publisher-" + randomUUID());
fs.mkdirSync(raw, { recursive: true });
fs.writeFileSync("lab/verify/P5A/round2/page-publisher-attempt.json", JSON.stringify({ raw }, null, 2));
const report: any = { acceptance: false, scope: "publisher correctness without timed traffic", testSha256: sha256(fs.readFileSync(new URL(import.meta.url))), cases: [] };
for (const wrong of [false, true]) {
  test(`two workers/two pages ${wrong ? "refuse wrong second publication" : "match independent expected output and end counts"}`, async () => {
    const scope = randomUUID(), comp = memoryComposition("xtdb", scope), dir = path.join(raw, wrong ? "wrong" : "positive");
    fs.mkdirSync(dir); await seedW0(comp, 100, path.join(dir, "seed.ndjson"));
    let publications = 0, planted = false;
    const wrapped = { ...comp, publishOutbox: async (records: readonly any[]) => {
      const actual = await comp.publishOutbox(records); publications++;
      if (wrong && publications === 2) { assert.ok(actual.deliveries.length); planted = true;
        return { ...actual, deliveries: actual.deliveries.map((d, i) => i ? d : { ...d, payload: '{"planted":true}' }) }; }
      return actual;
    } };
    const oracle = new TrafficOracle(wrapped, path.join(dir, "commands.ndjson"));
    let result: any;
    try {
      await oracle.init();
      const ops = [{ op: "assert", entityId: "p5:tenant", attribute: "p5/activation", value: { type: "string", value: W0.R2.hash }, validFrom: V_W0 }];
      const meta = { commandId: scope + ":activation" }, r = await comp.transact(ops, meta); assert.ok(r.ok);
      await oracle.append(ops, meta, r.value);
      const basis = { position: r.value.position, validAt: V_W0 }, activations = [{ tx: basis.position, from: W0.POPULATION_VALID_TIME, release: W0.R2.hash }];
      // [CX-VP5A-R2] Why: isolate cross-page semantic state from the timed traffic client's 120-second watchdog. Rejected: treating a busy-host timing refusal as a wrong-world result.
      const sweep = await runW0Sweep({ comp: wrapped, composition: "memory", lane: "xtdb", scope, subjects: subjectList(100), basis,
        sweepId: scope, cursor: path.join(dir, "cursor.json"), workers: 2, activations,
        onPage: records => oracle.publish(records, basis, activations) });
      result = { sweep, semantic: await oracle.finish() };
    } catch (e) { result = { error: String(e) }; }
    finally { oracle.close(); }
    report.cases.push({ wrong, publications, planted, result });
    fs.writeFileSync(path.join(raw, "observations.json"), JSON.stringify(report, null, 2));
    if (wrong) { assert.equal(planted, true); assert.match(result.error, /G5 deliveries/); }
    else { assert.equal(result.sweep.complete, true); assert.equal(result.semantic.outputs, 100); assert.equal(result.semantic.publications, 2);
      assert.deepEqual(result.semantic.counts.expected, result.semantic.counts.end); }
  });
}
