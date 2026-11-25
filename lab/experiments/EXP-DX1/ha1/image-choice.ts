// [DX-INT4] Why: until 2026-11-24 the ha1 toy runner (diagnostic, load-* and hasync-* modes) ran on the NEWEST
// "datomic-build" event in the shared lab/locks/events.jsonl whose image was still in the lab VM, whoever built it and
// from whichever branch. Every builder appends such an event when it builds a Datomic image, so a run started after
// another builder's build used that builder's image (its /opt/gateway, /config and /opt/datomic bytes; only the gateway
// source and the codec spec are mounted from the checkout under test). The fault: a case is not a result for the
// checkout it names whenever another branch's Datomic image was built after the checkout's own and still exists.
// Now the image is chosen only if its build inputs are this checkout's: either an engine build event whose
// buildInputsSha256 equals the inputs computed from this checkout's sources and the verified distribution, or a private
// variant build (engine.mjs build --lane datomic --variant-receipt FILE) named by DX_HA1_DATOMIC_RECEIPT whose sources are
// this checkout's. Otherwise the run refuses. Rejected: "newest" (above), a mutable tag (rotated by other builders).
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export type BuildEvent = { event?: string; imageId: string; buildInputsSha256: string; at?: string };
export type Receipt = { imageId: string; buildInputsSha256: string; sourceInputsSha256: string; tag: string };
export type Chosen = { imageId: string; buildInputsSha256: string; how: "event" | "receipt"; expected: string; sources: string };

const sha256 = (text: string) => createHash("sha256").update(text).digest("hex");

/** The engine's build inputs for `root` (engine.mjs datomicSources and buildDatomic, non-variant form). */
export function checkoutInputs(root: string, distributionDir: string,
  tree: (dir: string) => unknown, fileSha: (file: string) => string) {
  const config = tree(path.join(root, "lab/config/datomic"));
  const gateway = tree(path.join(root, "packages/datomic/gateway"));
  const specFile = path.join(root, "packages/datomic/src/codec-spec.json");
  const codec = { path: "codec-spec.json", bytes: fs.statSync(specFile).size, sha256: fileSha(specFile) };
  const sources = { config, gateway, codec, sha256: sha256(JSON.stringify({ config, gateway, codec })) };
  const distribution = tree(distributionDir);
  return { sources: sources.sha256, buildInputs: sha256(JSON.stringify({ sources, distribution })) };
}

/**
 * Choose the image for this checkout. `builds` are the engine's build events (any order), `present(id)` answers the
 * image's build-inputs label or undefined when the image is absent, `receipt` a private variant receipt (already
 * checked by runtime.mjs readVariantReceipt) or undefined. Throws when nothing built from these sources is present.
 */
export function chooseDatomicImage(builds: BuildEvent[], present: (id: string) => string | undefined,
  expected: { sources: string; buildInputs: string }, receipt?: Receipt): Chosen {
  if (receipt) {
    if (receipt.sourceInputsSha256 !== expected.sources)
      throw new Error(`DX_HA1_DATOMIC_RECEIPT was built from other sources (${receipt.sourceInputsSha256.slice(0, 12)}; this checkout ${expected.sources.slice(0, 12)})`);
    if (present(receipt.imageId) !== receipt.buildInputsSha256)
      throw new Error("DX_HA1_DATOMIC_RECEIPT names an image that is absent or whose build-inputs label differs");
    return { imageId: receipt.imageId, buildInputsSha256: receipt.buildInputsSha256, how: "receipt", expected: expected.buildInputs, sources: expected.sources };
  }
  for (const b of [...builds].filter((x) => x.event === undefined || x.event === "datomic-build").reverse()) {
    if (b.buildInputsSha256 !== expected.buildInputs) continue;
    if (present(b.imageId) === b.buildInputsSha256)
      return { imageId: b.imageId, buildInputsSha256: b.buildInputsSha256, how: "event", expected: expected.buildInputs, sources: expected.sources };
  }
  throw new Error(`No Datomic image built from this checkout's sources is present (build inputs ${expected.buildInputs.slice(0, 12)}). ` +
    "Build one with: node lab/bin/engine.mjs build --lane datomic --variant-receipt NEW_FILE --holder <holder> " +
    "(DX_JAVA=21), then set DX_HA1_DATOMIC_RECEIPT=NEW_FILE");
}
