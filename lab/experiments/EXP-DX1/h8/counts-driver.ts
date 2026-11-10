import { publicationMatrix } from "./publication-matrix.ts";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runW0Driver } from "../../../bench/w0-driver.ts";
import { COMPOSITIONS } from "../../../bench/lib/composition.ts";
import { openBulkCounts } from "./bulk-counts.ts";
// [DX-H8] Why: preserve the original W0 controller and all gates; replace only full-history transport on the main handle.
// Rejected: a fork of the activation/gate controller or altered expected counts.
export async function runCountsDriver(argv: string[]) {
  const i = argv.indexOf("--output"),
    output = path.resolve(argv[i + 1] ?? "runs/DX-H8-vm/receipt.json");
  if (i < 0 || !output.startsWith(path.resolve("runs") + path.sep))
    throw Error("counts output must be inside runs");
  fs.mkdirSync(path.dirname(output), { recursive: true });
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
    result.countMode = "full-history-public-batch-256";
    result.bulkCountObservations = counters.flatMap((c) => c.stats);
    fs.writeFileSync(output, JSON.stringify(result, null, 2) + "\n");
    if (
      result.N === 1000 &&
      argv.includes("--stored-preview") &&
      argv[argv.indexOf("--publish-size") + 1] === "64"
    )
      await publicationMatrix(result, path.dirname(output));
    return result;
  } finally {
    COMPOSITIONS.reach = original;
  }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  await runCountsDriver(process.argv.slice(2));
