import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runW0Driver } from "../../../bench/w0-driver.ts";
import { COMPOSITIONS } from "../../../bench/lib/composition.ts";
import { sha256 } from "../../../bench/lib/w0-world.ts";
import { openBulkCounts } from "./bulk-counts.ts";
// [DX-H6] Why: preserve the original W0 controller and all gates; replace only full-history transport on the main handle.
// Rejected: a fork of the activation/gate controller or altered expected counts.
export async function runCountsDriver(argv: string[]) {
  const i = argv.indexOf("--output"),
    output = path.resolve(argv[i + 1] ?? "runs/DX-H6-vm/receipt.json");
  if (i < 0 || !output.startsWith(path.resolve("runs") + path.sep))
    throw Error("counts output must be inside runs");
  fs.mkdirSync(path.dirname(output), { recursive: true });
  const sources = Object.fromEntries(
    [
      "lab/experiments/EXP-DX1/h6/counts-driver.ts",
      "lab/experiments/EXP-DX1/h6/bulk-counts.ts",
    ].map((file) => [file, sha256(fs.readFileSync(file))]),
  );
  const receipt: any = {
    startedAt: new Date().toISOString(),
    sources,
    status: "RUNNING",
    classification: "DIAGNOSTIC",
    countMode: "full-history-public-batch-256",
  };
  const sidecar = path.join(path.dirname(output), "counts-controller.json");
  fs.writeFileSync(sidecar, JSON.stringify(receipt, null, 2) + "\n");
  const original = COMPOSITIONS.reach;
  const counters: any[] = [];
  COMPOSITIONS.reach = async (lane, scope) => {
    const comp = await original(lane, scope);
    if (lane !== "datomic") return comp;
    let bulk;
    try {
      bulk = await openBulkCounts(comp);
    } catch (error) {
      await comp.close();
      throw error;
    }
    counters.push(bulk);
    const close = comp.close;
    comp.storeCounts = bulk.count;
    comp.close = async () => {
      bulk.close();
      await close();
    };
    return comp;
  };
  try {
    const result = await runW0Driver(argv);
    for (const [file, hash] of Object.entries(sources))
      if (sha256(fs.readFileSync(file)) !== hash) throw Error("counts controller source changed");
    result.sources = { ...result.sources, ...sources };
    result.countMode = receipt.countMode;
    result.bulkCountObservations = counters.flatMap((c) => c.stats);
    fs.writeFileSync(output, JSON.stringify(result, null, 2) + "\n");
    receipt.status = "CONTROLLER-RETURNED-SOURCES-MATCHED";
    return result;
  } finally {
    COMPOSITIONS.reach = original;
    receipt.finishedAt = new Date().toISOString();
    receipt.observations = counters.flatMap((c) => c.stats);
    fs.writeFileSync(sidecar, JSON.stringify(receipt, null, 2) + "\n");
  }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  await runCountsDriver(process.argv.slice(2));
