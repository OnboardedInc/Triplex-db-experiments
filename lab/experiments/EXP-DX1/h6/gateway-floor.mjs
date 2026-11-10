import fs from "node:fs";
import { createHash } from "node:crypto";
// [DX-H6] Why: quantify a compact wire request for the gateway owner without editing its implementation.
// Rejected: claiming a parse-only diagnostic is a validated new gateway route or a complete decoder.
const root = "/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-H6",
  recording = root + "/recorded-pages";
const out = root + "/gateway-floor";
fs.mkdirSync(out, { recursive: true });
const m = JSON.parse(fs.readFileSync(recording + "/manifest.json"));
const pairs = m.pages.map((p) => {
  const original = fs.readFileSync(recording + `/response-${p.page}.json`, "utf8"),
    r = JSON.parse(original);
  const compact = {
    ...r,
    entities: r.entities.map(([id, rev, rows]) => [
      id,
      rev,
      rows.map((v) => {
        if (!Array.isArray(v) || v.length !== 17)
          throw Error("floor only handles recorded modern rowPage");
        const type = v[4];
        let value;
        if (["string", "ref", "integer"].includes(type)) value = v[5];
        else if (type === "boolean") value = v[7];
        else if (type === "json") value = v[9];
        else throw Error("unhandled recorded value kind " + type);
        return [Number(v[0]), v[1], v[3], type, value, v[10], v[11], v[12]];
      }),
    ]),
  };
  const bytes = JSON.stringify(compact);
  fs.writeFileSync(out + `/compact-${p.page}.json`, bytes);
  return { original, compact: bytes };
});
const rounds = [];
for (let round = 0; round < 4; round++) {
  const sample = { round };
  for (const variant of round % 2 ? ["compact", "original"] : ["original", "compact"]) {
    const c = process.cpuUsage();
    let entities = 0;
    for (const pair of pairs) entities += JSON.parse(pair[variant]).entities.length;
    const d = process.cpuUsage(c);
    sample[variant] = { cpuS: (d.user + d.system) / 1e6, entities };
  }
  rounds.push(sample);
}
const bytes = Object.fromEntries(
  ["original", "compact"].map((v) => [v, pairs.reduce((n, p) => n + Buffer.byteLength(p[v]), 0)]),
);
const hash = (x) => createHash("sha256").update(x).digest("hex");
const result = {
  classification: "PARSE-ONLY-DIAGNOSTIC-NOT-A-GATEWAY-IMPLEMENTATION",
  recordingSha256: hash(fs.readFileSync(recording + "/manifest.json")),
  scriptSha256: hash(fs.readFileSync(import.meta.filename)),
  bytes,
  rounds,
  caveat:
    "Retains per-row id/position/type/value/record/valid times, hoists entity id, removes unused physical metadata/null value channels. No engine route, metadata validation, full decoder, workload throughput or semantic acceptance is measured.",
};
fs.writeFileSync(out + "/metrics.json", JSON.stringify(result, null, 2) + "\n");
console.log(JSON.stringify(result));
