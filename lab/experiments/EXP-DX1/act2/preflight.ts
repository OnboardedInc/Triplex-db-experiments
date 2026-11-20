import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { openComposition, type CompositionHandle } from "../../../bench/lib/composition.ts";
import { DomainOracle } from "../../../bench/lib/w0-gates.ts";
import { generateTrace } from "../../../bench/lib/trace.ts";
import { applyW0Trace, openW0Window } from "../../../bench/lib/w0-traffic.ts";
import { mapW0Trace } from "../../../bench/lib/w0-trace.ts";
import {
  W0,
  V_W0,
  canonical,
  reachableRows,
  sha256,
  triplexValue,
  w0Basis,
  worldOf,
  type WorldRow,
} from "../../../bench/lib/w0-world.ts";

export type Binding = { source: string; slot: string; nonce: string };
export function inputs() {
  const roots = [
    "lab/bench/lib",
    "lab/oracles/domain",
    "lab/world/W0/releases",
    "lab/experiments/EXP-DX1/act2",
    ...["core", "w0", "datomic", "qualification", "host"].map((p) => "packages/" + p + "/dist"),
  ];
  const files = roots
    .flatMap((root) =>
      fs
        .readdirSync(root, { recursive: true, encoding: "utf8" })
        .filter((f) => /\.(js|py|ts|json)$/.test(f))
        .map((f) => path.join(root, f)),
    )
    .concat(
      "pnpm-lock.yaml",
      ...[
        "act1/check.ts",
        "scale1/tenants.ts",
        "scale1/tenant-proof.ts",
        "scale1/tenant-seeds.json",
        "scale1/small-plan.ts",
      ].map((f) => "lab/experiments/EXP-DX1/" + f),
    )
    .sort();
  return sha256(canonical(files.map((f) => [f, sha256(fs.readFileSync(f))])));
}
const factsKey = (e: string, a: string, v: unknown) => canonical([e, a, v]);
const sorted = (facts: readonly W0.Fact[]) => facts.map((f) => canonical(f)).sort();

// [DX-ACT2] Why: replay the collision on fresh native data before spending the large seed budget. Rejected: validating the mapper in isolation or accepting an earlier smoke receipt.
export async function checkWindows(
  comp: CompositionHandle,
  binding: Binding,
  progress: (s: string) => void,
) {
  assert.equal(await comp.currentPosition(), 0);
  const rung = W0.rung(1000),
    worlds = [...W0.population(rung)].map((p) => p.world);
  const positions = new Map<string, number>();
  let batch: W0.Fact[] = [];
  async function flush() {
    if (!batch.length) return;
    const r = await comp.transact(
      batch.map((f) => ({
        op: "assert",
        entityId: f.e,
        attribute: f.a,
        value: triplexValue(f.a, f.v),
        validFrom: 0,
      })),
      { commandId: "preflight-seed:" + positions.size, actor: "preflight-seed" },
    );
    if (!r.ok) throw Error("Preflight seed: " + r.tag);
    assert.equal(r.value.triples.length, batch.length);
    const ack = r.value.triples.map((t) => factsKey(t.entityId, t.attribute, t.value)).sort();
    assert.deepEqual(ack, batch.map((f) => factsKey(f.e, f.a, triplexValue(f.a, f.v))).sort());
    for (const f of batch) positions.set(factsKey(f.e, f.a, f.v), r.value.position);
    batch = [];
  }
  progress("seeding 1000 W0 worlds");
  for (const world of worlds)
    for (const f of world.facts) {
      const k = factsKey(f.e, f.a, f.v);
      if (positions.has(k)) continue;
      positions.set(k, 0);
      batch.push(f);
      if (batch.length === 1000) await flush();
    }
  await flush();
  const expected = worlds.map((w) => ({
    subject: w.subject,
    facts: w.facts.map((f) => ({ ...f, tx: positions.get(factsKey(f.e, f.a, f.v))! })),
  }));
  const event = generateTrace({ seed: "DX-H2-frozen-v1", subjects: 1000, durationS: 180 }).find(
    (e) => e.seq === 2299 && !e.resend,
  )!;
  assert(event.correction && event.kind === "runtime" && event.facts === 6);
  const target = expected[event.subject]!,
    oracle = new DomainOracle(),
    digest = createHash("sha256");
  const verify = async (w: W0.World, rows: readonly WorldRow[], position: number) => {
    const actual = worldOf(w.subject, rows);
    assert.deepEqual(
      sorted(actual.facts),
      sorted(w.facts),
      "Pinned fact bytes differ for " + w.subject,
    );
    const basis = w0Basis({ position, validAt: V_W0 });
    const output = await oracle.call("evaluate", { world: w, release: "R1", basis });
    const evaluated = W0.sweepSubject(actual, W0.R1, basis);
    assert(
      !("error" in evaluated),
      w.subject + ": " + JSON.stringify("error" in evaluated ? evaluated : {}),
    );
    assert.equal(evaluated.json, output, w.subject + " oracle disparity");
    digest.update(canonical([w.subject, position, sha256(output)]) + "\n");
  };
  const windows = [];
  try {
    for (const phase of ["baseline", "sweep"]) {
      progress(phase + " live read and save");
      const position = await openW0Window(comp, binding.nonce + ":" + phase);
      const readWitness = async (p: number) => {
        const basis = { position: p, validAt: V_W0 };
        const read = await comp.sweepPage([target.subject], basis);
        assert.deepEqual(read.reportedBasis, basis);
        await verify(target, read.rows, p);
      };
      const old = structuredClone(target.facts);
      const [saved] = await Promise.all([
        applyW0Trace(comp, event, position),
        readWitness(position),
      ]);
      assert(!saved.duplicate && saved.receipt.position > position);
      const retry = await applyW0Trace(comp, { ...event, resend: true }, position);
      assert(
        retry.duplicate &&
          retry.receipt.txId === saved.receipt.txId &&
          retry.receipt.position === saved.receipt.position,
      );
      const mapped = mapW0Trace(event, position);
      assert.deepEqual(
        saved.receipt.triples.map((t: any) => factsKey(t.entityId, t.attribute, t.value)).sort(),
        mapped.rows.map(([e, a, v]) => factsKey(e, a, triplexValue(a, v))).sort(),
      );
      target.facts = old
        .filter((f) => !(f.e === target.subject && f.a === "bgcStatus"))
        .concat(mapped.rows.map(([e, a, v]) => ({ e, a, v, tx: saved.receipt.position })));
      await readWitness(saved.receipt.position);
      windows.push({ phase, position, txId: saved.receipt.txId, save: saved.receipt.position });
    }
    assert.notEqual(windows[0]!.txId, windows[1]!.txId);
    progress("checking both windows against the independent oracle for all 1000 subjects");
    const cut = { position: await comp.currentPosition(), validAt: V_W0 };
    for (let n = 0; n < expected.length; n += 16) {
      const group = expected.slice(n, n + 16);
      const read = await comp.sweepPage(
        group.map((w) => w.subject),
        cut,
      );
      assert.deepEqual(read.reportedBasis, cut);
      const index = new Map<string, WorldRow[]>();
      for (const r of read.rows) {
        const rows = index.get(r.entityId) ?? [];
        rows.push(r);
        index.set(r.entityId, rows);
      }
      await Promise.all(
        group.map((w) => verify(w, reachableRows([w.subject], [], index), cut.position)),
      );
    }
    return {
      binding,
      scope: comp.scopeName,
      subjects: expected.length,
      windows,
      cut: cut.position,
      oracleSha256: digest.digest("hex"),
    };
  } finally {
    oracle.close();
  }
}

