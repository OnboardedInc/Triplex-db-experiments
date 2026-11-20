import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { headSha, sources } from "./binding.ts";
import { checkSolo } from "./solo-proof.ts";
import { soloPopulation, soloScope } from "./solo-population.ts";
import { hash } from "./store.ts";
import { validatePreflight } from "../act2/preflight-runner.ts";

// [DX-SCALE1] Why: advance from a bounded release only after re-reading the original observations and both independently checked native dispositions on that attempt. Rejected: using the child exit code or the transfer's displayed stage as correctness evidence.
export function verifyCampaign(dir: string) {
  const json = (name: string) => JSON.parse(fs.readFileSync(path.join(dir, name), "utf8"));
  const a = json("attempt.json"),
    t = json("terminal.json"),
    transfer = json("transfer.json"),
    binding = { source: a.source, slot: a.slot, nonce: a.nonce };
  assert.equal(a.source, headSha());
  assert(a.bounded && a.item === 2 && a.mode === "activation" && a.activationMode === "delta");
  assert(t.source === a.source && t.slot === a.slot && t.nonce === a.nonce && t.cleanup);
  assert(t.service === "success" && Date.parse(t.endedAt) >= a.at);
  assert(transfer.source === a.source && transfer.nonce === a.nonce && transfer.tag === a.tag);
  const proof = json("delta-preflight/proof.json");
  assert.deepEqual(proof, json("transfer/preflight.json"));
  assert.deepEqual(proof.binding, binding);
  assert.deepEqual(json("delta-preflight/STATUS.json"), { binding, stage: "verified" });
  assert(proof.people === 1000 && proof.elapsedMs > 0 && proof.elapsedMs <= 600000);
  assert.equal(proof.scope, soloScope(a.nonce, 1000));
  assert.deepEqual(proof.emptyLarge, { scope: soloScope(a.nonce, 100000), position: 0 });
  assert.deepEqual(proof.populations, [soloPopulation(1000), soloPopulation(100000)]);
  assert.equal(proof.code, hash(sources("preflight")));
  validatePreflight(proof.windows, binding);
  const small = checkSolo(path.join(dir, "delta-preflight"), binding, 1000, 6, "preflight");
  assert.deepEqual(proof.loaded, small.loaded);
  assert.deepEqual(
    proof.offers,
    small.proofs.map((o: unknown) => hash(o)),
  );
  assert.equal(
    proof.fullFallback,
    hash(fs.readFileSync(path.join(dir, "delta-preflight/full-fallback.tap"), "utf8")),
  );
  const observed = checkSolo(path.join(dir, "delta"), binding, 100000, 90, "solo", true);
  assert.deepEqual(observed, json("transfer/delta-measurement.json"));
  assert.deepEqual(json("delta/STATUS.json"), { binding, stage: "complete" });
}

if (process.argv[1] === import.meta.filename) verifyCampaign(process.argv[2]!);
