import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { promisify } from "node:util";
import type { ServerCell } from "./server-workload.ts";

const shell = promisify(execFile);
const clock = () => performance.timeOrigin + performance.now();
const roles = ["tx", "pg", "gw-w", "gw-r"] as const;
type Role = (typeof roles)[number];
type Engines = Partial<Record<string, { id: string; cgroup: string }>>;
type Cpu = { usage_usec: number; nr_throttled: number; throttled_usec: number; pressure: string };
type Pg = { at: number; wal: Record<string, unknown>; checkpointer: Record<string, unknown>; io: unknown[] };
type EventKind = "index-start" | "index-complete" | "index-adoption" | "memory-index" | "memory-alarm" | "checkpoint-start" | "checkpoint-end";
type Event = { kind: EventKind; at: number; line: string; callback?: true; cause?: string; memoryHighMB?: number; alarmCount?: number };
type Binding = { source: string; slot: string; attempt: string; database: string; firstCut: number; cell: ServerCell; start: number; end: number };
type Sample = { due: number; at: number; until: number; sender: NodeJS.CpuUsage; cpu?: Record<Role, Cpu>; pg?: Pg; errors: string[] };
type Events = { events: Event[]; errors: string[]; priorMemory?: Event };
type Probe = {
  sample(due: number, signal: AbortSignal): Promise<Sample>;
  events(binding: Binding, signal: AbortSignal): Promise<Events>;
};
export const counterSql = `SELECT json_build_object(
  'at', extract(epoch FROM clock_timestamp()) * 1000,
  'wal', (SELECT row_to_json(w) FROM pg_stat_wal w),
  'checkpointer', (SELECT row_to_json(c) FROM pg_stat_checkpointer c),
  'io', (SELECT json_agg(i ORDER BY backend_type, object, context) FROM pg_stat_io i))`;

const limits = (signal: AbortSignal) => ({ signal, timeout: 5_000, maxBuffer: 2 * 1024 * 1024 });
const failure = (e: unknown) => e instanceof Error ? e.message.split("\n")[0]! : String(e);
const finite = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);
const counter = (value: unknown) => Number.isSafeInteger(value) && typeof value === "number" && value >= 0;
const cpuRead = async (cgroup: string) => {
  const [stat, pressure] = await Promise.all(["cpu.stat", "cpu.pressure"].map(file => fs.readFile(path.join(cgroup, file), "utf8")));
  const counters = Object.fromEntries(stat!.trim().split("\n").map(line => {
    const [name, value] = line.split(" ");
    return [name, Number(value)];
  }));
  return { ...counters, pressure: pressure!.trim() } as Cpu;
};
const validCpu = (cpu: Cpu) => cpu && [cpu.usage_usec, cpu.nr_throttled, cpu.throttled_usec].every(counter) && typeof cpu.pressure === "string";
const validPg = (pg: Pg, at: number, until: number) => pg && finite(pg.at) && pg.at >= at - 2 && pg.at <= until + 2 &&
  pg.wal && "wal_bytes" in pg.wal && pg.checkpointer && "num_timed" in pg.checkpointer && Array.isArray(pg.io) && pg.io.length > 0;

export function nativeEvent(line: string, postgres: boolean): Event[] {
  const pgStamp = postgres ? /(\d{4}-\d\d-\d\d \d\d:\d\d:\d\d\.\d{3}) UTC/.exec(line)?.[1] : undefined;
  const at = Date.parse((pgStamp ?? line.slice(0, 23)).replace(" ", "T") + "Z");
  if (!finite(at)) return [];
  if (postgres) {
    const start = /checkpoint starting:\s*(.*)$/.exec(line);
    if (start) return [{ kind: "checkpoint-start", at, line, cause: start[1] }];
    return line.includes("checkpoint complete:") ? [{ kind: "checkpoint-end", at, line }] : [];
  }
  const events: Event[] = [];
  if (line.includes(":event :update/create-index")) {
    if (line.includes(":phase :begin")) events.push({ kind: "index-start", at, line });
    if (line.includes(":phase :end")) events.push({ kind: "index-complete", at, line });
  }
  if (line.includes(":event :update/new-index")) events.push({ kind: "index-adoption", at, line });
  const memory = /:(?:MemoryIndexMB|MemIndexMB)\s+(?:\{[^}]*:hi\s+)?([\d.Ee+-]+)/.exec(line);
  if (memory && finite(Number(memory[1]))) events.push({ kind: "memory-index", at, line, memoryHighMB: Number(memory[1]) });
  const alarms = /:AlarmBackPressure\s+(?:\{[^}]*:sum\s+)?([\d.Ee+-]+)/.exec(line);
  if (alarms && counter(Number(alarms[1]))) events.push({ kind: "memory-alarm", at, line, alarmCount: Number(alarms[1]) });
  if (/\b(?:WARN|ERROR)\b/.test(line) && /mem(?:ory)?[- ]?index|back.pressure/i.test(line)) {
    events.push({ kind: "memory-alarm", at, line });
  }
  return events;
}

