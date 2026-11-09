// @ts-nocheck -- [EXP-CHECKJS-R2] unannotated bigint arithmetic or intentional JavaScript boolean/number coercion; unannotated bigint arithmetic or deliberate cross-kind comparisons. Binding errors remain checked by lab/bin/checkjs.mjs.
// EXP-F02 helpers: exact conversions, rendering and comparison. No engine I/O here.

/** Render any measured value for the report: keeps -0, NaN, bigint, Date and long text visible. */
export const render = (value) => {
  if (value === undefined) return "undefined";
  if (typeof value === "number") return Object.is(value, -0) ? "-0" : String(value);
  if (typeof value === "bigint") return `${value}n`;
  if (value instanceof Date) return `Date(${Number.isNaN(value.getTime()) ? "Invalid" : value.toISOString()})`;
  if (typeof value === "string") {
    const shown = value.length > 80 ? `${value.slice(0, 40)}...(${value.length} chars)` : value;
    return JSON.stringify(shown);
  }
  return JSON.stringify(value, (_key, v) =>
    typeof v === "number"
      ? Object.is(v, -0)
        ? "<-0>"
        : Number.isFinite(v)
          ? v
          : `<${v}>`
      : typeof v === "bigint"
        ? `<${v}n>`
        : v === undefined
          ? "<undefined>"
          : v,
  );
};

/** Deep equality with SameValue on numbers. JSON objects compare by key set, not key order. */
export const same = (a, b) => {
  if (typeof a === "number" || typeof b === "number") return Object.is(a, b);
  if (a === null || b === null || typeof a !== "object" || typeof b !== "object") return a === b;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a)) return a.length === b.length && a.every((item, i) => same(item, b[i]));
  const ka = Object.keys(a).filter((k) => a[k] !== undefined).sort();
  const kb = Object.keys(b).filter((k) => b[k] !== undefined).sort();
  return ka.length === kb.length && ka.every((k, i) => k === kb[i] && same(a[k], b[k]));
};

/** Key order of every object in a JSON value, for representation-change notes. */
export const keyOrder = (value) =>
  value === null || typeof value !== "object"
    ? null
    : Array.isArray(value)
      ? value.map(keyOrder)
      : Object.fromEntries(Object.keys(value).map((k) => [k, keyOrder(value[k])]));

const floorDiv = (a, b) => {
  const q = a / b;
  return a % b !== 0n && a < 0n !== b < 0n ? q - 1n : q;
};

/**
 * Epoch milliseconds (a double, possibly fractional) to exact nanoseconds through its shortest
 * decimal text, never `ms * 1e6` in floating point. Returns undefined for non-finite input.
 */
export const msToNanos = (ms) => {
  if (!Number.isFinite(ms)) return undefined;
  const text = Math.abs(ms).toString();
  let [mantissa, exponentText] = text.split("e");
  const exponent = exponentText === undefined ? 0 : Number(exponentText);
  let [intPart, frac = ""] = mantissa.split(".");
  let digits = intPart + frac;
  let point = intPart.length + exponent;
  if (point < 0) {
    digits = "0".repeat(-point) + digits;
    point = 0;
  }
  if (point > digits.length) digits = digits + "0".repeat(point - digits.length);
  intPart = digits.slice(0, point) || "0";
  frac = digits.slice(point);
  const nsFrac = (frac + "000000").slice(0, 6);
  const truncated = frac.length > 6 && /[1-9]/.test(frac.slice(6));
  const magnitude = BigInt(intPart) * 1_000_000n + BigInt(nsFrac);
  return { nanos: ms < 0 ? -magnitude : magnitude, truncated };
};

/** Exact nanoseconds back to the nearest double of the exact decimal millisecond value. */
export const nanosToMs = (nanos) => {
  const negative = nanos < 0n;
  const abs = negative ? -nanos : nanos;
  const whole = abs / 1_000_000n;
  const frac = (abs % 1_000_000n).toString().padStart(6, "0").replace(/0+$/, "");
  return Number(`${negative ? "-" : ""}${whole}${frac ? `.${frac}` : ""}`);
};

const pad = (n, w) => String(n).padStart(w, "0");

/**
 * ISO-8601 UTC text with the full sub-second precision of `ms` (up to nanoseconds).
 * style "java": years above 9999 get a leading "+" (java.time parsing); "xsd": no "+".
 */
