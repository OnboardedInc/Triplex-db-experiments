import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { gunzipSync } from "node:zlib";
import { canonical, sha256 } from "../../../bench/lib/w0-world.ts";
import { deepPopulation } from "../../../bench/lib/deep-world.ts";
import { activePerson } from "./cohort.ts";
import { memoryPlan } from "./memory-plan.ts";
import { nativePools, parseHistogram } from "./gateway-profile.ts";
import { heapResidency } from "../thin1/heap-residency.ts";

const roles = [
  "reader",
  "readGateway",
  "writeGateway",
  "transactor",
  "postgres",
  "driver",
] as const;
const median = (n: number[]) => [...n].sort((a, b) => a - b)[Math.floor(n.length / 2)]!;

function verify(dir: string) {
  const load = (name: string) => JSON.parse(fs.readFileSync(path.join(dir, name), "utf8"));
  const input = load("inputs.json"),
    result = load("result.json");
  const binding = sha256(
    canonical([
      input.source,
      input.inputs,
      input.attempt,
      input.mode,
      input.size,
      input.slot,
      input.containers,
      input.spread,
      input.seedOnly,
      input.policy,
      input.gatewaySource,
    ]),
  );
  assert.equal(input.binding, binding);
  assert.deepEqual(
    [result.binding, result.source, result.attempt, result.slot, result.size, result.mode],
    [binding, input.source, input.attempt, input.slot, input.size, input.mode],
  );
  assert.match(input.attempt, /^[a-f0-9-]{36}$/);
  assert(
    input.managedSlots === 1 && input.containers.length === 1 && input.spread && !input.seedOnly,
  );
  assert.match(input.containers[0].imageId, /^sha256:[a-f0-9]{64}$/);
  assert(input.policy.readMode === "validated" && input.policy.gateways === "demand");
  const plan = memoryPlan(input.policy.memory.points.join(","), input.mode, input.size)!;
  assert.deepEqual(plan, input.policy.memory);
  const phases = fs
    .readFileSync(path.join(dir, "phases.jsonl"), "utf8")
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line));
  const labels = plan.scopes
    ? plan.points.map((n) => `idle-${n}`)
    : ["fixed-active", ...plan.points.flatMap((n) => [0, 1, 2].map((s) => `people-${n}-${s}`))];
  assert.deepEqual(
    phases.map((p) => p.label),
    ["empty", ...labels],
  );
  const first = phases[0]!;
  for (const [i, phase] of phases.entries()) {
    assert.equal(phase.binding, binding);
    assert(
      Number.isFinite(Date.parse(phase.at)) &&
        (!i || Date.parse(phase.at) >= Date.parse(phases[i - 1].at)),
    );
    for (const [file, hash] of Object.entries(phase.reader.code))
      assert.equal(hash, input.inputs[file]);
    assert.deepEqual(
      phase.native.observations.write.budgets,
      first.native.observations.write.budgets,
    );
    const buffers = phase.native.observations.write.sharedBuffers;
    assert(
      buffers.limitBytes > 0 &&
        (buffers.usedBytes === null ||
          (buffers.usedBytes >= 0 && buffers.usedBytes <= buffers.limitBytes)),
    );
    for (const role of roles) {
      if (role === "reader" || role === "driver") continue;
      const owner = role === "readGateway" ? "read" : "write";
      const actual = phase.native.observations[owner].roles[role],
        start = first.native.observations[owner].roles[role];
      assert(actual.pid > 1 && Number(actual.ticks) > 0);
      assert.deepEqual([actual.pid, actual.ticks], [start.pid, start.ticks]);
    }
  }
  const summary = (group: typeof phases) => ({
    roles: Object.fromEntries(
      roles.map((role) => [
        role,
        {
          rssBytes: median(group.map((p) => (p[role] ?? p.native.roles[role]).rssBytes)),
          threads: median(group.map((p) => (p[role] ?? p.native.roles[role]).threads)),
          ...(role !== "reader" && role !== "driver"
            ? {
                pssBytes: group.map(
                  (p) =>
                    p.native.observations[role === "readGateway" ? "read" : "write"].roles[role]
                      .pssBytes,
                ),
              }
            : {}),
        },
      ]),
    ),
    native: group.map((p) => p.native.observations.write),
    diskBytes: median(group.map((p) => p.native.disk.kvsIncludingIndexes)),
  });
  if (plan.scopes) {
    const { opened, idle, firstReads, binding: measured } = load("memory-scopes.json");
    assert.equal(measured, binding);
    assert.equal(opened.length, input.size);
    assert.deepEqual(idle, result.memoryScopes.idle);
    assert.deepEqual(
      idle.map((p: any) => p.count),
      plan.points,
    );
    assert.equal(firstReads.length, plan.points.length);
    for (const [i, probe] of idle.entries()) {
      const read = firstReads[i];
      assert.strictEqual(Object.keys(phases[i + 1].sources).length, probe.count);
      assert(
        opened[i].openMs > 0 &&
          probe.idleMs >= 30_000 &&
          probe.firstSaveMs >= probe.saveAckMs &&
          probe.saveAckMs > 0,
      );
      assert.deepEqual(
        [probe.scope, probe.cut, probe.firstReadMs, probe.saved, probe.checkedRows],
        [opened[i].scope, read.position, read.ms, read.position + 1, 2],
      );
      assert.equal(read.scope, probe.scope);
      assert.equal(read.diagnostic.exchanges.length, 1);
      assert.equal(read.rows, 8);
      const ledger = new DatabaseSync(path.join(dir, `idle-${i}.sqlite`), { readOnly: true });
      try {
        assert.equal(
          ledger.prepare("SELECT dirty FROM people WHERE i=0").get()?.dirty,
          probe.saved,
        );
      } finally {
        ledger.close();
      }
    }
    return {
      source: input.source,
      attempt: input.attempt,
      binding,
      slot: input.slot,
      scopes: plan.points.map((n, i) => ({ count: n, ...summary([phases[i + 1]]) })),
      opened,
      idle,
    };
  }
  const measured = result.memoryPopulation,
    fixed = phases[1]!,
    scope = measured.scope;
  assert.equal(measured.people, input.size);
  assert.equal(
    measured.facts,
    result.mode === "int1-deep" ? deepPopulation(input.size).facts : input.size * 8,
  );
  assert.deepEqual(
    measured.touched,
    Array.from({ length: plan.activityPopulation / 50 }, (_, i) =>
      activePerson(i, plan.activityPopulation, true),
    ),
  );
  const roster = new DatabaseSync(path.join(dir, "population.sqlite"), { readOnly: true });
  let populations: ReturnType<typeof summary>[];
  try {
    const observed = roster.prepare("SELECT count(*) AS n FROM people WHERE born<=?");
    const ids = roster
      .prepare("SELECT i FROM people WHERE born<=? ORDER BY i")
      .all(fixed.sources[scope].position);
    assert.deepEqual(
      ids.map((r) => Number(r.i)),
      [...measured.touched].sort((a, b) => a - b),
    );
    populations = plan.points.map((n, i) => {
      const group = phases.slice(2 + i * 3, 5 + i * 3);
      const cutoff = group[0].sources[scope].position;
      assert.equal(observed.get(cutoff)?.n, n);
      for (const p of group) {
        assert.deepEqual(p.sources[scope], { position: cutoff, people: n });
        assert.deepEqual(p.reader.scopes[scope], fixed.reader.scopes[scope]);
        for (const role of ["readGateway", "writeGateway"])
          for (const [cache, fields] of [
            ["idMemo", ["maps", "entries", "estimatedBytes", "inserts", "misses", "evictions"]],
            [
              "entityCache",
              ["entries", "bytes", "misses", "evictions", "revisionMisses", "revisionEvictions"],
            ],
          ] as const)
            for (const field of fields)
              assert.equal(p.native[role][cache][field], fixed.native[role][cache][field]);
      }
      return { people: n, position: cutoff, ...summary(group) };
    });
  } finally {
    roster.close();
  }
  const [penultimate, last] = populations.slice(-2);
  const n = plan.points.at(-1)! - plan.points.at(-2)!;
  const cache = load("memory-object-cache.json");
  assert(cache.binding === binding && cache.position === measured.end);
  const nativeProfiles = input.policy.nativePools
    ? populations.map(({ people, position }) => {
        const phase = `people-${people}`;
        const data = load(phase + "-profile.json");
        assert.deepEqual([data.binding, data.phase, data.position], [binding, phase, position]);
        assert.deepEqual(data.samples.map((s: any) => s.role), ["write", "read", "transactor"]);
        const samples = data.samples.map((sample: any) => {
          assert.equal(sample.source, input.gatewaySource);
          assert.equal(sample.containerId, input.containers[0].id);
          assert.equal(sample.nonce, input.slot.replace("tx2-dxthin-", ""));
          assert.match(sample.witness, /^[a-f0-9-]{36}$/);
          assert.equal(sample.filename, phase + "-" + sample.role + ".histogram.gz");
          const compressed = fs.readFileSync(path.join(dir, sample.filename));
          assert.equal(sha256(compressed), sample.sha256);
          const text = gunzipSync(compressed).toString();
          assert(text.startsWith(sample.pid + ":"));
          assert.deepEqual(parseHistogram(text), sample.summary);
          for (const when of ["before", "after"] as const) {
            assert.deepEqual(nativePools(sample[when].nmt, sample.pid), sample.native[when]);
            if (input.policy.nativeResidency) {
              const state = sample[when];
              assert.deepEqual(heapResidency(state.heap, state.mappings), state.residency);
            }
          }
          if (sample.role === "transactor") {
            const proc = first.native.observations.write.roles.transactor;
            assert.deepEqual([sample.pid, sample.startTicks], [proc.pid, proc.ticks]);
          }
          return { role: sample.role, pid: sample.pid, ticks: sample.startTicks,
            witness: sample.witness, liveHeapBytes: sample.summary.bytes,
            before: sample.before, after: sample.after,
            chargedObjectCacheBytes: sample.chargedBytes, native: sample.native };
        });
        return { people, position, samples };
      })
    : [];
  if (nativeProfiles.length) {
    const identities = nativeProfiles.map((p) => p.samples.map((s: any) => [s.role, s.pid, s.ticks]));
    assert(identities.every((row) => canonical(row) === canonical(identities[0])));
    const challenges = nativeProfiles.flatMap((p) => p.samples.map((s: any) => s.witness));
    assert.equal(new Set(challenges).size, challenges.length);
  }
  return {
    source: input.source,
    attempt: input.attempt,
    binding,
    slot: input.slot,
    touched: measured.touched.length,
    populations,
    marginalBytes: Object.fromEntries(
      roles.map((role) => [
        role,
        (last!.roles[role]!.rssBytes - penultimate!.roles[role]!.rssBytes) / n,
      ]),
    ),
    cache,
    ...(nativeProfiles.length ? { nativeProfiles } : {}),
  };
}

const dirs = process.argv.slice(2);
assert(dirs.length > 0, "Provide completed memory trial directories");
console.log(JSON.stringify(dirs.map(verify), null, 2));