export function physicalTelemetry(out: string, engines: Engines): Probe {
  assert(roles.every(role => /^[a-f0-9]{64}$/.test(engines[role]?.id ?? "") &&
    engines[role]!.cgroup.startsWith("/sys/fs/cgroup/")), "Telemetry requires the live role IDs and cgroups");
  const bootId = path.resolve("/proc/sys/kernel/random/boot_id");
  const offset = performance.timeOrigin + performance.now() - Number(process.hrtime.bigint()) / 1e6;
  return {
    async sample(due, signal) {
      const at = clock(), sender = process.cpuUsage(), errors: string[] = [];
      const [cpu, database] = await Promise.allSettled([
        Promise.all(roles.map(async role =>
          [role, await cpuRead(engines[role]!.cgroup)] as const)),
        shell("docker", ["exec", engines.pg!.id, "psql", "-XAtq", "-v", "ON_ERROR_STOP=1",
          "-U", "postgres", "-d", "datomic", "-c", counterSql], limits(signal)),
      ]);
      const until = clock();
      const sample: Sample = { due, at, until, sender, errors };
      if (cpu.status === "fulfilled" && cpu.value.every(([, row]) => validCpu(row))) {
        sample.cpu = Object.fromEntries(cpu.value) as Record<Role, Cpu>;
      } else errors.push("Role CPU counters unavailable");
      if (database.status === "fulfilled") {
        try {
          const value: Pg = JSON.parse(database.value.stdout);
          assert(validPg(value, at, until), "stat views or database clock outside sample bracket");
          sample.pg = value;
        } catch (error) {
          errors.push("PostgreSQL counters: " + failure(error));
        }
      } else errors.push("PostgreSQL counters: " + failure(database.reason));
      return sample;
    },
    async events(binding, signal) {
      const since = new Date(binding.start - 1000).toISOString();
      const until = new Date(binding.end + 1000).toISOString();
      // [DX-V01] Why: use native timestamps and the current container IDs, retaining just the pertinent vendor records.
      // Rejected: inferring checkpoint cause from counters or translating a Datomic logical clock to a save deadline.
      const [postgres, datomic, callback, hostBoot] = await Promise.allSettled([
        shell("docker", ["logs", "--timestamps", "--since", since, "--until", until, engines.pg!.id], limits(signal)),
        shell("docker", ["exec", engines.tx!.id, "sh", "-c",
          'from="$1"; to="$2"; set -- /opt/datomic/log/*.log; test -f "$1" || exit 3; ' +
          'grep -hE ":update/(new-index|create-index)|MemoryIndexMB|MemIndexMB|AlarmBackPressure|[mM]em(ory)?[- ]?[Ii]ndex|back.pressure" "$@" | ' +
          `awk -v from="$from" -v to="$to" '{t=substr($0,1,23); if(t>=from && t<=to)print}'`,
          "scorecard-index-log",
          since.slice(0, 23).replace("T", " "), until.slice(0, 23).replace("T", " ")],
          limits(signal)),
        fs.readFile(path.join(out, "engines", binding.slot, "trace/raw/tx.jsonl"), { encoding: "utf8", signal }),
        fs.readFile(bootId, { encoding: "utf8", signal }),
      ]);
      const events: Event[] = [], errors: string[] = [];
      if (postgres.status === "fulfilled") {
        for (const stream of [postgres.value.stdout, postgres.value.stderr]) {
          for (const line of stream.split("\n")) events.push(...nativeEvent(line, true));
        }
      } else errors.push("PostgreSQL checkpoint log: " + failure(postgres.reason));
      if (datomic.status === "fulfilled") {
        for (const line of datomic.value.stdout.split("\n")) events.push(...nativeEvent(line, false));
      } else errors.push("Datomic vendor log: " + failure(datomic.reason));
      if (callback.status === "fulfilled") {
        try {
          let installed = false, dropped = 0;
          for (const line of callback.value.split("\n").slice(0, -1)) {
            if (!line) continue;
            const row = JSON.parse(line);
            assert.deepEqual([row.source, row.slot, row.run, row.process], [binding.source, binding.slot, binding.slot, "tx"]);
            assert(hostBoot.status === "fulfilled" && row.clock?.bootId === hostBoot.value.trim() &&
              row.clock.domain === "linux-monotonic" && finite(row.clock.offsetMs), "Datomic callback clock is unbound");
            const align = (at: number) => at - row.clock.offsetMs + offset;
            const state = row.counters?.indexAdoptions;
            if (state?.status === "installed") installed = true;
            dropped = Math.max(dropped, state?.dropped ?? 0);
            if (row.type === "index-adoption" && row.completed && finite(row.end))
              events.push({ kind: "index-adoption", at: align(row.end), line, callback: true });
            if (row.type !== "metrics" || !finite(row.at)) continue;
            const metric = row.counters?.memoryIndexMB;
            const mb = metric?.hi ?? metric;
            if (finite(mb)) events.push({ kind: "memory-index", at: align(row.at), line, memoryHighMB: mb, callback: true });
            const alarm = row.metrics?.AlarmBackPressure;
            const alarmCount = alarm?.sum ?? alarm;
            if (counter(alarmCount)) events.push({ kind: "memory-alarm", at: align(row.at), line, alarmCount, callback: true });
          }
          if (!installed || dropped) errors.push(`Datomic adoption observer installed=${installed}, dropped=${dropped}`);
        } catch (error) {
          errors.push("Datomic metrics or adoption trace: " + failure(error));
        }
      } else errors.push("Datomic metrics or adoption trace: " + failure(callback.reason));
      events.sort((a, b) => a.at - b.at);
      return { events: events.filter(e => e.at >= binding.start && e.at <= binding.end),
        priorMemory: events.findLast(e => e.kind === "memory-index" && e.at < binding.start), errors };
    },
  };
}

