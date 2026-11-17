import { expect, it } from "vitest";
import { Worker, MessageChannel } from "node:worker_threads";
import { Replica, packEntity } from "../../../../packages/datomic/dist/index.js";
import { runtimeWorkerEnvironment } from "../../../bench/lib/w0-runtime.ts";
import { assertBaselineHeadroom, capacitySchedule } from "../../../bench/lib/w0-replica-live.ts";
import { evaluateAll } from "../../../bench/lib/w0-replica.ts";
import { runReplicaDriver } from "../../../bench/lib/w0-replica-driver.ts";
import { adaptiveReplicaFeed } from "../../../bench/lib/w0-parallel.ts";
import { W0, V_W0, triplexValue, canonical, w0Basis } from "../../../bench/lib/w0-world.ts";

it("read-only verification rejects a capacity writer before opening any engine", async () => {
  await expect(
    runReplicaDriver([
      "--scope",
      "must-not-connect",
      "--rung",
      "1",
      "--verify-candidates-at-seed",
      "--seed-position",
      "1",
      "--seed-fingerprint",
      "--candidates",
      "--oracle-candidates",
      "--capacity-baseline-rates",
      "5",
    ]),
  ).rejects.toThrow("capacity traffic requires an explicitly writable activation hold");
  await expect(
    runReplicaDriver(["--probe-follow-only", "--probe-follow-after", "1"]),
  ).rejects.toThrow("tail-only probe requires read-only verification declaration");
});

it("capacity caps preserve every frozen event and valid time while exposing the new offer schedule", () => {
  const events = [
    { atMs: 10, subject: 1 },
    { atMs: 11, subject: 1 },
    { atMs: 900, subject: 2 },
  ];
  const paced = capacitySchedule(events, 5);
  expect(paced.map((j) => j.atMs)).toEqual([10, 210, 900]);
  paced.forEach((job, i) => expect(job.event).toBe(events[i]));
  expect(events.map((e) => e.atMs)).toEqual([10, 11, 900]);
  expect(capacitySchedule(events).map((j) => j.atMs)).toEqual([10, 11, 900]);
  for (const rate of [NaN, Infinity, -1]) expect(() => capacitySchedule(events, rate)).toThrow();
});

it("reader worker follows ordered packed cuts and walks only the requested subject", async () => {
  const subject = W0.placementId(0);
  const row = {
    id: "a",
    entityId: subject,
    attribute: "x",
    value: { type: "string" as const, value: "first" },
    position: 1,
    validFrom: 0,
  };
  const first = packEntity(1, [row]);
  const second = packEntity(2, [{ ...row, id: "b", position: 2 }]);
  const third = packEntity(3, [{ ...row, id: "c", position: 3 }]);
  const source = {
    head: async () => 1,
    page: async (): Promise<never> => {
      throw Error("network forbidden");
    },
    feed: async (): Promise<never> => {
      throw Error("network forbidden");
    },
  };
  const replica = Replica.fromImage(source, {
    position: 1,
    validAt: 0,
    entities: [[subject, first]],
  });
  replica.compact();
  replica.applyUpdate({
    position: 2,
    reset: false,
    valid: true,
    changes: [[subject, first, second]],
  });
  replica.compact();
  const channel = new MessageChannel();
  const worker = new Worker(new URL("../../../bench/lib/w0-runtime-worker.ts", import.meta.url), {
    execArgv: ["--experimental-strip-types"],
    workerData: {
      role: "reader",
      port: channel.port2,
      N: 1,
      seed: "fresh-runtime-fixture",
      worker: 0,
      readers: 4,
      readerOffset: 0,
    },
    transferList: [channel.port2],
  });
  const reads: any[] = [];
  const stopped = new Promise<any>((resolve, reject) => {
    worker.on("error", reject);
    worker.on("message", (message) => {
      if (message.type === "reads") reads.push(...message.records);
      if (message.type === "failure") reject(Error(message.error));
      if (message.type === "ready") {
        channel.port1.postMessage({
          type: "delta",
          update: { position: 3, reset: false, valid: true, changes: [[subject, second, third]] },
        });
        setTimeout(() => worker.postMessage({ type: "stop" }), 50);
      }
      if (message.type === "stopped") resolve(message);
    });
  });
  channel.port1.postMessage({ type: "image", image: (await replica.snapshotAt(2)).sharedImage() });
  try {
    const result = await stopped;
    expect(result.position).toBe(3);
    expect(reads.some((read) => read.position === 3)).toBe(true);
    expect(reads.every((read) => read.subject === subject && read.rows === 1 && read.ms >= 0)).toBe(
      true,
    );
    expect(result.metrics.measuredElu.utilization).toBeGreaterThan(0);
  } finally {
    await worker.terminate();
    channel.port1.close();
  }
}, 15000);

