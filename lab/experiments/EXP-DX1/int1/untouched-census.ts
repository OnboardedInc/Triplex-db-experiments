import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { gzipSync } from "node:zlib";
import { DatomicClient } from "../../../../packages/datomic/dist/index.js";
import { command } from "../w1/group/workload.ts";
import { facts, subject, type Account } from "../real1/population.ts";
import { metricEndpoint, type Stack } from "../thin1/native-metrics.ts";
import { parseHistogram } from "./gateway-profile.ts";

const sha = (value: Buffer | string) => createHash("sha256").update(value).digest("hex");

export async function untouchedCensus(stack: Stack, out: string, secret: string, source: string, high: number) {
  assert(process.platform === "linux" && /^[a-f0-9]{40}$/.test(source) && stack.managed?.compact);
  assert(high === 4096 || high === 24576);
  const low = high === 4096 ? 1024 : 16384;
  const peer = stack.managed.peers.find((p) => p.role === "read")!;
  const container = stack.containers.find((c) => c.id === peer.id);
  assert(container);
  const attempt = randomUUID(), write = new DatomicClient(stack.writeUrl, 45_000),
    read = new DatomicClient(stack.readUrl, 45_000);
  const identity = { source, attempt, nonce: stack.managed.nonce, slot: container.name,
    container: container.id, image: container.imageId, gateway: stack.gatewaySourceSha256 };
  fs.mkdirSync(out);
  const save = (name: string, payload: unknown) =>
    fs.writeFileSync(path.join(out, name + ".json"), JSON.stringify(payload) + "\n", { flag: "wx" });
  try {
    const created = await write.create(JSON.stringify(["triplex-scope-v1", "test", "test", "census-" + attempt, 0]), "lean", true);
    assert(created.created && created.strictRecordClocks);
    const db = created.db;
    const account: Account = { kind: "thin", id: 10, people: high };
    let head = 0, people = 0, lastT = 0n, pid: number | undefined, ticks: string | undefined;
    let originalGauge: unknown, gatewayWrapper: number | undefined;
    const frames: { first: number; last: number; operation: string; position: number; tx: string }[] = [];
    const observeHead = async () => {
      for (let n = 0; n < 40; n++) {
        const at = await read.begin(db);
        await read.release(db, at.handle);
        if (at.position === head) return;
        assert(at.position < head);
        await delay(100);
      }
      throw new Error("Read peer did not reach the census cut");
    };
    // [DX-INT1] Why: connect one read peer before adding people, then wait for metadata cuts only.
    // Rejected: reading a roster member to tell whether the peer has caught up.
    await observeHead();
    for (const population of [low, high]) {
      while (people < population) {
        const first = people, last = first + 32, operation = attempt + "/" + first;
        const rows = Array.from({ length: last - first }, (_, i) => facts(account, first + i)).flat();
        const input = command(operation, rows);
        const ack = await write.transact(db, input) as { operationId: string; position: { v: string }; t: { v: string } };
        assert.equal(ack.operationId, operation);
        assert.equal(Number(ack.position.v), ++head);
        const t = BigInt(ack.t.v);
        assert(t > lastT);
        lastT = t;
        const tx = input.claims[0]!.txId;
        assert.equal(await write.claim(db, operation, head), tx);
        frames.push({ first, last, operation, position: head, tx });
        people = last;
      }
      await observeHead();
      for (const indexed of [false, true]) {
        let index: { database: string; completed: boolean; requestedT: string } | undefined;
        if (indexed) {
          index = await write.request("POST", "/v2/db/" + db + "/request-index", { waitMs: 60_000 });
          assert(index?.database === db && index.completed && BigInt(index.requestedT) >= lastT);
          await observeHead();
        }
        const metric = async (endpoint: "/metrics" | "/gateway-profile", witness?: string) => {
          const reply = await fetch(metricEndpoint(peer.metrics, endpoint), {
            method: witness ? "POST" : "GET", redirect: "error", signal: AbortSignal.timeout(100_000),
            headers: { authorization: "Bearer " + secret, "x-thin-role": "read",
              ...(witness ? { "x-thin-observation": witness } : {}) },
          });
          if (!reply.ok) throw new Error("Census metrics: " + await reply.text());
          const row = await reply.json();
          assert.deepEqual([row.nonce, row.containerId, row.source, row.role],
            [identity.nonce, identity.container, identity.gateway, "read"]);
          return row;
        };
        const samples = [];
        for (let n = 0; n < 3; n++) {
          if (n) await delay(500);
          samples.push(await metric("/metrics"));
        }
        const witness = randomUUID();
        const { histogram, ...profile } = await metric("/gateway-profile", witness);
        assert.equal(profile.witness, witness);
        pid ??= profile.pid;
        ticks ??= profile.startTicks;
        assert(profile.pid === pid && profile.startTicks === ticks && ticks && Number(ticks) > 0);
        // [DX-INT1] Why: the launcher can remain above the profiled JVM.
        // Rejected: attributing a shell PID to the Java histogram or matching on a process name.
        gatewayWrapper ??= samples[0]!.gatewayPid;
        assert(Number.isSafeInteger(gatewayWrapper) && gatewayWrapper! > 1);
        assert(samples.every((m) => m.gatewayPid === gatewayWrapper));
        const ancestor = (child: number): boolean => {
          if (child === gatewayWrapper) return true;
          if (child <= 1) return false;
          const stat = fs.readFileSync("/proc/" + child + "/stat", "utf8");
          return ancestor(Number(stat.slice(stat.lastIndexOf(") ") + 2).split(" ")[1]));
        };
        assert(ancestor(pid!));
        assert(histogram.startsWith(pid + ":"));
        assert.equal(profile.chargedBytes, profile.caches.reduce((sum: number, c: { units: number; bytesPerUnit: number }) =>
          sum + c.units * c.bytesPerUnit, 0));
        const gauge = await read.request<{idMemo: {entries: number; inserts: number}; entityCache: {entries: number; bytes: number}}>("GET", "/v2/admin/scan-stats");
        originalGauge ??= gauge.idMemo.inserts;
        assert.equal(gauge.idMemo.entries, 0);
        assert.equal(gauge.entityCache.entries, 0);
        assert.equal(gauge.idMemo.inserts, originalGauge);
        const name = population + (indexed ? "-indexed" : "-live"), bytes = gzipSync(histogram);
        fs.writeFileSync(path.join(out, name + ".histogram.gz"), bytes, { flag: "wx" });
        save(name, { ...identity, db, population, head, indexed, index, samples, gatewayWrapper, profile, gauge,
          histogram: sha(bytes), totals: parseHistogram(histogram) });
      }
    }
    // Only these exact, post-census controls touch a person on the read peer.
    const hard = async (i: number, position: number) => read.rows(db, {
      entityIds: [subject(account, i), ...Array.from({ length: 3 }, (_, n) => subject(account, i) + "/ans:" + n)],
      basis: { recordedPosition: position, validAt: Date.UTC(2026, 0, 1) },
    });
    for (const [i, cut, exists] of [[0, low / 32, true], [high - 1, low / 32, false], [high - 1, head, true]] as const) {
      const rows = await hard(i, cut);
      assert.deepEqual(rows.map((r) => JSON.stringify([r.entity_id, r.attribute, r.value_type, r.value_string])).sort(),
        (exists ? facts(account, i).map((r) => JSON.stringify([r.e, r.a, r.v.type, r.v.value])).sort() : []));
    }
    save("census", { ...identity, db, head, people, sampled: [low, high], touchedDuringSamples: 0, frames });
  } finally {
    write.close();
    read.close();
  }
}
