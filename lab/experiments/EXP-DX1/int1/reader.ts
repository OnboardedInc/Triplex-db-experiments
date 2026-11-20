import assert from "node:assert/strict";
import { fork } from "node:child_process";
import fs from "node:fs";
import { getHeapSpaceStatistics } from "node:v8";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import {
  openComposition,
  type Basis,
  type CompositionHandle,
} from "../../../bench/lib/composition.ts";
import { replicaReply, restoreReplicaReply } from "../../../bench/lib/replica-reads.ts";
import { validatedSubjectReader } from "../../../bench/lib/touched-reads.ts";
import { coldReadProfiler } from "./read-profile.ts";

export function mappedReaderPages(text: string) {
  const rss = { heap: 0, anonymousData: 0, anonymousCode: 0, stacks: 0, fileData: 0, fileCode: 0, kernel: 0 };
  const totals = { Pss: 0, Private_Dirty: 0, Anonymous: 0 };
  const counts = { Rss: 0, Pss: 0, Private_Dirty: 0, Anonymous: 0 };
  let group: keyof typeof rss = "kernel", mappings = 0;
  for (const line of text.split("\n")) {
    const map = /^[a-f\d]+-[a-f\d]+\s+([rwxps-]{4})\s+\S+\s+\S+\s+\d+\s*(.*)$/.exec(line);
    if (map) {
      const name = map[2]!, executable = map[1]!.includes("x");
      if (name === "[heap]") group = "heap";
      else if (name.startsWith("[stack")) group = "stacks";
      else if (!name || name.startsWith("[anon")) group = executable ? "anonymousCode" : "anonymousData";
      else if (name.startsWith("/")) group = executable ? "fileCode" : "fileData";
      else group = "kernel";
      mappings++;
    } else {
      const field = /^(Rss|Pss|Private_Dirty|Anonymous):\s+(\d+) kB$/.exec(line);
      if (!field) continue;
      assert(mappings > 0);
      const bytes = Number(field[2]) * 1024;
      const name = field[1] as keyof typeof counts;
      assert.equal(++counts[name], mappings);
      if (name === "Rss") rss[group] += bytes;
      else totals[name] += bytes;
    }
  }
  assert(mappings > 0 && Object.values(counts).every(n => n === mappings));
  return { mappings, rss, ...totals };
}

