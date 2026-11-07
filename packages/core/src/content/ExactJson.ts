/**
 * Exact JSON numbers: the check every qualified write route runs before `CanonicalJson`.
 *
 * [EXP-F02b] Why: RULINGS Q30a. A JSON value containing -0, a non-finite number, or a number that
 * is not exactly a binary64 value is rejected, never normalized. `CanonicalJson` (and the lane
 * encoders, which use `JSON.stringify`) turn -0 into 0 by design, because -0 and 0 are one JSON
 * value for identity (RULINGS Q14b); that is correct for hashing but is silent conversion for
 * storage. EXP-F02 records fixed by rejecting first: `ledger json neg-zero-in-object` and
 * `ledger json neg-zero-in-list` on xtdb and qlever (lab/experiments/EXP-F02-wire-exactness/
 * results.json). Canonical identity is unchanged; this module only finds the offending number.
 * Rejected: normalizing -0 to 0 before the write (silent conversion, Sam's numeric rule item 3);
 * changing CanonicalJson (it is the identity hash substrate and must not move).
 */

export type InexactJsonReason = "negative-zero" | "non-finite" | "not-binary64";

/** The first offending number and where it is (`$`, `$.amount`, `$[1].v`). */
export interface InexactJsonNumber {
  readonly path: string;
  readonly reason: InexactJsonReason;
  /** The number as written: `-0`, `NaN`, `Infinity`, or the literal text. */
  readonly text: string;
}

const describe = (value: number): string => (Object.is(value, -0) ? "-0" : String(value));

const memberPath = (path: string, key: string): string =>
  /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key) ? `${path}.${key}` : `${path}[${JSON.stringify(key)}]`;

/**
 * The first number inside an in-memory JSON value that fails `accept`, depth first in key and
 * index order. Non-plain values are skipped; rejecting them is CanonicalJson's job.
 */
export const findNumber = (
  value: unknown,
  accept: (n: number) => boolean,
  path = "$",
  seen: Set<object> = new Set(),
): { readonly path: string; readonly value: number } | undefined => {
  if (typeof value === "number") return accept(value) ? undefined : { path, value };
  if (value === null || typeof value !== "object" || seen.has(value)) return undefined;
  seen.add(value);
  try {
    if (Array.isArray(value)) {
      for (let index = 0; index < value.length; index++) {
        const found = findNumber(value[index], accept, `${path}[${index}]`, seen);
        if (found !== undefined) return found;
      }
      return undefined;
    }
    for (const key of Object.keys(value)) {
      const found = findNumber(
        (value as Record<string, unknown>)[key],
        accept,
        memberPath(path, key),
        seen,
      );
      if (found !== undefined) return found;
    }
    return undefined;
  } finally {
    seen.delete(value);
  }
};

/**
 * The first -0 or non-finite number inside an in-memory JSON value (Q30a). Every other JS number
 * is a binary64 value and survives `JSON.stringify` / `JSON.parse` exactly (EXP-F02: `low-bit-double`,
 * `subnormal`, `beyond-2^53`, `1e21` came back exact on both engines).
 */
export const firstInexactNumber = (value: unknown): InexactJsonNumber | undefined => {
  const found = findNumber(value, (n) => Number.isFinite(n) && !Object.is(n, -0));
  if (found === undefined) return undefined;
  return {
    path: found.path,
    reason: Number.isFinite(found.value) ? "negative-zero" : "non-finite",
    text: describe(found.value),
  };
};

/** Sign, significant digits (no leading or trailing zeros) and exponent of decimal text. */
const decimalValue = (text: string): string => {
  const match = /^(-?)(\d+)(?:\.(\d+))?(?:[eE]([+-]?\d+))?$/.exec(text);
  if (match === null) throw new TypeError(`Not a decimal literal: ${text}`);
  const [, sign = "", whole = "", fraction = "", exponentText = "0"] = match;
  let digits = `${whole}${fraction}`.replace(/^0+/, "");
  if (digits === "") return "0";
  let exponent = BigInt(exponentText) - BigInt(fraction.length);
  const trailing = /0+$/.exec(digits)?.[0].length ?? 0;
  digits = digits.slice(0, digits.length - trailing);
  exponent += BigInt(trailing);
  return `${sign}${digits}e${exponent}`;
};

