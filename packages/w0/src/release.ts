/**
 * Releases: the document, its content hash, its diff and activation (SPEC 5).
 */
import { createHash } from "node:crypto";
import { canonicalPlain } from "./json.js";

/** SPEC 5.1: the eleven rule entries in their fixed order, which is also the evaluation and trace order (SPEC 8). */
export const RULE_ORDER = [
  "LIFE",
  "I9S1",
  "I9S2",
  "EVSUB",
  "EVSTAT",
  "BGC",
  "DOCEXP",
  "MINWAGE",
  "OT",
  "PAYCHG",
  "PROP",
] as const;
export type RuleId = (typeof RULE_ORDER)[number];

export type FloorSource = "jurisdiction.stateMinWageCents" | "location.localMinWageCents";

/** The params of each rule, as the SPEC 5.1 table and `schema.json` `releaseParams` give them. */
export interface RuleParams {
  readonly LIFE: Record<string, never>;
  readonly I9S1: Record<string, never>;
  readonly I9S2: { readonly businessDays: number };
  readonly EVSUB: { readonly businessDays: number };
  readonly EVSTAT: { readonly tncBusinessDays: number };
  readonly BGC: Record<string, never>;
  readonly DOCEXP: { readonly leadDays: Readonly<Record<string, number>> };
  readonly MINWAGE: { readonly floorSources: readonly FloorSource[] };
  readonly OT: { readonly thresholdMinutes: number };
  readonly PAYCHG: { readonly thresholdCents: number };
  readonly PROP: Record<string, never>;
}

export interface RuleEntryDoc<R extends RuleId = RuleId> {
  readonly id: R;
  readonly params: RuleParams[R];
  readonly scope?: { readonly jurisdictions: readonly string[]; readonly params: RuleParams[R] };
}

export interface ReleaseDoc {
  readonly name: "R1" | "R2" | "R3";
  readonly rules: readonly RuleEntryDoc[];
  readonly world: "W0";
}

/** A rule entry ready for evaluation: SPEC 5.1 scoped entries apply `scope.params` inside the scope and `params` elsewhere. */
export interface CompiledEntry<P> {
  readonly params: P;
  readonly scope: { readonly jurisdictions: ReadonlySet<string>; readonly params: P } | null;
}

export interface CompiledRelease {
  readonly name: string;
  /** SPEC 5.2: "sha256:" + lowercase hex of SHA-256 over canonicalJson(release) */
  readonly hash: string;
  readonly doc: ReleaseDoc;
  readonly entries: { readonly [R in RuleId]: CompiledEntry<RuleParams[R]> };
  /** canonical JSON of each rule entry, for the SPEC 5.3 diff */
  readonly entryJson: { readonly [R in RuleId]: string };
}

export class ReleaseError extends Error {}

const sha256hex = (s: string): string => createHash("sha256").update(s, "utf8").digest("hex");

const isObj = (x: unknown): x is Record<string, unknown> =>
  typeof x === "object" && x !== null && !Array.isArray(x);
const hasExactKeys = (x: Record<string, unknown>, keys: readonly string[]): boolean => {
  const own = Object.keys(x);
  return (
    own.length === keys.length && keys.every((k) => Object.prototype.hasOwnProperty.call(x, k))
  );
};
const isIntIn = (x: unknown, lo: number, hi: number): boolean =>
  typeof x === "number" && Number.isSafeInteger(x) && x >= lo && x <= hi;

const FLOOR_SOURCES: readonly FloorSource[] = [
  "jurisdiction.stateMinWageCents",
  "location.localMinWageCents",
];
const DOC_TYPES = ["passport", "ead", "visa"];
const JUR_ID = /^jur:[a-z0-9-]{1,32}$/;

