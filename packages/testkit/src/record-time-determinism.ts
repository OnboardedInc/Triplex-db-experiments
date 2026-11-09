import { Effect } from "effect";
import { EntityId, Triples, string } from "@triplex-build/triplex";
import type { makeA0RecordTimeSuite } from "./record-time-schedules.js";
/** Run in a fresh scope with fixed IDs; callers compare complete receipts across fresh runs and arms. */
export const recordTimeDeterministicFixture = (suite: ReturnType<typeof makeA0RecordTimeSuite>) =>
  Effect.gen(function* () {
    const t = yield* Triples;
    const receipts = [];
    for (const clock of [300000, 300000, 299999, 300001]) {
      suite.clock.set(clock);
      receipts.push(
        yield* t.transact([
          {
            op: "assert",
            entityId: EntityId.make("rt:deterministic"),
            attribute: ":rt/value",
            value: string("value"),
          },
        ]),
      );
    }
    return receipts;
  }).pipe(Effect.provide(suite.layer));