export async function collectCell(probe: Probe, binding: Binding, signal: AbortSignal) {
  const samples: Sample[] = [];
  for (let due = binding.start; due <= binding.end; due += 1000) {
    while (clock() < due) await sleep(Math.ceil(due - clock()), undefined, { signal });
    // [DX-V01] Why: retain missed ticks instead of issuing a simulated catch-up burst of SQL probes.
    // Rejected: backfilling samples with a later stats snapshot.
    if (due !== binding.end && clock() >= due + 1000) continue;
    samples.push(await probe.sample(due, signal));
  }
  await sleep(1100, undefined, { signal }); // Flush the once-per-second native recorder past the end boundary.
  const native = await probe.events(binding, signal);
  // [DX-V01] Why: make the native cadence visible at each host tick.
  // Rejected: resampling a minute bucket as a new measurement each second or assigning a future bucket to a past ACK.
  let next = 0;
  let memory = native.priorMemory;
  const joined = samples.map(sample => {
    const from = next;
    while (native.events[next] && native.events[next]!.at <= Math.min(sample.at, binding.end)) {
      const event = native.events[next++]!;
      if (event.kind === "memory-index") memory = event;
    }
    return { ...sample, native: { from, until: next,
      lastMemory: memory ? { at: memory.at, highMB: memory.memoryHighMB } : null } };
  });
  return { binding, samples: joined, ...native };
}

export type Telemetry = Awaited<ReturnType<typeof collectCell>>;

