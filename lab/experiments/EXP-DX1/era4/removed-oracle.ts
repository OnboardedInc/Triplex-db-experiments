// [DX-ERA4, third review T1, the owner's ruling of 2026-11-25] W0-1.2's removed values (era4/W0-REMOVED-VALUES.md)
// against the independent oracle (O-DOMAIN, lab/oracles/domain/w0.py), on the same worlds: the TS kernel and the
// Python oracle, both opted in with `removable` and `kept`, must give byte-identical outputs; and without the options
// both must give W0-1.1.2's answers (an erased marker on a document attribute is W0.E_VALUE). No gateway, on the Mac.
//   node --no-warnings --experimental-transform-types lab/experiments/EXP-DX1/era4/removed-oracle.ts OUT.json
import assert from "node:assert/strict";
import fs from "node:fs";
import { DomainOracle } from "../../../bench/lib/w0-gates.ts";
import { W0, canonical, triplexValue, worldOf, reachableRows, type WorldRow } from "../../../bench/lib/w0-world.ts";

const [outPath] = process.argv.slice(2);
assert(outPath);
const S = W0.placementId(0);
const docs = [S + "/doc:a", S + "/doc:b"];
let pos = 0;
const row = (e: string, a: string, v: unknown): WorldRow => ({
  id: "r" + ++pos, entityId: e, attribute: a, value: triplexValue(a, v), position: 3, validFrom: 0,
});
const erased = (e: string, a: string): WorldRow => ({
  id: "r" + ++pos, entityId: e, attribute: a, value: { type: "erased", erasedAt: Date.parse("2026-01-02T00:00:00Z") }, position: 4, validFrom: 0,
});
// two documents: one expired at the population's valid time, one not (both of a tracked type)
const base = () => [
  row(S, "bgcStatus", "clear"), row(S, "weeklyMinutes", 2400), row(S, "location", "loc:b4"), row(S, "payRateCents", 1660),
  row(S, "baselinePayRateCents", 1660), row(S, "documents", docs[0]), row(S, "documents", docs[1]),
  row("loc:b4", "jurisdiction", "jur:b4"), row("loc:b4", "localMinWageCents", 1700), row("jur:b4", "stateMinWageCents", 1650),
  row(docs[0]!, "docType", "ead"), row(docs[0]!, "expiresOn", "2025-12-29"),
  row(docs[1]!, "docType", "visa"), row(docs[1]!, "expiresOn", "2027-08-15"),
];
const remove = (rows: WorldRow[], e: string, a: string) => rows.map((r) => (r.entityId === e && r.attribute === a ? erased(e, a) : r));
const basis = { tx: 9, validTime: W0.POPULATION_VALID_TIME };
const removable = [...W0.REMOVABLE_ATTRIBUTES];
const expiredId = (d: string) => {
  // the work item id of DOCEXP's expired-document notice for document d (SPEC 8.4), taken from the kept world itself
  const o = W0.evaluateWorld(worldOf(S, reachableRows([S], base())), W0.R1, basis);
  assert(!W0.isFailure(o));
  return o.workItems.find((w) => w.key === d && w.kind === "notify.document-expired")?.id;
};
const held0 = expiredId(docs[0]!);
assert(held0 && !expiredId(docs[1]!), "document a is expired and document b is not");
type Case = { label: string; rows: WorldRow[]; options?: W0.EvaluateOptions };
const cases: Case[] = [
  { label: "kept world, no options (W0-1.1.2)", rows: base() },
  { label: "kept world, options named, nothing removed (W0-1.1.2's answer)", rows: base(), options: { removable } },
  { label: "a's expiry removed, no options: W0.E_VALUE (W0-1.1.2)", rows: remove(base(), docs[0]!, "expiresOn") },
  { label: "a's expiry removed, a's notice kept", rows: remove(base(), docs[0]!, "expiresOn"), options: { removable, kept: [held0] } },
  { label: "a's expiry removed, nothing kept (the notice had not been recorded)", rows: remove(base(), docs[0]!, "expiresOn"), options: { removable } },
  { label: "a's type removed, a's notice kept", rows: remove(base(), docs[0]!, "docType"), options: { removable, kept: [held0] } },
  { label: "a's type and expiry removed, kept", rows: remove(remove(base(), docs[0]!, "docType"), docs[0]!, "expiresOn"), options: { removable, kept: [held0] } },
  { label: "b's expiry removed (not expired at the removal), nothing kept", rows: remove(base(), docs[1]!, "expiresOn"), options: { removable } },
  { label: "both removed, a kept", rows: remove(remove(base(), docs[0]!, "expiresOn"), docs[1]!, "expiresOn"), options: { removable, kept: [held0] } },
  { label: "removable names payRateCents: W0.E_VALUE", rows: base(), options: { removable: ["payRateCents"] } },
  { label: "kept holds a malformed id: W0.E_VALUE", rows: base(), options: { removable, kept: ["wi:nothex"] } },
  { label: "a removed value on payRateCents: W0.E_VALUE", rows: remove(base(), S, "payRateCents"), options: { removable } },
];
const oracle = new DomainOracle();
const out: unknown[] = [];
let agree = 0;
for (const release of ["R1", "R2"] as const) {
  for (const c of cases) {
    const world = worldOf(S, reachableRows([S], c.rows));
    const k = W0.evaluateWorld(world, W0[release], basis, c.options);
    const kernel = W0.isFailure(k) ? canonical(k) : W0.outputJson(k);
    const raw = await oracle.call("evaluate", { world, release, basis, ...(c.options ?? {}) });
    const same = canonical(JSON.parse(kernel)) === canonical(JSON.parse(raw));
    agree += Number(same);
    const o = JSON.parse(kernel);
    out.push({
      release, case: c.label, agree: same,
      result: o.error ?? {
        docexp: o.trace.filter((t: { rule: string }) => t.rule === "DOCEXP").map((t: { key: string; row: number }) => [t.key, t.row]),
        tasks: o.tasks.filter((t: { rule: string }) => t.rule === "DOCEXP").map((t: { kind: string; id: string }) => t.kind + " " + t.id.split("#")[2]),
        work: o.workItems.filter((w: { rule: string }) => w.rule === "DOCEXP").map((w: { key: string; payload: unknown }) => [w.key, w.payload]),
      },
      ...(same ? {} : { kernel, oracle: raw }),
    });
  }
}
oracle.close();
fs.writeFileSync(outPath, JSON.stringify(out, null, 1));
for (const o of out) console.log(JSON.stringify(o));
console.log(JSON.stringify({ kind: "verdict", cases: out.length, agree }));
process.exit(agree === out.length ? 0 : 1);
