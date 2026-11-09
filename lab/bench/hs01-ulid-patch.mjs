// [EXP-HS01-R3] Why: production ids are monotonic ULIDs (16-byte blobs), the W0 seed's deterministic generator is not. The ULID-shaped
// diagnostic seeds the same W0 workload with core's deterministic triple and transaction ids replaced by canonical Crockford ULIDs that
// increase by one per call (a monotonic factory inside one millisecond). The patch is applied to packages/core/dist only for the seed run,
// then restored from the saved original and hash-checked. Rejected: editing core source (the product must not change for a diagnostic).
// usage: node lab/bench/hs01-ulid-patch.mjs apply|restore <state.json>
import fs from "node:fs";
import { createHash } from "node:crypto";
const [mode, state] = process.argv.slice(2);
const file = "packages/core/dist/store/RuntimeServices.js";
const sha = (b) => createHash("sha256").update(b).digest("hex");
const from =
  'return `${(hash >>> 0).toString(36).toUpperCase().padStart(8, "0")}${value.toString(36).toUpperCase().padStart(18, "0")}`;';
const to =
  'let n = (BigInt(hash >>> 0) << 88n) + 0x2468ace13579bdf02468ace1n + BigInt(value); let out = ""; for (let i = 0; i < 26; i++, n >>= 5n) out = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"[Number(n & 31n)] + out; return out;';
if (mode === "apply") {
  if (fs.existsSync(state)) throw Error("state exists: restore first");
  const original = fs.readFileSync(file, "utf8");
  if (original.split(from).length !== 2) throw Error("generator line not found exactly once");
  fs.writeFileSync(state + ".original", original);
  fs.writeFileSync(file, original.replace(from, to));
  fs.writeFileSync(
    state,
    JSON.stringify(
      { file, originalSha256: sha(original), patchedSha256: sha(fs.readFileSync(file)) },
      null,
      2,
    ),
  );
} else if (mode === "restore") {
  const s = JSON.parse(fs.readFileSync(state, "utf8"));
  fs.writeFileSync(file, fs.readFileSync(state + ".original"));
  const now = sha(fs.readFileSync(file));
  if (now !== s.originalSha256) throw Error("restore hash mismatch " + now);
  fs.writeFileSync(state, JSON.stringify({ ...s, restoredSha256: now, restored: true }, null, 2));
  console.log("restored", now);
} else throw Error("usage: apply|restore state.json");
