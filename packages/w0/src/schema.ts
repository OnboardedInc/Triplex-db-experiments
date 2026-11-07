/**
 * Entities and attributes (SPEC 3), value types (SPEC 2) and the error codes (SPEC 4.4).
 */
import { isInstant, parseDate } from "./dates.js";

export type W0ErrorCode =
  | "W0.E_SHAPE"
  | "W0.E_BASIS"
  | "W0.E_UNKNOWN"
  | "W0.E_VALUE"
  | "W0.E_CARDINALITY"
  | "W0.E_NO_RELEASE";

/** SPEC 2 `erased`: `{"erasedAt": <instant>}`, allowed only on PII attributes. */
export interface Erased {
  readonly erasedAt: string;
}

/**
 * A fact value as a caller hands it to the typed entry points. Integers may be safe-integer numbers or bigints (Triplex's own
 * exact integers are bigints); anything that is not a valid value of its attribute's type is W0.E_VALUE (SPEC 4.4 step 3).
 */
export type FactValue = string | number | bigint | boolean | Erased;

/**
 * The value the wire reader gives for a JSON value that no W0 type accepts (null, an array, a non-integer number token, an
 * object other than one `erasedAt` string member, an integer beyond 2^53 - 1 in magnitude). Every such value is W0.E_VALUE
 * whatever the attribute (SPEC 2, 4.4 step 3), so one marker loses nothing.
 */
export const NOT_A_VALUE: unique symbol = Symbol("W0.notAValue");
export type RawValue = FactValue | typeof NOT_A_VALUE;

/** A validated value: integers are safe-integer numbers from here on (cents are at most 2^53 - 1, SPEC 2). */
export type Value = string | number | boolean | Erased;

export type Kind = "placement" | "document" | "decision" | "answer" | "location" | "jurisdiction";

type ValueType =
  | { readonly t: "date" }
  | { readonly t: "instant" }
  | { readonly t: "cents" }
  | { readonly t: "minutes" }
  | { readonly t: "boolean" }
  | { readonly t: "text" }
  | { readonly t: "enum"; readonly values: ReadonlySet<string> }
  /** a ref to an id of `kind`; `owned` means the id must start with the holding entity's owner id + `/<prefix>:` */
  | { readonly t: "ref"; readonly kind: Kind; readonly owned: boolean };

export interface AttrSpec {
  readonly type: ValueType;
  readonly many: boolean;
  readonly pii: boolean;
  /** the attribute's position in its kind's table, used as a slot index by the world index */
  readonly ord: number;
}

type Row = Omit<AttrSpec, "ord">;
const one = (type: ValueType, pii = false): Row => ({ type, many: false, pii });
const many = (type: ValueType): Row => ({ type, many: true, pii: false });
const table = (rows: readonly (readonly [string, Row])[]): ReadonlyMap<string, AttrSpec> =>
  new Map(rows.map(([name, row], ord) => [name, { ...row, ord }]));
const enm = (...values: string[]): ValueType => ({ t: "enum", values: new Set(values) });

/** SPEC 3 attribute tables, the same as `schema.json`. No other attribute exists (SPEC 3, case C63). */
export const ATTRIBUTES: Readonly<Record<Kind, ReadonlyMap<string, AttrSpec>>> = {
  placement: table([
    ["startDate", one({ t: "date" })],
    ["section1AttestedAt", one({ t: "instant" })],
    ["ssn", one({ t: "text" }, true)],
    ["everifyStatus", one(enm("pending", "tnc", "authorized", "fnc"))],
    ["everifyStatusAt", one({ t: "instant" })],
    ["everifySubmitResult", one(enm("accepted", "rejected"))],
    ["bgcStatus", one(enm("pending", "clear", "consider"))],
    ["payRateCents", one({ t: "cents" })],
    ["baselinePayRateCents", one({ t: "cents" })],
    ["weeklyMinutes", one({ t: "minutes" })],
    ["location", one({ t: "ref", kind: "location", owned: false })],
    ["documents", many({ t: "ref", kind: "document", owned: true })],
    ["decisions", many({ t: "ref", kind: "decision", owned: true })],
    ["answers", many({ t: "ref", kind: "answer", owned: true })],
  ]),
  document: table([
    ["docType", one(enm("passport", "ead", "visa"))],
    ["expiresOn", one({ t: "date" })],
    ["reverified", one({ t: "boolean" })],
  ]),
  decision: table([
    ["target", one(enm("i9.section2", "bgc.adjudication", "pay.change"))],
    ["verdict", one(enm("approve", "waive", "reject"))],
    ["author", one(enm("person", "system", "agent"))],
  ]),
  answer: table([
    ["field", one({ t: "text" })],
    ["value", one({ t: "text" })],
    // SPEC 3: `next` is a ref to an answer owned by the same placement.
    ["next", one({ t: "ref", kind: "answer", owned: true })],
  ]),
  location: table([
    ["jurisdiction", one({ t: "ref", kind: "jurisdiction", owned: false })],
    ["localMinWageCents", one({ t: "cents" })],
  ]),
  jurisdiction: table([["stateMinWageCents", one({ t: "cents" })]]),
};

export const MAX_CENTS = 9007199254740991; // 2^53 - 1 (SPEC 2)
export const MAX_MINUTES = 10080; // minutes in one week (SPEC 2)
const MAX_CENTS_BIG = 9007199254740991n;

/** `[a-z0-9-]{1,32}` over `s.slice(from)` (SPEC 3 local part). */
function isLocal(s: string, from: number, to: number = s.length): boolean {
  const len = to - from;
  if (len < 1 || len > 32) return false;
  for (let k = from; k < to; k++) {
    const c = s.charCodeAt(k);
    if (!((c >= 0x61 && c <= 0x7a) || (c >= 0x30 && c <= 0x39) || c === 0x2d)) return false;
  }
  return true;
}

