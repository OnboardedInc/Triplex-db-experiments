import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
// [DX-H5] Why: bind bulky durable evidence after cleanup while keeping each committed manifest under 1 MB.
// Rejected: importing raw worlds into git or hashing files that a measurement is still writing.
const root = "/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-H5";
const target = path.dirname(new URL(import.meta.url).pathname);
const inventory = JSON.parse(fs.readFileSync(path.join(root, "final-inventory.json"), "utf8"));
if (
  inventory.containers.length ||
  inventory.networks.length ||
  Date.now() - Date.parse(inventory.observedAt) > 300000
)
  throw Error("fresh empty own-container/network inventory required");
const lock = "/Users/sam/Claude/Projects/triplex-db-2/locks/measure/owner.json";
if (fs.existsSync(lock) && JSON.parse(fs.readFileSync(lock, "utf8")).id === "DX-H5")
  throw Error("measurement still owns lease");
const files = [];
const walk = (dir) => {
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, item.name);
    if (item.isDirectory()) {
      if (
        item.name.startsWith("tx2-dxh5-") &&
        fs.existsSync(path.join(full, "arguments.json")) &&
        !fs.existsSync(path.join(full, "exit.json"))
      )
        throw Error("attempt not terminal: " + item.name);
      walk(full);
    } else if (item.isFile() && full !== path.join(root, "SHA256SUMS")) files.push(full);
    else if (!item.isFile()) throw Error("non-file evidence: " + full);
  }
};
walk(root);
const result = [];
for (const file of files.sort()) {
  const before = fs.statSync(file),
    hash = createHash("sha256");
  for await (const bytes of fs.createReadStream(file)) hash.update(bytes);
  const after = fs.statSync(file);
  if (before.size !== after.size || before.mtimeMs !== after.mtimeMs)
    throw Error("evidence changed: " + file);
  const relative = path.relative(root, file);
  if (/[\n\r\\]/.test(relative)) throw Error("unsupported checksum path");
  result.push(hash.digest("hex") + "  " + relative + "\n");
}
if (fs.existsSync(path.join(root, "SHA256SUMS"))) throw Error("refuse to overwrite final manifest");
fs.writeFileSync(path.join(root, "SHA256SUMS"), result.join(""), { flag: "wx" });
let part = "",
  n = 0;
const chunks = [];
const flush = () => {
  if (!part) return;
  const name = "SHA256SUMS.part-" + String(++n).padStart(3, "0");
  fs.writeFileSync(path.join(target, name), part, { flag: "wx" });
  chunks.push(createHash("sha256").update(part).digest("hex") + "  " + name + "\n");
  part = "";
};
for (const row of result) {
  if (Buffer.byteLength(part) + Buffer.byteLength(row) > 750000) flush();
  part += row;
}
flush();
fs.writeFileSync(path.join(target, "SHA256SUMS"), chunks.join(""), { flag: "wx" });
console.log(
  JSON.stringify({
    files: files.length,
    bytes: files.reduce((n, f) => n + fs.statSync(f).size, 0),
    parts: n,
    root,
  }),
);
