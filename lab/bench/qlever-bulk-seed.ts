#!/usr/bin/env node
/**
 * QLever bulk seed (engine-free): build the N-Quads file of a seeded NS rung for `qlever-index`, plus the
 * seed manifest the driver needs (`driver.ts --seed-manifest`).
 *
 *   node lab/bench/qlever-bulk-seed.ts --rung 10k [--subjects N] [--seed ns-v2] --out runs/qlever-seed/<name>
 *     -> <out>/seed.nq           every triple the seed commands would have written, in the scope's named graph
 *        <out>/manifest.json     scope, positions, instants, txIds, per-subject state, recorded oracle commands
 *
 * [EXP-N01] Why: transacts on QLever cost 0.7-1.5 s each and about 30 facts/s (2026-11-07 probe), so a 10k rung
 * (about 380k facts) would take hours through SPARQL UPDATE. Here the REAL Triplex write path runs (core
 * `Triples.transact` over the public `makeQleverStorageAdapter`), but against a capture client that applies
 * each UPDATE's VALUES rows to an in-memory graph instead of sending it. The bytes are therefore exactly what
 * the adapter would have stored (rows, field channels, order keys, claims, operation receipts, the journal,
 * the meta position); only the transport differs. The capture client answers the few queries a pure-assert
 * transact makes (source position, command claim, operation receipt, initialize) and refuses any other query,
 * so an unexpected read cannot silently return a wrong empty answer.
 * Rejected: hand-writing the RDF encoding (it would drift from the adapter); transacts against a scratch QLever
 * (the slow path this replaces).
 * Engine side (not done here; lab/bin/engine.mjs owns it): create the slot volume with seed.nq in /data and
 * build the index from it instead of bootstrap.nt (`qlever-index -i triplex -f seed.nq -F nq ...`), keeping
 * the bootstrap triple, then start the server as usual. The driver then runs with --seed-manifest.
 */
import { createHash } from "node:crypto";
import fs from "node:fs";
import zlib from "node:zlib";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { Effect, Layer } from "effect";
import { REPO, core, runtimeApi } from "./lib/triplex.ts";
import type { CompositionHandle, Outcome, Receipt } from "./lib/composition.ts";
import { seedRung } from "./lib/seed.ts";
import { RUNGS, accountOfSubject, accountsFor, populationCounts } from "./lib/world.ts";
import { chooseSamples } from "./lib/samples.ts";
import { ManagedRuntime } from "effect";

const argv = process.argv.slice(2);
const opt = (k: string, d?: string) => (argv.includes(`--${k}`) ? argv[argv.indexOf(`--${k}`) + 1] : d);
const rung = opt("rung", "10k")!;
const subjects = opt("subjects") ? Number(opt("subjects")) : RUNGS[rung]!;
const seedLabel = opt("seed", "ns-v2")!;
const out = path.resolve(opt("out") ?? "");
if (!out.startsWith(path.join(REPO, "runs") + path.sep)) throw new Error("--out must be under runs/");
fs.mkdirSync(out, { recursive: true });
const qlever: any = await import(pathToFileURL(path.join(REPO, "packages/qlever/dist/index.js")).href);

// ---------------------------------------------------------------- capture client

const META = "<urn:triplex:meta>";
const F = (c: string) => `<urn:triplex:field:${c}>`;
// Streaming: assertion, claim and operation subjects are new in every seed command, so their quads are written
// as each UPDATE arrives; only the meta subject (overwritten by every commit) and the last UPDATE's subjects
// (for the adapter's receipt read-back) are kept in memory. 10k-rung seeds are about 23M quads.
const XSD_INT = "<http://www.w3.org/2001/XMLSchema#integer>";
const toNq = (o: string) => (/^-?\d+$/.test(o) ? `"${o}"^^${XSD_INT}` : o);
// Gzip members of about 8 MiB each (a concatenation is one valid gzip stream): the host disk is nearly full,
// and qlever-index reads the decompressed stream from stdin (`gunzip -c seed.nq.gz | qlever-index -f - -F nq`).
const nqFile = path.join(out, "seed.nq.gz");
const nqFd = fs.openSync(nqFile, "w");
let pending = "";
const rawHash = createHash("sha256");
let rawBytes = 0;
const emit = (text: string, flush = false) => {
  pending += text;
  if (pending.length < 8 << 20 && !flush) return;
  rawHash.update(pending);
  rawBytes += Buffer.byteLength(pending);
  fs.writeSync(nqFd, zlib.gzipSync(pending, { level: 6 }));
  pending = "";
};
emit(`<urn:triplex:bootstrap> <urn:triplex:format> "1" .\n`);
const meta = new Map<string, string>();
let recent = new Map<string, string>();
const seenSubjects = new Set<string>();
let graphIri = "";
let updates = 0, quads = 0;
const graph = { get: (key: string) => (key.startsWith(META) ? meta.get(key) : recent.get(key)) };
const unexpected: string[] = [];
const valueOf = (s: string, p: string) => graph.get(`${s} ${p}`);
const unlit = (o: string | undefined) => (o === undefined ? undefined : o.startsWith('"') ? JSON.parse(o.slice(0, o.lastIndexOf('"') + 1)) : o);

