import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { Evidence, loopback } from "../ha1/common.ts";
import { Account } from "../ha1/one-db.ts";
import { replayEvidence } from "./replay.ts";

test("independent replay binds the authored cut and rejects a changed row", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "hasync-replay-"));
  const ac = new Account("oracle-test", "http://" + loopback + ":1", "http://" + loopback + ":1");
  const written = Array.from({ length: 2 }, (_, n) => ac.intent("save-" + n, 3));
  for (const [n, i] of written.entries()) {
    ac.remember(i, {
      operationId: i.operationId,
      position: { t: "long", v: String(21 + n) },
      t: { t: "long", v: String(101 + n) },
      recordedAt: { t: "double", v: i.claims[0]!.timestamp },
    });
  }
  let changed = false;
  ac.r.rows = async (_db, request) => {
    const cut = request["basis"] as { recordedPosition: number };
    return written.flatMap((i, n) =>
      n + 21 <= cut.recordedPosition
        ? i.rows.map((row) => ({
            ...row,
            recorded_position: n + 21,
            value_string: changed ? "different" : row.value_string,
          }))
        : [],
    );
  };
  try {
    const result = await replayEvidence(new Evidence(dir, "hasync-commit", "test"), ac, written);
    assert.deepEqual(
      result.cuts.map((c) => c.rows),
      [3, 6],
    );
    changed = true;
    await assert.rejects(replayEvidence(new Evidence(dir, "hasync-commit", "test"), ac, written), {
      code: "ERR_ASSERTION",
    });
  } finally {
    ac.close();
    fs.rmSync(dir, { recursive: true });
  }
});

test("a replacement aligns both operations to the receipt and checks the two cuts", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "hasync-replacement-"));
  const ac = new Account(
    "oracle-replacement",
    "http://" + loopback + ":1",
    "http://" + loopback + ":1",
  );
  const before = ac.intent("before");
  const draft = ac.intent("replacement");
  const after = {
    ...draft,
    rows: [
      ...draft.rows,
      {
        ...before.rows[0]!,
        retracted_at: draft.claims[0]!.timestamp,
        retracted_position: 1,
        retract_tx_id: draft.claims[0]!.txId,
      },
    ],
  };
  for (const [i, input] of [before, after].entries()) {
    ac.remember(input, {
      operationId: input.operationId,
      position: { t: "long", v: String(i + 1) },
      t: { t: "long", v: String(i + 101) },
      recordedAt: { t: "double", v: input.claims[0]!.timestamp },
    });
  }
  ac.r.rows = async (_db, request) => {
    const { recordedPosition } = request["basis"] as { recordedPosition: number };
    const expected = recordedPosition === 1 ? before : after;
    return [{ ...expected.rows[0]!, recorded_position: recordedPosition }];
  };
  try {
    const result = await replayEvidence(
      new Evidence(dir, "hasync-ack", "test"),
      ac,
      [before, after],
      "replacement",
    );
    assert.deepEqual(
      result.cuts.map((cut) => cut.rows),
      [1, 1],
    );
    assert.notEqual(result.cuts[0]!.digest, result.cuts[1]!.digest);
  } finally {
    ac.close();
    fs.rmSync(dir, { recursive: true });
  }
});
