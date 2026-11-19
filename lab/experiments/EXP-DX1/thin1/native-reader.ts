import assert from "node:assert/strict";
import { fork } from "node:child_process";
import { fileURLToPath } from "node:url";
import { openComposition, type Basis, type PullResult } from "../../../bench/lib/composition.ts";
import {
  ReplicaReader,
  ReplicaReadHost,
  replicaReply,
  restoreReplicaReply,
} from "../../../bench/lib/replica-reads.ts";
import { touchedPull } from "../../../bench/lib/touched-reads.ts";
import { person } from "./population.ts";
import { W0, worldOf } from "../../../bench/lib/w0-world.ts";
import type { ReplicaSnapshot } from "../../../../packages/datomic/dist/index.js";

interface Input {
  scope: string;
  binding: string;
  mode: "all" | "touched";
  size: number;
  position: number;
  instant: number;
}
interface Request {
  id: number;
  op: "pull" | "follow" | "capture" | "world" | "stats" | "close";
  root?: string;
  position?: number;
  validAt?: number;
}
interface Stats {
  rss: number;
  unloadedRss: number;
  packed: number;
  history: number;
  position: number;
}

async function serve(input: Input) {
  const base = await openComposition("reach", "datomic", input.scope);
  global.gc?.();
  const unloadedRss = process.memoryUsage().rss;
  let host: ReplicaReadHost | undefined;
  try {
    const roots =
      input.mode === "all" ? Array.from({ length: input.size }, (_, i) => person(i)) : [];
    host = await ReplicaReadHost.open(
      input.scope,
      roots,
      base,
      input,
      "inline",
      64 * 1024 ** 2,
      "reader",
      process.env.DATOMIC_URL,
      input.mode,
      undefined,
      Date.parse(W0.POPULATION_VALID_TIME),
    );
    const copy = host,
      local = new ReplicaReader(undefined, copy.index);
    let held: ReplicaSnapshot | undefined;
    copy.subscribe((d) => local.notify(d.reset));
    process.on("message", async (m: Request) => {
      try {
        let value: unknown;
        if (m.op === "pull") {
          const basis = { recordedPosition: m.position, validAt: m.validAt } as Basis;
          const gateway = () => base.pull(m.root!, basis);
          const result =
            input.mode === "touched"
              ? await touchedPull(local, copy.replica, m.root!, basis, gateway)
              : await local.pullAt(m.root!, basis, gateway);
          value = replicaReply(result);
        } else if (m.op === "follow") {
          let timer: ReturnType<typeof setTimeout> | undefined;
          try {
            await Promise.race([
              copy.replica.caughtUpTo(m.position!),
              new Promise((_, reject) => {
                timer = setTimeout(
                  () => reject(Error("Read peer did not reach the acknowledged position")),
                  90_000,
                );
              }),
            ]);
          } finally {
            clearTimeout(timer);
          }
          value = copy.replica.position;
        } else if (m.op === "capture") {
          held = await copy.replica.snapshotAt(m.position!);
          value = held!.position;
        } else if (m.op === "world") {
          assert(held && held.position === m.position && held.validAt === m.validAt);
          value = worldOf(m.root!, held.world(m.root!));
        } else if (m.op === "stats") {
          global.gc?.();
          value = {
            rss: process.memoryUsage().rss,
            unloadedRss,
            packed: copy.replica.bytes,
            history: copy.index.historyBytes,
            position: copy.replica.position,
          };
        } else if (m.op === "close") {
          await copy.close();
          await base.close();
          process.send!({ id: m.id, binding: input.binding }, () => process.disconnect!());
          return;
        } else throw Error("Unknown reader operation");
        process.send!({ id: m.id, binding: input.binding, value });
      } catch (error) {
        process.send!({ id: m.id, binding: input.binding, error: String(error) });
      }
    });
    process.send!({ id: 0, binding: input.binding, value: copy.replica.position });
  } catch (error) {
    await host?.close();
    await base.close();
    throw error;
  }
}

export async function nativeReader(input: Input) {
  // [DX-THIN1] Why: independent OS processes expose reader RSS and driver RSS at the same phase boundary.
  // Rejected: attributing fractions of one shared process high-water mark to two roles.
  const child = fork(fileURLToPath(import.meta.url), ["--reader-child"], {
    serialization: "advanced",
    stdio: ["ignore", "inherit", "inherit", "ipc"],
    env: { ...process.env, DATOMIC_URL: process.env.DATOMIC_READ_URLS },
  });
  const pending = new Map<number, { resolve(v: any): void; reject(e: Error): void }>();
  let serial = 0,
    failure: Error | undefined;
  const fail = (error: Error) => {
    failure = error;
    for (const p of pending.values()) p.reject(error);
    pending.clear();
  };
  child.on("error", fail);
  child.on("exit", (code, signal) => fail(Error("Reader exited " + (signal ?? code))));
  child.on("message", (m: { id: number; binding: string; error?: string; value: unknown }) => {
    if (m.binding !== input.binding) {
      fail(Error("Foreign reader reply"));
      return;
    }
    const p = pending.get(m.id);
    if (!p) {
      fail(Error("Unknown reader reply"));
      return;
    }
    pending.delete(m.id);
    if (m.error) p.reject(Error(m.error));
    else p.resolve(m.value);
  });
  const send = (id: number, message: object) =>
    new Promise<any>((resolve, reject) => {
      if (failure) {
        reject(failure);
        return;
      }
      pending.set(id, { resolve, reject });
      child.send(message, (err) => {
        if (err) fail(err);
      });
    });
  const ask = (op: Request["op"], data = {}) => send(++serial, { op, id: serial, ...data });
  try {
    assert.equal(await send(0, input), input.position);
  } catch (error) {
    child.kill();
    throw error;
  }
  return {
    pull: async (root: string, position: number, validAt: number): Promise<PullResult> =>
      restoreReplicaReply(await ask("pull", { root, position, validAt })),
    follow: async (position: number) => {
      assert.equal(await ask("follow", { position }), position);
    },
    capture: async (position: number) => {
      assert.equal(await ask("capture", { position }), position);
    },
    world: (root: string, basis: W0.Basis): Promise<W0.World> =>
      ask("world", { root, position: basis.tx, validAt: Date.parse(basis.validTime) }),
    stats: (): Promise<Stats> => ask("stats"),
    close: async () => {
      try {
        await ask("close");
      } finally {
        if (child.connected) child.kill();
      }
    },
  };
}
if (process.argv[2] === "--reader-child" && process.send) {
  // [DX-THIN1] Why: the guest parent owns the reader and its journal subscription for this attempt.
  // Rejected: keeping a follower polling after a failed controller or cutoff.
  process.once("disconnect", () => process.exit(0));
  process.once("message", (input: Input) => {
    void serve(input).catch((error) => {
      process.send!({ id: 0, binding: input.binding, error: String(error) }, () =>
        process.disconnect!(),
      );
    });
  });
}
