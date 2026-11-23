import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { DatomicClient } from "../../../../packages/datomic/dist/index.js";
import { fieldValue } from "../../../bench/lib/deep-world.ts";
import { Histogram } from "../../../bench/lib/hist.ts";
import { SEED_VALID_FROM } from "../../../bench/lib/world.ts";
import { now } from "../scale1/decision/observer.ts";
import { accounts, field, task } from "../scale1/decision/plan.ts";
import type { AdoptedSeed } from "../v01/adopt.ts";

// [DX-RD2] The short pinned ladder for TX2_PINNED_SHORTCUT on the aged 1 billion database: the scorecard's own read
// (one person's field 0 by client.rows at a pinned position, one exchange per read), at the old seed cut and near the
// head, 1, 16 and 256 seats for 60 s each; "on" means both pinned options. The old cut is checked against the seed's value on every read.
// Rejected: a new read path (the measured read must be the card's), and a second oracle for the near-head pin
// (AGE1 may have changed the field; that pin is checked for one row at or below the pin).
export const pinnedSeats = [1, 16, 256] as const;
export const pinnedStepSeconds = 60;
export const recentDistance = 1000;

export async function pinnedLadder(out: string, read: string, seed: AdoptedSeed, head: number, shortcut: boolean, toy = false) {
  const seconds = toy ? 3 : pinnedStepSeconds, seats = toy ? [1, 4] : [...pinnedSeats];
  const client = new DatomicClient(read, 35_000);
  const options = await client.request<any>("GET", "/v1/db/" + seed.scope.db + "/write-options");
  // [DX-RD2] "on" runs both pinned options: the cut lookup (TX2_PINNED_CUT_LOOKUP) and the short-cut (TX2_PINNED_SHORTCUT).
  assert.deepEqual([options.options.pinnedShortcut, options.options.pinnedCutLookup], [shortcut, shortcut],
    "the read gateway does not run the requested options");
  const stats = async () => (await client.request<any>("GET", "/v2/admin/scan-stats")).pinnedShortcut;
  const pins = [{ name: "seed-cut", position: seed.scope.cut }, { name: "near-head", position: Math.max(seed.scope.cut, head - (toy ? 5 : recentDistance)) }];
  const steps = [];
  try {
    for (const pin of pins) {
      const basis = { recordedPosition: pin.position, validAt: SEED_VALID_FROM };
      for (const n of seats) {
        const end = now() + seconds * 1000, delay = new Histogram(), before = await stats();
        const failures: Record<string, number> = {};
        let errors = 0, wrong = 0;
        await Promise.all(Array.from({ length: n }, async (_, seat) => {
          let k = seat;
          while (now() < end) {
            const subject = (7919 * ++k) % seed.image.people, a = seat % accounts.length, entity = task(a, subject);
            const issued = now();
            try {
              const rows = await client.rows(seed.scope.db, { entityIds: [entity], pattern: { attribute: field(0) }, basis });
              assert.equal(rows.length, 1);
              assert.deepEqual([rows[0]!.entity_id, rows[0]!.attribute], [entity, field(0)]);
              assert(rows[0]!.recorded_position <= pin.position);
              if (pin.position === seed.scope.cut && rows[0]!.value_string !== fieldValue(subject, 0, 0, 0).value) wrong++;
              if (now() <= end) delay.recordMs(now() - issued);
            } catch (error) {
              errors++;
              const key = error instanceof Error ? (error as any).code ?? error.name : "unknown";
              failures[key] = (failures[key] ?? 0) + 1;
            }
          }
        }));
        const after = await stats();
        const step = { pin: pin.name, position: pin.position, seats: n, seconds, goodput: delay.count / seconds,
          errors, failures, wrong, read: delay.summary(),
          shortcut: { current: after.currentAnswers - before.currentAnswers, asOf: after.asOfAnswers - before.asOfAnswers } };
        console.log("[DX-RD2] " + JSON.stringify(step));
        steps.push(step);
        assert.equal(wrong, 0, "a pinned read returned a value other than the seed's");
      }
    }
  } finally {
    client.close();
  }
  const result = { shortcut, head, pins, steps };
  fs.writeFileSync(path.join(out, "pinned-ladder.json"), JSON.stringify(result, null, 2) + "\n", { flag: "wx", mode: 0o600 });
  return result;
}
