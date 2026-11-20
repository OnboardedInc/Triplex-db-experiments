import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { verifyLatencies } from "./bench-cases.ts";
import { deepPopulation } from "../../../bench/lib/deep-world.ts";
import { canonical } from "../../../bench/lib/w0-world.ts";
const [thin, deep, idle] = process.argv.slice(2);
assert(
  thin && deep && idle,
  "Provide the two completed population directories followed by the idle census",
);
const roles = [
  "reader",
  "readGateway",
  "writeGateway",
  "transactor",
  "postgres",
  "driver",
] as const;
function load(dir: string) {
  const get = (name: string) => JSON.parse(fs.readFileSync(path.join(dir, name), "utf8")),
    inputs = get("inputs.json"),
    r = get("result.json");
  const bind = createHash("sha256")
    .update(
      canonical([
        inputs.source,
        inputs.inputs,
        inputs.attempt,
        inputs.mode,
        inputs.size,
        inputs.slot,
        inputs.containers,
        ...(typeof inputs.spread === "boolean" ? [inputs.spread, inputs.seedOnly] : []),
        ...(inputs.policy ? [inputs.policy] : []),
        ...(inputs.gatewaySource ? [inputs.gatewaySource] : []),
      ]),
    )
    .digest("hex");
  assert.equal(bind, r.binding);
  assert.equal(bind, inputs.binding);
  assert.equal(inputs.slot, r.slot);
  assert.equal(inputs.attempt, r.attempt);
  assert.equal(inputs.source, r.source);
  assert.equal(inputs.size, r.size);
  assert.equal(inputs.mode, r.mode);
  assert.match(inputs.boot, /^[a-f0-9-]{36}$/);
  assert([1, 2].includes(inputs.managedSlots ?? 2));
  assert.equal(new Set(inputs.containers.map((c: any) => c.id)).size, inputs.managedSlots ?? 2);
  const p = fs
    .readFileSync(path.join(dir, "phases.jsonl"), "utf8")
    .trim()
    .split("\n")
    .map((s) => JSON.parse(s));
  assert(p.length === new Set(p.map((x) => x.label)).size);
  assert(p.every((x) => x.binding === bind));
  for (const [index, phase] of p.entries()) {
    assert(
      Number.isFinite(Date.parse(phase.at)) &&
        (!index || Date.parse(phase.at) >= Date.parse(p[index - 1].at)),
    );
    const disk = phase.native.disk;
    assert(disk.fsync === "on" && disk.synchronousCommit === "on" && disk.fullPageWrites === "on");
    if (phase.reader.code)
      for (const [file, hash] of Object.entries(phase.reader.code))
        assert.equal(hash, inputs.inputs[file]);
    if (inputs.policy?.readerPages) {
      const pages = phase.reader.pages;
      assert.deepEqual([pages.binding, pages.pid, pages.ticks], [bind, p[0].reader.pages.pid, p[0].reader.pages.ticks]);
      assert(Number.isSafeInteger(pages.pid) && pages.pid > 1 && Number(pages.ticks) > 0 && pages.mappings > 0);
      assert(Object.values(pages.rss).every(n => typeof n === "number" && Number.isSafeInteger(n) && n >= 0));
    }
  }
  return { r, p: Object.fromEntries(p.map((x) => [x.label, x])), bind, inputs };
}
function count(p: any, role: (typeof roles)[number]) {
  const value = role === "reader" || role === "driver" ? p[role] : p.native.roles[role];
  assert(value.rssBytes > 0 && value.threads > 0);
  return value;
}
function deltas(a: any, b: any, denominator: number) {
  assert(denominator > 0);
  return Object.fromEntries(
    roles.map((role) => {
      const x = count(a, role),
        y = count(b, role);
      return [
        role,
        {
          rssBytesPerUnit: (y.rssBytes - x.rssBytes) / denominator,
          threadsPerUnit: (y.threads - x.threads) / denominator,
          before: x.rssBytes,
          after: y.rssBytes,
        },
      ];
    }),
  );
}
const population = [thin, deep].map((dir, i) => {
  const { r, p, bind, inputs } = load(dir);
  assert.equal(r.mode, i ? "int1-deep" : "int1-thin");
  assert.equal(r.size, i ? 10000 : 100000);
  const a = r.accounts[0];
  assert.equal(a.people, r.size);
  assert.equal(a.scope, "int1-" + r.attempt + "-population");
  assert.equal(a.facts, i ? deepPopulation(r.size).facts : 8 * r.size);
  assert.equal(a.active, r.size / 50);
  assert.equal(a.ryow, a.active);
  assert(
    a.replay.status === "PASS" && a.replay.entityQueries >= a.replay.reads && a.replay.reads > 0,
  );
  assert.equal(r.latency.cold.n, r.size / (inputs.seedOnly ? 50 : 100));
  if (r.latencyReceipt) verifyLatencies(dir, r, bind, r.attempt, inputs.spread === undefined ? undefined : inputs);
  const before = p["fixed-hot"],
    after = p["after-cold-import"];
  const x = before.reader.scopes[a.scope],
    y = after.reader.scopes[a.scope];
  // [DX-INT1] Why: attribute the RSS difference to the independently counted new imports between the two observed watermarks, with existing touches held fixed.
  // Rejected: dividing an unconstrained process high-water mark by a configured population.
  const db = new DatabaseSync(path.join(dir, "population.sqlite"), { readOnly: true });
  try {
    const at = db.prepare("SELECT count(*) AS n FROM people WHERE born<=?");
    const bx = before.sources?.[a.scope], by = after.sources?.[a.scope];
    if (bx || by) assert.deepEqual([bx?.people, by?.people], [a.active, r.size]);
    assert.equal(at.get(bx?.position ?? x.position)?.n, a.active);
    assert.equal(at.get(by?.position ?? y.position)?.n, r.size);
    assert.equal(
      db.prepare("SELECT count(*) AS n FROM people WHERE dirty IS NOT NULL").get()?.n,
      a.active,
    );
  } finally {
    db.close();
  }
  assert.equal(x.entries, y.entries);
  assert.equal(x.packed, y.packed);
  assert.equal(x.bytes, y.bytes);
  if (inputs.policy?.gateways === "demand" && inputs.policy.readMode === "validated") {
    for (const role of ["readGateway", "writeGateway"]) {
      const old = before.native[role], current = after.native[role];
      // [DX-THIN1] Why: equal byte totals could hide imports replacing existing residents. Rejected: certifying zero cold admissions from a stationary byte gauge alone.
      for (const [cache, fields] of [
        ["idMemo", ["maps", "entries", "inserts", "misses", "evictions", "estimatedBytes"]],
        ["entityCache", ["entries", "misses", "evictions", "revisionMisses", "revisionEvictions", "bytes"]],
      ] as const) {
        for (const field of fields) {
          assert(Number.isSafeInteger(old[cache][field]));
          assert.equal(current[cache][field], old[cache][field], role + "." + cache + "." + field);
        }
      }
    }
  }
  const n = r.size - a.active;
  return {
    binding: bind,
    slot: r.slot,
    people: r.size,
    coldAdded: n,
    facts: a.facts,
    coldMs: r.latency.cold,
    latencyEvidence: r.latencyReceipt ?? {
      method: "nearest-rank computed in the original trial",
      rawSamplesRetained: false,
    },
    commitMs: r.latency.commit,
    reads: a.reads,
    ryow: a.ryow,
    oracle: a.replay,
    roles: deltas(before, after, n),
    readerPackedDelta: y.packed - x.packed,
    ...(inputs.policy?.readerPages ? { readerMappedBytesDelta: Object.fromEntries(
      Object.keys(before.reader.pages.rss).map(k => [k, after.reader.pages.rss[k] - before.reader.pages.rss[k]]),
    ) } : {}),
    gatewayCachePerCold: Object.fromEntries(
      ["readGateway", "writeGateway"].map((k) => [
        k,
        {
          ids: (after.native[k].idMemo.estimatedBytes - before.native[k].idMemo.estimatedBytes) / n,
          rows: (after.native[k].entityCache.bytes - before.native[k].entityCache.bytes) / n,
        },
      ]),
    ),
    sqlBytesPerCold:
      (after.native.disk.kvsIncludingIndexes - before.native.disk.kvsIncludingIndexes) / n,
    nativeMoving: r.moving,
  };
});
const { r, p, bind } = load(idle);
assert.equal(r.mode, "int1-idle");
assert.equal(Object.keys(p["one-idle"].reader.scopes).length, 1);
assert.equal(Object.keys(p["all-idle"].reader.scopes).length, r.idleScopes);
assert(Object.values(p["all-idle"].reader.scopes).every((s: any) => s.entries === 0));
console.log(
  JSON.stringify(
    {
      population,
      idle: {
        binding: bind,
        scopes: r.idleScopes,
        denominator: r.idleScopes - 1,
        roles: deltas(p["one-idle"], p["all-idle"], r.idleScopes - 1),
      },
    },
    null,
    2,
  ),
);
