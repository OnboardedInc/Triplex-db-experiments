/**
 * Token-level JSON reading and canonical JSON writing for W0 (SPEC sections 2, 4.4 step 1, 9 and 14 rows 1, 2, 34).
 *
 * `JSON.parse` cannot be used: it turns `1650.0`, `1.65e3` and `3.0` into integers (SPEC 14 row 1), rounds integers above
 * 2^53 - 1 (SPEC 14 row 2) and silently keeps the last of two duplicate keys (SPEC 14 row 34). This scanner keeps every number
 * token's kind (an integer token as an exact bigint, any other number token as its source text) and records duplicate keys on
 * the subtree, so the operation can report `W0.E_SHAPE` for a duplicate anywhere in its input (SPEC 4.4 step 1, case C66).
 *
 * The scanner is iterative, so nesting depth is bounded by memory, not by the call stack (SPEC-AMBIGUITY D01b-A13).
 */

/** A JSON value with its token kinds preserved. `start` and `end` are character offsets into the scanned text. */
export type JV = JNull | JBool | JInt | JNum | JStr | JArr | JObj;

export interface JNull {
  readonly t: "null";
  start: number;
  end: number;
}
export interface JBool {
  readonly t: "bool";
  readonly v: boolean;
  start: number;
  end: number;
}
/** An integer token, `-?(0|[1-9][0-9]*)` (SPEC 2). `v` is its exact value; `-0` has value 0 (Q53 reading A02). */
export interface JInt {
  readonly t: "int";
  readonly v: bigint;
  start: number;
  end: number;
}
/** Any other number token (a fraction or an exponent). Kept as its source text (Q53 reading A07). */
export interface JNum {
  readonly t: "num";
  readonly src: string;
  start: number;
  end: number;
}
export interface JStr {
  readonly t: "str";
  readonly v: string;
  start: number;
  end: number;
}
export interface JArr {
  readonly t: "arr";
  readonly v: JV[];
  /** true when this array or anything inside it holds an object with a duplicate key */
  dup: boolean;
  start: number;
  end: number;
}
export interface JObj {
  readonly t: "obj";
  /** member values by key; with a duplicate key the later value is kept, but `dup` is set and the input is E_SHAPE anyway */
  readonly m: Map<string, JV>;
  /** true when this object has a duplicate key or anything inside it does */
  dup: boolean;
  start: number;
  end: number;
}

export class JsonSyntaxError extends Error {
  constructor(readonly offset: number) {
    super(`JSON syntax error at offset ${offset}`);
  }
}

/**
 * Decodes input bytes as strict UTF-8. Returns null for anything that is not UTF-8 or that starts with a byte order mark:
 * both are `W0.E_SHAPE` (Q53 reading A01; SPEC 9 item 1 forbids a byte order mark).
 */
export function decodeUtf8Strict(bytes: Uint8Array): string | null {
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) return null;
  try {
    return new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes);
  } catch {
    return null;
  }
}

const isWs = (c: number): boolean => c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d;
const isDigit = (c: number): boolean => c >= 0x30 && c <= 0x39;

function hexVal(c: number): number {
  if (c >= 0x30 && c <= 0x39) return c - 0x30;
  if (c >= 0x61 && c <= 0x66) return c - 0x57;
  if (c >= 0x41 && c <= 0x46) return c - 0x37;
  return -1;
}

/**
 * Scans exactly one JSON value (RFC 8259 grammar, whitespace allowed around it) from `src`. Throws JsonSyntaxError for anything
 * else, including `NaN`, `Infinity`, a leading `+`, leading zeros, trailing commas, unescaped control characters and trailing
 * content (Q53 reading A01: bytes that are not one JSON value are W0.E_SHAPE; SPEC-AMBIGUITY D01b-A11 for the non-standard
 * tokens some parsers accept).
 */
