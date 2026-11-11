import { registerHooks } from "node:module";
import assert from "node:assert/strict";
import { tests } from "../r1/corpus-assert.ts";
import { corpusStats } from "./corpus-adapter.ts";
process.env.DATOMIC_INTEGRATION = "1";
assert.match(process.env.DATOMIC_URL ?? "", /^http:\/\/tx2-dxr2-[a-z0-9-]+-gw-w:8080$/);
process.env.DATOMIC_GATEWAY_URL = process.env.DATOMIC_URL;
process.env.DX_B5_SCENARIOS = "300";
process.env.DX_B5_SCENARIO_START = "0";
// [DX-R1] Why: reuse the actual corpus file against emitted package code inside the existing generator image.
// Rejected: copying source, downloading Linux Vitest bindings, or modifying the package corpus itself.
registerHooks({
  resolve(specifier, context, next) {
    if (specifier === "vitest")
      return { url: new URL("../r1/corpus-assert.ts", import.meta.url).href, shortCircuit: true };
    if (
      context.parentURL?.endsWith("/layout-differential.test.ts") &&
      specifier === "../src/DatomicStorageAdapter.js"
    )
      return { url: new URL("./corpus-adapter.ts", import.meta.url).href, shortCircuit: true };
    if (context.parentURL?.includes("/packages/datomic/test/") && specifier.startsWith("../src/"))
      return next(
        new URL(specifier.replace("../src/", "../dist/"), context.parentURL).href,
        context,
      );
    return next(specifier, context);
  },
});
const corpusPath = "../../../../packages/datomic/test/layout-differential.test.ts";
await import(corpusPath);
const selected = tests.filter((test) => test.name.includes("300 deterministic scenarios"));
assert.equal(selected.length, 1);
for (const test of process.argv.includes("--corpus-dry-run") ? [] : selected) {
  let timer: ReturnType<typeof setTimeout>;
  try {
    await Promise.race([
      test.run(),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error("Corpus timeout")), test.timeout);
      }),
    ]);
  } catch (error) {
    console.log(
      JSON.stringify({ kind: "replica-corpus-incomplete", ...corpusStats, error: String(error) }),
    );
    throw error;
  } finally {
    clearTimeout(timer!);
  }
}
if (process.argv.includes("--corpus-dry-run")) {
  console.log(
    JSON.stringify({ kind: "corpus-loader-ready", tests: selected.map((test) => test.name) }),
  );
} else {
  assert(corpusStats.worlds > 0);
  assert.equal(corpusStats.supportedScopes, 300);
  assert.equal(corpusStats.unsupportedLegacy, 300);
  corpusStats.completedScopes = corpusStats.supportedScopes - corpusStats.unsupportedPositions;
  console.log(JSON.stringify({ kind: "replica-corpus-equality", ...corpusStats }));
}
