// [CX-VHS01-R3] Why: retain and read back all observations after writers stop, including failed attempts. Rejected: bulky Git evidence or a checksum described as semantic proof.
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
const root = "/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VHS01/round3";
const sha = (b) => createHash("sha256").update(b).digest("hex");
const hashFile = async (p) => {
  const h = createHash("sha256");
  for await (const b of fs.createReadStream(p)) h.update(b);
  return h.digest("hex");
};
const pins = new Set();
function scan(x) {
  if (!x || typeof x !== "object") return;
  if (typeof x.path === "string" && /^[0-9a-f]{64}$/.test(x.sha256)) pins.add(x.path);
  for (const [k, v] of Object.entries(x)) {
    if (k.includes("/") && typeof v === "string" && /^[0-9a-f]{64}$/.test(v)) pins.add(k);
    scan(v);
  }
}
scan(JSON.parse(fs.readFileSync("lab/acceptance/obligations.json", "utf8")));
const moved = [];
for (const p of [...pins].sort()) {
  const old = sha(execFileSync("git", ["show", "257d4d20:" + p])),
    current = sha(fs.readFileSync(p));
  if (old !== current) moved.push({ path: p, old, current });
}
assert.equal(execFileSync("git", ["diff", "afafa7aa", "--", "packages"], { encoding: "utf8" }), "");
assert.equal(
  execFileSync("git", ["diff", "13ce4978", "--", "lab/bin", "lab/acceptance"], {
    encoding: "utf8",
  }),
  "",
);
fs.writeFileSync(
  path.join(root, "pin-audit.json"),
  JSON.stringify(
    {
      pinnedPaths: pins.size,
      moved,
      product: "afafa7aa",
      productUnchanged: true,
      evaluatorAndAcceptanceUnchanged: true,
    },
    null,
    2,
  ),
  { flag: "wx" },
);
const paths = fs.readdirSync(root, { recursive: true }).map(String).sort();
const entries = [];
for (const p of paths) {
  const full = path.join(root, p),
    stat = fs.lstatSync(full);
  if (stat.isSymbolicLink()) entries.push({ path: p, link: fs.readlinkSync(full) });
  else if (stat.isFile()) entries.push({ path: p, bytes: stat.size, sha256: await hashFile(full) });
}
for (const e of entries)
  if (e.sha256)
    assert.equal(await hashFile(path.join(root, e.path)), e.sha256, "readback " + e.path);
const manifest =
  entries.map((e) => (e.link ? "LINK:" + e.link : e.sha256) + "  " + e.path).join("\n") + "\n";
fs.writeFileSync(path.join(root, "SHA256SUMS"), manifest, { flag: "wx" });
const attempts = entries
  .filter((e) => e.path.endsWith("/receipt.json"))
  .map((e) => {
    const r = JSON.parse(fs.readFileSync(path.join(root, e.path)));
    return {
      path: path.dirname(e.path),
      head: r.head,
      command: r.command,
      start: r.start,
      end: r.end,
      result: r.result,
      sourceUnchanged: r.sourceUnchanged,
      receiptSha256: e.sha256,
    };
  });
const index = {
  format: "CX-VHS01-offline-review-round3/1",
  root,
  reviewedHead: "719f5b0e",
  product: "afafa7aa0954eedbabad359248a3dee9a9ae5c34",
  files: entries.length,
  bytes: entries.reduce((s, e) => s + (e.bytes ?? 0), 0),
  manifestSha256: sha(Buffer.from(manifest)),
  allRegularFilesReadBack: true,
  pinnedPaths: pins.size,
  movedPins: moved,
  attempts,
};
fs.writeFileSync("lab/verify/HS01/evidence-round3.json", JSON.stringify(index, null, 2) + "\n");
fs.writeFileSync(
  "lab/verify/HS01/SHA256SUMS-round3",
  sha(Buffer.from(manifest)) + "  " + path.join(root, "SHA256SUMS") + "\n",
);
console.log(
  JSON.stringify({
    files: index.files,
    bytes: index.bytes,
    pinnedPaths: pins.size,
    movedPins: moved.length,
    readback: true,
  }),
);
