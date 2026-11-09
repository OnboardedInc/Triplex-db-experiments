#!/usr/bin/env node
/**
 * XTDB seed-only writer (EXP-K01; R26 section 6.6 item 1): seed one NS rung through the real commit path into the live
 * XTDB slot that XTDB_URL names, and write the seed manifest the driver continues from (`driver.ts --seed-manifest`).
 *
 *   XTDB_URL=... node lab/bench/xtdb-seed.ts --rung 10k [--subjects N] [--seed ns-v2] [--seed-batch-facts 400]
 *     [--oracle-subjects 12] [--composition public|public-queued] [--seed-budget-s S] --out runs/xtdb-seed/<name>
 *   -> <out>/manifest.json  format tx2-xtdb-seed/1: the fields of qlever-bulk-seed.ts's tx2-ns-bulk-seed/1 manifest
 *                           (scope, result.{firstPosition,lastPosition,lastInstant,state,versionIds}, recorded, capture.wallS)
 *                           plus seedInputs, the seed half of the RULINGS Q74a golden key
 *
 * Then: `engine.mjs settle` (a fresh-seeded arm, Q74b) or `engine.mjs golden --manifest <out>/manifest.json`.
 *
 * [EXP-K01] Why: the driver seeds and measures in one process, so its seed cannot be frozen and reused. This writer runs
 * the same seedRung with the same oracle and history samples the driver and qlever-bulk-seed.ts use, but with a
 * deterministic scope name and command ids (no per-run tag), so two seeds of the same inputs write the same rows and a
 * golden key names exactly what produced the bytes. Version ids are kept for every subject (as the QLever manifest
 * does), so any P4 history sample can be grown in place later.
 * Rejected: a --seed-only flag on driver.ts (the driver's scope name carries a random runTag; two entry points with one
 * seed routine are simpler than a driver with two lifecycles).
 */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { openComposition } from "./lib/composition.ts";
import { pinXtdb } from "./lib/g0-xtdb.ts";
import { seedRung } from "./lib/seed.ts";
import { chooseSamples } from "./lib/samples.ts";
import { RUNGS, accountOfSubject, accountsFor, populationCounts } from "./lib/world.ts";
import { REPO } from "./lib/triplex.ts";

const argv = process.argv.slice(2);
const opt = (k: string, d?: string) => (argv.includes(`--${k}`) ? argv[argv.indexOf(`--${k}`) + 1] : d);
const rung = opt("rung", "10k")!;
const subjects = opt("subjects") ? Number(opt("subjects")) : RUNGS[rung]!;
if (!Number.isSafeInteger(subjects) || subjects < 1) throw new Error(`--rung ${rung} / --subjects: no subject count`);
const seedLabel = opt("seed", "ns-v2")!;
const batchFacts = Number(opt("seed-batch-facts", "400"));
const oracleSubjectsN = Number(opt("oracle-subjects", "12"));
const composition = opt("composition", "public")!;
const budgetS = opt("seed-budget-s") ? Number(opt("seed-budget-s")) : null;
const out = path.resolve(opt("out") ?? "");
if (!out.startsWith(path.join(REPO, "runs") + path.sep)) throw new Error("--out must be under runs/");
if (fs.existsSync(path.join(out, "manifest.json"))) throw new Error(`${path.relative(REPO, out)}/manifest.json exists; seeds are write-once`);
if (!process.env["XTDB_URL"]) throw new Error("XTDB_URL is required (the endpoint engine.mjs up printed)");
fs.mkdirSync(out, { recursive: true });

const sha = (b: Buffer | string) => createHash("sha256").update(b).digest("hex");
const git = (args: string[]) => execFileSync("git", ["-C", REPO, ...args], { encoding: "utf8", maxBuffer: 256 << 20 }).trim();
/** Same tree hash as gate.mjs hashDist: sha256 over "<sha256>  <path>\n" lines of every file under packages/<pkg>/dist. */
function distTree(pkg: string) {
  const root = path.join(REPO, "packages", pkg, "dist");
  const files: string[] = [];
  const visit = (dir: string) => { for (const e of fs.readdirSync(dir, { withFileTypes: true })) { const p = path.join(dir, e.name); if (e.isDirectory()) visit(p); else if (e.isFile()) files.push(p); } };
  if (!fs.existsSync(root)) throw new Error(`packages/${pkg}/dist is missing; build first`);
  visit(root);
  const lines = files.map((f) => path.relative(REPO, f)).sort((a, b) => a.localeCompare(b)).map((rel) => `${sha(fs.readFileSync(path.join(REPO, rel)))}  ${rel}\n`);
  return { files: lines.length, sha256: sha(lines.join("")) };
}

// ---------------------------------------------------------------- the seed half of the golden key (Q74a)