export function scan(src: string): JV {
  const n = src.length;
  let i = 0;
  type Frame = { node: JArr | JObj; key: string };
  const stack: Frame[] = [];

  const ws = (): void => {
    while (i < n && isWs(src.charCodeAt(i))) i++;
  };
  const fail = (): never => {
    throw new JsonSyntaxError(i);
  };

  const readString = (): string => {
    // at the opening quote
    i++;
    let out = "";
    let runStart = i;
    for (;;) {
      if (i >= n) fail();
      const c = src.charCodeAt(i);
      if (c === 0x22) {
        out += src.slice(runStart, i);
        i++;
        return out;
      }
      if (c < 0x20) fail();
      if (c !== 0x5c) {
        i++;
        continue;
      }
      out += src.slice(runStart, i);
      i++;
      if (i >= n) fail();
      const e = src.charCodeAt(i);
      switch (e) {
        case 0x22:
          out += '"';
          break;
        case 0x5c:
          out += "\\";
          break;
        case 0x2f:
          out += "/";
          break;
        case 0x62:
          out += "\b";
          break;
        case 0x66:
          out += "\f";
          break;
        case 0x6e:
          out += "\n";
          break;
        case 0x72:
          out += "\r";
          break;
        case 0x74:
          out += "\t";
          break;
        case 0x75: {
          if (i + 4 >= n) fail();
          let code = 0;
          for (let k = 1; k <= 4; k++) {
            const h = hexVal(src.charCodeAt(i + k));
            if (h < 0) fail();
            code = code * 16 + h;
          }
          out += String.fromCharCode(code);
          i += 4;
          break;
        }
        default:
          fail();
      }
      i++;
      runStart = i;
    }
  };

  const readKeyThenColon = (): string => {
    ws();
    if (src.charCodeAt(i) !== 0x22) fail();
    const key = readString();
    ws();
    if (src.charCodeAt(i) !== 0x3a) fail();
    i++;
    return key;
  };

  const readNumber = (): JInt | JNum => {
    const start = i;
    let integer = true;
    if (src.charCodeAt(i) === 0x2d) i++;
    const first = src.charCodeAt(i);
    if (first === 0x30) {
      i++;
    } else if (first >= 0x31 && first <= 0x39) {
      while (i < n && isDigit(src.charCodeAt(i))) i++;
    } else {
      fail();
    }
    if (src.charCodeAt(i) === 0x2e) {
      integer = false;
      i++;
      if (!isDigit(src.charCodeAt(i))) fail();
      while (i < n && isDigit(src.charCodeAt(i))) i++;
    }
    const ec = src.charCodeAt(i);
    if (ec === 0x65 || ec === 0x45) {
      integer = false;
      i++;
      const sc = src.charCodeAt(i);
      if (sc === 0x2b || sc === 0x2d) i++;
      if (!isDigit(src.charCodeAt(i))) fail();
      while (i < n && isDigit(src.charCodeAt(i))) i++;
    }
    const text = src.slice(start, i);
    // SPEC 2: an integer token has no fraction and no exponent; BigInt keeps it exact above 2^53 - 1 (SPEC 14 row 2).
    if (integer) return { t: "int", v: BigInt(text), start, end: i };
    return { t: "num", src: text, start, end: i };
  };

  const literal = (word: string): void => {
    if (src.startsWith(word, i)) i += word.length;
    else fail();
  };

  let result: JV | undefined;
  outer: for (;;) {
    ws();
    if (i >= n) fail();
    const start = i;
    const c = src.charCodeAt(i);
    let value: JV;
    if (c === 0x7b) {
      i++;
      const node: JObj = { t: "obj", m: new Map(), dup: false, start, end: -1 };
      ws();
      if (src.charCodeAt(i) === 0x7d) {
        i++;
        node.end = i;
        value = node;
      } else {
        stack.push({ node, key: readKeyThenColon() });
        continue outer;
      }
    } else if (c === 0x5b) {
      i++;
      const node: JArr = { t: "arr", v: [], dup: false, start, end: -1 };
      ws();
      if (src.charCodeAt(i) === 0x5d) {
        i++;
        node.end = i;
        value = node;
      } else {
        stack.push({ node, key: "" });
        continue outer;
      }
    } else if (c === 0x22) {
      const v = readString();
      value = { t: "str", v, start, end: i };
    } else if (c === 0x2d || isDigit(c)) {
      value = readNumber();
    } else if (c === 0x74) {
      literal("true");
      value = { t: "bool", v: true, start, end: i };
    } else if (c === 0x66) {
      literal("false");
      value = { t: "bool", v: false, start, end: i };
    } else if (c === 0x6e) {
      literal("null");
      value = { t: "null", start, end: i };
    } else {
      return fail();
    }

    // Attach the finished value to its parent, closing every container that ends here.
    for (;;) {
      const top = stack[stack.length - 1];
      if (top === undefined) {
        result = value;
        break outer;
      }
      const childDup = (value.t === "arr" || value.t === "obj") && value.dup;
      if (top.node.t === "arr") {
        top.node.v.push(value);
        if (childDup) top.node.dup = true;
      } else {
        if (top.node.m.has(top.key)) top.node.dup = true; // SPEC 4.4 step 1: a duplicate key anywhere is W0.E_SHAPE
        top.node.m.set(top.key, value);
        if (childDup) top.node.dup = true;
      }
      ws();
      const d = src.charCodeAt(i);
      if (d === 0x2c) {
        i++;
        if (top.node.t === "obj") top.key = readKeyThenColon();
        continue outer;
      }
      if (d !== (top.node.t === "arr" ? 0x5d : 0x7d)) fail();
      i++;
      top.node.end = i;
      stack.pop();
      value = top.node;
    }
  }
  ws();
  if (i !== n) fail();
  return result;
}

