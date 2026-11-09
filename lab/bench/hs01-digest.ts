/** [EXP-HS01-R3] Why: prove that a records-ON store and a records-OFF store of the same deterministic workload hold the same logical rows.
 * Reads one broker.db read-only, decodes every fact, history and journal row (records expanded) with the worker's own decoder and prints an
 * order-independent digest (XOR of per-row SHA-256 over the canonical row JSON) per class. Both stores must be seeded with the same
 * HS01_SCOPE. Rejected: comparing file bytes or dbstat (those differ by design) and sampling rows (the claim is about every row).
 * usage: tsx lab/bench/hs01-digest.ts <broker.db>
 */
import fs from "node:fs";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { rowCodec } from "../../packages/qlever/src/broker/row-codec.ts";
const Database = createRequire(new URL("../../packages/qlever/package.json", import.meta.url))(
  "better-sqlite3",
);
const file = process.argv[2]!;
const db = new Database(file, { readonly: true, fileMustExist: true });
const k = new Function("Buffer", rowCodec + "return {decodeRow,jrecSynth,packId,unpackId,sameId};")(
  Buffer,
);
const one = (sql: string) => db.prepare(sql);
const small = new Map<string, unknown>();
const dict = {
  ents: ["eid", "name"],
  attrs: ["aid", "name"],
  strs: ["sid", "s"],
  hds: ["hid", "name"],
} as const;
const sel: Record<string, any> = {};
for (const [t, [id, col]] of Object.entries(dict))
  sel[t] = one(`SELECT ${col} v FROM ${t} WHERE ${id}=?`);
const txq = one("SELECT tx,at FROM txs WHERE pos=?");
const heads = new Map<string, number>();
for (const r of one("SELECT hid,name FROM hds").all() as any[]) heads.set(r.name, r.hid);
const lookupq = {
  attrs: one("SELECT aid id FROM attrs WHERE name=?"),
  strs: one("SELECT sid id FROM strs WHERE s=?"),
} as Record<string, any>;
const factq = one("SELECT * FROM facts WHERE id=?"),
  histq = one("SELECT * FROM history WHERE id=?"),
  jq = one("SELECT * FROM journal WHERE id=?");
const c: any = {
  name: (t: string, id: number) => {
    if (t === "ents") return sel.ents.get(id)?.v;
    const key = t + ":" + id;
    let v = small.get(key);
    if (v === undefined) {
      v = sel[t].get(id)?.v;
      if (Buffer.isBuffer(v)) v = JSON.parse(v.toString());
      small.set(key, v);
    }
    return v;
  },
  tx: (pos: number) => txq.get(pos),
  hid: (key: string) => heads.get(key),
  look: (t: string, v: string) => lookupq[t].get(v)?.id,
  ent: (sid: any) => (factq.get(sid) ?? histq.get(sid))?.e,
};
c.row = (id: string) => {
  const sid = k.packId(id, c);
  const s = factq.get(sid) ?? histq.get(sid) ?? jq.get(sid);
  return s ? k.decodeRow(s, c) : undefined;
};
const canonical = (r: any) =>
  JSON.stringify(
    Object.fromEntries(
      Object.keys(r)
        .sort()
        .map((key) => [
          key,
          typeof r[key] === "number" && !Number.isFinite(r[key]) ? String(r[key]) : r[key],
        ]),
    ),
  );
const acc = (label: string) => {
  let digest = 0n,
    n = 0;
  return {
    add(row: any) {
      digest ^= BigInt("0x" + createHash("sha256").update(canonical(row)).digest("hex"));
      n++;
    },
    done: () => ({ label, n, digest: digest.toString(16).padStart(64, "0") }),
  };
};
const facts = acc("facts"),
  history = acc("history"),
  journal = acc("journal");
let fromRecords = 0,
  verbatim = 0;
for (const s of one("SELECT * FROM facts").iterate()) facts.add(k.decodeRow(s, c));
for (const s of one("SELECT * FROM history").iterate()) history.add(k.decodeRow(s, c));
for (const s of one("SELECT * FROM journal").iterate()) {
  journal.add(k.decodeRow(s, c));
  verbatim++;
}
for (const rec of one("SELECT * FROM jrec").iterate())
  for (const s of k.jrecSynth(rec, c)) {
    journal.add(k.decodeRow(s, c));
    fromRecords++;
  }
const report = JSON.stringify({
  file,
  facts: facts.done(),
  history: history.done(),
  journal: journal.done(),
  fromRecords,
  verbatim,
});
if (process.argv[3]) fs.writeFileSync(process.argv[3], report + "\n", { flag: "wx" });
console.log(report);