export const msToIso = (ms, style = "java") => {
  const converted = msToNanos(ms);
  if (converted === undefined) throw new RangeError(`No ISO form for ${ms}`);
  const seconds = floorDiv(converted.nanos, 1_000_000_000n);
  const nanos = converted.nanos - seconds * 1_000_000_000n;
  const date = new Date(Number(seconds) * 1000);
  if (Number.isNaN(date.getTime())) throw new RangeError(`Outside the ECMAScript Date range: ${ms}`);
  const year = date.getUTCFullYear();
  const yearText =
    year < 0 ? `-${pad(-year, 4)}` : year > 9999 ? `${style === "java" ? "+" : ""}${year}` : pad(year, 4);
  const fraction = pad(nanos, 9).replace(/0+$/, "");
  return `${yearText}-${pad(date.getUTCMonth() + 1, 2)}-${pad(date.getUTCDate(), 2)}T${pad(date.getUTCHours(), 2)}:${pad(
    date.getUTCMinutes(),
    2,
  )}:${pad(date.getUTCSeconds(), 2)}${fraction ? `.${fraction}` : ""}Z`;
};

/** Parse ISO text as printed by XTDB (`...Z[GMT]`, `+10000-...T00:00Z`) or QLever, exactly. */
export const isoToMs = (text) => {
  const match =
    /^([+-]?\d{4,})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d+))?)?(Z|[+-]\d{2}:?\d{2})?(?:\[[^\]]+\])?$/.exec(
      text,
    );
  if (match === null) throw new TypeError(`Unparsed timestamp text ${JSON.stringify(text)}`);
  const [, y, mo, d, h, mi, s = "0", f = "", zone = "Z"] = match;
  const date = new Date(0);
  date.setUTCFullYear(Number(y), Number(mo) - 1, Number(d));
  date.setUTCHours(Number(h), Number(mi), Number(s), 0);
  let base = date.getTime();
  if (Number.isNaN(base)) throw new RangeError(`Outside the ECMAScript Date range: ${text}`);
  if (zone !== "Z") {
    const sign = zone[0] === "-" ? -1 : 1;
    const digits = zone.slice(1).replace(":", "");
    base -= sign * (Number(digits.slice(0, 2)) * 60 + Number(digits.slice(2))) * 60_000;
  }
  const fracNanos = BigInt((f + "000000000").slice(0, 9));
  return nanosToMs(BigInt(base) * 1_000_000n + fracNanos);
};

/** xsd:double lexical form of a JS number, keeping -0, NaN and the infinities. */
export const xsdDouble = (v) =>
  Number.isNaN(v) ? "NaN" : v === Infinity ? "INF" : v === -Infinity ? "-INF" : Object.is(v, -0) ? "-0" : String(v);

/** Parse an RDF numeric lexical (xsd:double/decimal/int as QLever exports them). */
export const parseRdfNumber = (text) =>
  text === "INF" ? Infinity : text === "-INF" ? -Infinity : text === "NaN" ? NaN : Number(text);

/** Triplex comparators for range rules. */
export const compare = {
  text: (a, b) => (a < b ? -1 : a > b ? 1 : 0),
  textCodePoint: (a, b) => {
    const x = [...a].map((c) => c.codePointAt(0));
    const y = [...b].map((c) => c.codePointAt(0));
    for (let i = 0; i < Math.min(x.length, y.length); i++) if (x[i] !== y[i]) return x[i] - y[i];
    return x.length - y.length;
  },
  number: (a, b) => (a < b ? -1 : a > b ? 1 : 0),
  integer: (a, b) => (a < b ? -1 : a > b ? 1 : 0),
  instant: (a, b) => (a < b ? -1 : a > b ? 1 : 0),
  int64: (a, b) => {
    const x = BigInt(a);
    const y = BigInt(b);
    return x < y ? -1 : x > y ? 1 : 0;
  },
  date: (a, b) => (a < b ? -1 : a > b ? 1 : 0),
};

/**
 * Does `actual` (ids in engine order) respect `cmp` over `values` (id -> value)? Ties may come
 * in any order. Returns the first inversion or undefined.
 */
export const firstInversion = (actual, values, cmp) => {
  for (let i = 1; i < actual.length; i++) {
    const a = values.get(actual[i - 1]);
    const b = values.get(actual[i]);
    if (cmp(a, b) > 0) return { before: actual[i - 1], after: actual[i] };
  }
  return undefined;
};
