// @ts-nocheck -- [EXP-CHECKJS-R2] unannotated dynamic parameters; runtime error inspection. Binding errors remain checked by lab/bin/checkjs.mjs.
// Scratch verification of the naming functions proposed in R3. Pure functions, no I/O.

// Port of xtdb.util.NormalForm.normalForm0 (references/xtdb/api/src/main/kotlin/xtdb/util/NormalForm.kt:8-12)
export const xtdbNormalForm = (s) =>
  s.replaceAll("-", "_").replace(/^xt\//, "_").split(/[./$]/).join("$").toLowerCase();

// :person/first-name -> person$first_name
export const xtdbColumn = (key) => {
  if (!/^:[a-z][a-z0-9_-]*\/[a-z][a-z0-9_-]*$/.test(key)) throw new TypeError("bad attribute key " + key);
  return xtdbNormalForm(key.slice(1));
};

// PascalCase entity type -> snake_case relation name
export const xtdbRelation = (name) => {
  if (!/^[A-Z][A-Za-z0-9]*$/.test(name)) throw new TypeError("bad entity type " + name);
  return name
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1_$2")
    .toLowerCase();
};

// Entity id -> IRI path segment. Injective, canonical uppercase hex, prefixed-name safe.
export const encodeEntityId = (id) => {
  if (id.length === 0) throw new TypeError("empty entity id");
  if (!id.isWellFormed()) throw new TypeError("lone surrogate");
  const bytes = new TextEncoder().encode(id);
  let out = "";
  const last = bytes.length - 1;
  bytes.forEach((b, i) => {
    const ch = String.fromCharCode(b);
    const alnum = /[A-Za-z0-9_:]/.test(ch) && b < 128;
    const dashOrDot = (ch === "-" || ch === ".") && b < 128;
    const safe = alnum || (ch === "-" && i !== 0) || (ch === "." && i !== 0 && i !== last);
    out += safe ? ch : "%" + b.toString(16).toUpperCase().padStart(2, "0");
    void dashOrDot;
  });
  return out;
};
export const decodeEntityId = (seg) => {
  const bytes = [];
  for (let i = 0; i < seg.length; i++) {
    if (seg[i] === "%") {
      const hex = seg.slice(i + 1, i + 3);
      if (!/^[0-9A-F]{2}$/.test(hex)) throw new TypeError("non canonical escape");
      bytes.push(parseInt(hex, 16));
      i += 2;
    } else bytes.push(seg.charCodeAt(i));
  }
  const id = new TextDecoder("utf-8", { fatal: true }).decode(new Uint8Array(bytes));
  if (encodeEntityId(id) !== seg) throw new TypeError("non canonical encoding");
  return id;
};

const keys = [":person/name", ":person/first-name", ":person/first_name", ":a-b/c", ":a_b/c", ":placement/worker", ":common/created-by"];
console.log("--- attribute columns");
for (const k of keys) console.log(k.padEnd(22), xtdbColumn(k));
const cols = new Map();
for (const k of keys) { const c = xtdbColumn(k); (cols.get(c) ?? cols.set(c, []).get(c)).push(k); }
console.log("collisions:", [...cols].filter(([, v]) => v.length > 1));

console.log("--- relations");
for (const n of ["Person", "ProjectMember", "HTTPRoute", "ABTest", "AbTest", "W2Form", "I9Document", "Oauth2Token"])
  console.log(n.padEnd(14), xtdbRelation(n));

console.log("--- entity ids");
const ids = ["worker:maria", "case:01J9XYZABC", "a/b c", "100%", "é/ü", "-lead", "trail.", ".", "..", "a.b", "x~y", "emoji:😀", "Q?#", "UPPER:lower"];
for (const id of ids) {
  const e = encodeEntityId(id);
  console.log(JSON.stringify(id).padEnd(20), e.padEnd(28), decodeEntityId(e) === id ? "roundtrip ok" : "ROUNDTRIP FAIL");
}
for (const bad of ["", "a\ud800b"]) { try { encodeEntityId(bad); console.log("accepted?!", JSON.stringify(bad)); } catch (e) { console.log("rejects", JSON.stringify(bad), "->", e.message); } }
// Injectivity spot check over a small alphabet
const alphabet = ["a", "A", "%", "/", ".", "-", ":", " ", "é"];
const seen = new Map();
let n = 0;
const rec = (s, d) => { if (s.length) { const e = encodeEntityId(s); if (seen.has(e) && seen.get(e) !== s) throw new Error("collision " + s); seen.set(e, s); n++; } if (d < 4) for (const a of alphabet) rec(s + a, d + 1); };
rec("", 0);
console.log("injectivity: checked", n, "ids up to length 4, no collisions");