/**
 * Code point order, which is the byte order of the UTF-8 encoding that SPEC 9 item 2 names. For printable ASCII (every string
 * the rules produce, SPEC 8.7) it equals JavaScript's default string order; it differs only for strings beyond U+FFFF, which can
 * reach the unchecked strings of `publish` and `receive` (SPEC 4.4 step 1, Q44a).
 */
export function cmpCodePoints(a: string, b: string): number {
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    const x = a.codePointAt(i)!;
    const y = b.codePointAt(j)!;
    if (x !== y) return x < y ? -1 : 1;
    i += x > 0xffff ? 2 : 1;
    j += y > 0xffff ? 2 : 1;
  }
  if (i >= a.length) return j >= b.length ? 0 : -1;
  return 1;
}

/** true when some character of `s` is `"`, `\\`, or outside U+0020 to U+007E */
function needsEscape(s: string): boolean {
  for (let k = 0; k < s.length; k++) {
    const c = s.charCodeAt(k);
    if (c < 0x20 || c > 0x7e || c === 0x22 || c === 0x5c) return true;
  }
  return false;
}

/**
 * A JSON string literal. SPEC 9 item 4 writes `"` as `\"` and `\` as `\\`; every string the rules produce is printable ASCII,
 * so nothing else is escaped there. Other strings (only the opaque, unchecked strings of `publish` and `receive`) get the
 * escapes of Python's `json.dumps(ensure_ascii=True)`: the short escapes `\b \f \n \r \t`, `\u00XX` for other control
 * characters and DEL, and `\uXXXX` (lowercase hex) for every UTF-16 code unit above U+007E (Q53 reading A07).
 */
export function quote(s: string): string {
  if (!needsEscape(s)) return '"' + s + '"';
  let out = '"';
  for (let k = 0; k < s.length; k++) {
    const c = s.charCodeAt(k);
    if (c === 0x22) out += '\\"';
    else if (c === 0x5c) out += "\\\\";
    else if (c >= 0x20 && c <= 0x7e) out += s[k];
    else if (c === 0x08) out += "\\b";
    else if (c === 0x0c) out += "\\f";
    else if (c === 0x0a) out += "\\n";
    else if (c === 0x0d) out += "\\r";
    else if (c === 0x09) out += "\\t";
    else out += "\\u" + c.toString(16).padStart(4, "0");
  }
  return out + '"';
}

/**
 * Canonical JSON (SPEC 9) of a scanned value: members sorted by key in code point order, no whitespace, integer tokens in
 * decimal (`-0` as `0`, Q53 reading A02), any other number token as its source text and strings as in `quote` (Q53 reading A07).
 */
export function canonicalJV(v: JV): string {
  switch (v.t) {
    case "null":
      return "null";
    case "bool":
      return v.v ? "true" : "false";
    case "int":
      return v.v.toString();
    case "num":
      return v.src;
    case "str":
      return quote(v.v);
    case "arr": {
      let out = "[";
      for (let k = 0; k < v.v.length; k++) {
        if (k > 0) out += ",";
        out += canonicalJV(v.v[k]!);
      }
      return out + "]";
    }
    case "obj": {
      const keys = [...v.m.keys()].sort(cmpCodePoints);
      let out = "{";
      for (let k = 0; k < keys.length; k++) {
        if (k > 0) out += ",";
        out += quote(keys[k]!) + ":" + canonicalJV(v.m.get(keys[k]!)!);
      }
      return out + "}";
    }
  }
}

/**
 * Canonical JSON of a plain value built in code (release documents, payloads, preimages). Integers must be safe integers or
 * bigints; any other number throws, because W0 has no floating-point value anywhere (SPEC 2).
 */
export function canonicalPlain(x: unknown): string {
  if (x === null) return "null";
  switch (typeof x) {
    case "boolean":
      return x ? "true" : "false";
    case "string":
      return quote(x);
    case "bigint":
      return x.toString();
    case "number":
      if (!Number.isSafeInteger(x)) throw new TypeError(`W0 has no non-integer number: ${x}`);
      return Object.is(x, -0) ? "0" : String(x);
    case "object": {
      if (Array.isArray(x)) return "[" + x.map(canonicalPlain).join(",") + "]";
      const keys = Object.keys(x as object).sort(cmpCodePoints);
      return (
        "{" +
        keys
          .map((k) => quote(k) + ":" + canonicalPlain((x as Record<string, unknown>)[k]))
          .join(",") +
        "}"
      );
    }
    default:
      throw new TypeError(`not a JSON value: ${typeof x}`);
  }
}