const OWNED_PREFIX: Readonly<Record<string, Kind>> = {
  "doc:": "document",
  "dec:": "decision",
  "ans:": "answer",
};
const PREFIX_OF: Readonly<Partial<Record<Kind, string>>> = {
  document: "/doc:",
  decision: "/dec:",
  answer: "/ans:",
};

/** SPEC 3 id grammar: `pl:<local>` is a placement id. */
export const isPlacementId = (id: string): boolean => id.startsWith("pl:") && isLocal(id, 3);

/**
 * The kind of an id under the SPEC 3 grammar and, for owned kinds, the owning placement id; null when the id is no entity id.
 */
export function classify(id: string): { kind: Kind; owner: string } | null {
  if (id.startsWith("pl:")) {
    const slash = id.indexOf("/", 3);
    if (slash < 0) return isLocal(id, 3) ? { kind: "placement", owner: id } : null;
    if (!isLocal(id, 3, slash)) return null;
    const kind = OWNED_PREFIX[id.slice(slash + 1, slash + 5)];
    if (kind === undefined || !isLocal(id, slash + 5)) return null;
    return { kind, owner: id.slice(0, slash) };
  }
  if (id.startsWith("loc:")) return isLocal(id, 4) ? { kind: "location", owner: "" } : null;
  if (id.startsWith("jur:")) return isLocal(id, 4) ? { kind: "jurisdiction", owner: "" } : null;
  return null;
}

/**
 * SPEC 4.2 item 3: the entities allowed in the world of `subject` are the subject, the entities it owns (id starts with
 * `<subject>/`), locations and jurisdictions. Returns the entity's kind, or null when `e` is not allowed (W0.E_UNKNOWN).
 */
export function allowedKind(e: string, subject: string): Kind | null {
  if (e === subject) return "placement";
  const c = classify(e);
  if (c === null) return null;
  if (c.kind === "location" || c.kind === "jurisdiction") return c.kind;
  if (c.kind === "placement") return null; // another placement (case C62)
  return c.owner === subject ? c.kind : null;
}

/** Validates `v` against an attribute's type and normalises integers to numbers; returns NOT_A_VALUE when invalid (SPEC 2). */
export function checkValue(spec: AttrSpec, v: RawValue, owner: string): Value | typeof NOT_A_VALUE {
  if (v === NOT_A_VALUE || (v as unknown) === null || (v as unknown) === undefined)
    return NOT_A_VALUE;
  if (typeof v === "object") {
    // SPEC 2 `erased`: exactly one key `erasedAt` holding an instant, and only on a PII attribute (case C64).
    if (!spec.pii) return NOT_A_VALUE;
    const keys = Object.keys(v);
    if (keys.length !== 1 || keys[0] !== "erasedAt") return NOT_A_VALUE;
    const at: unknown = v.erasedAt;
    return typeof at === "string" && isInstant(at) ? v : NOT_A_VALUE;
  }
  const type = spec.type;
  switch (type.t) {
    case "date":
      return typeof v === "string" && parseDate(v) >= 0 ? v : NOT_A_VALUE;
    case "instant":
      return typeof v === "string" && isInstant(v) ? v : NOT_A_VALUE;
    case "cents":
    case "minutes": {
      // SPEC 2: a JSON integer token in 0 to 2^53 - 1 (cents) or 0 to 10080 (minutes); `1650.0`, `1.65e3` and `"1650"` are
      // not integers (cases C38, C68, C70) and never reach here as numbers from the wire reader.
      const max = type.t === "cents" ? MAX_CENTS : MAX_MINUTES;
      if (typeof v === "bigint")
        return v >= 0n && v <= MAX_CENTS_BIG && Number(v) <= max ? Number(v) : NOT_A_VALUE;
      if (typeof v === "number")
        return Number.isSafeInteger(v) && v >= 0 && v <= max ? (v === 0 ? 0 : v) : NOT_A_VALUE;
      return NOT_A_VALUE;
    }
    case "boolean":
      return typeof v === "boolean" ? v : NOT_A_VALUE;
    case "text": {
      // SPEC 2: 1 to 64 characters, each U+0020 to U+007E.
      if (typeof v !== "string" || v.length < 1 || v.length > 64) return NOT_A_VALUE;
      for (let k = 0; k < v.length; k++) {
        const c = v.charCodeAt(k);
        if (c < 0x20 || c > 0x7e) return NOT_A_VALUE;
      }
      return v;
    }
    case "enum":
      return typeof v === "string" && type.values.has(v) ? v : NOT_A_VALUE;
    case "ref": {
      // SPEC 2 `ref`: an entity id of the stated kind; SPEC 3: documents, decisions and answers named by a placement start
      // with that placement's id, and an answer's `next` names an answer of the same placement.
      if (typeof v !== "string") return NOT_A_VALUE;
      if (type.owned) {
        // `owner` is a valid placement id, so `<owner>/doc:<local>` (or dec:, ans:) is exactly a document (decision,
        // answer) id owned by `owner`: the same test as classify(v) with owner and kind compared, without allocating.
        const suffix = PREFIX_OF[type.kind]!;
        const n = owner.length;
        return v.startsWith(owner) && v.startsWith(suffix, n) && isLocal(v, n + suffix.length)
          ? v
          : NOT_A_VALUE;
      }
      const c = classify(v);
      return c !== null && c.kind === type.kind ? v : NOT_A_VALUE;
    }
  }
}
