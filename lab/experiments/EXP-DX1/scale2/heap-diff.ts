// [DX-SCALE2] What a process holds per enrolled publishing account: two V8 heap snapshots (before and after enrolment)
// aggregated by constructor name (count and self bytes), the difference sorted by bytes.
//   node --max-old-space-size=8192 --experimental-transform-types lab/experiments/EXP-DX1/scale2/heap-diff.ts BEFORE AFTER ACCOUNTS
import fs from "node:fs";

type Agg = Map<string, { count: number; bytes: number }>;
function aggregate(file: string): Agg {
  const snap = JSON.parse(fs.readFileSync(file, "utf8"));
  const fields: string[] = snap.snapshot.meta.node_fields;
  const types: string[] = snap.snapshot.meta.node_types[0];
  const width = fields.length, iType = fields.indexOf("type"), iName = fields.indexOf("name"), iSize = fields.indexOf("self_size");
  const nodes: number[] = snap.nodes, strings: string[] = snap.strings;
  const out: Agg = new Map();
  for (let k = 0; k < nodes.length; k += width) {
    const type = types[nodes[k + iType]!]!;
    const name = type === "object" || type === "closure" ? type + ":" + strings[nodes[k + iName]!] : type;
    const e = out.get(name) ?? { count: 0, bytes: 0 };
    e.count++;
    e.bytes += nodes[k + iSize]!;
    out.set(name, e);
  }
  return out;
}
const [before, after, accounts] = process.argv.slice(2);
const a = aggregate(before!), b = aggregate(after!), n = Number(accounts);
const rows = [...b].map(([name, v]) => {
  const w = a.get(name) ?? { count: 0, bytes: 0 };
  return { name, count: v.count - w.count, bytes: v.bytes - w.bytes };
}).sort((x, y) => y.bytes - x.bytes);
const total = rows.reduce((s, r) => s + r.bytes, 0);
console.log(JSON.stringify({ accounts: n, totalBytes: total, bytesPerAccount: Math.round(total / n),
  top: rows.slice(0, 30).map((r) => ({ ...r, perAccount: { count: Math.round(r.count / n), bytes: Math.round(r.bytes / n) } })) }, null, 1));
