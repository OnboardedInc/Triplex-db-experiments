// EXP-F02b: before/after counts of the wire falsifier per engine and kind.
// Usage: node summarize.mjs BEFORE.json AFTER.json [AFTER2.json ...]
// Several AFTER files (one run per engine) are merged: each contributes its own engines' records.
import { readFileSync } from "node:fs";

const [beforePath, ...afterPaths] = process.argv.slice(2);
const load = (path) => JSON.parse(readFileSync(path, "utf8"));
const before = load(beforePath).results;
const after = afterPaths.flatMap((path) => {
  const file = load(path);
  const engines = new Set(file.sectionsThisRun ?? []);
  const own = (r) =>
    engines.size === 0 || r.engine === "spec" || [...engines].some((s) => s.startsWith(r.engine));
  return file.results.filter(own);
});
// Spec records appear once per AFTER file; keep one copy.
const dedupe = (records) => {
  const seen = new Set();
  return records.filter((r) => {
    if (r.engine !== "spec") return true;
    const key = `${r.path}|${r.caseId}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const BAD = (v) =>
  v.startsWith("critical") || v.startsWith("spec-gap") || v === "spec-wrong" || v === "spec-claims-exact-but-rejected";
const tally = (records) => {
  const out = {};
  for (const r of records) {
    if (!BAD(r.verdict)) continue;
    const key = `${r.engine} ${r.kind}`;
    out[key] ??= {};
    out[key][r.verdict] = (out[key][r.verdict] ?? 0) + 1;
  }
  return out;
};
const totals = (records) => {
  const out = {};
  for (const r of records) out[r.verdict] = (out[r.verdict] ?? 0) + 1;
  return out;
};
const a = dedupe(after);
const tb = tally(before);
const ta = tally(a);
const keys = [...new Set([...Object.keys(tb), ...Object.keys(ta)])].sort();
console.log("engine kind".padEnd(22), "before".padEnd(60), "after");
for (const key of keys)
  console.log(key.padEnd(22), JSON.stringify(tb[key] ?? {}).padEnd(60), JSON.stringify(ta[key] ?? {}));
console.log("\nall verdicts before:", JSON.stringify(totals(before)));
console.log("all verdicts after: ", JSON.stringify(totals(a)));
console.log(`records before ${before.length}, after ${a.length}`);
for (const r of a.filter((x) => BAD(x.verdict)))
  console.log("REMAINING", r.engine, r.path, r.kind, r.caseId, r.verdict, (r.how ?? r.error ?? "").slice(0, 160));
