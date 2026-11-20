// [DX-COMPACT1] Why: compare both native read paths with frozen W0 facts and the unchanged Python oracle.
// Rejected: treating matching current and pinned results as an independent correctness check.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

type Fact = { e: string; a: string; v: string | number | boolean; tx: number };
type World = { subject: string; facts: Fact[] };
type Activation = { from: string; release: string; tx: number };
type Fixture = {
  id: string;
  op: "evaluate" | "reconcile" | "affected";
  expected: Record<string, unknown>;
  input: {
    basis: { tx: number; validTime: string };
    world?: World;
    worlds?: World[];
    activations?: Activation[];
    release?: string;
    writes?: [string, string][];
  };
};
type W0Request = { op: Fixture["op"]; input: Fixture["input"] };

const hash = (data: Uint8Array | string) => createHash("sha256").update(data).digest("hex");
const compare = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;

function canonical(value: unknown): string {
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
  if (value !== null && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return "{" + Object.keys(record).sort(compare)
      .map((k) => JSON.stringify(k) + ":" + canonical(record[k])).join(",") + "}";
  }
  return JSON.stringify(value);
}

const root = (e: string) => e.split("/", 1)[0]!;
const sortWorld = (w: World) => ({ subject: w.subject, facts: w.facts.slice().sort((a, b) => compare(canonical(a), canonical(b))) });

function visibleWorlds(input: Fixture["input"], remap: Map<string, number>) {
  const worlds = input.worlds ?? [input.world!];
  // [DX-COMPACT1] Why: a shared jurisdiction seeded by one world is visible to all placements that reference it.
  // Rejected: treating each frozen affected-case world as a separate database.
  const facts = [...new Map(worlds.flatMap((w) => w.facts.map((f) => [canonical(f), f] as const))).values()];
  return worlds.map((w) => {
    const local = facts.find((f) => f.e === w.subject && f.a === "location")?.v;
    const jurisdiction = facts.find((f) => f.e === local && f.a === "jurisdiction")?.v;
    const visible = facts.filter((f) => root(f.e) === w.subject || f.e === local || f.e === jurisdiction);
    return sortWorld({
      subject: w.subject,
      // W0 treats the integer token -0 as 0 in storage and canonical output.
      facts: visible.map((f) => ({ ...f, v: f.v === 0 ? 0 : f.v, tx: remap.get(f.tx + "/" + root(f.e))! })),
    });
  });
}

function expected(fixture: Fixture) {
  const { input } = fixture;
  const worlds = input.worlds ?? [input.world!];
  const ids = new Map<string, { p: number; owner: string; activation?: Activation }>();
  for (const { facts } of worlds) for (const fact of facts) {
    const owner = root(fact.e);
    ids.set(fact.tx + "/" + owner, { p: fact.tx, owner });
  }
  const units = [...ids.values(), ...(input.activations ?? []).map((a) => ({ p: a.tx, owner: "loc:release", activation: a }))];
  units.sort((a, b) => a.p - b.p || compare(a.owner, b.owner) ||
    compare(a.activation?.from ?? "", b.activation?.from ?? "") || compare(a.activation?.release ?? "", b.activation?.release ?? ""));
  let position = 0;
  const positions = new Map<string, number>();
  const activations: Activation[] = [];
  for (const unit of units) {
    position = Math.max(unit.p, position + 1);
    if (unit.activation) activations.push({ ...unit.activation, tx: position });
    else positions.set(unit.p + "/" + unit.owner, position);
  }
  position = Math.max(input.basis.tx, position);
  const moved = position !== input.basis.tx || units.some((u) => !u.activation && positions.get(u.p + "/" + u.owner) !== u.p)
    || (input.activations ?? []).some((a) => !activations.some((b) => a.from === b.from && a.release === b.release && a.tx === b.tx));
  return { position, activations, moved, worlds: visibleWorlds(input, positions) };
}

function selected(dir: string): Fixture[] {
  return fs.readdirSync(dir).sort(compare).flatMap((name) => {
    let fixture: Fixture;
    try { fixture = JSON.parse(fs.readFileSync(path.join(dir, name), "utf8")); }
    catch { return []; }
    const { op, input, expected } = fixture;
    if (!["evaluate", "reconcile", "affected"].includes(op) || typeof expected !== "object" || !expected || "error" in expected) return [];
    const p = input?.basis?.tx;
    const worlds = input?.worlds ?? [input?.world];
    if (!Number.isSafeInteger(p) || p < 0 || p > 40 || worlds.some((w) => !w || w.facts.some((f) => typeof f.v === "object"))) return [];
    return [fixture];
  });
}

function makeInput(fixture: Fixture, position: number, worlds: World[], activations: Activation[]) {
  const { op, input } = fixture;
  const basis = { ...input.basis, tx: position };
  if (op === "evaluate") return { basis, release: input.release, world: worlds[0] };
  if (op === "affected") return { basis, release: input.release, worlds, writes: input.writes };
  return { basis, world: worlds[0], activations };
}

