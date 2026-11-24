// [DX-XQ10] Declare the commit-time index's attributes on the demo database and backfill them, so the console's fast
// answer is visible (demo/toy/up.sh with DEMO_CROSS_INDEX=1, on a stack whose gateways run TX2_CROSS_INDEX=1).
//   node examples/demo-mcp/src/declare-index.ts demo/console/index-declaration.json
// Idempotent: when every attribute of the file is declared already, nothing is written. A declaration only grows; an
// attribute the database refuses (protected, a release writes it, a json family) is reported with the store's code.
// The backfill reads every entity once and needs a quiet window: it refuses (BackfillRaced) if a save lands meanwhile.
// Why: the owner sees the fast route on a toy without anyone typing the call. Rejected: declaring from up.sh's shell.
import { readFileSync } from "node:fs";
import { DatomicHttpError, type CrossIndexDeclaration } from "@triplex-build/triplex-datomic";
import { Demo } from "./store.ts";

const file = process.argv[2];
if (!file) throw new Error("usage: declare-index.ts <declaration.json>");
const wanted = JSON.parse(readFileSync(file, "utf8")) as CrossIndexDeclaration;
const demo = new Demo();
try {
  const state = await demo.reader.indexDeclaration(demo.db);
  const have = state.declaration?.attributes ?? [];
  const missing = wanted.attributes.filter((a) => !have.some((h) => h.attribute === a.attribute));
  if (!missing.length) {
    console.log(`INDEX ALREADY DECLARED: ${have.length} attributes, epochs ${JSON.stringify(state.epochs)}`);
  } else {
    const used = new Set(have.map((h) => h.code));
    const declaration: CrossIndexDeclaration = { version: 1, attributes: [...have, ...missing.filter((a) => !used.has(a.code))], ...(state.declaration?.types ? { types: state.declaration.types } : {}) };
    await demo.writer.declareIndexes(demo.db, declaration);
    const t0 = performance.now();
    const b = await demo.writer.backfillIndex(demo.db, {});
    console.log(`INDEX DECLARED: ${declaration.attributes.map((a) => a.attribute).join(", ")}; backfill sealed ${b.sealed}, ${b.entities} entities, ${b.added} entries added, ${b.batches} batches, ${Math.round(performance.now() - t0)} ms (diagnostic)`);
  }
} catch (error) {
  console.log(`INDEX NOT DECLARED: ${error instanceof DatomicHttpError ? `${error.code}: ${error.message}` : String(error)}`);
  process.exitCode = 1;
} finally {
  demo.close();
}
