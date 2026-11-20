import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { randomUUID, createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { performance } from "node:perf_hooks";
import { setTimeout as sleep } from "node:timers/promises";
import { Worker } from "node:worker_threads";
import type { Expected } from "../../../bench/lib/model.ts";
import { generateTrace, type TraceEvent } from "../../../bench/lib/trace.ts";
import {
  accountsFor,
  accountOfSubject,
  ids,
  ownFacts,
  sharedFacts,
  seedAddress,
  SEED_VALID_FROM,
} from "../../../bench/lib/world.ts";
import { buildTraceCommand, seedOps, type SubjectState } from "../../../bench/lib/commands.ts";
import type { ReadImage } from "../../../../packages/datomic/dist/index.js";
import type { requestIndex } from "../../../bench/lib/maintenance.ts";
import { blockPerf, physicalDelta, physicalSnapshot } from "./probe-metrics.ts";
import { finishTransactor, type GatewayExchange } from "./probe-transactor.ts";
import { collectGatewayPauses } from "./gateway-pauses.ts";
import { inLocalSlot } from "./owned-local.ts";

const now = () => performance.timeOrigin + performance.now();
const sha = (x: unknown) => createHash("sha256").update(JSON.stringify(x)).digest("hex");
const quantile = (ms: number[], p: number) =>
  ms.length ? [...ms].sort((a, b) => a - b)[Math.ceil(ms.length * p) - 1] : null;
const p90 = (ms: number[]) => quantile(ms, 0.9);
const source = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
const [
  output,
  duration = "90",
  topology = "prepared",
  workerCount = topology === "prepared" ? "6" : "2",
] = process.argv.slice(2);
assert(
  output && /^(prepared|self-test|s[123])$/.test(topology),
  "Usage: writer-probe.ts OUTPUT [SECONDS] [prepared|self-test|s1|s2|s3] [WORKERS]",
);
const seconds = Number(duration),
  nWorkers = Number(workerCount),
  selfTest = topology === "self-test";
assert(
  Number.isSafeInteger(seconds) &&
    seconds >= 1 &&
    seconds <= 90 &&
    Number.isSafeInteger(nWorkers) &&
    nWorkers >= 1 &&
    nWorkers <= 6,
);
if (topology === "prepared")
  assert(nWorkers === 6 && seconds === 90 && process.platform === "linux");
const out = path.resolve(output),
  nonce = randomUUID(),
  startOffset = 242_000,
  subjects = 10_000;
fs.mkdirSync(out);
const store = (where: string, value: unknown) =>
  fs.writeFileSync(path.join(out, where), JSON.stringify(value, null, 2) + "\n", { flag: "wx" });
const tape = generateTrace({
  seed: "ns-v2",
  subjects,
  durationS: startOffset / 1000 + seconds + 1,
}).filter(
  (x) =>
    x.stream === "background" && x.atMs >= startOffset && x.atMs < startOffset + seconds * 1000,
);
const primarySeq = new Set(tape.filter((e) => !e.resend).map((e) => e.seq));
const events = tape.filter((e) => !e.resend || primarySeq.has(e.seq));
assert(primarySeq.size, "Clip has no primary writes");
const people = [...new Set(events.map((e) => e.subject))].sort((a, b) => a - b);
const reads = Array.from({ length: seconds }, (_, i) => ({
  subject: people[i % people.length]!,
  offsetMs: i * 1000 + 100,
}));
const validAt = SEED_VALID_FROM + 100_000;
const tapeHash = sha({ events, reads, validAt });

async function waitUntil(at: number) {
  while (now() < at) await sleep(Math.max(1, at - now()));
}

type Write = {
  seq: number;
  resend: boolean;
  request: string;
  offsetMs: number;
  verdictMs: number;
  traceId?: string;
  nativeT?: string;
  position?: number;
  gatewayAwaitMs?: number;
};
type Ready = {
  run: (at: number) => Promise<{
    writes: Write[];
    gateway: { subject: number; digest: string; requests: number; facts: number; bytes: number }[];
    maintenance: Awaited<ReturnType<typeof requestIndex>> | null;
  }>;
  close: () => Promise<void>;
};

async function prepare(arm: number): Promise<Ready> {
  if (selfTest)
    return {
      close: async () => {},
      run: async (at) => {
        const write = async (e: TraceEvent) => {
          await waitUntil(at + e.atMs - startOffset);
          return {
            seq: e.seq,
            resend: e.resend,
            request: sha(e),
            offsetMs: e.atMs - startOffset,
            verdictMs: now() - (at + e.atMs - startOffset),
          };
        };
        const read = async (r: (typeof reads)[number]) => {
          await waitUntil(at + r.offsetMs);
          return { subject: r.subject, digest: sha(r), requests: 1, facts: 0, bytes: 0 };
        };
        const [writes, gateway] = await Promise.all([
          Promise.all(events.map(write)),
          Promise.all(reads.map(read)),
        ]);
        return { writes, gateway, maintenance: null };
      },
    };
  const { openComposition } = await import("../../../bench/lib/composition.ts");
  const { Model } = await import("../../../bench/lib/model.ts");
  const { observe } = await import("../../../bench/lib/observe.ts");
  const { observeNativeReceipt } = await import("../../../bench/lib/datomic-publication.ts");
  const { beginTrace, finishTrace, withTrace } = await import("../../../bench/lib/tracing.ts");
  const { requestIndex } = await import("../../../bench/lib/maintenance.ts");
  const { DatomicClient } = await import("../../../../packages/datomic/dist/index.js");
  const { runtimeApi } = await import("../../../bench/lib/triplex.ts");
  const scope = `rd1-${nonce}-${arm}`,
    model = new Model(subjects);
  const writer = await openComposition("reach", "datomic", scope);
  const endpoint = process.env.DATOMIC_READ_URLS?.split(",")[0];
  assert(endpoint && process.env.DATOMIC_URL);
  const client = new DatomicClient(endpoint);
  const maint = new DatomicClient(process.env.DATOMIC_URL);
  client.forceFullReach = true;
  const databaseScope = runtimeApi.DatabaseScope.test(scope);
  const layout = process.env.TRIPLEX_DATOMIC_LAYOUT ?? "lean";
  assert(layout === "lean" || layout === "legacy");
  const close = async () => {
    client.close();
    maint.close();
    await writer.close();
  };
  try {
    const db = await maint.create(databaseScope, layout, true);
    assert(
      db.strictRecordClocks && (await writer.currentPosition()) === 0,
      "Expected fresh strict scope before seed",
    );
    const state = new Map<number, SubjectState>(),
      accountCount = accountsFor(subjects);
    const accounts = [...new Set(people.map((i) => accountOfSubject(i, accountCount)))].sort(
      (a, b) => a - b,
    );
    const seed = [
      ...accounts.map((i) => sharedFacts(i)),
      ...people.map((i) => ownFacts(i, accountCount)),
    ].flat();
    let position = 0,
      instant = 0;
    const idsByKey = new Map<string, string>();
    for (let i = 0; i < seed.length; i += 1000) {
      const operations = seedOps(seed.slice(i, i + 1000));
      const d = await writer.transact(operations, {
        commandId: `${scope}:seed:${i}`,
        actor: "bulk-seed",
      });
      if (!d.ok) throw Error(`Seed refused: ${d.tag}`);
      assert(d.value.position > position && d.value.triples.length === operations.length);
      position = d.value.position;
      instant = d.value.instant;
      model.bindReceipt(operations, d.value, "bulk-seed");
      for (const row of d.value.triples) idsByKey.set(`${row.entityId}/${row.attribute}`, row.id);
    }
    for (const subject of people) {
      const stampId = idsByKey.get(`${ids.placement(subject)}/:placement/stamp`),
        addressId = idsByKey.get(`${ids.worker(subject)}/:worker/address`);
      assert(stampId && addressId);
      state.set(subject, {
        stamp: 0,
        stampId,
        stampValidFrom: SEED_VALID_FROM,
        address: seedAddress(subject),
        addressId,
        addressValidFrom: SEED_VALID_FROM,
      });
    }
    assert.equal(await writer.currentPosition(), position);
    const expected = new Map(people.map((i) => [i, model.expected(i, instant, validAt)]));
    const original = new Map<
      number,
      {
        command: ReturnType<typeof buildTraceCommand>;
        logical: string;
        position: number;
        txId: string;
      }
    >();
    const native = new Map<string, { t: string; position: number; gatewayAwaitMs: number }>();
    const bySubject = new Map<number, Promise<Write>>();
    return {
      close,
      run: async (at) => {
        observeNativeReceipt((name, _input, reply, p, commands) => {
          if (name === db.db)
            for (const id of commands)
              native.set(id, {
                t: reply.t.v,
                position: p,
                gatewayAwaitMs: reply.transactMicros / 1000,
              });
        });
        const issue = async (e: TraceEvent): Promise<Write> => {
          const scheduledAt = at + e.atMs - startOffset;
          await waitUntil(scheduledAt);
          const prev = original.get(e.seq);
          const st = state.get(e.subject)!;
          assert(!e.resend || prev, "Duplicate has no fresh original");
          const command =
            prev?.command ??
            buildTraceCommand({
              runTag: scope,
              event: e,
              state: st,
              scheduledAbsMs: validAt + e.atMs,
            });
          const logical =
            prev?.logical ??
            sha({
              added: command.added,
              removed: command.removed,
              from: command.addedValidFrom,
              range: command.validRange,
              scheduledOffset: e.atMs,
            });
          const trace = beginTrace(
            "commit",
            "rd1.writer",
            { arm, seq: e.seq, resend: e.resend },
            scheduledAt,
          );
          try {
            const reply: Awaited<ReturnType<typeof writer.transact>> = await withTrace(trace, () =>
              writer.transact(command.operations, {
                commandId: command.commandId,
                preconditions: command.preconditions,
                actor: e.kind,
              }),
            );
            if (e.resend) {
              assert(!reply.ok && reply.tag === "CommandAlreadyCommittedError");
            } else {
              if (!reply.ok) throw Error(`Matched write ${e.seq} failed: ${reply.tag}`);
              const receipt = reply.value;
              const row = receipt.triples.find(
                (r) =>
                  r.entityId === ids.placement(e.subject) && r.attribute === ":placement/stamp",
              );
              assert(row?.value.value === String(command.newStamp) && receipt.position > position);
              st.stamp = command.newStamp;
              st.stampId = row.id;
              st.stampValidFrom = Math.floor(validAt + e.atMs);
              if (command.newAddress !== null) {
                st.address = command.newAddress;
                st.addressValidFrom = command.validRange.from;
                st.addressId = receipt.triples.find(
                  (r) => r.entityId === ids.worker(e.subject) && r.attribute === ":worker/address",
                )!.id;
              }
              original.set(e.seq, {
                command,
                logical,
                position: receipt.position,
                txId: receipt.txId,
              });
              if (e.ackLoss) {
                const resolved = await writer.transactionByCommand(command.commandId);
                assert(
                  resolved.ok &&
                    resolved.value?.position === receipt.position &&
                    resolved.value?.txId === receipt.txId,
                );
              }
            }
            const ref = native.get(command.commandId);
            const bound = original.get(e.seq)!;
            assert(
              ref?.position === bound.position &&
                /^\d+$/.test(ref.t) &&
                Number.isFinite(ref.gatewayAwaitMs) &&
                ref.gatewayAwaitMs >= 0,
            );
            return {
              seq: e.seq,
              resend: e.resend,
              request: logical,
              offsetMs: e.atMs - startOffset,
              verdictMs: now() - scheduledAt,
              traceId: trace?.traceId,
              nativeT: ref.t,
              position: bound.position,
              ...(e.resend ? {} : { gatewayAwaitMs: ref.gatewayAwaitMs }),
            };
          } finally {
            finishTrace(trace);
          }
        };
        const writes = events.map((e) => {
          const p = (bySubject.get(e.subject) ?? Promise.resolve()).then(() => issue(e));
          bySubject.set(e.subject, p);
          return p;
        });
        const gateway = reads.map(async (r) => {
          await waitUntil(at + r.offsetMs);
          const got = await client.readDemandWorld(
            String(databaseScope),
            ids.placement(r.subject),
            { recordedAt: instant, recordedPosition: position, validAt },
          );
          assert(got && got.requests === 1);
          const observed = observe({ triples: got.triples }),
            exp = expected.get(r.subject)!;
          assert(
            exp.fullRows &&
              observed.digest === exp.digest &&
              observed.facts === exp.facts &&
              observed.stamp === exp.stamp,
            "Gateway tape returned a different world",
          );
          return {
            subject: r.subject,
            digest: observed.digest,
            requests: got.requests,
            facts: observed.facts,
            bytes: observed.bytes,
          };
        });
        const index = async () => {
          if (seconds < 30) return null;
          await waitUntil(at + seconds * 500);
          return requestIndex(maint, db.db, `probe-${arm}`, now, 10_000);
        };
        try {
          const [w, g, m] = await Promise.all([Promise.all(writes), Promise.all(gateway), index()]);
          return { writes: w, gateway: g, maintenance: m };
        } finally {
          observeNativeReceipt(undefined);
        }
      },
    };
  } catch (error) {
    await close();
    throw error;
  }
}

function inbox<T>(worker: Worker, select: (x: any) => boolean) {
  return new Promise<T>((resolve, reject) => {
    const finish = (error: Error | null, value?: T) => {
      worker.off("message", receive);
      worker.off("error", failure);
      worker.off("exit", exit);
      if (error) reject(error);
      else resolve(value!);
    };
    const receive = (value: T) => {
      if (select(value)) finish(null, value);
    };
    const failure = (error: Error) => finish(error);
    const exit = (code: number) =>
      finish(Error(`Replay worker exited before its receipt (${code})`));
    worker.on("message", receive);
    worker.once("error", failure);
    worker.once("exit", exit);
  });
}

type ReplayLoad = { readsPerS: number; fullRowShare: number; targetCores: number };

async function replaySetup(
  directory: string,
  image: ReadImage | undefined,
  expected: Expected[],
  load: ReplayLoad,
) {
  const budget = topology === "prepared" ? 2 * 1024 ** 3 : 128 * 1024 ** 2;
  const { SpillThread } = await import("../../../bench/lib/spill-thread.ts");
  const spill = new SpillThread(path.join(directory, "replay-spill"), budget);
  const workers = Array.from(
    { length: nWorkers },
    (_, worker) =>
      new Worker(new URL("./replay-worker.ts", import.meta.url), {
        workerData: { worker, image, expected },
      }),
  );
  const stop = () => Promise.all(workers.map((w) => w.terminate()));
  try {
    await Promise.all(workers.map((w) => inbox(w, (x) => x.ready)));
  } catch (error) {
    await stop();
    await spill.abort();
    throw error;
  }
  let running = false,
    closed = false;
  return {
    run: async (at: number) => {
      running = true;
      await spill.beginPhase(0, at, 0);
      const results = workers.map((w) => {
        const done = inbox<{
          reads: number;
          fullRows: number;
          start: number;
          end: number;
          cpuMs: number;
          elu: number;
        }>(w, (x) => Number.isSafeInteger(x.reads));
        const observationPort = spill.connect();
        w.postMessage(
          {
            at,
            until: at + seconds * 1000,
            perSecond: load.readsPerS / nWorkers,
            fullRowShare: load.fullRowShare,
            observationPort,
          },
          [observationPort],
        );
        return done;
      });
      const rows = await Promise.all(results);
      const recorded = await spill.finish();
      closed = true;
      assert(rows.every((x) => x.reads > 0 && x.start >= at && x.end >= at + seconds * 1000));
      assert.equal(
        recorded.length,
        rows.reduce((n, x) => n + x.reads, 0),
      );
      const summary = {
        readers: rows,
        reads: recorded.length,
        readsPerS: recorded.length / seconds,
        activeReaderCores: rows.reduce((total, r) => total + r.cpuMs, 0) / (seconds * 1000),
        encodedBytes: recorded.encodedBytes,
        disk: spill.diskBudget,
      };
      recorded.dispose();
      return summary;
    },
    close: async () => {
      await stop();
      if (!closed) {
        if (running) await spill.abort();
        else (await spill.finish()).dispose();
      }
    },
  };
}

function readGateway(
  file: string | undefined,
  offset: number,
  writes: Write[],
  run: string,
  slot: string,
) {
  const exchanges: GatewayExchange[] = [];
  if (!file) return { matched: 0, p90ApiMs: null, p90PeerWaitMs: null, rows: [], exchanges };
  const size = fs.statSync(file).size - offset;
  assert(size >= 0 && size < 128 * 1024 ** 2, "Gateway trace rotated or exceeded probe allowance");
  const bytes = Buffer.alloc(size),
    fd = fs.openSync(file, "r");
  const prefix = Buffer.alloc(1, 10);
  try {
    if (offset > 0) assert.equal(fs.readSync(fd, prefix, 0, 1, offset - 1), 1);
    assert.equal(fs.readSync(fd, bytes, 0, size, offset), size);
  } finally {
    fs.closeSync(fd);
  }
  const wanted = new Map(writes.filter((w) => !w.resend).map((w) => [w.traceId, w]));
  assert(
    wanted.size === primarySeq.size && !wanted.has(undefined),
    "Missing or duplicate writer trace ID",
  );
  const lines = bytes.toString().split("\n");
  lines.pop(); // Next flush may complete a line from other prepared-stack traffic.
  if (prefix[0] !== 10) lines.shift();
  const seen = new Set<string>();
  const rows = lines.flatMap((line) => {
    if (!line.trim()) return [];
    const r = JSON.parse(line),
      w = wanted.get(r.traceId),
      io = r.attributes?.transactionIoStats;
    if (!w || r.type !== "request" || r.attributes?.datomicT === undefined) return [];
    assert(
      io && String(r.attributes.datomicT) === w.nativeT && !seen.has(r.traceId),
      "Wrong or repeated gateway commit observation",
    );
    assert(r.source === source && r.slot === slot && r.run === run && r.process === "gw-w");
    const span = r.spans.find((s: any) => s.name.startsWith("peer.transact-await"));
    assert(span && Number.isFinite(io["api-ms"]) && io["api-ms"] >= 0 && span.end >= span.start);
    exchanges.push(r);
    seen.add(r.traceId);
    return [
      {
        seq: w.seq,
        traceId: w.traceId,
        t: w.nativeT,
        apiMs: io["api-ms"] as number,
        peerWaitMs: (span.end - span.start) as number,
        reads: io.reads ?? null,
      },
    ];
  });
  return {
    matched: rows.length,
    p90ApiMs: p90(rows.map((r) => r.apiMs)),
    p90PeerWaitMs: p90(rows.map((r) => r.peerWaitMs)),
    rows,
    exchanges,
  };
}

async function run(slot: string) {
  const manifest = {
    nonce,
    source,
    slot,
    seconds,
    nWorkers,
    tapeHash,
    primaryCount: primarySeq.size,
    gatewayCalls: reads.length,
    driverSha256: createHash("sha256")
      .update(fs.readFileSync(import.meta.filename))
      .digest("hex"),
  };
  store("tape.json", { ...manifest, events, reads, validAt });
  const physical = topology === "prepared";
  const file = physical ? process.env.DX_RD1_WRITE_TRACE : undefined;
  const traceRun = process.env.TRIPLEX_TRACE_RUN ?? "";
  const traceDir = file ? path.dirname(file) : undefined;
  if (physical) {
    assert(
      file &&
        traceDir &&
        path.basename(file) === "gw-w.jsonl" &&
        traceRun &&
        process.env.TRIPLEX_TRACE_SOURCE === source &&
        ["summary", "full"].includes(process.env.TRIPLEX_TRACE_LEVEL ?? ""),
      "Bind the prepared stack's write trace to the checked-out source",
    );
    for (const artifact of [".finish", "tx.jfr", "tx.jfr-complete.jsonl", "tx-jfr-error.txt", "gw-w.jfr", "gw-w.jfr-complete.jsonl", "gw-w-jfr-error.txt"])
      assert(
        !fs.existsSync(path.join(traceDir, artifact)),
        "Prepared trace directory already has a terminal artifact",
      );
    assert.equal(process.env.TRIPLEX_NODE_WORKER_CPUS, "5,6,7,9,10,11");
    assert.equal(process.env.TRIPLEX_NODE_MAIN_CPUS, "3");
  }
  const fixtureModule = selfTest ? undefined : await import("./reader-cost.ts");
  const fixture = fixtureModule?.costFixture(physical ? 1024 : 32);
  const load = fixture
    ? await fixtureModule!.calibrateReplay(
        fixture,
        physical ? 89_000 : 8_000,
        physical ? 4.57 : 0.5,
      )
    : { readsPerS: 8_000, targetCores: 0, fullRowShare: 0 };
  const image = fixture?.index.image();
  const expected = fixture
    ? Array.from({ length: fixture.model.subjects }, (_, i) => fixture.model.expected(i, 100, 1000))
    : [{ fullRows: true, stamp: 0, facts: 64, digest: "immutable-fixture", commits: 0 }];
  const started = performance.now();
  const deadline = started + 600_000;
  const blocks = [];
  let bootId: string | undefined;
  let controlHash: string | undefined;
  for (const [i, on] of [false, true, true, false].entries()) {
    const folder = `block-${i + 1}`,
      directory = path.join(out, folder);
    fs.mkdirSync(directory);
    const ready = await prepare(i);
    const replay = await replaySetup(directory, image, expected, load);
    try {
      if (physical && performance.now() + seconds * 1000 + 15_000 > deadline)
        throw Error("Next matched block would exceed the ten-minute probe budget");
      const offset = file ? fs.statSync(file).size : 0;
      const before = physical ? await physicalSnapshot() : null;
      if (before) {
        bootId ??= before.boot;
        assert.equal(before.boot, bootId);
      }
      const at = now() + 300;
      const perf = physical ? waitUntil(at).then(() => blockPerf(directory, seconds)) : null;
      const afterBlock = waitUntil(at + seconds * 1000).then(() =>
        physical ? physicalSnapshot() : null,
      );
      const [foreground, noise, after] = await Promise.all([
        ready.run(at),
        on ? replay.run(at) : null,
        afterBlock,
      ]);
      const metrics = before && after ? physicalDelta(before, after) : null;
      const hash = sha({
        writes: foreground.writes.map((w) => [w.seq, w.offsetMs, w.resend, w.request]),
        gateway: foreground.gateway.map((r) => [r.subject, r.requests, r.facts]),
        maintenanceRequests: Number(foreground.maintenance !== null),
      });
      controlHash ??= hash;
      assert.equal(
        hash,
        controlHash,
        "Foreground tape or actual gateway request/maintenance count changed",
      );
      if (file) await sleep(1_100); // The gateway flushes buffered records once per second.
      const gatewayTrace = readGateway(file, offset, foreground.writes, traceRun, slot);
      const perfResult = await perf;
      const block = {
        ...manifest,
        arm: i,
        on,
        at,
        until: at + seconds * 1000,
        controlHash,
        reads: noise?.reads ?? 0,
        replay: noise ?? null,
        writerP50Ms: quantile(
          foreground.writes.filter((w) => !w.resend).map((w) => w.verdictMs),
          0.5,
        ),
        writerP90Ms: p90(foreground.writes.filter((w) => !w.resend).map((w) => w.verdictMs)),
        gatewayAwaitP90Ms: p90(
          foreground.writes.flatMap((w) =>
            w.gatewayAwaitMs === undefined ? [] : [w.gatewayAwaitMs],
          ),
        ),
        gatewayTrace,
        metrics,
        perf: perfResult,
        maintenanceCompleted: foreground.maintenance?.completed ?? null,
      };
      store(`${folder}/observed.json`, { ...block, before, after, ...foreground });
      blocks.push(block);
    } finally {
      try {
        await replay.close();
      } finally {
        await ready.close();
      }
    }
  }
  const exported =
    traceDir && bootId
      ? await finishTransactor(
          traceDir,
          blocks.flatMap((b) => b.gatewayTrace.exchanges),
          { run: traceRun, source, slot },
          bootId,
          deadline,
        )
      : null;
  const gatewayPauses = traceDir && bootId
    ? await collectGatewayPauses(traceDir, { run: traceRun, source, slot },
      { bootId, offsetMs: now() - Number(process.hrtime.bigint()) / 1e6 }, blocks, deadline)
    : null;
  const transactor = blocks.map((b) => {
    const rows = b.gatewayTrace.rows.flatMap((r) => {
      const row = r.traceId ? exported?.bound.get(r.traceId) : undefined;
      return row ? [{ seq: r.seq, ...row }] : [];
    });
    return {
      arm: b.arm,
      matched: rows.length,
      p90ProcessMs: p90(rows.map((r) => r.processMs)),
      p90ApplyMs: p90(rows.map((r) => r.applyMs)),
      rows,
    };
  });
  const wallS = (performance.now() - started) / 1000;
  const nativeComplete =
    !!exported &&
    !!gatewayPauses &&
    transactor.every((t) => t.matched === primarySeq.size) &&
    blocks.every(
      (b) =>
        b.gatewayTrace.matched === primarySeq.size &&
        b.metrics?.runnableStatsEnabled &&
        b.perf?.countersDelivered &&
        b.maintenanceCompleted,
    );
  const contrast = (() => {
    if (!nativeComplete) return null;
    const ratio = (values: (number | null)[]) => {
      const baseline = (values[0]! + values[3]!) / 2;
      return baseline > 0 ? [values[1]! / baseline, values[2]! / baseline] : null;
    };
    return {
      processP90Ratios: ratio(transactor.map((t) => t.p90ProcessMs)),
      txWithP90Ratios: ratio(blocks.map((b) => b.gatewayTrace.p90ApiMs)),
      peerWaitP90Ratios: ratio(blocks.map((b) => b.gatewayTrace.p90PeerWaitMs)),
    };
  })();
  const output = {
    ...manifest,
    wallS,
    replayTarget: load,
    blocks,
    transactor,
    writeGatewayGc: gatewayPauses,
    nativeRecording: exported && { sha256: exported.sha256, events: exported.events },
    nativeComplete,
    contrast,
    diagnostic: selfTest
      ? "offline control and collector fixture"
      : "matched foreground with local replica and recorder off/on/on/off",
  };
  store("result.json", output);
  console.log(
    JSON.stringify(
      {
        ...manifest,
        wallS,
        nativeComplete,
        arms: blocks.map((x) => ({
          on: x.on,
          reads: x.reads,
          writerP90Ms: x.writerP90Ms,
          nativeP90: transactor[x.arm]!.p90ProcessMs,
        })),
      },
      null,
      2,
    ),
  );
}

if (topology === "prepared") {
  assert(process.env.TRIPLEX_TRACE_SLOT, "Missing prepared slot identity");
  await run(process.env.TRIPLEX_TRACE_SLOT);
} else if (selfTest) await run("offline-fixture");
else await inLocalSlot(topology, run);