const NUMBER_TOKEN = /-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/y;

/**
 * The first number literal in JSON text that `JSON.parse` would change: one that parses to -0 or
 * to ±Infinity (`1e400`), or whose decimal value differs from the shortest decimal form of the
 * binary64 it parses to, so digits would be lost (`0.10000000000000000001`,
 * `12345678901234567890`). `0.1` and `1.0` are exact in this sense: their value is the shortest
 * form of the double they parse to. For text routes (bulk import, replay and restore read JSON
 * text; RULINGS Q23); in-memory values use `firstInexactNumber`. Assumes `text` is valid JSON.
 */
export const firstInexactNumberText = (text: string): InexactJsonNumber | undefined => {
  let index = 0;
  let count = 0;
  while (index < text.length) {
    const char = text[index]!;
    if (char === '"') {
      index++;
      while (index < text.length && text[index] !== '"') index += text[index] === "\\" ? 2 : 1;
      index++;
      continue;
    }
    if (char === "-" || (char >= "0" && char <= "9")) {
      NUMBER_TOKEN.lastIndex = index;
      const literal = NUMBER_TOKEN.exec(text)?.[0];
      if (literal === undefined) throw new TypeError(`Invalid JSON number at offset ${index}`);
      const parsed = Number(literal);
      const path = `number #${count} at offset ${index}`;
      if (!Number.isFinite(parsed)) return { path, reason: "non-finite", text: literal };
      if (Object.is(parsed, -0)) return { path, reason: "negative-zero", text: literal };
      if (decimalValue(literal) !== decimalValue(String(parsed)))
        return { path, reason: "not-binary64", text: literal };
      index += literal.length;
      count++;
      continue;
    }
    index++;
  }
  return undefined;
};

const writeExact = (value: unknown): string => {
  if (typeof value === "number") return Object.is(value, -0) ? "-0" : JSON.stringify(value);
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value))
    return `[${value.map((item) => (item === undefined ? "null" : writeExact(item))).join(",")}]`;
  return `{${Object.entries(value)
    .filter(([, item]) => item !== undefined)
    .map(([key, item]) => `${JSON.stringify(key)}:${writeExact(item)}`)
    .join(",")}}`;
};

/**
 * `JSON.stringify` for storage, except that -0 is written as `-0` (valid JSON; `JSON.parse` reads
 * it back as -0). Output is byte-identical to `JSON.stringify` for every value without a -0.
 *
 * [EXP-F02b] Why: RULINGS Q21 AMB-04 and the Q34c boundary of Q30a. The journal stores each change,
 * with the asserted typed value inside it, as a JSON-valued fact (store/transactionMetadata.ts), so
 * a `number` -0 assertion was journaled as 0 by the lanes' `JSON.stringify` (F02 finding 1). The
 * lanes use this for the ledger's JSON payload, so the journal carries typed values losslessly
 * while the logical change shape stays `{ ..., value: { type: "number", value: -0 } }`. User JSON
 * with -0 is still refused by the writer (Q30a); canonical identity (CanonicalJson) is unchanged.
 * Assumes a plain JSON value that the lane's validation has already accepted.
 * Rejected: a tagged journal form for -0 (changes the journal's logical content that oracles
 * compare, RULINGS AMB-05); normalizing in CanonicalJson's place (identity must not move).
 */
export const stringify = (value: unknown): string =>
  findNumber(value, (n) => !Object.is(n, -0)) === undefined
    ? JSON.stringify(value)
    : writeExact(value);
