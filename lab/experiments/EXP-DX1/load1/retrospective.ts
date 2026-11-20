import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { sha } from "./source.ts";

const [dir] = process.argv.slice(2);
assert(dir);
const sums = fs.readFileSync(new URL("./SHA256SUMS", import.meta.url), "utf8");
const read = (file: string) => {
  const input = fs.readFileSync(path.join(dir, file));
  assert(sums.split("\n").includes(sha(input) + "  " + path.basename(dir) + "/" + file), file);
  return JSON.parse(input.toString("utf8"));
};
const attempt = read("attempt.json"),
  observation = read("observations.json"),
  raw = read("live-128.offers.json");
assert.deepEqual(
  [observation.source, observation.nonce, observation.slot],
  [attempt.source, attempt.nonce, attempt.slot],
);
assert.deepEqual(
  [raw.source, raw.nonce, raw.slot],
  [attempt.source.git, attempt.nonce, attempt.slot],
);
const observationArm = observation.result.find((r: any) => r.arm === "live-128");
assert.equal(raw.scope, observationArm.scope);
const native = new Map<string, any>(raw.native.map((r: any) => [r.command, r]));
const bulk = raw.ordered.map((o: any) => {
  const n = native.get(o.command);
  assert(n && n.position === o.position && n.grant.bulk && n.group === 1);
  return { ...o, submit: n.submit - raw.start, reply: n.end - raw.start };
});
const tail = raw.samples
  .filter((r: any) => r.actor === "quiet" && r.kind === "save" && r.outcome === "verified")
  .sort((a: any, b: any) => b.end - b.due - (a.end - a.due))
  .slice(0, 10)
  .map((s: any) => {
    const own = native.get("save/quiet/" + s.seq);
    assert(own && own.position === s.seen.position);
    const ongoing = bulk.find((b: any) => b.offer <= s.offered && b.ack > s.offered);
    return {
      sequence: s.seq,
      latencyMs: s.end - s.due,
      offerSlipMs: s.offered - s.due,
      stageBeforeSubmitMs: own.submit - raw.start - s.offered,
      observedOwnQueueMs: own.queueUs / 1000,
      ownReplyMs: own.end - raw.start - s.offered,
      ownPosition: own.position,
      bulk: ongoing
        ? {
            command: ongoing.command,
            position: ongoing.position,
            sentBeforeOffer: ongoing.submit <= s.offered,
            nativeReplyAfterOffer: ongoing.reply >= s.offered,
            remainingClientMs: ongoing.ack - s.offered,
          }
        : null,
    };
  });
const q = (v: number[], frac: number) =>
  [...v].sort((a, b) => a - b)[Math.ceil(v.length * frac) - 1];
console.log(
  JSON.stringify(
    {
      binding: [attempt.nonce, attempt.source.git, attempt.slot, raw.scope],
      bulkCount: bulk.length,
      clientBulkFrameP50Ms: q(
        bulk.map((b: any) => b.ack - b.offer),
        0.5,
      ),
      clientBulkFrameP99Ms: q(
        bulk.map((b: any) => b.ack - b.offer),
        0.99,
      ),
      tail,
    },
    null,
    2,
  ),
);
