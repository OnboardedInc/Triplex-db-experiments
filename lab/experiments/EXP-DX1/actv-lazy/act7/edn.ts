import assert from "node:assert/strict";

// [DX-ACT7] Why: AGE1's replay ledgers (the checkpoint with its probe map, and the population with its roster) travel
// inside the 1 billion handoff bundle as the exact EDN files AGE1 wrote with `pr-str`. The settlement check needs the
// probe map and the roster to regenerate the aged saves, so it reads them here. This reader covers what `pr-str` writes
// for those maps: maps, vectors, lists, sets, strings, numbers, keywords, symbols, nil, booleans, characters, tagged
// literals (the tag is dropped) and `#_` discards. Keywords become strings with their colon (":owner"); integers that
// do not fit a double exactly are refused.
// Rejected: a regular expression over the text (a probe's nested :fields map would be misread) or running Clojure on
// the runner host to convert the ledgers (the check would then depend on a second runtime).
export type Edn = null | boolean | number | string | Edn[] | Map<Edn, Edn> | { set: Edn[] } | { char: string };

export function readEdn(text: string): Edn {
  let i = 0;
  const ws = () => {
    for (;;) {
      const c = text[i];
      if (c === undefined) return;
      if (c === ";") {
        while (i < text.length && text[i] !== "\n") i++;
      } else if (c === " " || c === "\n" || c === "\t" || c === "\r" || c === ",") i++;
      else return;
    }
  };
  const delimiter = (c: string | undefined) => c === undefined || /[\s,()[\]{}";]/.test(c);
  const token = () => {
    const start = i;
    while (!delimiter(text[i])) i++;
    return text.slice(start, i);
  };
  const seq = (close: string) => {
    const out: Edn[] = [];
    for (;;) {
      ws();
      assert(i < text.length, "EDN: unterminated collection");
      if (text[i] === close) {
        i++;
        return out;
      }
      const v = value();
      if (v !== DISCARDED) out.push(v as Edn);
    }
  };
  const DISCARDED = Symbol("discarded");
  const value = (): Edn | typeof DISCARDED => {
    ws();
    const c = text[i];
    assert(c !== undefined, "EDN: unexpected end");
    if (c === "(") {
      i++;
      return seq(")");
    }
    if (c === "[") {
      i++;
      return seq("]");
    }
    if (c === "{") {
      i++;
      const items = seq("}");
      assert(items.length % 2 === 0, "EDN: odd map");
      const m = new Map<Edn, Edn>();
      for (let k = 0; k < items.length; k += 2) m.set(items[k]!, items[k + 1]!);
      return m;
    }
    if (c === "#") {
      const n = text[i + 1];
      if (n === "{") {
        i += 2;
        return { set: seq("}") };
      }
      if (n === "_") {
        i += 2;
        value();
        return DISCARDED;
      }
      i++;
      token(); // the tag (for example #inst or #uuid): the value follows
      return value();
    }
    if (c === '"') {
      i++;
      let s = "";
      for (;;) {
        const d = text[i++];
        assert(d !== undefined, "EDN: unterminated string");
        if (d === '"') return s;
        if (d !== "\\") {
          s += d;
          continue;
        }
        const e = text[i++];
        if (e === "n") s += "\n";
        else if (e === "t") s += "\t";
        else if (e === "r") s += "\r";
        else if (e === "b") s += "\b";
        else if (e === "f") s += "\f";
        else if (e === "u") {
          s += String.fromCharCode(Number.parseInt(text.slice(i, i + 4), 16));
          i += 4;
        } else s += e;
      }
    }
    if (c === "\\") {
      i++;
      return { char: token() || text[i++]! };
    }
    const t = token();
    assert(t.length, "EDN: empty token at " + i);
    if (t === "nil") return null;
    if (t === "true") return true;
    if (t === "false") return false;
    if (/^[+-]?\d+N?$/.test(t)) {
      const n = Number(t.replace(/N$/, ""));
      assert(Number.isSafeInteger(n), "EDN: integer outside the exact range: " + t);
      return n;
    }
    if (/^[+-]?(\d+\.?\d*([eE][+-]?\d+)?|\.\d+)M?$/.test(t)) return Number(t.replace(/M$/, ""));
    if (t === "##Inf" || t === "##-Inf" || t === "##NaN") return Number(t.slice(2));
    return t; // keyword (":a") or symbol
  };
  const out = value();
  ws();
  assert(out !== DISCARDED && i === text.length, "EDN: trailing input");
  return out as Edn;
}

/** A map's value by keyword (":owner"). */
export function get(m: Edn | undefined, key: string): Edn | undefined {
  assert(m instanceof Map, "EDN: not a map at " + key);
  return m.get(key);
}
export const num = (v: Edn | undefined, what: string) => {
  assert(typeof v === "number" && Number.isFinite(v), "EDN: " + what + " is not a number");
  return v;
};
