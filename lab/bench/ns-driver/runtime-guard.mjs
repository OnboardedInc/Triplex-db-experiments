// [EXP-NSR-R3] Why: unresolved computed or reflective imports must fail during execution even when absent from the bundler graph. Rejected: treating build-time resolution alone as runtime containment.
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { registerHooks } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
const manifestFile = process.env.NSR_BUNDLE_MANIFEST;
if (!process.permission || !manifestFile) throw Error("NSR requires the permission-model launcher");
if (process.permission.has("child") || process.permission.has("worker"))
  throw Error("NSR child/worker permission refused");
const root = path.dirname(fs.realpathSync(manifestFile)),
  manifest = JSON.parse(fs.readFileSync(manifestFile, "utf8"));
const entry = path.join(root, manifest.entry);
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
if (
  manifest.schema !== "ns-driver-bundle/2" ||
  manifest.entry !== "driver.mjs" ||
  sha(fs.readFileSync(entry)) !== manifest.bundleSha256
)
  throw Error("NSR artifact binding mismatch");
if (sha(fs.readFileSync(fileURLToPath(import.meta.url))) !== manifest.support["runtime-guard.mjs"])
  throw Error("NSR runtime guard binding mismatch");
const entryURL = pathToFileURL(fs.realpathSync(entry)).href;
const externals = new Set(manifest.externals);
function check(url) {
  if (url.startsWith("node:")) {
    if (!externals.has(url)) throw Error("NSR module outside graph: " + url);
    return;
  }
  if (url !== entryURL) throw Error("NSR module outside graph: " + url);
}
registerHooks({
  resolve(specifier, context, next) {
    const resolved = next(specifier, context);
    check(resolved.url);
    return resolved;
  },
  load(url, context, next) {
    check(url);
    if (url === entryURL && sha(fs.readFileSync(fileURLToPath(url))) !== manifest.bundleSha256)
      throw Error("NSR artifact changed");
    return next(url, context);
  },
});
Object.defineProperty(globalThis, Symbol.for("ns-driver-runtime/1"), {
  value: Object.freeze({ bundleSha256: manifest.bundleSha256 }),
  writable: false,
  configurable: false,
});
