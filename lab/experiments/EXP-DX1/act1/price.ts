import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { DomainOracle, emptyWireState } from "../../../bench/lib/w0-gates.ts";
import { publishChanged } from "../../../bench/lib/w0-replica.ts";
import { W0, canonical, sha256 } from "../../../bench/lib/w0-world.ts";
import type { OutboxStore } from "../../../bench/lib/w0-outbox.ts";
import { observe, open, oracleRecord } from "./check.ts";

const N = 1000, script = import.meta.filename;
const [action, root, scope] = process.argv.slice(2);
if (!root || !["measure", "readback"].includes(action ?? "")) throw Error("price.ts measure NEW_DIRECTORY");
process.env.DX_ACT1_SQLITE_DIR = resolve(root);
if (action === "readback") {
  const expected = JSON.parse(readFileSync(join(root, "expected.json"), "utf8"));
  const comp = await open(scope!);
  try {
    const head = await comp.currentPosition();
    const rows = [];
    for (let i = 0; i < N; i += 64) {
      const page = expected.slice(i, i + 64);
      const states = await observe(comp, page.map((r: any) => r.subject), head);
      for (const [j, state] of states.entries()) rows.push({ subject: page[j].subject, state });
    }
    const bytes = canonical(rows);
    writeFileSync(join(root, scope + ".observed.json"), bytes, { flag: "wx" });
    const mismatches = rows.filter((r, i) => canonical(r) !== canonical(expected[i])).length;
    console.log(JSON.stringify({ scope, head, subjects: rows.length, mismatches, hash: sha256(bytes),
      guardsAtRelease: rows.filter((r, i) => canonical(r.state.subjects) === canonical(expected[i].state.subjects)).length }));
  } finally { await comp.close(); }
} else {
  mkdirSync(root, { recursive: false });
  const nonce = randomUUID(), expected = [], a: W0.EvaluationRecord[] = [], b: W0.EvaluationRecord[] = [];
  const rung = W0.rung(N), basis = W0.populationBasis(rung), later = { ...basis, tx: basis.tx + 1 };
  const oracle = new DomainOracle();
  let itemChanges = 0;
  try {
    for (const { world } of W0.population(rung)) {
      let prior = emptyWireState();
      for (const [release, cut, records] of [[W0.R1, basis, a], [W0.R2, later, b]] as const) {
        const result = W0.sweepSubject(world, release, cut);
        assert.ok(!("error" in result));
        const output = JSON.parse(await oracle.call("evaluate", { world, release: release.name, basis: cut }));
        assert.equal(result.json, canonical(output));
        const next = JSON.parse(await oracle.call("publish", { state: prior, evaluations: [oracleRecord(output)] }));
        assert.ok(next.state);
        if (release === W0.R2 && canonical(next.state.items) !== canonical(prior.items)) itemChanges++;
        records.push(result.record);
        prior = next.state;
      }
      expected.push({ subject: world.subject, state: prior });
    }
  } finally { oracle.close(); }
  assert.equal(expected.length, N);
  const reference = canonical(expected);
  writeFileSync(join(root, "expected.json"), reference, { flag: "wx" });
  const inputs = sha256(canonical([a, b]));
  const paths = execFileSync("git", ["ls-files", "-co", "--exclude-standard", "--", "lab/experiments/EXP-DX1/act1/*.ts",
    "lab/bench/lib/*.ts", "lab/bench/lib/w0-oracle.py", "lab/oracles/domain/*.py", "lab/world/W0/releases", "pnpm-lock.yaml"]).toString().trim().split("\n");
  const sourceFiles = Object.fromEntries(paths.map((f) => [f, sha256(readFileSync(f))]));
  for (const pkg of ["core","sql","sqlite","w0","datomic"]) {
    const { readdirSync } = await import("node:fs");
    const dir = "packages/" + pkg + "/dist";
    for (const f of readdirSync(dir, { recursive: true }) as string[])
      if (f.endsWith(".js")) sourceFiles[dir + "/" + f] = sha256(readFileSync(join(dir, f)));
  }
  writeFileSync(join(root, "sources.json"), JSON.stringify(sourceFiles), { flag: "wx" });
  const binding = { nonce, sourceSha256: sha256(canonical(sourceFiles)), inputs, expected: sha256(reference), N, basis, later,
    releases: [W0.R1.hash, W0.R2.hash], slot: "local-sqlite-full-sync", node: process.version, itemChanges };
  const arms = [];
  for (const layout of [undefined, "full-state", "guard-fact"] as const) {
    const name = layout ?? "historical", scope = "act1-" + name + "-" + nonce;
    let store = await open(scope);
    await publishChanged(store, a, { layout, inflight: 1, frameSize: 32 });
    await store.close();
    const fileBytes = () => statSync(join(root, scope + ".db")).size;
    const initialBytes = fileBytes();
    store = await open(scope);
    let statePages = 0, stateRows = 0, headReads = 0, claimReads = 0, casSubjects = 0, assertedBytes = 0;
    let commitMs = 0, opsBytes = 0, txCount = 0;
    const frames: unknown[] = [];
    const comp: OutboxStore = { ...store,
      currentPosition: () => { headReads++; return store.currentPosition(); },
      sweepPage: async (...args) => { const r = await store.sweepPage(...args); statePages += r.roundTrips; stateRows += r.rows.length; return r; },
      transactionByCommand: (cmd) => { claimReads++; return store.transactionByCommand(cmd); },
      transact: async (ops, meta) => {
        const start = performance.now();
        const r = await store.transact(ops, meta);
        const duration = performance.now() - start;
        assert.ok(r.ok);
        const bytes = Buffer.byteLength(JSON.stringify(ops));
        casSubjects += (meta.preconditions as any[]).filter((p) => p._tag === "EntityState").length;
        assertedBytes += ops.reduce((n, op) => n + (op.op === "assert" ? Buffer.byteLength(op.value.value) : 0), 0);
        txCount++; commitMs += duration; opsBytes += bytes;
        frames.push({ commandId: meta.commandId, position: r.value.position, txId: r.value.txId, duration, bytes });
        return r;
      },
    };
    const cpu = process.cpuUsage(), start = performance.now();
    const result = await publishChanged(comp, b, { layout, frameSize: 32, inflight: 1 });
    const wallMs = performance.now() - start, usage = process.cpuUsage(cpu);
    await store.close();
    const reopened = JSON.parse(execFileSync(process.execPath, ["--experimental-strip-types", script, "readback", root, scope],
      { encoding: "utf8", stdio: ["ignore","pipe","inherit"] }));
    assert.equal(reopened.subjects, N);
    assert.equal(reopened.mismatches, layout ? 0 : N - itemChanges);
    if (layout) assert.equal(reopened.hash, binding.expected);
    assert.equal(reopened.scope, scope);
    assert.equal(txCount, result.commits);
    const arm = { name, scope, wallMs, commitMs, cpuMs: (usage.user + usage.system) / 1000, statePages, stateRows,
      headReads, claimReads, casSubjects, assertedBytes, opsBytes, fileGrowth: fileBytes() - initialBytes, txCount, reopened };
    writeFileSync(join(root, name + "-frames.json"), JSON.stringify(frames), { flag: "wx" });
    arms.push(arm);
    console.log(JSON.stringify(arm));
  }
  for (const [path, digest] of Object.entries(sourceFiles)) assert.equal(sha256(readFileSync(path)), digest);
  writeFileSync(join(root, "price.json"), JSON.stringify({ ...binding, arms }, null, 2) + "\n", { flag: "wx" });
}
