import assert from "node:assert/strict";
import type { CompositionHandle } from "../../../bench/lib/composition.ts";
import { Account } from "./account.ts";
import type { W0 } from "../../../bench/lib/w0-world.ts";

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
        release =
          command.includes(":cmd:fence:") ||
          command.includes(":cmd:reject:") ||
          (command.includes(":cmd:event:") &&
            (meta.preconditions as { entityId?: string; tripleIds?: string[] }[] | undefined)?.some(
              (x) => x.entityId?.endsWith(":fence") && x.tripleIds?.length === 1,
            )) === true;
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
  private readonly a: Account;
  private queued: { id: string; ok: (d: Decision) => void; fail: (e: unknown) => void }[] = [];
  constructor(account: Account) {
    this.a = account;
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
      const p = await this.a.db.comp.currentPosition(),
        ids = [...new Set(group.map((g) => g.id))],
        r = await this.a.decisionsAt(ids, p);
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

// [DX-ACT2] Why: each account admits a single command's preparation at a time; a release waits only for the already admitted save. Other gateways still meet the durable fence. Rejected: letting 55 prepared saves race for the same predecessor.
export class AccountWriter {
  private releases: (() => Promise<void>)[] = [];
  private saves: (() => Promise<void>)[] = [];
  private busy = false;
  submit<T>(kind: "release" | "save", work: (waitMs: number) => Promise<T>): Promise<T> {
    const at = performance.now();
    return new Promise((ok, fail) => {
      (kind === "release" ? this.releases : this.saves).push(async () => {
        try {
          ok(await work(performance.now() - at));
        } catch (e) {
          fail(e);
        }
      });
      void this.take();
    });
  }
  private async take() {
    if (this.busy) return;
    this.busy = true;
    try {
      for (;;) {
        const next = this.releases.shift() ?? this.saves.shift();
        if (!next) break;
        await next();
      }
    } finally {
      this.busy = false;
    }
  }
}
