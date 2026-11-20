import assert from "node:assert/strict";
import { W0, canonical, sha256 } from "../../../bench/lib/w0-world.ts";

type Due = {
  kind: "due";
  parameter: "businessDays" | "tncBusinessDays";
  date: string;
  rows: number[];
};
type Operation =
  | Due
  | { kind: "fixed" }
  | { kind: "documents"; parameter: "leadDays" }
  | { kind: "floor"; parameter: "floorSources" }
  | {
      kind: "threshold";
      parameter: "thresholdMinutes" | "thresholdCents";
      input: "minutes" | "pay-difference";
    };
type Declaration = { reads: string[]; operation: Operation };
const decision = ["S.decisions", "D.target", "D.verdict", "D.author"];
// [DX-ACT2] Why: declarations describe the row predicate, input axis and comparison once; storage executes the resulting ranges. Rejected: identifying a release by its name or hard-coding R2's three edits.
export const declarations: Record<W0.RuleId, Declaration> = {
  LIFE: { reads: ["S.startDate"], operation: { kind: "fixed" } },
  I9S1: { reads: ["S.startDate", "S.section1AttestedAt", "S.ssn"], operation: { kind: "fixed" } },
  I9S2: {
    reads: ["S.startDate", ...decision],
    operation: { kind: "due", parameter: "businessDays", date: "startDate", rows: [3, 4] },
  },
  EVSUB: {
    reads: ["S.startDate", "S.ssn", "S.everifyStatus", "S.everifySubmitResult"],
    operation: { kind: "due", parameter: "businessDays", date: "startDate", rows: [2, 3, 4, 6] },
  },
  EVSTAT: {
    reads: ["S.everifyStatus", "S.everifyStatusAt"],
    operation: { kind: "due", parameter: "tncBusinessDays", date: "everifyStatusAt", rows: [2] },
  },
  BGC: { reads: ["S.bgcStatus", ...decision], operation: { kind: "fixed" } },
  DOCEXP: {
    reads: ["S.documents", "d.docType", "d.expiresOn", "d.reverified"],
    operation: { kind: "documents", parameter: "leadDays" },
  },
  MINWAGE: {
    reads: [
      "S.startDate",
      "S.payRateCents",
      "S.location",
      "L.jurisdiction",
      "J.stateMinWageCents",
      "L.localMinWageCents",
    ],
    operation: { kind: "floor", parameter: "floorSources" },
  },
  OT: {
    reads: ["S.weeklyMinutes"],
    operation: { kind: "threshold", parameter: "thresholdMinutes", input: "minutes" },
  },
  PAYCHG: {
    reads: ["S.payRateCents", "S.baselinePayRateCents", ...decision],
    operation: { kind: "threshold", parameter: "thresholdCents", input: "pay-difference" },
  },
  PROP: { reads: decision, operation: { kind: "fixed" } },
};
export const compilerVersion = sha256(canonical(declarations));
export const parameterRules = W0.RULE_ORDER.filter(
  (r) => declarations[r].operation.kind !== "fixed",
);
export const allIndexes = () => new Set(parameterRules);
export type Location = {
  id: string;
  jurisdiction: string | null;
  local: number | null;
  state: number | null;
};
export type Posting = {
  rule: W0.RuleId;
  location: string;
  tag: string;
  value: number;
  subject: string;
  key: string;
};
export type Range = {
  rule: W0.RuleId;
  location: string;
  tag: string;
  low: number | null;
  high: number | null;
  includeLow: boolean;
  includeHigh: boolean;
};
export type Member = Pick<Posting, "rule" | "subject" | "key">;
export type CompiledLookups = { ranges: Range[]; fallback: W0.RuleId[] };
export const bucket = (p: Pick<Posting, "rule" | "location" | "tag">) =>
  canonical([p.rule, p.location, p.tag]);