export async function runPreflight(dir: string, binding: Binding) {
  assert.match(binding.source, /^[a-f0-9]{40}$/);
  assert.match(binding.nonce, /^[a-zA-Z0-9-]+$/);
  assert(binding.slot);
  assert.equal(process.env.TRIPLEX_TRACE_SLOT, binding.slot);
  assert.equal(process.env.TRIPLEX_TRACE_SOURCE, binding.source);
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(dir, "request.json"), "utf8")), binding);
  assert(!fs.existsSync(path.join(dir, "STATUS.json")));
  const status = (stage: string, reason?: string) => {
    fs.writeFileSync(
      path.join(dir, "STATUS.tmp"),
      JSON.stringify({ binding, stage, reason, at: new Date().toISOString() }) + "\n",
    );
    fs.renameSync(path.join(dir, "STATUS.tmp"), path.join(dir, "STATUS.json"));
  };
  const started = Date.now();
  let stage = "opening a fresh database";
  const progress = (s: string) => {
    stage = s;
    status(s);
  };
  progress(stage);
  const timer = setTimeout(() => {
    status("stopped", "600 second preflight deadline during " + stage);
    process.exit(124);
  }, 600_000);
  let comp: CompositionHandle | undefined;
  try {
    const sourceInputs = inputs();
    process.env.TX2_W0_POINT_JOURNAL = "1";
    comp = await openComposition("reach", "datomic", "act2-preflight-" + binding.nonce);
    const proof = await checkWindows(comp, binding, progress);
    assert.equal(sourceInputs, inputs());
    assert(Date.now() - started < 600_000);
    const receipt = { ...proof, sourceInputs, elapsedMs: Date.now() - started };
    fs.writeFileSync(path.join(dir, "preflight.json"), JSON.stringify(receipt) + "\n", {
      flag: "wx",
    });
    status("verified");
    return receipt;
  } catch (e) {
    status("stopped", stage + ": " + String(e));
    throw e;
  } finally {
    clearTimeout(timer);
    await comp?.close();
  }
}

if (process.argv[1] === import.meta.filename) {
  const [dir, source, slot, nonce] = process.argv.slice(2);
  await runPreflight(dir!, { source: source!, slot: slot!, nonce: nonce! });
}
