import assert from "node:assert/strict";
import fs from "node:fs";
import { openComposition } from "../../../bench/lib/composition.ts";
import { sealedSnapshot } from "./file-source.ts";
import { Snapshot } from "./snapshot.ts";

const [scope, namespace, headerFile, exportFile, checkpoint, widthText, depthText] =
  process.argv.slice(2);
assert(
  scope && namespace && headerFile && exportFile && checkpoint && widthText && depthText,
  "Expected scope, account namespace, header JSON, sealed SQLite export, checkpoint, width and receipt depth",
);
const width = Number(widthText),
  depth = Number(depthText);
assert([1, 2, 4].includes(depth));
const header = JSON.parse(fs.readFileSync(headerFile, "utf8"));
const source = sealedSnapshot(exportFile, header, namespace, width);
try {
  const comp = await openComposition("reach", "datomic", scope);
  try {
    const run = await Snapshot.open(comp, source.data, source.data.groups, width, checkpoint);
    try {
      const start = performance.now();
      await run.drain(depth);
      const elapsedMs = performance.now() - start;
      console.log(
        JSON.stringify({ scope, source: run.source, elapsedMs, ...(await run.verify()) }),
      );
    } finally {
      run.close();
    }
  } finally {
    await comp.close();
  }
} finally {
  source.close();
}