const runTag = `seed-${seedLabel}`;
const scopeName = `ns-xtdb-${opt("subjects") ? `dev${subjects}` : rung}-seed-${seedLabel}-${sha(`${subjects}`).slice(0, 8)}`;
const ADAPTER_PATHS = ["packages/core", "packages/xtdb", "packages/qualification"];
const GENERATOR_FILES = ["lab/bench/xtdb-seed.ts", "lab/bench/lib/g0.ts", "lab/bench/lib/g0-schema.ts", "lab/bench/lib/g0-catalog.ts", "lab/bench/lib/g0-values.ts", "lab/bench/lib/g0-wire.ts", "lab/bench/lib/g0-native.ts", "lab/bench/lib/g0-normalize.ts", "lab/bench/lib/g0-xtdb.ts", "lab/bench/lib/n01-counts.ts", "lab/bench/lib/world.ts", "lab/bench/lib/commands.ts", "lab/bench/lib/seed.ts", "lab/bench/lib/rng.ts", "lab/bench/lib/samples.ts", "lab/bench/lib/composition.ts", "lab/bench/lib/triplex.ts"];
const dirtyAdapter = git(["status", "--porcelain=v1", "--", ...ADAPTER_PATHS.map((p) => `${p}/src`)]);
const seedInputs = {
  format: "tx2-xtdb-seed-inputs/1",
  adapter: {
    commit: git(["log", "-1", "--format=%H", "--", ...ADAPTER_PATHS]),
    dirty: dirtyAdapter.length > 0,
    diffSha256: dirtyAdapter.length ? sha(execFileSync("git", ["-C", REPO, "diff", "HEAD", "--binary", "--", ...ADAPTER_PATHS], { maxBuffer: 1 << 30 })) : null,
    dist: Object.fromEntries(["core", "xtdb", "qualification"].map((p) => [p, distTree(p)])),
  },
  generator: Object.fromEntries(GENERATOR_FILES.map((f) => [f, sha(fs.readFileSync(path.join(REPO, f)))])),
  options: { rung: opt("subjects") ? `dev:${subjects}` : rung, subjects, seed: seedLabel, seedBatchFacts: batchFacts, oracleSubjects: oracleSubjectsN, historySubjects: "all", composition, runTag, scope: scopeName, budgetS },
};

// ---------------------------------------------------------------- seed through the real write path

const comp = await openComposition(composition, "xtdb", scopeName);
const startPosition = await comp.currentPosition();
if (startPosition !== 0) throw new Error(`scope ${scopeName} is at position ${startPosition}, not 0: seed into a fresh slot (engine.mjs up --fresh)`);
const accounts = accountsFor(subjects);
const oracleSubjects = chooseSamples(subjects, oracleSubjectsN);
const log = (l: string) => process.stderr.write(`[xtdb-seed ${new Date().toISOString().slice(11, 19)}] ${l}\n`);
log(`seeding ${subjects} subjects (${accounts} accounts) into scope ${scopeName} at ${comp.backend.url} through composition ${composition}`);
const startedAt = new Date().toISOString();
const t0 = performance.now();
const seed = await seedRung({
  comp, subjects, runTag, batchFacts, budgetMs: budgetS === null ? Infinity : budgetS * 1000,
  recordSubjects: new Set(oracleSubjects), recordAccounts: new Set(oracleSubjects.map((i) => accountOfSubject(i, accounts))),
  historySubjects: new Set(Array.from({ length: subjects }, (_, i) => i)), log,
});
const wallS = (performance.now() - t0) / 1000;
const endPosition = await comp.currentPosition();
await comp.close().catch(() => {});
if (endPosition !== seed.lastPosition) throw new Error(`engine position ${endPosition} differs from the seed's last receipt position ${seed.lastPosition}`);
const pop = populationCounts(seed.seededSubjects, accounts);

const manifest = {
  format: "tx2-xtdb-seed/1",
  lane: "xtdb",
  rung: seedInputs.options.rung, subjects, seed: seedLabel, scope: scopeName, accounts,
  seedInputs,
  engine: { url: comp.backend.url, container: process.env["TX2_ENGINE_CONTAINER"] ?? null },
  capture: { wallS, startedAt, endedAt: new Date().toISOString() },
  result: {
    seededSubjects: seed.seededSubjects, complete: seed.complete, commands: seed.commands, assertions: seed.assertions, expectedAssertions: pop.seedAssertions,
    assertionsMatchClosedForm: pop.seedAssertions === seed.assertions, factsPerS: seed.factsPerS, commitMs: seed.commitMs, failureCount: seed.failures.length, failures: seed.failures.slice(0, 10),
    firstPosition: seed.firstPosition, lastPosition: seed.lastPosition, lastInstant: seed.lastInstant,
    state: [...seed.state].map(([i, s]) => [i, s.stampId, s.addressId]),
    versionIds: [...seed.versionIds],
  },
  recorded: seed.recorded,
};
// [EXP-K01-R13] Why: a diagnostic smoke must preserve seed inputs even if pinning refuses, without inventing a completed manifest or pin. Rejected: losing the only command/receipt record at the first diagnostic failure.
if (argv.includes("--diagnostic")) fs.writeFileSync(path.join(out,"unqualified-manifest.json"),JSON.stringify({...manifest,format:"tx2-xtdb-seed-diagnostic/1",diagnosticOnly:true})+"\n",{flag:"wx"});
// [EXP-K01-R7] Why: D is pinned after the last seed commit and before any freeze step, independently of process diagnostics. Rejected: deriving D from the frozen copy.
const g0 = await pinXtdb(comp.backend.url, manifest);
fs.writeFileSync(path.join(out, "manifest.json"), JSON.stringify({...manifest,g0}) + "\n");
console.log(JSON.stringify({ out: path.relative(REPO, out), scope: scopeName, subjects: seed.seededSubjects, complete: seed.complete, assertions: seed.assertions, closedForm: manifest.result.assertionsMatchClosedForm, commands: seed.commands, lastPosition: seed.lastPosition, wallS: Number(wallS.toFixed(1)), factsPerS: Number(seed.factsPerS.toFixed(1)) }));