export const member = (p: Member) => canonical([p.subject, p.rule, p.key]);
export const day = (value: string) => W0.parseDate(value.slice(0, 10));
const missingDate = Number.MIN_SAFE_INTEGER;
// [DX-ACT2] Why: a zero probe threshold exposes every nonzero unapproved difference. Rejected: the current release threshold (it hides tomorrow’s candidates).
const probeDoc = structuredClone(W0.R1.doc);
const probe = W0.compileRelease({
  ...probeDoc,
  rules: probeDoc.rules.map((e) =>
    e.id === "PAYCHG" ? { id: "PAYCHG", params: { thresholdCents: 0 } } : e,
  ),
});
export function describe(world: W0.World, basis: W0.Basis, available = allIndexes()) {
  const error = W0.checkBasis(basis);
  if (error) throw Error(error);
  const index = W0.indexWorld(world, basis.tx);
  if (typeof index === "string") throw Error(index);
  const trace = W0.evaluateIndexed(index, probe, basis).trace;
  const byEntity = new Map<string, Map<string, W0.Fact>>();
  for (const f of world.facts) {
    if (f.a === "answers" || f.e.includes("/ans:")) continue;
    const attrs = byEntity.get(f.e) ?? new Map();
    attrs.set(f.a, f);
    byEntity.set(f.e, attrs);
  }
  const val = (e: string, a: string) => byEntity.get(e)?.get(a)?.v;
  const s = world.subject,
    id = String(val(s, "location") ?? ""),
    jurisdiction = val(id, "jurisdiction");
  const number = (e: string, a: string) => {
    const v = val(e, a);
    return v === undefined ? null : Number(v);
  };
  const location: Location = {
    id,
    jurisdiction: jurisdiction === undefined ? null : String(jurisdiction),
    state: number(String(jurisdiction ?? ""), "stateMinWageCents"),
    local: number(id, "localMinWageCents"),
  };
  const postings: Posting[] = [];
  for (const rule of parameterRules) {
    if (!available.has(rule)) continue;
    const op = declarations[rule].operation;
    const add = (v: number, tag = "", key = "") =>
      postings.push({ rule, location: id, tag, value: v, subject: s, key });
    if (op.kind === "due") {
      const d = val(s, op.date);
      if (typeof d === "string" && op.rows.includes(trace.find((t) => t.rule === rule)!.row))
        add(day(d));
    } else if (op.kind === "documents") {
      for (const row of trace.filter((t) => t.rule === rule && t.key)) {
        const type = val(row.key, "docType"),
          expiry = val(row.key, "expiresOn");
        if (typeof type === "string" && val(row.key, "reverified") !== true)
          add(typeof expiry === "string" ? day(expiry) : missingDate, type, row.key);
      }
    } else if (op.kind === "floor") {
      const pay = number(s, "payRateCents");
      if (id && pay !== null) add(pay);
    } else if (op.kind === "threshold" && op.input === "minutes") {
      const minutes = number(s, "weeklyMinutes");
      if (minutes !== null) add(minutes);
    } else if (
      op.kind === "threshold" &&
      [4, 5].includes(trace.find((t) => t.rule === rule)!.row)
    ) {
      add(Math.abs(number(s, "payRateCents")! - number(s, "baselinePayRateCents")!));
    }
  }
  return { location, postings };
}
function effective(rel: W0.CompiledRelease, rule: W0.RuleId, l: Location): Record<string, unknown> {
  const e = rel.entries[rule];
  return (
    l.jurisdiction && e.scope?.jurisdictions.has(l.jurisdiction) ? e.scope.params : e.params
  ) as Record<string, unknown>;
}
export function derive(
  old: W0.CompiledRelease,
  next: W0.CompiledRelease,
  valid: string,
  locations: readonly Location[],
  available = allIndexes(),
): CompiledLookups {
  assert(W0.isInstant(valid), "W0.E_BASIS");
  const ranges: Range[] = [],
    fallback: W0.RuleId[] = [];
  for (const rule of W0.diff(old, next)) {
    const op = declarations[rule]?.operation;
    if (op?.kind === "fixed") continue;
    if (!op || !available.has(rule)) {
      fallback.push(rule);
      continue;
    }
    for (const loc of locations) {
      const prev = effective(old, rule, loc)[op.parameter],
        now = effective(next, rule, loc)[op.parameter];
      if (canonical(prev) === canonical(now)) continue;
      const add = (
        tag = "",
        low: number | null = null,
        high: number | null = null,
        includeLow = false,
        includeHigh = true,
      ) => ranges.push({ rule, location: loc.id, tag, low, high, includeLow, includeHigh });
      if (op.kind === "due") add();
      else if (op.kind === "threshold")
        add("", Math.min(Number(prev), Number(now)), Math.max(Number(prev), Number(now)));
      else if (op.kind === "documents") {
        const a = prev as Record<string, number>,
          b = now as Record<string, number>;
        for (const tag of new Set([...Object.keys(a), ...Object.keys(b)])) {
          if (a[tag] === b[tag]) continue;
          if (a[tag] === undefined || b[tag] === undefined) add(tag);
          else add(tag, day(valid) + Math.min(a[tag]!, b[tag]!), null, true);
        }
      } else {
        const floor = (sources: unknown) => {
          const values = (sources as string[])
            .map((k) => (k.startsWith("jurisdiction.") ? loc.state : loc.local))
            .filter((v): v is number => v !== null);
          return values.length ? Math.max(...values) : null;
        };
        const a = floor(prev),
          b = floor(now);
        if (a === b) continue;
        if (a === null || b === null) add();
        else add("", null, Math.max(a, b), false, false);
      }
    }
  }
  return { ranges, fallback };
}
export function bounds<T>(items: readonly T[], key: (v: T) => number, r: Range): [number, number] {
  function seek(n: number, after: boolean) {
    let lo = 0,
      hi = items.length;
    while (lo < hi) {
      const m = Math.floor((lo + hi) / 2),
        v = key(items[m]!);
      if (v < n || (v === n && after)) lo = m + 1;
      else hi = m;
    }
    return lo;
  }
  return [
    r.low === null ? 0 : seek(r.low, !r.includeLow),
    r.high === null ? items.length : seek(r.high, r.includeHigh),
  ];
}
export function projection(output: W0.Output) {
  const rows = new Map<string, string>();
  for (const [table, items] of [
    ["tasks", output.tasks],
    ["obligations", output.obligations],
    ["flags", output.flags],
    ["work", output.workItems],
  ] as const)
    for (const item of items) {
      const id = "id" in item ? item.id : item.name;
      const key =
        item.rule === "DOCEXP" || item.rule === "PROP"
          ? "key" in item
            ? item.key
            : (id.replace(/@due$/, "").split("#")[2] ?? "")
          : "";
      const value =
        "version" in item
          ? { rule: item.rule, kind: item.kind, key: item.key, payload: JSON.parse(item.payload) }
          : item;
      rows.set(canonical([output.subject, item.rule, key, table, id]), canonical(value));
    }
  return rows;
}
export type Difference = readonly [string, string | null, string | null];
export function differences(
  world: W0.World,
  basis: W0.Basis,
  old: W0.CompiledRelease,
  next: W0.CompiledRelease,
): Difference[] {
  const a = W0.evaluateWorld(world, old, basis),
    b = W0.evaluateWorld(world, next, basis);
  if (W0.isFailure(a) || W0.isFailure(b))
    throw Error(W0.isFailure(a) ? a.error : (b as W0.Failure).error);
  const before = projection(a),
    after = projection(b);
  return [...new Set([...before.keys(), ...after.keys()])]
    .sort()
    .filter((k) => before.get(k) !== after.get(k))
    .map((k) => [k, before.get(k) ?? null, after.get(k) ?? null]);
}
