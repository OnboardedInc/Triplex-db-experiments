// [EXP-HS01-R3] Why: round 3 evidence index and checksum manifests, written after every attempt has finished.
// Rejected: hashing while a run is still writing (the manifest would not describe the final bytes).
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
const durable = "/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-HS01";
const here = path.dirname(new URL(import.meta.url).pathname);
const sha = (file) => {
  const hash = createHash("sha256"),
    fd = fs.openSync(file, "r"),
    buffer = Buffer.alloc(8 * 1024 * 1024);
  try {
    for (let n; (n = fs.readSync(fd, buffer, 0, buffer.length, null)); )
      hash.update(buffer.subarray(0, n));
  } finally {
    fs.closeSync(fd);
  }
  return hash.digest("hex");
};
const walk = (dir, out = []) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isSymbolicLink()) out.push({ path: p, link: fs.readlinkSync(p) });
    else if (e.isDirectory()) walk(p, out);
    else if (e.isFile()) out.push({ path: p });
  }
  return out;
};
const roots = fs.readdirSync(durable).filter((d) => d.startsWith("r3-"));
const attempts = {};
const lines = [];
for (const root of roots) {
  const full = path.join(durable, root);
  if (!fs.statSync(full).isDirectory()) {
    lines.push(sha(full) + "  " + root);
    continue;
  }
  for (const f of walk(full)) {
    const rel = path.relative(durable, f.path);
    lines.push((f.link ? "LINK:" + f.link : sha(f.path)) + "  " + rel);
  }
  const receipt = path.join(full, "receipt.json");
  if (fs.existsSync(receipt)) {
    const r = JSON.parse(fs.readFileSync(receipt, "utf8"));
    attempts[root] = {
      label: r.label,
      command: r.command,
      head: r.head,
      start: r.start,
      end: r.end,
      result: r.result,
      sourceStillMatches: r.sourceStillMatches,
      receiptSha256: sha(receipt),
    };
  }
  const manifest = path.join(full, "seed-manifest.json");
  if (fs.existsSync(manifest)) {
    const m = JSON.parse(fs.readFileSync(manifest, "utf8"));
    attempts[root] = {
      seed: m.N,
      status: m.status,
      sizeVerdict: m.sizeVerdict,
      assertions: m.assertions,
      logicalBytes: m.logicalBytes,
      bytesPerAssertion: m.bytesPerAssertion,
      manifestSha256: sha(manifest),
    };
  }
}
lines.sort((a, b) => a.split("  ")[1].localeCompare(b.split("  ")[1]));
fs.writeFileSync(path.join(durable, "SHA256SUMS-r3.durable"), lines.join("\n") + "\n");
fs.writeFileSync(
  path.join(here, "evidence-r3.json"),
  JSON.stringify(
    {
      durableRoot: durable,
      series: process.argv[2],
      files: lines.length,
      attempts,
      verification:
        "cd durableRoot; shasum -a 256 -c /absolute/path/to/repo/lab/experiments/EXP-HS01/SHA256SUMS-r3 (the durable manifest line); then shasum -a 256 -c SHA256SUMS-r3.durable",
    },
    null,
    2,
  ) + "\n",
);
const key = [
  ["SHA256SUMS-r3.durable", path.join(durable, "SHA256SUMS-r3.durable")],
  ["evidence-r3.json", path.join(here, "evidence-r3.json")],
];
fs.writeFileSync(
  path.join(here, "SHA256SUMS-r3"),
  key
    .map(
      ([name, file]) =>
        sha(file) +
        "  " +
        (name === "evidence-r3.json" ? "lab/experiments/EXP-HS01/evidence-r3.json" : name),
    )
    .join("\n") + "\n",
);
console.log(JSON.stringify({ files: lines.length, attempts: Object.keys(attempts).length }));