/** Checks one rule's params object against the SPEC 5.1 table (`schema.json` releaseParams). */
function checkParams(id: RuleId, p: unknown): boolean {
  if (!isObj(p)) return false;
  switch (id) {
    case "LIFE":
    case "I9S1":
    case "BGC":
    case "PROP":
      return hasExactKeys(p, []);
    case "I9S2":
    case "EVSUB":
      return hasExactKeys(p, ["businessDays"]) && isIntIn(p["businessDays"], 1, 10);
    case "EVSTAT":
      return hasExactKeys(p, ["tncBusinessDays"]) && isIntIn(p["tncBusinessDays"], 1, 20);
    case "DOCEXP": {
      if (!hasExactKeys(p, ["leadDays"])) return false;
      const lead = p["leadDays"];
      return (
        isObj(lead) &&
        Object.entries(lead).every(([k, v]) => DOC_TYPES.includes(k) && isIntIn(v, 0, 365))
      );
    }
    case "MINWAGE": {
      if (!hasExactKeys(p, ["floorSources"])) return false;
      const fs = p["floorSources"];
      // non-empty, distinct, ascending, from the two sources
      return (
        Array.isArray(fs) &&
        fs.length >= 1 &&
        fs.every(
          (s, k) =>
            FLOOR_SOURCES.includes(s as FloorSource) &&
            (k === 0 || (fs[k - 1] as string) < (s as string)),
        )
      );
    }
    case "OT":
      return hasExactKeys(p, ["thresholdMinutes"]) && isIntIn(p["thresholdMinutes"], 0, 10080);
    case "PAYCHG":
      return (
        hasExactKeys(p, ["thresholdCents"]) && isIntIn(p["thresholdCents"], 0, 9007199254740991)
      );
  }
}

/** Validates a release document against SPEC 5.1 and compiles it; throws ReleaseError on any departure. */
export function compileRelease(doc: ReleaseDoc): CompiledRelease {
  const d: unknown = doc;
  if (!isObj(d) || !hasExactKeys(d, ["name", "rules", "world"]))
    throw new ReleaseError("release keys");
  if (d["world"] !== "W0") throw new ReleaseError("release world");
  if (d["name"] !== "R1" && d["name"] !== "R2" && d["name"] !== "R3")
    throw new ReleaseError("release name");
  const rules = d["rules"];
  if (!Array.isArray(rules) || rules.length !== RULE_ORDER.length)
    throw new ReleaseError("release rules");
  const entries: Record<string, CompiledEntry<unknown>> = {};
  const entryJson: Record<string, string> = {};
  RULE_ORDER.forEach((id, k) => {
    const e: unknown = rules[k];
    if (!isObj(e) || e["id"] !== id) throw new ReleaseError(`rule ${k} must be ${id}`);
    const scoped = Object.prototype.hasOwnProperty.call(e, "scope");
    if (!hasExactKeys(e, scoped ? ["id", "params", "scope"] : ["id", "params"]))
      throw new ReleaseError(`${id} keys`);
    if (!checkParams(id, e["params"])) throw new ReleaseError(`${id} params`);
    let scope: CompiledEntry<unknown>["scope"] = null;
    if (scoped) {
      // SPEC 5.1: scope.jurisdictions is a non-empty array of distinct jurisdiction ids in ascending order, and scope.params
      // has the same keys and types as params.
      const s = e["scope"];
      if (!isObj(s) || !hasExactKeys(s, ["jurisdictions", "params"]))
        throw new ReleaseError(`${id} scope keys`);
      const js = s["jurisdictions"];
      if (
        !Array.isArray(js) ||
        js.length === 0 ||
        !js.every(
          (j, n) =>
            typeof j === "string" && JUR_ID.test(j) && (n === 0 || (js[n - 1] as string) < j),
        )
      )
        throw new ReleaseError(`${id} scope jurisdictions`);
      if (!checkParams(id, s["params"])) throw new ReleaseError(`${id} scope params`);
      scope = { jurisdictions: new Set(js as string[]), params: s["params"] };
    }
    entries[id] = { params: e["params"], scope };
    entryJson[id] = canonicalPlain(e);
  });
  const canonical = canonicalPlain(doc);
  return {
    name: doc.name,
    hash: "sha256:" + sha256hex(canonical),
    doc,
    entries: entries as unknown as CompiledRelease["entries"],
    entryJson: entryJson as unknown as CompiledRelease["entryJson"],
  };
}

/** SPEC 5.3: the rule ids, in release order, whose entries have different canonical JSON in A and B. */
export function diff(a: CompiledRelease, b: CompiledRelease): RuleId[] {
  return RULE_ORDER.filter((id) => a.entryJson[id] !== b.entryJson[id]);
}

