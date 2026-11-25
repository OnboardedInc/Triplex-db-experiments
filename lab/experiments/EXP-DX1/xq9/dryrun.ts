// [DX-XQ9] Mac dry run of Arm C of xq6/server.ts (code paths only; nothing measured): seeds 1,000 loader-shaped
// subjects of account-003 (roots pl:, tasks i9:<n> and i9:<n>:t<k> with :task/status, profiles wk: with pay) on this toy
// stack, writes a demo-style ready file that states the shapes, runs server.ts with small overrides and DX_XQ9_SKIP_B=1.
//   node lab/bin/heavy.mjs --label DX-XQ9-dryrun -- bash lab/experiments/EXP-DX1/xq9/gate.sh "$PWD" NEW_OUT_DIR dryrun
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { Effect, Layer, ManagedRuntime } from "effect";

const REPO = path.resolve(import.meta.dirname, "../../../..");
const dist = (pkg: string, file: string) => pathToFileURL(path.join(REPO, "packages", pkg, "dist", file)).href;
const core: any = await import(dist("core", "index.js"));
const runtimeApi: any = await import(dist("core", "runtime/index.js"));
const datomic: any = await import(dist("datomic", "index.js"));
const [out, writeUrl, readUrl, prefix] = process.argv.slice(2);
assert(out && writeUrl && readUrl && prefix);
fs.mkdirSync(out, { recursive: true });
const scope = runtimeApi.DatabaseScope.test(`xq9-dry-${process.pid}`);
const writer = new datomic.DatomicClient(writeUrl, 600_000);
const { db } = await writer.create(scope, "lean");
const rt = ManagedRuntime.make(runtimeApi.Runtime.define({
  name: "datomic",
  storage: Layer.succeed(runtimeApi.StorageAdapter, datomic.makeDatomicStorageAdapter(writer, scope, { layout: "lean", serverRecordTime: true })),
  queries: Layer.succeed(runtimeApi.QueryExecutor, datomic.makeDatomicQueryExecutor(writer, scope)),
}).layer({ scope, capabilities: runtimeApi.Capabilities.none })) as any;
const pad = (n: number) => String(n).padStart(8, "0");
const S = (v: string) => ({ type: "string", value: v });
const op = (e: string, a: string, value: object) => ({ op: "assert", entityId: e, entityType: "X", attribute: a, value, validFrom: 0 });
for (const acct of ["account-003", "account-001"])
  for (let i = 0; i < 1000; i += 100)
    await rt.runPromise(Effect.flatMap(core.Triples, (t: any) => t.transact(Array.from({ length: 100 }, (_, k) => {
      const n = i + k, base = `acct/${acct}/`;
      return [
        op(`${base}pl:${pad(n)}`, ":person/status", S(n % 2 ? "a" : "b")),
        op(`${base}wk:${pad(n)}`, ":person/custom-pay-cents", { type: "integer", value: String(1400 + ((n * 37) % 700)) }),
        ...Array.from({ length: 1 + (n % 5) }, (_, t) => op(`${base}i9:${pad(n)}${t ? `:t${t}` : ""}`, ":task/status", S((n + t) % 3 ? "pending" : "complete"))),
      ];
    }).flat(), { actor: "xq9-dry" })));
const old = Number((await writer.basis(db)).position.v);
const ready = { version: "triplex-demo-ready/1", prefix, database: db, writePort: Number(new URL(writeUrl).port), readPort: Number(new URL(readUrl).port),
  questionRoutes: { idLists: true, sweep: true, sweepShapes: "all" } };
fs.writeFileSync(path.join(out, "ready.json"), JSON.stringify(ready));
execFileSync("node", ["--no-warnings", "--experimental-transform-types", path.join(REPO, "lab/experiments/EXP-DX1/xq6/server.ts"), path.join(out, "ready.json"), path.join(out, "server")],
  { stdio: "inherit", env: { ...process.env, DX_XQ6_OLD: String(old), DX_XQ6_SERVER_SUBJECTS: "1000", DX_XQ6_WINDOW_S: "5", DX_XQ9_SKIP_B: "1" } });
// The write gateway's keep-alive socket sits idle through Arm C; a fresh client deletes the scope (dryrun-1 failed here
// with ECONNRESET after the runner had finished). The stack is removed by gate.sh either way.
await rt.dispose().catch(() => {});
writer.close();
const cleaner = new datomic.DatomicClient(writeUrl, 60_000);
await cleaner.delete(scope).catch((e: unknown) => console.log("scope delete failed (the stack is removed anyway):", String(e)));
cleaner.close();
