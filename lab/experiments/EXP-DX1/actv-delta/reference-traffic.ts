import assert from "node:assert/strict";
import { setTimeout as delay } from "node:timers/promises";
import type { CompositionHandle } from "../../../bench/lib/composition.ts";
import type { DomainOracle } from "../../../bench/lib/w0-gates.ts";
import { W0, V_W0 } from "../../../bench/lib/w0-world.ts";
import { readDeepWorlds } from "../../../bench/lib/deep-activation.ts";
import type { Account } from "../scale1/tenants.ts";
import { OrderedSaves } from "./save-queue.ts";
import { evaluate } from "./model.ts";
import { query } from "./bench-rung.ts";
import { hash } from "./store.ts";
import { iso } from "./v3.ts";
export type ReferenceSave = { subject: string; p: number; worldAfter: W0.World; tx: number };
export function referenceTraffic(
  c: CompositionHandle,
  t: Account,
  rel: W0.CompiledRelease,
  marker: number,
  oracle: DomainOracle,
  save: () => Promise<ReferenceSave>,
  loaded: boolean,
  readWorlds = readDeepWorlds,
) {
  const saved: ReferenceSave[] = [],
    q = new OrderedSaves(),
    start = performance.now();
  let stop = false,
    error: unknown,
    reads = 0,
    steady = 0,
    burst = 0;
  function offer() {
    void q.submit(t.key, async () => {
      if (error) return;
      try {
        saved.push(await save());
      } catch (e) {
        error = e;
        stop = true;
      }
    });
  }
  const writes = (async () => {
    if (!loaded) {
      offer();
      return;
    }
    while (!error && (!stop || burst < 55)) {
      const normal = steady * 625,
        surge = burst < 55 ? (burst * 1000) / 55 : Infinity,
        b = surge <= normal || stop,
        due = b ? surge : normal,
        wait = start + due - performance.now();
      if (wait > 0) {
        await delay(Math.min(20, wait));
        continue;
      }
      offer();
      if (b) burst++;
      else steady++;
    }
  })();
  const readers = loaded
    ? [0, 1].map(async (group) => {
        let round = 0;
        try {
          do {
            const ids = Array.from(
                { length: Math.min(32, t.people) },
                (_, i) => t.first + ((group * 32 + i + round * 67) % t.people),
              ),
              p = await c.currentPosition(),
              basis = { tx: p, validTime: iso(V_W0) };
            assert(p >= marker);
            const worlds = await readWorlds(c, ids, { position: p, validAt: V_W0 }, t.key);
            const actual = worlds.map((w) => [
              w.subject,
              hash(JSON.parse(W0.outputJson(evaluate(w, rel, basis)))),
            ]);
            assert.deepEqual(
              actual,
              await query(oracle, "raw-answers", { worlds, doc: rel.doc, basis }),
            );
            reads += worlds.length;
            round++;
          } while (!stop && !error);
        } catch (e) {
          error = e;
          stop = true;
        }
      })
    : [];
  const finish = async () => {
    stop = true;
    await writes;
    await Promise.all(readers);
    await q.drain();
    if (error) throw error;
    assert(
      loaded
        ? saved.length === steady + burst && burst === 55 && reads >= Math.min(t.people, 32) * 2
        : saved.length === 1,
    );
    return { saved, reads, steady, burst };
  };
  return {
    finish,
    check: () => {
      if (error) throw error;
    },
  };
}