const p = <R extends RuleId>(id: R, params: RuleParams[R]): RuleEntryDoc<R> => ({ id, params });

// The three release documents of lab/world/W0/releases (SPEC 5.1 table). The tests check that each one's canonical JSON equals
// the file's and that its hash equals releases/index.json.
const R1_DOC: ReleaseDoc = {
  name: "R1",
  rules: [
    p("LIFE", {}),
    p("I9S1", {}),
    p("I9S2", { businessDays: 3 }),
    p("EVSUB", { businessDays: 3 }),
    p("EVSTAT", { tncBusinessDays: 8 }),
    p("BGC", {}),
    p("DOCEXP", { leadDays: { ead: 0, visa: 0 } }),
    p("MINWAGE", { floorSources: ["jurisdiction.stateMinWageCents"] }),
    p("OT", { thresholdMinutes: 2400 }),
    p("PAYCHG", { thresholdCents: 500 }),
    p("PROP", {}),
  ],
  world: "W0",
};

const R2_RULES: readonly RuleEntryDoc[] = [
  p("LIFE", {}),
  p("I9S1", {}),
  p("I9S2", { businessDays: 2 }),
  p("EVSUB", { businessDays: 3 }),
  p("EVSTAT", { tncBusinessDays: 8 }),
  p("BGC", {}),
  p("DOCEXP", { leadDays: { ead: 90, visa: 0 } }),
  p("MINWAGE", { floorSources: ["jurisdiction.stateMinWageCents", "location.localMinWageCents"] }),
  p("OT", { thresholdMinutes: 2400 }),
  p("PAYCHG", { thresholdCents: 500 }),
  p("PROP", {}),
];

const R2_DOC: ReleaseDoc = { name: "R2", rules: R2_RULES, world: "W0" };

const R3_DOC: ReleaseDoc = {
  name: "R3",
  rules: R2_RULES.map((e) =>
    e.id === "OT"
      ? {
          id: "OT",
          params: { thresholdMinutes: 2400 },
          scope: {
            jurisdictions: [
              "jur:j010",
              "jur:j020",
              "jur:j030",
              "jur:j040",
              "jur:j050",
              "jur:j060",
              "jur:j070",
              "jur:j080",
              "jur:j090",
              "jur:j100",
            ],
            params: { thresholdMinutes: 2700 },
          },
        }
      : e,
  ),
  world: "W0",
};

export const R1 = compileRelease(R1_DOC);
export const R2 = compileRelease(R2_DOC);
export const R3 = compileRelease(R3_DOC);

/** SPEC 4.3: `release` names `releases/<name>.json`. */
export const RELEASES_BY_NAME: ReadonlyMap<string, CompiledRelease> = new Map([
  ["R1", R1],
  ["R2", R2],
  ["R3", R3],
]);
/** SPEC 5.4 step 4: a picked hash must be R1's, R2's or R3's. */
export const RELEASES_BY_HASH: ReadonlyMap<string, CompiledRelease> = new Map([
  [R1.hash, R1],
  [R2.hash, R2],
  [R3.hash, R3],
]);

/** An activation fact (SPEC 5.4): "this tenant uses release H from valid time F", committed at position `tx`. */
export interface Activation {
  readonly from: string;
  readonly release: string;
  readonly tx: number;
}

/**
 * SPEC 5.4 `resolveRelease(activations, v)`: the candidates are the activations with `from <= v` (string comparison); pick the
 * greatest `from`, then the greatest `tx`, then the greatest `release` string; the pick must be R1, R2 or R3 (case C61). A pick
 * naming an unknown well-formed hash is W0.E_NO_RELEASE with no fall-back to another candidate (Q53 reading A06).
 */
export function resolveRelease(
  activations: readonly Activation[],
  v: string,
): CompiledRelease | "W0.E_NO_RELEASE" {
  let best: Activation | null = null;
  for (const a of activations) {
    if (!(a.from <= v)) continue;
    if (
      best === null ||
      a.from > best.from ||
      (a.from === best.from && (a.tx > best.tx || (a.tx === best.tx && a.release > best.release)))
    )
      best = a;
  }
  if (best === null) return "W0.E_NO_RELEASE";
  return RELEASES_BY_HASH.get(best.release) ?? "W0.E_NO_RELEASE";
}