it("binds writer/follower composition routing to the declared write endpoint without changing reader routing", () => {
  const writer = "http://bound-write:8080";
  for (const role of ["writer", "follower"]) {
    const env = runtimeWorkerEnvironment(role, writer);
    expect(env.DATOMIC_URL).toBe(writer);
    expect(env.DATOMIC_READ_URLS).toBe(writer);
    expect(() => runtimeWorkerEnvironment(role)).toThrow();
  }
  expect(runtimeWorkerEnvironment("reader").DATOMIC_READ_URLS).toBe(process.env.DATOMIC_READ_URLS);
});
it("requires complete finite baseline samples before activation admission", () => {
  const good = {
    readers: 256,
    read: { count: 1000 },
    commitService: { count: 10, p99: 20 },
    commit: { p99: 60 },
    offered: 10,
    acknowledged: 10,
    failures: 0,
    windowMs: 10000,
    pendingAtStop: 2,
  };
  expect(() => assertBaselineHeadroom(good)).not.toThrow();
  for (const bad of [
    { read: { count: 0 } },
    { commitService: { count: 0, p99: null } },
    { commit: { p99: NaN } },
    { acknowledged: 9 },
    { pendingAtStop: 33 },
    { windowMs: 0 },
  ])
    expect(() => assertBaselineHeadroom({ ...good, ...bad })).toThrow();
});

it("retains single-release worker results losslessly in compact form", async () => {
  const rung = W0.rung(1000),
    placements = [...W0.population(rung, 0, 2)];
  const position = Number(W0.populationBasis(rung).tx);
  const rows = new Map<string, any[]>();
  const seen = new Set<string>();
  for (const placement of placements)
    for (const fact of placement.world.facts) {
      const key = canonical(fact);
      if (seen.has(key)) continue;
      seen.add(key);
      const list = rows.get(fact.e) ?? [];
      list.push({
        id: key,
        entityId: fact.e,
        attribute: fact.a,
        value: triplexValue(fact.a, fact.v),
        position: Number(fact.tx),
        validFrom: 0,
      });
      rows.set(fact.e, list);
    }
  const source = {
    head: async () => position,
    page: async (): Promise<never> => {
      throw Error("network forbidden");
    },
    feed: async (): Promise<never> => {
      throw Error("network forbidden");
    },
  };
  const replica = Replica.fromImage(source, {
    position,
    validAt: V_W0,
    entities: [...rows].map(
      ([id, body]) => [id, packEntity(Math.max(...body.map((row) => row.position)), body)] as const,
    ),
  });
  const result = await evaluateAll({
    replica,
    subjects: placements.map((placement) => placement.world.subject),
    releases: W0.R2,
    workers: 1,
    compactRecords: true,
  });
  expect(result.records).toHaveLength(2);
  for (let i = 0; i < 2; i++) {
    const expected = W0.sweepSubject(
      placements[i].world,
      W0.R2,
      w0Basis({ position, validAt: V_W0 }),
    );
    expect(canonical(result.records[i].candidates[0])).toBe(
      canonical({ release: W0.R2.hash, ...expected }),
    );
  }
}, 15000);

// [DX-S5] Why: an oversized response is a read transport failure, so retries must preserve its cursor and every returned byte.
// Rejected: truncating returned journals, retrying unrelated failures, or looping forever on a single oversized journal.
it("oversized feed pages halve at the same cut and retain the learned safe bound", async () => {
  const calls: number[][] = [],
    events: unknown[] = [];
  const page = {
    head: 99,
    transactions: [{ position: 42, entities: ["fixture"] }],
    bytes: new Uint8Array([0, 1, 255]),
  };
  const feed = adaptiveReplicaFeed(
    async (after, limit, wait) => {
      calls.push([after, limit, wait]);
      if (limit > 4)
        throw Object.assign(new Error("Gateway response exceeds 67108864 bytes"), {
          _tag: "DatomicTransportError",
        });
      return page;
    },
    (event) => events.push(event),
  );
  expect(await feed(41, 1000, 17)).toBe(page);
  expect(await feed(41, 1000, 17)).toBe(page);
  expect(calls).toEqual([
    [41, 16, 17],
    [41, 8, 17],
    [41, 4, 17],
    [41, 4, 17],
  ]);
  expect(events).toHaveLength(2);
  expect(page.bytes).toEqual(new Uint8Array([0, 1, 255]));
});
it("unrelated feed errors propagate without another request", async () => {
  const error = new Error("Gateway response exceeds 67108864 bytes");
  let calls = 0;
  const feed = adaptiveReplicaFeed(async () => {
    calls++;
    throw error;
  });
  await expect(feed(41, 16, 0)).rejects.toBe(error);
  expect(calls).toBe(1);
});
it("one oversized journal fails closed after a bounded number of retries", async () => {
  const error = Object.assign(new Error("Gateway response exceeds 67108864 bytes"), {
    _tag: "DatomicTransportError",
  });
  const limits: number[] = [];
  const feed = adaptiveReplicaFeed(async (_after, limit) => {
    limits.push(limit);
    throw error;
  });
  await expect(feed(41, 16, 0)).rejects.toBe(error);
  expect(limits).toEqual([16, 8, 4, 2, 1]);
});
