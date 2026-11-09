// [EXP-RT01] Why: inspect the new fixture's first raw read failure. Rejected: weakening a property assertion without identifying its cause.
import { Effect } from "effect";
import {
  generateRouteHistory,
  foldRouteHistory,
  routeHead,
  routeWatermark,
} from "../../../../packages/testkit/dist/route.js";
import { stampOf } from "../../../../packages/core/dist/index.js";
import { makeQleverStorageAdapter } from "../../../../packages/qlever/src/QleverStorageAdapter.js";
import { integerOrderKey, metaIri, assertionIri } from "../../../../packages/qlever/src/rdf.js";
import { makeRecordTimeClient } from "../../../../packages/qlever/test/fixtures/record-time-client.js";
const full = generateRouteHistory(1, 16);
const history = {
  ...full,
  commits: full.commits.slice(0, 1),
  attempts: full.attempts!.filter((a) => a.id === full.commits[0]!.receipt!.attemptId),
};
const t = makeRecordTimeClient();
t.records.set(
  metaIri,
  new Map([
    ["position", String(routeHead(history))],
    ["stamp", integerOrderKey(String(stampOf(routeWatermark(history))))],
  ]),
);
for (const row of foldRouteHistory(history))
  t.records.set(
    assertionIri(row.id),
    new Map([
      ["_row", JSON.stringify(row)],
      ["entity_id", row.entity_id],
      ["attribute", row.attribute],
    ]),
  );
try {
  console.log(
    await Effect.runPromise(
      makeQleverStorageAdapter(t.client, "debug").query(
        {},
        { validAt: history.now, recordedAt: history.commits[0]!.instant },
      ),
    ),
  );
} catch (error) {
  console.log(error);
  console.log((error as Error & { cause?: unknown }).cause);
}
