import assert from "node:assert/strict";
import { fork } from "node:child_process";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import {
  openComposition,
  type Basis,
  type CompositionHandle,
} from "../../../bench/lib/composition.ts";
import { replicaReply, restoreReplicaReply } from "../../../bench/lib/replica-reads.ts";

export function processSize() {
  global.gc?.();
  return { rssBytes: process.memoryUsage().rss, threads: fs.readdirSync("/proc/self/task").length };
}
// [DX-INT1] Why: all accounts share one reader process, while its RSS, threads and retained worlds remain measurable independently of the driver.
// Rejected: one reader OS process per account or attributing the driver's expected rows to the product.
export function startReader(binding: string, budget?: number) {
  const child = fork(fileURLToPath(import.meta.url), ["--reader", binding], {
    serialization: "advanced",
    env: {
      ...process.env,
      ...(budget ? { DX_TOUCHED_RETAIN_BYTES: String(budget) } : {}),
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
    stats: () => ask("stats"),
    watermark: (scope: string) => ask("watermark", { scope }),
    pull: async (scope: string, root: string, p: number, v: number) =>
      restoreReplicaReply(await ask("pull", { scope, root, p, v })),
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
  const binding = process.argv[3],
    scopes = new Map<string, CompositionHandle>();
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
        scopes.set(m.scope, await openComposition("reach-touched", "datomic", m.scope));
      } else if (m.op === "pull")
        value = replicaReply(
          await scopes.get(m.scope)!.pull(m.root, { recordedPosition: m.p, validAt: m.v } as Basis),
        );
      else if (m.op === "watermark") value = scopes.get(m.scope)!.touchedUsage!().position;
      else if (m.op === "stats")
        value = {
          ...processSize(),
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
