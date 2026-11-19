import assert from "node:assert/strict";
import { subjectOf } from "../../../bench/lib/world.ts";
import type { Store } from "./store.ts";

// [DX-ACT1] Why: the feed subscriber learns owners by reading every native position after its saved cut. Rejected: polling the writer's returned transaction by ID (that omits backlog and supplies the answer).
export function observeFeed(s: Store, start: number) {
  const known = new Map<string, { p: number; at: number; owners: number[] }>();
  let p = start,
    active: Promise<void> | undefined,
    again = false,
    error: unknown;
  const wake = () => {
    again = true;
    if (active || error) return;
    active = (async () => {
      while (again) {
        again = false;
        const head = await s.head();
        while (p < head) {
          const page = await s.comp.feedPage(p, 16);
          assert(page.transactions.length);
          for (const r of page.transactions) {
            if (r.position > head) break;
            assert.equal(r.position, ++p);
            if (
              r.actor !== "lazy/input" ||
              JSON.parse(r.correlationId).context.event.kind !== "source"
            )
              continue;
            const owners = new Set<number>();
            for (const c of r.changes) {
              if (c.entityId.startsWith("lazy/")) continue;
              const i = subjectOf(c.entityId);
              assert(i !== null, "Unknown frozen trace owner");
              owners.add(i);
            }
            assert(!known.has(r.txId));
            known.set(r.txId, {
              p,
              at: performance.timeOrigin + performance.now(),
              owners: [...owners].sort((a, b) => a - b),
            });
          }
        }
      }
    })()
      .catch((e) => {
        error = e;
      })
      .finally(() => {
        active = undefined;
        if (again && !error) wake();
      });
  };
  return {
    wake,
    finish: async () => {
      wake();
      while (active) await active;
      if (error) throw error;
      return known;
    },
  };
}