const dir = process.argv[2];
assert(dir, "provide a durable prototype attempt directory");
const read = (file: string) => fs.readFileSync(path.join(dir, file));
const binding = JSON.parse(read("binding.json").toString());
const cleanup = JSON.parse(read("cleanup.json").toString());
assert.equal(binding.phase, "prototype");
assert.equal(cleanup.attempt, binding.attempt);
assert.equal(cleanup.slotReleased, binding.slot);
assert.equal(cleanup.rolesRemoved, 3);
assert.deepEqual(binding.durability.slice(0, 3), ["on", "on", "on"]);
const steps = JSON.parse(read("steps.json").toString());
for (const step of ["oracle", "recovery", "sdk"]) assert.equal(steps[step], "completed");
for (const [file, digest] of Object.entries(binding.sources)) assert.equal(hash(read("source/" + file)), digest);
assert.equal(hash(JSON.stringify(binding.sources)), binding.sourceHash);
assert.equal(hash(fs.readFileSync(new URL(import.meta.url))), binding.sources["gate.ts"]);
function observations(file: string) {
  return read(file).toString().split("\n").filter((l) => l.startsWith("COMPACT ")).map((l) => {
    const data = JSON.parse(l.slice(8));
    assert.equal(data.source, binding.sourceHash);
    assert.equal(data.attempt, binding.attempt);
    return data;
  });
}
const rows = observations("probe.log");
const fixtures = selected(path.join(dir, "source", "cases"));
const checks = rows.filter((x) => x.kind === "oracle-case");
assert.equal(checks.length, fixtures.length);
assert(fixtures.length >= 20);
assert.deepEqual(checks.map((x) => x.case), fixtures.map((x) => x.id));
const requests: W0Request[] = [];
const expectedDirect: [number, Record<string, unknown>][] = [];
let unchanged = 0;
let priorT = 0;
for (const [i, fixture] of fixtures.entries()) {
  const row = checks[i];
  assert.equal(row.op, fixture.op);
  assert.equal(row.validTime, fixture.input.basis.validTime);
  assert(Number.isSafeInteger(row.nativeT) && row.nativeT >= priorT);
  priorT = row.nativeT;
  const want = expected(fixture);
  assert.equal(row.position, want.position, fixture.id);
  assert.deepEqual(row.activations, want.activations, fixture.id);
  requests.push({ op: fixture.op, input: makeInput(fixture, want.position, want.worlds, want.activations) });
  if (!want.moved) {
    unchanged++;
    expectedDirect.push([requests.length - 1, fixture.expected]);
  }
  for (const arm of ["current", "pinned"]) {
    const worlds = row[arm].map(sortWorld);
    assert.deepEqual(worlds, want.worlds, fixture.id + " " + arm);
    requests.push({ op: fixture.op, input: makeInput(fixture, row.position, worlds, row.activations) });
  }
}

const oracleEntrypoint = "lab/bench/lib/w0-oracle.py";
const oracleModule = "lab/oracles/domain/w0.py";
const oracleInputs = Object.fromEntries(Object.entries(binding.sources).filter(([file]) => file.startsWith("lab/")));
assert(oracleInputs[oracleEntrypoint] && oracleInputs[oracleModule] && oracleInputs["lab/oracles/domain/jsontok.py"]);
assert.equal(Object.keys(oracleInputs).filter((file) => file.startsWith("lab/world/W0/releases/")).length, 4);
const result = spawnSync("python3", ["-I", "-B", path.join(dir, "source", oracleEntrypoint)], {
  input: requests.map(canonical).join("\n") + "\n", encoding: "utf8", maxBuffer: 32 * 1024 * 1024,
});
assert.equal(result.status, 0, result.stderr);
const lines = result.stdout.trimEnd().split("\n");
assert.equal(lines.length, requests.length);
for (let i = 0; i < lines.length; i += 3) {
  assert.equal(lines[i + 1], lines[i], checks[i / 3].case + " current");
  assert.equal(lines[i + 2], lines[i], checks[i / 3].case + " pinned");
}
for (const [i, want] of expectedDirect) assert.equal(lines[i], canonical(want), "frozen W0 answer");

const temporal = rows.find((x) => x.kind === "temporal-witness");
const erasure = rows.find((x) => x.kind === "erasure-witness");
const witnesses = observations("recovery.log");
assert.equal(witnesses.length, 1);
const recovery = witnesses[0];
assert.equal(recovery.kind, "recovery");
assert.deepEqual(recovery.receipt, temporal.receipt);
assert.deepEqual(recovery.world, temporal.reads.find((x: { position: number }) => x.position === 1).world);
assert.deepEqual(recovery.erased, erasure.cut);
assert.equal(recovery.head, rows.find((x) => x.kind === "oracle-end").head);
assert.equal(temporal.receipt.nativeT, temporal.other.nativeT);
assert.equal(temporal.receipt.nativeT, temporal.sibling.nativeT);
assert.deepEqual(temporal.reads.map((r: { world: World }) => r.world.facts[0]?.v ?? null), [null, 2000, 2600, 2000, 2600, 2000]);
const old = temporal.feed[0].changes[3];
assert.deepEqual(old, {
  op: "retire", id: [1, 0], e: "pl:p", a: "weeklyMinutes", v: 2000, from: null, to: null,
  recordedAt: temporal.initial.recorded, retiredAt: temporal.receipt.recorded,
});
const sdk = JSON.parse(read("sdk.json").toString());
assert.equal(sdk.attempt, binding.attempt);
assert.equal(sdk.source, binding.sourceHash);
assert.deepEqual([sdk.first.position, sdk.edit.position, sdk.sibling.position, sdk.other.position], [1, 2, 3, 1]);
assert.equal(sdk.edit.nativeT, sdk.sibling.nativeT);
assert.equal(sdk.edit.nativeT, sdk.other.nativeT);
assert(sdk.requests >= 11);

console.log(JSON.stringify({
  attempt: binding.attempt, source: binding.sourceHash, fixtures: fixtures.length,
  frozenExactCoordinates: unchanged, recutCoordinates: fixtures.length - unchanged, domainResponses: lines.length,
  caseIds: fixtures.map((x) => x.id), oracleInputs, oracleResponsesSha256: hash(result.stdout),
  probe: hash(read("probe.log")), recovery: hash(read("recovery.log")), sdk: hash(read("sdk.json")),
}, null, 2));
