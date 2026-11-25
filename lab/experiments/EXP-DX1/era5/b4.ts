// [DX-ERA5, second review] DX-ERA4's B4 fix (`actv-lazy/decision.ts` `withoutRemoved`): with TX2_DERIVED_SEAL=1 a
// removed value other than `ssn` is dropped from the world before evaluation (W0 itself refuses such a world with
// W0.E_VALUE). What does a subject owe after its document type or expiry date is removed, against the independent oracle
// (bench/lib/w0-oracle.py) on the same worlds? No gateway: the TS kernel and the Python oracle, on the Mac.
//   node --no-warnings --experimental-transform-types lab/experiments/EXP-DX1/era5/b4.ts OUT.json
import assert from "node:assert/strict";
import fs from "node:fs";
import { DomainOracle } from "../../../bench/lib/w0-gates.ts";
import { W0, canonical, triplexValue, worldOf, reachableRows, type WorldRow } from "../../../bench/lib/w0-world.ts";
import { withoutRemoved } from "../actv-lazy/decision.ts";

const [outPath] = process.argv.slice(2);
assert(outPath);
process.env.TX2_DERIVED_SEAL = "1";
const S = W0.placementId(0);
const doc = S + "/doc:a";
let pos = 0;
const row = (e: string, a: string, v: unknown): WorldRow => ({
  id: "r" + ++pos, entityId: e, attribute: a, value: triplexValue(a, v), position: 3, validFrom: 0,
});
const erased = (e: string, a: string): WorldRow => ({
  id: "r" + ++pos, entityId: e, attribute: a, value: { type: "erased", erasedAt: Date.parse("2026-01-02T00:00:00Z") }, position: 3, validFrom: 0,
});
const base = (type: string, expires: string) => [
  row(S, "bgcStatus", "clear"), row(S, "weeklyMinutes", 2400), row(S, "location", "loc:b4"), row(S, "payRateCents", 1660),
  row(S, "baselinePayRateCents", 1660), row(S, "documents", doc),
  row("loc:b4", "jurisdiction", "jur:b4"), row("loc:b4", "localMinWageCents", 1700), row("jur:b4", "stateMinWageCents", 1650),
  row(doc, "docType", type), row(doc, "expiresOn", expires),
];
const variants: Record<string, (t: string, x: string) => WorldRow[]> = {
  "kept": (t, x) => base(t, x),
  "both removed (B4: dropped)": (t, x) => withoutRemoved(base(t, x).map((r) => (r.entityId === doc && r.attribute !== "documents" ? erased(doc, r.attribute) : r))),
  "both removed (W0: erased markers)": (t, x) => base(t, x).map((r) => (r.entityId === doc ? erased(doc, r.attribute) : r)),
  "expiry removed (B4)": (t, x) => withoutRemoved(base(t, x).map((r) => (r.entityId === doc && r.attribute === "expiresOn" ? erased(doc, r.attribute) : r))),
  "type removed (B4)": (t, x) => withoutRemoved(base(t, x).map((r) => (r.entityId === doc && r.attribute === "docType" ? erased(doc, r.attribute) : r))),
  "never had a document (control)": (t, x) => base(t, x).filter((r) => r.entityId !== doc && r.attribute !== "documents"),
};
const cases: [string, string][] = [["visa", "2026-02-13"], ["ead", "2025-12-29"], ["ead", "2027-08-15"], ["passport", "2026-01-10"]];
const basis = { tx: 9, validTime: W0.POPULATION_VALID_TIME };
const oracle = new DomainOracle();
const out: unknown[] = [];
const summary = (o: unknown) => {
  if (W0.isFailure(o as never)) return { failure: (o as { error?: string }).error };
  const items = (o as { workItems: { kind: string; rule: string; payload: string }[] }).workItems;
  return items.map((w) => `${w.rule}:${w.kind}`).sort();
};
for (const [type, expires] of cases) {
  for (const [label, make] of Object.entries(variants)) {
    const rows = make(type, expires);
    const world = worldOf(S, reachableRows([S], rows));
    let kernel: unknown, oracleOut: unknown;
    try { kernel = summary(W0.evaluateWorld(world, W0.R1, basis)); } catch (e) { kernel = { threw: String((e as Error).message).slice(0, 120) }; }
    try {
      const raw = await oracle.call("evaluate", { world, release: "R1", basis });
      const parsed = JSON.parse(raw);
      oracleOut = parsed.workItems ? parsed.workItems.map((w: { kind: string; rule: string }) => `${w.rule}:${w.kind}`).sort() : parsed;
    } catch (e) { oracleOut = { threw: String((e as Error).message).slice(0, 120) }; }
    out.push({ document: `${type} expiring ${expires}`, variant: label, kernel, oracle: oracleOut, agree: canonical(kernel) === canonical(oracleOut) });
  }
}
oracle.close();
fs.writeFileSync(outPath, JSON.stringify(out, null, 1));
for (const o of out) console.log(JSON.stringify(o));
