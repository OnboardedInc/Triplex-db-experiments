import assert from "node:assert/strict";
import { test } from "node:test";
import { Exit } from "effect";
import { DatomicHttpError } from "../../../../../packages/datomic/dist/index.js";
import { runtimeApi } from "../../../../bench/lib/triplex.ts";
import { Conflict, rejectUnrecordedWrite } from "../store.ts";

const rejected = (native: DatomicHttpError) =>
  Exit.fail(
    new runtimeApi.WriteError({ message: "Datomic transaction was rejected", cause: native }),
  );

test("a rejected frame returns the original gateway policy error and code", async () => {
  for (const [code, status] of [
    ["BulkFrameTooLarge", 413],
    ["WriteBudgetExceeded", 413],
    ["WriteQueueFull", 429],
  ] as const) {
    const native = new DatomicHttpError(status, code, "Synthetic policy rejection");
    await assert.rejects(
      rejectUnrecordedWrite(rejected(native), 4, async () => assert.fail("Polled another writer")),
      (e) => e instanceof DatomicHttpError && e === native && e.code === code && e.status === status,
    );
  }
});

test("a changed source still reports a conflict for an ordinary refused write", async () => {
  const error = new DatomicHttpError(409, "CasConflict", "Source changed");
  await assert.rejects(
    rejectUnrecordedWrite(rejected(error), 4, async () => 5),
    Conflict,
  );
  await assert.rejects(
    rejectUnrecordedWrite(rejected(error), 4, async () => 4),
    /Native write had no receipt: Datomic transaction was rejected/,
  );
});