export function summarizeTelemetry(raw: Telemetry, expected: Binding, endedAt: number) {
  assert.deepEqual(raw.binding, expected, "Cell telemetry source, cut or time window differs");
  const { start, end } = expected;
  assert(raw.samples.length >= 1);
  let previous = -Infinity;
  if (raw.priorMemory) assert(raw.priorMemory.kind === "memory-index" && raw.priorMemory.at < start &&
    finite(raw.priorMemory.memoryHighMB));
  let next = 0, memory = raw.priorMemory;
  for (const s of raw.samples) {
    assert(s.due >= start && s.due <= end && Number.isInteger((s.due - start) / 1000));
    assert(s.due > previous && s.at >= s.due && s.until >= s.at && s.until <= endedAt);
    assert(counter(s.sender.user) && counter(s.sender.system));
    assert(!s.cpu || roles.every(role => validCpu(s.cpu![role])));
    assert(!s.pg || validPg(s.pg, s.at, s.until));
    assert.equal(s.native.from, next);
    while (raw.events[next] && raw.events[next]!.at <= Math.min(s.at, end)) {
      const event = raw.events[next++]!;
      if (event.kind === "memory-index") memory = event;
    }
    assert.equal(s.native.until, next);
    assert.deepEqual(s.native.lastMemory, memory ? { at: memory.at, highMB: memory.memoryHighMB } : null);
    previous = s.due;
  }
  const [first, last] = [raw.samples[0]!, raw.samples.at(-1)!];
  assert.equal(last.due, end);
  const boundaryMs = last.at - first.at;
  const percent = (usec: number) => (usec / boundaryMs / 10).toFixed(1) + "% of one core";
  const completeBoundaries = first.due === start && first.at - start < 1000 && last.at - end < 1000 && boundaryMs > 0;
  const cpu = roles.map(role => {
    const a = first.cpu?.[role], b = last.cpu?.[role];
    if (!completeBoundaries || !a || !b || b.usage_usec < a.usage_usec || b.nr_throttled < a.nr_throttled ||
      b.throttled_usec < a.throttled_usec) return `${role} CPU unavailable`;
    return `${role} ${percent(b.usage_usec - a.usage_usec)}, ${b.nr_throttled - a.nr_throttled} throttled periods/${((b.throttled_usec - a.throttled_usec) / 1000).toFixed(1)} ms`;
  });
  const senderUs = last.sender.user + last.sender.system - first.sender.user - first.sender.system;
  const sender = completeBoundaries && senderUs >= 0 ? percent(senderUs) : "unavailable";
  for (const [i, e] of raw.events.entries()) {
    assert(e.at >= (raw.events[i - 1]?.at ?? start) && e.at <= end && typeof e.line === "string" && e.line.length);
  }
  assert.equal(next, raw.events.length);
  const counts = (kind: EventKind) => {
    const rows = raw.events.filter(e => e.kind === kind);
    return rows.some(e => e.callback) ? rows.filter(e => e.callback).length : rows.length;
  };
  const alarms = raw.events.filter(e => e.kind === "memory-alarm");
  const measures = alarms.filter(e => e.alarmCount !== undefined);
  const alarmMetrics = measures.some(e => e.callback) ? measures.filter(e => e.callback) : measures;
  const alarmTotal = alarmMetrics.reduce((sum, e) => sum + e.alarmCount!, 0);
  const causes = [...new Set(raw.events.filter(e => e.kind === "checkpoint-start").map(e => e.cause))].join(", ");
  const mem = raw.events.flatMap(e => e.memoryHighMB === undefined ? [] : [e.memoryHighMB]);
  const missed = (end - start) / 1000 + 1 - raw.samples.length;
  const pgSamples = raw.samples.filter(s => s.pg).length;
  const walFrom = first.pg?.wal, walTo = last.pg?.wal;
  const walBytes = walFrom?.wal_bytes, finalWalBytes = walTo?.wal_bytes;
  const wal = completeBoundaries && walFrom && walTo && walFrom.stats_reset === walTo.stats_reset &&
    finite(walBytes) && finite(finalWalBytes) && finalWalBytes >= walBytes
    ? ` · WAL ${((finalWalBytes - walBytes) / 1024 ** 2).toFixed(1)} MiB` : "";
  const gaps = raw.errors.length ? ` Native source gaps: ${raw.errors.join(". ")}.` : "";
  return `CPU ${cpu.join(" · ")} · sender process ${sender}. PG stat views ${pgSamples}/${raw.samples.length} samples, ${missed} missed ticks${wal}.` +
    ` Checkpoints ${counts("checkpoint-start")} starts${causes ? " (" + causes + ")" : ""}/${counts("checkpoint-end")} ends.` +
    ` Datomic ${counts("index-start")} index starts/${counts("index-adoption")} adoptions · memory-index high ${mem.length ? Math.max(...mem) + " MB" : "unavailable in window"} · ${alarmMetrics.length ? alarmTotal : "unavailable"} alarm count across metric buckets, ${alarms.length - measures.length} warning/error events.${gaps}`;
}
