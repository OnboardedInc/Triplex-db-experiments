import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { gunzipSync } from "node:zlib";
import { canonical } from "../../../bench/lib/w0-world.ts";
import { parseHistogram } from "./gateway-profile.ts";
import { verifyLatencies } from "./bench-cases.ts";

const sha = (v: string | Buffer) => createHash("sha256").update(v).digest("hex");
export function inspectProfiles(dir: string) {
  const read = (f: string) => JSON.parse(fs.readFileSync(path.join(dir,f),"utf8"));
  const input = read("inputs.json"), result = read("result.json");
  const binding = sha(canonical([input.source, input.inputs, input.attempt, input.mode, input.size,
    input.slot, input.containers, input.spread, input.seedOnly, ...(input.policy ? [input.policy] : [])]));
  assert(input.seedOnly && input.spread && input.managedSlots === 1);
  assert.equal(input.binding, binding);
  assert.deepEqual([result.binding, result.source, result.attempt, result.slot, result.size],
    [binding, input.source, input.attempt, input.slot, input.size]);
  const account = result.accounts[0];
  assert(result.accounts.length === 1 && account.people === input.size && account.ryow * 50 === input.size);
  verifyLatencies(dir, result, binding, input.attempt, input);
  const phases = fs.readFileSync(path.join(dir, "phases.jsonl"), "utf8").trim().split("\n").map(s => JSON.parse(s));
  const identities = new Map<string,string>(), witnesses = new Set<string>(), roles = [];
  for (const [stage, name] of [["seed-only", "after-cold-import"], ["two-percent", "after-activity"]]) {
    const profile = read(stage + "-profile.json");
    const phase = phases.filter(x => x.label === name);
    assert.equal(phase.length, 1);
    assert.equal(phase[0].binding, binding);
    assert.equal(profile.binding, binding);
    assert.equal(profile.phase, stage);
    assert.deepEqual(profile.samples.map((s: any) => s.role).sort(), ["read","write"]);
    for (const s of profile.samples) {
      assert.equal(s.containerId, input.containers[0].id);
      assert.equal(input.slot, "tx2-dxthin-" + s.nonce);
      assert(!witnesses.has(s.witness));
      witnesses.add(s.witness);
      const identity = canonical([s.containerId,s.source,s.pid,s.startTicks]);
      if (stage === "seed-only") identities.set(s.role,identity);
      else assert.equal(identities.get(s.role),identity);
      assert.equal(s.filename, stage + "-" + s.role + ".histogram.gz");
      const compressed = fs.readFileSync(path.join(dir,s.filename));
      assert.equal(sha(compressed),s.sha256);
      const raw = gunzipSync(compressed).toString();
      const summary = parseHistogram(raw);
      assert.deepEqual(summary,s.summary);
      assert.equal(s.chargedBytes,s.caches.reduce((n: number,c: any) => n + c.units*c.bytesPerUnit,0));
      const metrics = phase[0].native[s.role + "Gateway"];
      const objects = [...raw.matchAll(/^\s*\d+:\s+(\d+)\s+(\d+)\s+(\S+)/gm)]
        .filter(m => m[3] === "triplex.gateway.entity_cache.ParsedKey" || m[3] === "triplex.gateway.reach.ReadConfig" ||
          m[3] === "datomic.db.Datum" || m[3]!.startsWith("triplex.gateway.reach.proxy$java.util.concurrent.ConcurrentHashMap$IDeref"))
        .map(m => ({ class: m[3], instances: Number(m[1]), shallowBytes: Number(m[2]) }));
      roles.push({ stage, role: s.role, idMemo: metrics.idMemo.estimatedBytes,
        parsed: metrics.entityCache.entityBytes, revision: metrics.entityCache.revisionBytes,
        recent: metrics.entityCache.recentBytes, peer: s.chargedBytes, shallow: summary.bytes,
        rss: phase[0].native.roles[s.role+"Gateway"].rssBytes, objects });
    }
  }
  assert.equal(new Set(identities.values()).size, 2);
  const first = read("latency-samples.json").firstReads;
  const largest = first.filter((r: any) => r.tasks === 34).map((r: any) => r.ms);
  return { source: input.source, binding, mode: input.mode, people: input.size, activity: account.ryow, roles,
    cold: result.latency.cold, firstInScopeMs: first[0].ms, largestClassMs: largest };
}
if (process.argv[1] === import.meta.filename)
  console.log(JSON.stringify(process.argv.slice(2).map(inspectProfiles),null,2));
