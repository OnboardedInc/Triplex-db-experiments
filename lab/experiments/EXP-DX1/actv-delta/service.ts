import assert from "node:assert/strict";
import type { CompositionHandle } from "../../../bench/lib/composition.ts";
import { Account } from "./account.ts";
import type { W0 } from "../../../bench/lib/w0-world.ts";
import { setTimeout as delay } from "node:timers/promises";
import { iso } from "./v3.ts";

type Job = { release: boolean; run: () => Promise<void>; parked: number; command: string };
export type Admission = {
  command: string;
  queuedForSaveMs: number;
  queueMs: number;
  serviceMs: number;
  ok: boolean;
};
export function writerPipeline(source: CompositionHandle) {
  const releases: Job[] = [],
    saves: Job[] = [],
    samples: Admission[] = [];
  let active: Job | undefined;
  async function pump() {
    if (active) return;
    while ((active = releases.shift() ?? saves.shift())) {
      const j = active;
      await j.run();
      active = undefined;
    }
  }
  const comp: CompositionHandle = {
    ...source,
    transact(ops, meta) {
      const command = String(meta.commandId),
        queued = performance.now(),
        route = /^actv-delta:([a-zA-Z0-9_-]+):cmd:(fence|reject|event):/.exec(command),
        guard = (
          meta.preconditions as { entityId?: string; tripleIds?: string[] }[] | undefined
        )?.find((x) => x.entityId === "actv-delta:" + route?.[1] + ":fence"),
        release =
          route?.[2] === "fence" ||
          route?.[2] === "reject" ||
          (route?.[2] === "event" &&
            guard?.tripleIds?.length === 1 &&
            ops.some((op) => op.op === "retract" && op.id === guard.tripleIds![0]));
      const prior = active && !active.release ? active : undefined;
      return new Promise((ok, fail) => {
        const j: Job = {
          release,
          command,
          parked: 0,
          run: async () => {
            const at = performance.now();
            let accepted = false;
            try {
              const r = await source.transact(ops, meta);
              accepted = r.ok;
              ok(r);
            } catch (e) {
              fail(e);
            } finally {
              const end = performance.now();
              j.parked = end;
              samples.push({
                command,
                queuedForSaveMs: prior ? Math.max(0, prior.parked - queued) : 0,
                queueMs: at - queued,
                serviceMs: end - at,
                ok: accepted,
              });
            }
          },
        };
        // [DX-ACT2] Why: bound the native FIFO to one outstanding transaction per writer gateway; Publish goes ahead of unsubmitted saves. Rejected: queueing all 55 burst saves in the transactor where a fence cannot overtake them.
        (release ? releases : saves).push(j);
        void pump();
      });
    },
  };
  return { comp, samples };
}

export type Decision = { output: W0.Output; seq: number; releaseSeq: number; position: number };
export class CurrentDecisions {
  private readonly a: Pick<Account, "currentCut" | "decisionsAt">;
  private readonly clock: (() => string) | null;
  private queued: { id: string; ok: (d: Decision) => void; fail: (e: unknown) => void }[] = [];
  constructor(
    account: Pick<Account, "currentCut" | "decisionsAt">,
    clock: (() => string) | null = () => iso(Date.now()),
  ) {
    this.a = account;
    this.clock = clock;
  }
  read(id: string): Promise<Decision> {
    return new Promise((ok, fail) => {
      this.queued.push({ id, ok, fail });
      if (this.queued.length === 1) setImmediate(() => void this.flush());
    });
  }
  private async flush() {
    const group = this.queued.splice(0);
    try {
      // [DX-ACT2] Why: concurrent arrivals can share one cut acquired after every request in the group. Rejected: reusing an earlier latest position after another client publishes.
      const now = this.clock?.(),
        p = await this.a.currentCut(now),
        ids = [...new Set(group.map((g) => g.id))],
        r = await this.a.decisionsAt(ids, p, now);
      for (const g of group) {
        const output = r.out.get(g.id);
        assert(output);
        g.ok({ output, seq: r.head.seq, releaseSeq: r.head.releaseSeq, position: p });
      }
    } catch (e) {
      for (const g of group) g.fail(e);
    }
  }
}

// [DX-ACT2] Why: on startup replay due clock events with the same durable command keys even while dispatch and saves are idle. Rejected: deriving notices only when a point reader happens to ask for the expired person.
export async function runValidClock(
  account: Pick<Account, "currentCut">,
  signal: AbortSignal,
  now = () => iso(Date.now()),
  interval = 250,
) {
  while (!signal.aborted) {
    await account.currentCut(now());
    if (!signal.aborted)
      await delay(interval, undefined, { signal }).catch((e) => {
        if (!signal.aborted) throw e;
      });
  }
}