export function processSize(collect = true) {
  const before = process.memoryUsage();
  const spaces = getHeapSpaceStatistics().map(s => ({ name: s.space_name, used: s.space_used_size, committed: s.physical_space_size }));
  if (collect) global.gc?.();
  const mask = fs
    .readFileSync("/proc/self/status", "utf8")
    .match(/^Cpus_allowed_list:\s*(.+)$/m)![1]!;
  const cpus = mask
    .trim()
    .split(",")
    .flatMap((part) => {
      const [first, last = first] = part.split("-").map(Number);
      return Array.from({ length: last - first + 1 }, (_, i) => first + i);
    });
  return {
    rssBytes: process.memoryUsage().rss,
    before, after: process.memoryUsage(), spaces,
    threads: fs.readdirSync("/proc/self/task").length,
    cpus,
  };
}
// [DX-INT1] Why: all accounts share one reader process, while its RSS, threads and retained worlds remain measurable independently of the driver.
// Rejected: one reader OS process per account or attributing the driver's expected rows to the product.
export function startReader(binding: string, budget?: number, wire?: "plain" | "gzip") {
  const cpus = process.env.DX_BARE_METAL === "1" ? process.env.DX_INT1_READER_CPUS : undefined;
  if (cpus) assert(/^\d+(,\d+){5}$/.test(cpus) && new Set(cpus.split(",")).size === 6);
  const child = fork(fileURLToPath(import.meta.url), ["--reader", binding], {
    // [DX-INT1] Why: start the entire reader, including V8 workers, in the six-core BM1 reader assignment before Node initializes.
    // Rejected: setting the JS thread's affinity after GC and network threads have inherited the sender's mask.
    ...(cpus
      ? {
          execPath: "/usr/bin/taskset",
          execArgv: ["-c", cpus, process.execPath, ...process.execArgv],
        }
      : {}),
    serialization: "advanced",
    env: {
      ...process.env,
      ...(budget ? { DX_TOUCHED_RETAIN_BYTES: String(budget) } : {}),
      ...(wire ? {
        TRIPLEX_DATOMIC_FAST_PATHS: [
          ...(process.env.TRIPLEX_DATOMIC_FAST_PATHS ?? "").split(",").filter(x => x && x !== "demand-gzip"),
          ...(wire === "gzip" ? ["demand-gzip"] : []),
        ].join(","),
      } : {}),
      DATOMIC_URL: process.env.DATOMIC_READ_URLS?.split(",")[0],
    },
    stdio: ["ignore", "inherit", "inherit", "ipc"],
  });
  let serial = 0;
  const waiting = new Map<number, { resolve(v: any): void; reject(e: Error): void }>();
  let stopped: Error | undefined;
  const fail = (e: Error) => {
    stopped = e;
    for (const p of waiting.values()) p.reject(e);
    waiting.clear();
  };
  child.once("exit", (c, s) => fail(Error("Reader exited " + (s ?? c))));
  child.once("error", fail);
  child.on("message", (m: any) => {
    const p = waiting.get(m.id);
    if (!p || m.binding !== binding) {
      fail(Error("Foreign reader response"));
      return;
    }
    waiting.delete(m.id);
    if (m.error) p.reject(Error(m.error));
    else p.resolve(m.value);
  });
  const ask = (op: string, data: object = {}) =>
    new Promise<any>((resolve, reject) => {
      if (stopped) {
        reject(stopped);
        return;
      }
      const id = ++serial;
      waiting.set(id, { resolve, reject });
      child.send({ binding, id, op, ...data }, (e) => {
        if (e) fail(e);
      });
    });
  return {
    open: (scope: string) => ask("open", { scope }),
    stats: async (collect = true) => {
      const result = await ask("stats", { collect });
      if (!collect || process.env.DX_INT1_READER_PAGES !== "1") return result;
      // [DX-THIN1] Why: sample the bound child from its parent after collection, without allocating the map text in the measured reader. Rejected: subtracting V8 heap capacity from RSS to infer native memory.
      const pid = child.pid!;
      const start = () => fs.readFileSync("/proc/" + pid + "/stat", "utf8").split(") ").at(-1)!.split(" ")[19];
      const ticks = start();
      assert(child.connected && Number(ticks) > 0);
      const pages = mappedReaderPages(fs.readFileSync("/proc/" + pid + "/smaps", "utf8"));
      assert.equal(start(), ticks);
      return { ...result, pages: { binding, pid, ticks, ...pages } };
    },
    watermark: (scope: string) => ask("watermark", { scope }),
    pull: async (scope: string, root: string, p: number, v: number, profile = false) => {
      const reply = await ask("pull", { scope, root, p, v, profile });
      return { ...restoreReplicaReply(reply), diagnostic: reply.diagnostic };
    },
    close: async () => {
      try {
        await ask("close");
      } finally {
        if (child.connected) child.kill();
      }
    },
  };
}
if (process.argv[2] === "--reader" && process.send) {
  const profile = coldReadProfiler();
  const binding = process.argv[3],
    scopes = new Map<string, Pick<CompositionHandle, "pull" | "touchedUsage" | "close">>();
  const code = Object.fromEntries(
    [
      "lab/experiments/EXP-DX1/int1/reader.ts",
      "lab/bench/lib/touched-reads.ts",
      "lab/bench/lib/replica-reads.ts",
      "packages/datomic/dist/replica/Replica.js",
      "packages/datomic/dist/replica/RecentReads.js",
    ].map((f) => [f, createHash("sha256").update(fs.readFileSync(f)).digest("hex")]),
  );
  process.once("disconnect", () => process.exit(0));
  process.on("message", async (m: any) => {
    try {
      assert.equal(m.binding, binding);
      let value;
      if (m.op === "open") {
        assert(!scopes.has(m.scope));
        if (process.env.DX_TOUCHED_READ_MODE === "validated") {
          let fallback: Promise<CompositionHandle> | undefined;
          const reader = validatedSubjectReader(m.scope, async (root, basis) => {
            fallback ??= openComposition("reach", "datomic", m.scope);
            return (await fallback).pull(root, basis);
          });
          scopes.set(m.scope, { pull: reader.pull, touchedUsage: reader.usage,
            async close() { reader.close(); await (await fallback)?.close(); } });
        } else scopes.set(m.scope, await openComposition("reach-touched", "datomic", m.scope));
      } else if (m.op === "pull") {
        const read = async () => replicaReply(
          await scopes.get(m.scope)!.pull(m.root, { recordedPosition: m.p, validAt: m.v } as Basis),
        );
        if (m.profile && process.env.DX_TOUCHED_READ_MODE === "validated") {
          const measured = await profile(read);
          value = { ...measured.value, diagnostic: measured.diagnostic };
        } else value = await read();
      }
      else if (m.op === "watermark") value = scopes.get(m.scope)!.touchedUsage!().position;
      else if (m.op === "stats")
        value = {
          ...processSize(m.collect !== false),
          code,
          scopes: Object.fromEntries([...scopes].map(([s, h]) => [s, h.touchedUsage!()])),
        };
      else if (m.op === "close") {
        for (const h of scopes.values()) await h.close();
      } else throw Error("Unknown operation");
      process.send!({ binding, id: m.id, value });
    } catch (e) {
      process.send!({ binding, id: m.id, error: String(e) });
    }
  });
}
