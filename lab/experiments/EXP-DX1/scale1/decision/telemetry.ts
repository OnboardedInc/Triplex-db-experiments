import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createInterface } from "node:readline";
import { setTimeout as sleep } from "node:timers/promises";
import { engineResources, read, write, type Destination } from "./seed.ts";
import { fileHash } from "../measurements.ts";
import { quietFor } from "./plan.ts";
import type { Save } from "./writes.ts";

const roles = ["gw-w", "gw-r", "tx"] as const;
const assigned = { "gw-w": "2", "gw-r": "4,8", tx: "0" };
const required = ["gw-w.jsonl", "tx.jfr", "tx.jfr.jsonl", "tx.jfr-complete.jsonl"];
const traceDir = (dir: string, slot: string) => path.join(dir, "engines", slot, "trace/raw");
const wholeUtc = /^\[(\d{4}-\d\d-\d\dT[^\]]+)\]\[/;
const bootId = () => fs.readFileSync("/proc/sys/kernel/random/boot_id", "utf8").trim();
function anchor() {
  const lo = process.hrtime.bigint();
  const wallMs = Date.now(),
    senderMs = performance.timeOrigin + performance.now();
  const hi = process.hrtime.bigint();
  return { bootId: bootId(), wallMs, senderMs, beforeNs: String(lo), afterNs: String(hi) };
}

function gcLog(file: string) {
  const log = fs.readFileSync(file, "utf8");
  const collector = /\[gc\s*\] Using (.+)$/m.exec(log)?.[1]?.trim();
  const cpuCount = /CPUs:\s+(\d+) total,\s+(\d+) available/.exec(log)?.[2];
  const rows = log.trimEnd().split("\n");
  const times = rows.map((row) => Date.parse(wholeUtc.exec(row)?.[1] ?? ""));
  assert(
    collector && cpuCount && times.every(Number.isFinite),
    "Missing absolute JVM GC setup/log clocks",
  );
  return {
    collector,
    activeProcessors: Number(cpuCount),
    first: times[0]!,
    last: times[times.length - 1]!,
    lines: rows.length,
    pauses: rows.filter((l) => /\[gc\s*\] GC\(\d+\).* Pause .*\s[\d.]+ms$/.test(l)).length,
  };
}

export function traceFiles(dir: string, slot: string) {
  const raw = traceDir(dir, slot);
  if (!fs.existsSync(raw)) return [];
  return fs
    .readdirSync(raw)
    .filter(
      (name) =>
        /^(?:preflight-)?(?:gw-w|gw-r|tx)(?:-gc\.log|\.jsonl)$/.test(name) ||
        /^(?:tx\.jfr(?:\.jsonl|-complete\.jsonl)?|tx-jfr-error\.txt)$/.test(name),
    )
    .map((name) => path.relative(dir, path.join(raw, name)))
    .sort();
}

export function beginCapture(dir: string, id: Destination, restoredAt: number) {
  const started = anchor(),
    resources = engineResources(id.slot);
  const jvms = Object.fromEntries(
    roles.map((role) => {
      const cpus = resources[role].cpus;
      assert.equal(cpus, assigned[role]);
      const log = gcLog(path.join(traceDir(dir, id.slot), role + "-gc.log"));
      assert(log.first >= restoredAt && log.first <= started.wallMs);
      assert.equal(log.activeProcessors, cpus.split(",").length);
      return [role, { cpus, ...log }];
    }),
  );
  write(path.join(dir, "telemetry-start.json"), { ...id, restoredAt, started, jvms });
  return started;
}

export function checkSpace(dir: string) {
  const disk = fs.statfsSync(dir);
  assert(
    disk.bavail * disk.bsize >= 64 * 2 ** 30,
    "Live diagnostic output reached the reserved disk floor",
  );
}

export async function endCapture(dir: string, id: Destination, started: ReturnType<typeof anchor>) {
  const raw = traceDir(dir, id.slot);
  const stopped = anchor();
  assert.equal(stopped.bootId, started.bootId);
  execFileSync("docker", ["stop", "--time", "20", id.slot + "-gw-w", id.slot + "-gw-r"], {
    timeout: 60000,
    stdio: "ignore",
  });
  // [DX-SCALE1] Why: the pinned JRE exports its own recording while still alive.
  // Rejected: copying an unflushed .jfr file or timing the JFR export as workload.
  fs.writeFileSync(path.join(raw, ".finish"), "", { flag: "wx" });
  const complete = path.join(raw, "tx.jfr-complete.jsonl");
  const deadline = Date.now() + 45 * 60000;
  while (!fs.existsSync(complete)) {
    assert(
      Date.now() < deadline && !fs.existsSync(path.join(raw, "tx-jfr-error.txt")),
      "Native JFR export incomplete",
    );
    checkSpace(dir);
    await sleep(2000);
  }
  const jfr = read(complete);
  assert.deepEqual(
    [jfr.source, jfr.run, jfr.slot, jfr.clock.bootId],
    [id.source, id.slot, id.slot, started.bootId],
  );
  assert(jfr.recordingStart <= started.wallMs && jfr.at >= stopped.wallMs && jfr.clockSamples >= 2);
  const files = await Promise.all(
    required.map(async (name) => {
      const file = path.join(raw, name);
      return { name, bytes: fs.statSync(file).size, sha256: await fileHash(file) };
    }),
  );
  assert.equal(files.find((f) => f.name === "tx.jfr")?.sha256, jfr.fileSha256);
  const jvms = Object.fromEntries(
    roles.map((role) => [role, gcLog(path.join(raw, role + "-gc.log"))]),
  );
  write(path.join(dir, "telemetry-end.json"), { ...id, started, stopped, jvms, jfr, files });
}

const traceparent = /^00-([a-f0-9]{32})-([a-f0-9]{16})-0[01]$/;
const lines = (file: string) =>
  createInterface({ input: fs.createReadStream(file), crlfDelay: Infinity });
const clocks = (a: ReturnType<typeof anchor>) => {
  const lo = BigInt(a.beforeNs),
    hi = BigInt(a.afterNs);
  assert(hi >= lo && hi - lo < 50_000_000n);
  return { offset: a.senderMs - Number((lo + hi) / 2n) / 1e6, bracketMs: Number(hi - lo) / 1e6 };
};

// [DX-SCALE1] Why: join the observed HTTP response root, original durable t and
// transactor database hash. Rejected: assigning a nearby GC or native event by time.
export async function summarizeCapture(
  dir: string,
  id: Pick<Destination, "source" | "slot" | "nonce">,
) {
  const start = read(path.join(dir, "telemetry-start.json"));
  const end = read(path.join(dir, "telemetry-end.json"));
  for (const x of [start, end])
    assert.deepEqual([x.source, x.slot, x.nonce], [id.source, id.slot, id.nonce]);
  assert.deepEqual(start.started, end.started);
  assert.equal(start.started.bootId, end.stopped.bootId);
  const boot = start.started.bootId;
  const firstClock = clocks(start.started),
    lastClock = clocks(end.stopped);
  const raw = traceDir(dir, id.slot);
  for (const file of end.files) {
    assert(required.includes(file.name));
    const full = path.join(raw, file.name);
    assert.equal(fs.statSync(full).size, file.bytes);
    assert.equal(await fileHash(full), file.sha256);
  }
  assert.equal(new Set(end.files.map((x: { name: string }) => x.name)).size, required.length);
  const jvms = Object.fromEntries(
    roles.map((role) => {
      const checked = gcLog(path.join(raw, role + "-gc.log"));
      const expected = end.jvms[role];
      assert.deepEqual(
        [checked.collector, checked.activeProcessors, checked.first],
        [expected.collector, expected.activeProcessors, expected.first],
      );
      assert(checked.lines >= expected.lines && expected.last >= start.jvms[role].last);
      return [role, { ...checked, cpus: assigned[role] }];
    }),
  );
  const owners = new Map<string, { root: string; cell: string; t?: string; top?: Save }>();
  const cells: Record<
    string,
    {
      acked: number;
      offered: number;
      flushed: number;
      parsed: number;
      queue: number;
      prepare: number;
      entry: number;
      reply: number;
      gatewayJoined: number;
      nativeJoined: number;
      slowQuiet: {
        id: string;
        due: number;
        sent?: number;
        reply?: number;
        gateway?: Record<string, number>;
        nativeDone?: number;
      }[];
    }
  > = {};
  const native = new Map<string, { cell: string; members: number; ranks: number[] }>();
  for (const name of fs
    .readdirSync(dir)
    .filter((n) => /^r\d{1,2}-.*-writer\.json$/.test(n))
    .sort()) {
    const r = read(path.join(dir, name));
    assert.deepEqual(
      [r.source, r.slot, r.nonce, r.isolation],
      [id.source, id.slot, id.nonce, true],
    );
    assert(r.start >= start.started.senderMs && r.start + 300000 <= end.stopped.senderMs);
    const key = r.key as string;
    assert.equal(key + "-writer.json", name);
    const all = r.writes as Save[];
    const acked = all.filter((w) => w.status === "acked");
    const slow = acked
      .filter((w) => w.account === quietFor(r.repeat, true))
      .sort((a, b) => b.end! - b.due - (a.end! - a.due))
      .slice(0, 7);
    for (const w of all) {
      const parent = traceparent.exec(w.responseTrace ?? "");
      if (!parent) continue;
      const [, trace, root] = parent;
      assert(trace && root && !owners.has(trace));
      owners.set(trace, {
        root,
        cell: key,
        t: w.status === "acked" ? w.receipt?.t : undefined,
        top: slow.includes(w) ? w : undefined,
      });
    }
    cells[key] = {
      acked: acked.length,
      offered: all.length,
      flushed: all.filter((w) => w.sent).length,
      parsed: acked.filter((w) => w.stage?.timeline).length,
      queue: acked.filter((w) => Number.isFinite(w.stage?.groupQueueMicros)).length,
      prepare: acked.filter((w) => Number.isFinite(w.stage?.timeline?.payloadPrepared)).length,
      entry: acked.filter((w) => Number.isFinite(w.stage?.readyToNativeEntryMs)).length,
      reply: acked.filter((w) => Number.isFinite(w.responseHeaders)).length,
      gatewayJoined: 0,
      nativeJoined: 0,
      slowQuiet: slow.map((w) => ({ id: w.id, due: w.due, sent: w.sent, reply: w.end })),
    };
  }
  for await (const line of lines(path.join(raw, "gw-w.jsonl"))) {
    const g = JSON.parse(line);
    const s = owners.get(g.traceId);
    if (!s) continue;
    assert.equal(g.root, s.root);
    assert.deepEqual(
      [g.source, g.slot, g.process, g.clock.bootId],
      [id.source, id.slot, "gw-w", boot],
    );
    assert(g.kind === "commit" && g.name.endsWith("/transact") && g.truncated === 0);
    assert(Number.isFinite(g.clock.offsetMs) && Number.isFinite(g.start) && g.end >= g.start);
    owners.delete(g.traceId);
    if (!s.t) continue;
    assert.equal(String(g.attributes.datomicT), s.t);
    const c = cells[s.cell]!;
    c.gatewayJoined++;
    const rank = c.slowQuiet.findIndex((w) => w.id === s.top?.id);
    if (rank !== -1) {
      const spans = g.spans as { name: string; start: number; end: number }[];
      const convert = (wall: number) => wall - g.clock.offsetMs + firstClock.offset;
      const prepare = spans.find((x) => x.name === "commit.prepare-and-validate");
      const ready = spans.find((x) => x.name.startsWith("peer.transact-await"));
      const entryOffset = s.top?.stage?.readyToNativeEntryMs;
      c.slowQuiet[rank]!.gateway = {
        received: convert(g.start),
        ...(prepare
          ? { prepareStart: convert(prepare.start), prepareEnd: convert(prepare.end) }
          : {}),
        ...(prepare && Number.isFinite(entryOffset)
          ? { nativeEntryApprox: convert(prepare.end) + entryOffset! }
          : {}),
        ...(ready ? { peerResult: convert(ready.end) } : {}),
        replyWritten: convert(g.end),
      };
    }
    const hash = g.attributes.databaseHash;
    if (!/^[a-f0-9]{64}$/.test(hash)) continue;
    const key = hash + "/" + s.t;
    const frame = native.get(key) ?? { cell: s.cell, members: 0, ranks: [] };
    assert.equal(frame.cell, s.cell);
    frame.members++;
    if (rank !== -1) frame.ranks.push(rank);
    native.set(key, frame);
  }
  for await (const line of lines(path.join(raw, "tx.jfr.jsonl"))) {
    const t = JSON.parse(line);
    if (t.name !== "datomic.tx/process") continue;
    const key = t.databaseHash + "/" + t.datomicT;
    const frame = native.get(key);
    if (!frame) continue;
    assert.deepEqual(
      [t.source, t.slot, t.process, t.clock.bootId],
      [id.source, id.slot, "tx", boot],
    );
    if (
      t.clock.crossProcessQualified !== true ||
      !Number.isFinite(t.end) ||
      !Number.isFinite(t.clock.offsetMs)
    )
      continue;
    const c = cells[frame.cell]!;
    c.nativeJoined += frame.members;
    for (const rank of frame.ranks)
      c.slowQuiet[rank]!.nativeDone = t.end - t.clock.offsetMs + firstClock.offset;
    native.delete(key);
  }
  return {
    ...id,
    jvms,
    cells,
    clock: {
      bootId: boot,
      firstClock,
      lastClock,
      anchorDriftMs: Math.abs(firstClock.offset - lastClock.offset),
    },
    nativeClock:
      "Datomic :tx/process completion event. Native entry comes from the WFIX1 instrumented first transaction function at millisecond resolution.",
  };
}
