// [CX-VNSR] Why: mutate a retained RPC feed payload from this verifier's fresh parity run. Rejected: relying only on the producer's unchanged fixture data.
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { auditP3 } from "../../bench/ns-driver/p3.mjs";
import { host } from "../../bench/lib/p3.mjs";
const dir = path.resolve(process.argv[2]);
const comparisonDir = fs
  .readdirSync(dir)
  .map((x) => path.join(dir, x))
  .find((p) => fs.existsSync(path.join(p, "comparison.json")));
assert.ok(comparisonDir, "fresh split comparison missing");
const comparison = JSON.parse(fs.readFileSync(path.join(comparisonDir, "comparison.json")));
const mono = path.join(dir, comparison.monolith);
const receipt = JSON.parse(fs.readFileSync(path.join(mono, "receipt.json")));
const prefix = JSON.parse(fs.readFileSync(path.join(mono, "prefix.json")));
const old = JSON.parse(fs.readFileSync(path.join(mono, "observations.json")));
assert.deepEqual(
  comparison.split.accounting
    .filter((x) => x.receipt)
    .map((x) => ({ commandId: x.commandId, ...x.receipt })),
  old.acks,
);
assert.deepEqual(
  comparison.split.accounting.filter((x) => !x.receipt).map((x) => x.commandId),
  receipt.measurement.publishedWithoutAck,
);
const records = host.openPublicationReader(receipt.config.publicationFile);
try {
  const baseline = auditP3({ config: receipt.config, prefix, ...old, records });
  const consumed = structuredClone(comparison.split.consumer);
  consumed.runId = receipt.runId;
  consumed.checkpoint.source = receipt.config.source;
  for (const page of consumed.pages) page.cursor.source = receipt.config.source;
  // Samples belong to the split attempt; reuse monolith timings solely to isolate the content negative control.
  consumed.samples = old.consumed.samples;
  const unmodified = auditP3({ config: receipt.config, prefix, ...old, consumed, records });
  assert.deepEqual(unmodified, baseline);
  consumed.pages[0].entries.find((e) => e.kind === "commit").transactions[0].changes[0].attribute =
    ":test/WRONG";
  assert.throws(
    () => auditP3({ config: receipt.config, prefix, ...old, consumed, records }),
    /content\/resolution mismatch/,
  );
  console.log(
    JSON.stringify(
      {
        comparisonDir,
        monolith: receipt.runId,
        equalFeedAndAccounting: true,
        changedRpcFeedRejected: true,
        error: "Feed content/resolution mismatch at 0",
        limitation: "Recompute negative control, not an online runNS semantic check.",
      },
      null,
      2,
    ),
  );
} finally {
  records.close();
}
