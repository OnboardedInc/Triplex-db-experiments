// [EXP-HS01] Why: freeze one source revision and run dependency-ordered checks with append-only receipts.
// Rejected: concurrent builds/seeds (a clean build can remove files imported by a seed process).
import fs from "node:fs";
import path from "node:path";
import { spawn, execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
// HS01_ATTEMPT continues an earlier attempt id and HS01_ONLY (comma-separated stage labels) runs just those stages, so a
// series interrupted by the 5 GiB disk floor resumes on the same source without repeating completed stages.
const base = "/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-HS01",
  attempt = process.env.HS01_ATTEMPT ?? "r3-final-" + randomUUID(),
  only = process.env.HS01_ONLY?.split(",");
const stages = [];
const resultFile = path.join(
  base,
  attempt + "-pipeline" + (only ? "-resume-" + Date.now() : "") + ".json",
);
fs.mkdirSync(base, { recursive: true });
const run = async (label, cmd, heavy = true, env = {}) => {
  if (only && !only.includes(label)) return 0;
  const args = [
    "lab/experiments/EXP-HS01/run.mjs",
    attempt + "-" + label,
    ...(heavy ? ["node", "lab/bin/heavy.mjs", "--label", "CX-HS01-" + label, "--"] : []),
    ...cmd,
  ];
  const child = spawn(process.execPath, args, {
    stdio: "inherit",
    env: { ...process.env, ...env },
  });
  const code = await new Promise((resolve) => child.once("close", resolve));
  stages.push({ label, cmd, code, at: new Date().toISOString() });
  fs.writeFileSync(resultFile, JSON.stringify({ attempt, stages }, null, 2));
  return code;
};
await run("build", ["node", "lab/experiments/EXP-HS01/build.mjs"]);
await run("hs01", [
  "node_modules/.bin/vitest",
  "run",
  "--config",
  "lab/verify/HS01/vitest.config.ts",
]);
// gate.mjs owns the same heavy admission internally; an outer token would deadlock a saturated pool.
await run(
  "g0-xtdb",
  ["node", "lab/bin/gate.mjs", "G0", "--lane", "xtdb", "--exp", "EXP-HS01"],
  false,
);
await run(
  "g0-qlever",
  ["node", "lab/bin/gate.mjs", "G0", "--lane", "qlever", "--exp", "EXP-HS01"],
  false,
);
await run("sql01", [
  "node_modules/.bin/vitest",
  "run",
  "--config",
  "lab/verify/SQL01/vitest.config.ts",
]);
await run("p2q", [
  "node_modules/.bin/vitest",
  "run",
  "--config",
  "lab/verify/P2Q/vitest.config.ts",
  "--exclude",
  "**/live/**",
  "--exclude",
  "**/check1-*",
  "--exclude",
  "**/check2-ack*",
  "--exclude",
  "**/check4-feed*",
  "--exclude",
  "**/round10-types*",
  "--exclude",
  "**/round10-public-type*",
  "-t",
  "^(?!.*a burned LSN)",
]);
await run("storage", [
  "node_modules/.bin/vitest",
  "run",
  "--config",
  "lab/verify/P2Q/vitest.config.ts",
  "check2-ack.test.ts",
  "check4-feed.test.ts",
  "check5-q31c.test.ts",
  "-t",
  "sequential resend|two transactions that read|100 crashes per variant|nested transacts|rejects|ordinal",
]);
await run("route", [
  "node_modules/.bin/vitest",
  "run",
  "--root",
  "packages/testkit",
  "--maxWorkers",
  "1",
  "--no-file-parallelism",
]);
await run("kill80", ["node", "lab/verify/HS01/kill.mjs"]);
fs.mkdirSync("lab/experiments/EXP-SQL01/evidence", { recursive: true });
await run("flip", ["node", "lab/experiments/EXP-SQL01/flip-wal.mjs"]);
// [EXP-HS01-R3] Why: the reviewer's round 2 test (a byte-identical copy of CX-VHS01's lab/verify/HS01/round2/review.test.ts) runs against the
// final source, and the abrupt-stop schedule runs a second time with the journal record option ON.
await run("review-r2", [
  "node_modules/.bin/vitest",
  "run",
  "--config",
  "lab/verify/HS01/round2/vitest.config.ts",
]);
await run("kill80-records", ["node", "lab/verify/HS01/kill.mjs"], true, {
  HS01_JOURNAL_RECORDS: "1",
});
// Seeds, one store at a time (disk): W0 ids at 1k and 10k, journal option OFF then ON with the SAME deterministic scope so both stores
// hold the same logical rows; each 10k store is digested row by row (records expanded), archived and removed. Then the ULID-shaped diagnostic.
const SCOPE = "hs01:r3-shared-scope";
const seedPair = async (ids, sizes, extra = {}) => {
  for (const N of sizes)
    for (const mode of ["off", "on"]) {
      const out = path.join(base, attempt + "-" + ids + "-" + N + "-" + mode);
      const env = {
        HS01_SCOPE: SCOPE,
        HS01_IDS: ids,
        ...(mode === "on" ? { HS01_JOURNAL: "records" } : {}),
        ...extra,
      };
      await run(
        "seed-" + ids + "-" + N + "-" + mode,
        ["node_modules/.bin/tsx", "lab/bench/hs01-seed.ts", out, String(N)],
        true,
        env,
      );
      if (N === 10000) {
        await run("digest-" + ids + "-" + N + "-" + mode, [
          "node_modules/.bin/tsx",
          "lab/bench/hs01-digest.ts",
          path.join(out, "store/broker.db"),
          path.join(out, "digest.json"),
        ]);
        await run(
          "archive-" + ids + "-" + N + "-" + mode,
          ["node", "lab/experiments/EXP-HS01/archive-store.mjs", out],
          false,
        );
      }
    }
};
await seedPair("w0", [1000, 10000]);
const patchState = path.join(base, attempt + "-ulid-patch.json");
await run(
  "ulid-patch-apply",
  ["node", "lab/bench/hs01-ulid-patch.mjs", "apply", patchState],
  false,
);
await seedPair("ulid", [10000]);
await run(
  "ulid-patch-restore",
  ["node", "lab/bench/hs01-ulid-patch.mjs", "restore", patchState],
  false,
);
// [EXP-HS01] Why: reproduce the lab pack inventory, building only its declared packages in dependency order.
// Rejected: root turbo build (would include the out-of-scope DuckDB and independent UI applications).
const buildPack = String.raw`
import fs from 'node:fs';import path from 'node:path';import {execFileSync}from 'node:child_process';
const root=process.cwd(),exclude=JSON.parse(fs.readFileSync('lab/config/pack-exclusions.json')),items=new Map();
for(const e of fs.readdirSync('packages')){const p=path.join('packages',e,'package.json');if(!fs.existsSync(p))continue;const m=JSON.parse(fs.readFileSync(p));if(!exclude[m.name])items.set(m.name,{dir:path.dirname(p),m});}
const done=new Set();function build(name){if(done.has(name))return;const x=items.get(name);for(const dep of Object.keys({...x.m.dependencies,...x.m.devDependencies}))if(items.has(dep))build(dep);execFileSync('/bin/sh',['-c',x.m.scripts.build],{cwd:x.dir,env:{...process.env,PATH:path.join(root,'node_modules/.bin')+':'+process.env.PATH},stdio:'inherit'});done.add(name);}for(const name of items.keys())build(name);
`;
await run("pack-build", ["node", "--input-type=module", "-e", buildPack]);
await run("pack", ["node", "lab/bin/check-packages.mjs"], true, {
  TRIPLEX_PACK_ARTIFACT_ROOT: path.join(base, attempt + "-pack"),
});
await run("evaluator", [
  "node",
  "--test",
  "lab/bin/test/claim.test.mjs",
  "lab/bin/test/claim-round2.test.mjs",
]);
await run("lint", [
  "node_modules/.bin/oxlint",
  "packages/qlever/src/broker",
  "lab/verify/HS01",
  "lab/bench/hs01-seed.ts",
  "lab/bench/hs01-digest.ts",
  "lab/bench/hs01-ulid-patch.mjs",
  "lab/bench/hs01-terms.mjs",
  "lab/experiments/EXP-HS01",
  "--deny-warnings",
]);
const changed = execFileSync("git", ["diff", "257d4d20", "--name-only"], { encoding: "utf8" })
  .trim()
  .split("\n")
  .filter((f) => /\.(ts|mjs)$/.test(f));
await run("format", ["node_modules/.bin/oxfmt", "--check", ...changed]);
await run("diff-check", ["git", "diff", "--check"]);
console.log(JSON.stringify({ attempt, resultFile, failed: stages.filter((x) => x.code !== 0) }));
process.exitCode = stages.some((s) => s.code !== 0) ? 1 : 0;
