import { DatomicClient } from "../../../../packages/datomic/dist/index.js";
import { worldOf } from "./golden-world.ts";
import fs from "node:fs";
import http from "node:http";
import { openComposition } from "../../../bench/lib/composition.ts";
import { canonical, sha256, V_W0, reachableRows } from "../../../bench/lib/w0-world.ts";
import { subjectList } from "../../../bench/lib/sweep.ts";
import { evaluateW0, loadW0Pins } from "../../../bench/lib/evaluate.ts";
// [DX-H6] Why: preserve actual response bytes alongside the old decoder's worlds and outputs.
// Rejected: synthetic population rows (cannot measure protocol decode or prove stored positions).
const out = "/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-H6/recorded-pages";
fs.mkdirSync(out, { recursive: true });
if (fs.existsSync(out + "/manifest.json")) throw Error("recording is immutable");
let page = -1;
const request = DatomicClient.prototype.request;
DatomicClient.prototype.request = function (method: any, path: any, body: any, ...rest: any[]) {
  return (request as any).call(
    this,
    method,
    path,
    String(path).includes("/reach") ? { ...body, full: true } : body,
    ...rest,
  );
};
const original = http.request;
(http as any).request = function (...args: any[]) {
  const req = (original as any)(...args);
  if (String(args[0]?.pathname ?? args[0]?.path).includes("/reach")) {
    const n = page,
      chunks: Buffer[] = [];
    const write = req.write.bind(req),
      end = req.end.bind(req);
    req.write = (chunk: any, ...rest: any[]) => {
      chunks.push(Buffer.from(chunk));
      return write(chunk, ...rest);
    };
    req.end = (chunk: any, ...rest: any[]) => {
      if (chunk && typeof chunk !== "function") chunks.push(Buffer.from(chunk));
      fs.writeFileSync(`${out}/request-${n}.json`, Buffer.concat(chunks));
      return end(chunk, ...rest);
    };
    req.on("response", (res: any) => {
      const bytes: Buffer[] = [];
      res.on("data", (c: Buffer) => bytes.push(c));
      res.on("end", () => {
        if (res.statusCode !== 200) throw Error("HTTP " + res.statusCode);
        fs.writeFileSync(`${out}/response-${n}.json`, Buffer.concat(bytes));
      });
    });
  }
  return req;
};
const sources = Object.fromEntries(
  [
    "lab/experiments/EXP-DX1/h6/record.ts",
    "lab/experiments/EXP-DX1/h6/golden-world.ts",
    "lab/bench/lib/w0-public.ts",
    "lab/bench/lib/w0-world.ts",
    "lab/bench/lib/w0-datomic-reader.ts",
    "lab/bench/lib/composition.ts",
    "lab/bench/lib/triplex.ts",
    "lab/bench/lib/w0-cache.ts",
    "lab/bench/lib/evaluate.ts",
    ...fs
      .readdirSync("packages/datomic/dist")
      .filter((f) => f.endsWith(".js"))
      .map((f) => "packages/datomic/dist/" + f),
  ].map((file) => [file, sha256(fs.readFileSync(file))]),
);
const sourceRoot = "/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-H6/recorded-source";
for (const file of Object.keys(sources)) {
  const target=sourceRoot+"/"+file;fs.mkdirSync(target.slice(0,target.lastIndexOf('/')),{recursive:true});
  fs.copyFileSync(file,target);
}
const scope = "dxh5-w0-1000-v1",
  comp = await openComposition("reach", "datomic", scope);
const pins = await loadW0Pins(),
  subjects = subjectList(1000),
  basis = { position: await comp.currentPosition(), validAt: V_W0 };
const manifest: any = {
  classification: "DIAGNOSTIC-GOLDEN-NOT-ACCEPTANCE",
  scope,
  basis,
  sources,
  pages: [],
  files: {},
};
try {
  if (basis.position !== 42775) throw Error("sealed seed head mismatch");
  for (let offset = 0; offset < subjects.length; offset += 64) {
    page = offset / 64;
    const roots = subjects.slice(offset, offset + 64),
      body = await comp.sweepPage(roots, basis),
      records = [];
    for (const subject of roots) {
      const world = worldOf(subject, reachableRows([subject], body.rows));
      const result = await evaluateW0(world, "R2", basis, pins);
      records.push({ subject, world, ...result });
    }
    fs.writeFileSync(`${out}/golden-${page}.json`, canonical(records));
    manifest.pages.push({ page, subjects: roots, rows: body.rows.length });
  }
  for (const file of fs.readdirSync(out).sort())
    if (file !== "manifest.json") manifest.files[file] = sha256(fs.readFileSync(out + "/" + file));
  for (const [file, hash] of Object.entries(sources))
    if (sha256(fs.readFileSync(file)) !== hash) throw Error("recording source changed: " + file);
  fs.writeFileSync(out + "/manifest.json", JSON.stringify(manifest, null, 2) + "\n");
} finally {
  await comp.close();
}