function applyUpdate(sparql: string) {
  const g = /INSERT \{ GRAPH (<[^>]+>)/.exec(sparql)?.[1];
  if (!g) throw new Error("capture: unrecognized UPDATE shape");
  if (graphIri && g !== graphIri) throw new Error("capture: more than one scope graph");
  graphIri = g;
  const start = sparql.indexOf("VALUES (?s ?p ?new) {");
  const end = sparql.lastIndexOf("} OPTIONAL {");
  if (start < 0 || end < 0) throw new Error("capture: UPDATE has no VALUES block");
  recent = new Map();
  let chunk = "";
  for (const line of sparql.slice(start + "VALUES (?s ?p ?new) {".length, end).split("\n")) {
    const row = line.trim();
    if (!row) continue;
    if (!row.startsWith("(<") || !row.endsWith(")")) throw new Error(`capture: bad VALUES row ${row.slice(0, 120)}`);
    const body = row.slice(1, -1);
    const s1 = body.indexOf("> ") + 1;
    const s = body.slice(0, s1);
    const rest = body.slice(s1 + 1);
    const p1 = rest.indexOf("> ") + 1;
    const key = `${s} ${rest.slice(0, p1)}`, o = rest.slice(p1 + 1);
    if (s === META) { meta.set(key, o); continue; }
    recent.set(key, o);
    chunk += `${key} ${toNq(o)} ${g} .\n`;
    quads++;
  }
  // A subject written by two commands would need overwrite semantics; seeds never do that, so refuse it.
  for (const subject of new Set([...recent.keys()].map((k) => k.slice(0, k.indexOf("> ") + 1)))) {
    if (seenSubjects.has(subject)) throw new Error(`capture: subject ${subject} rewritten by a later command; streaming needs new subjects`);
    seenSubjects.add(subject);
  }
  emit(chunk);
  updates++;
}

const captureClient = {
  async query(sparql: string): Promise<any[]> {
    if (/^SELECT \?s WHERE \{ \?s \?p \?o \} LIMIT 1$/.test(sparql)) return [];
    if (sparql.includes(`${META} ${F("position")} ?position`)) {
      const v = unlit(valueOf(META, F("position")));
      return v === undefined ? [] : [{ position: { type: "literal", value: String(v) } }];
    }
    const claim = /(<urn:triplex:claim:[^>]+>) <urn:triplex:field:tx_id> \?tx/.exec(sparql);
    if (claim) {
      const tx = unlit(valueOf(claim[1]!, F("tx_id")));
      return tx === undefined ? [] : [{ tx: { type: "literal", value: tx } }];
    }
    const op = /(<urn:triplex:operation:[^>]+>) <urn:triplex:field:attempt_id> \?attempt/.exec(sparql);
    if (op) {
      const attempt = unlit(valueOf(op[1]!, F("attempt_id")));
      return attempt === undefined ? [] : [{ attempt: { type: "literal", value: attempt } }];
    }
    unexpected.push(sparql.slice(0, 600));
    throw new Error(`capture: unexpected query during a bulk seed (refused): ${sparql.slice(0, 300)}`);
  },
  async update(sparql: string) {
    applyUpdate(sparql);
    return {};
  },
  async command() { throw new Error("capture: commands are not used by seeding"); },
  async cancel() {},
  async close() {},
};

// ---------------------------------------------------------------- a Triplex runtime over the capture client

const scopeName = `ns-qlever-${rung}-bulk-${seedLabel}-${createHash("sha256").update(`${subjects}`).digest("hex").slice(0, 8)}`;
const scope = runtimeApi.DatabaseScope.test(scopeName);
const definition = runtimeApi.Runtime.define({
  name: "qlever",
  storage: Layer.effect(runtimeApi.StorageAdapter, Effect.gen(function* () {
    const rt: any = yield* Effect.service(runtimeApi.TripleStoreRuntime);
    return qlever.makeQleverStorageAdapter(captureClient, rt.scope, {});
  })),
  queries: Layer.effect(runtimeApi.QueryExecutor, Effect.gen(function* () {
    const rt: any = yield* Effect.service(runtimeApi.TripleStoreRuntime);
    return qlever.makeQleverQueryExecutor(captureClient, rt.scope, {});
  })),
});
const managed: any = (ManagedRuntime as any).make(definition.layer({ scope, capabilities: runtimeApi.Capabilities.none }));
const T: any = await managed.runPromise(Effect.service(core.Triples));
const failureOf = (exit: any) => { const f = exit?.cause?.failures?.[0]; const e = f?.error ?? f?.defect; return { ok: false as const, tag: String(e?._tag ?? f?._tag ?? "Unknown"), error: e }; };
const comp: Pick<CompositionHandle, "transact" | "transactionByCommand"> = {
  transact: async (operations, meta): Promise<Outcome<Receipt>> => {
    const exit = await managed.runPromiseExit(T.transact(operations, meta));
    return exit._tag === "Success" ? { ok: true, value: exit.value } : failureOf(exit);
  },
  transactionByCommand: async () => ({ ok: true, value: null }),
};

// ---------------------------------------------------------------- seed through the real write path

const accounts = accountsFor(subjects);
const oracleSubjects = chooseSamples(subjects, Number(opt("oracle-subjects", "12")));
const started = performance.now();
const seed = await seedRung({
  comp: comp as CompositionHandle, subjects, runTag: `bulk-${seedLabel}`, batchFacts: 400, budgetMs: Infinity,
  // The same O-REPLAY sample the driver uses (12 subjects); versioned-fact ids for every subject, so any
  // P4 history sample can be grown in place later.
  recordSubjects: new Set(oracleSubjects), recordAccounts: new Set(oracleSubjects.map((i) => accountOfSubject(i, accountsFor(subjects)))),
  historySubjects: new Set(Array.from({ length: subjects }, (_, i) => i)), log: (l) => process.stderr.write(l + "\n"),
});
await managed.dispose();
const pop = populationCounts(subjects, accounts);
if (unexpected.length) throw new Error(`capture refused ${unexpected.length} queries`);

// ---------------------------------------------------------------- write N-Quads and the manifest

let tail = "";
for (const [sp, o] of meta) { tail += `${sp} ${toNq(o)} ${graphIri} .\n`; quads++; }
emit(tail, true);
fs.closeSync(nqFd);
const nqSha = rawHash.digest("hex");
const manifest = {
  format: "tx2-ns-bulk-seed/1",
  lane: "qlever",
  rung, subjects, seed: seedLabel, scope: scopeName, graphIri, accounts,
  generatorSources: Object.fromEntries(["lab/bench/lib/world.ts", "lab/bench/lib/seed.ts", "lab/bench/qlever-bulk-seed.ts", "packages/qlever/dist/QleverStorageAdapter.js", "packages/qlever/dist/rdf.js"].map((f) => [f, createHash("sha256").update(fs.readFileSync(path.join(REPO, f))).digest("hex")])),
  nq: { file: "seed.nq.gz", format: "N-Quads, gzip members", sha256OfDecompressed: nqSha, sha256: nqSha, quads, decompressedBytes: rawBytes, gzipBytes: fs.statSync(nqFile).size },
  capture: { updates, wallS: (performance.now() - started) / 1000 },
  result: {
    seededSubjects: seed.seededSubjects, complete: seed.complete, commands: seed.commands, assertions: seed.assertions, expectedAssertions: pop.seedAssertions,
    firstPosition: seed.firstPosition, lastPosition: seed.lastPosition, lastInstant: seed.lastInstant,
    state: [...seed.state].map(([i, s]) => [i, s.stampId, s.addressId]),
    versionIds: [...seed.versionIds],
  },
  recorded: seed.recorded,
  note: "instants are the capture-time runtime clock; every later read and commit on the indexed server is later, so they stay ordered",
};
fs.writeFileSync(path.join(out, "manifest.json"), JSON.stringify(manifest) + "\n");
console.log(JSON.stringify({ out: path.relative(REPO, out), scope: scopeName, subjects: seed.seededSubjects, assertions: seed.assertions, closedForm: pop.seedAssertions === seed.assertions, commands: seed.commands, quads, nqBytes: rawBytes, gzBytes: manifest.nq.gzipBytes, wallS: manifest.capture.wallS.toFixed(1) }));
