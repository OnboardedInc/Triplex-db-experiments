import fs from "node:fs";
import path from "node:path";
// [DX-H5] Why: distinguish admission wait from measured work using actual current owner bytes.
// Rejected: reconstructing past lock ownership from a later successful run.
const root = "/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-H5";
const ownerFile = "/Users/sam/Claude/Projects/triplex-db-2/locks/measure/owner.json";
const row = { observedAt: new Date().toISOString() };
try {
  row.ownerBytes = fs.readFileSync(ownerFile, "utf8");
  row.owner = JSON.parse(row.ownerBytes);
  row.ownerMtimeMs = fs.statSync(ownerFile).mtimeMs;
  if (row.owner.id === "DX-H5" && /^tx2-dxh5-[a-z0-9-]+$/.test(row.owner.prefix)) {
    const out = path.join(root, row.owner.prefix, "owner-observed.json");
    if (!fs.existsSync(out)) fs.writeFileSync(out, JSON.stringify(row, null, 2) + "\n");
  }
} catch (error) {
  row.error = String(error);
}
fs.appendFileSync(path.join(root, "admission.ndjson"), JSON.stringify(row) + "\n");
console.log(JSON.stringify(row));
