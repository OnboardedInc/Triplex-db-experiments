import assert from "node:assert/strict";
import { test } from "node:test";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { runW0Sweep } from "../../../bench/lib/sweep.ts";
import { w0Basis } from "../../../bench/lib/w0-world.ts";
// [DX-H8] Why: a fast second frame must not enter publication while the first still awaits its ACK.
// Rejected: checking invocation order alone (the asynchronous SDK can still have a pending send).
test("ordered activation waits for ACK before the next frame, and does not replay a completed cursor", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "h8-order-"));
  const basis = { position: 0, validAt: 0 };
  const subjects = Array.from({ length: 128 }, (_, i) => String(i).padStart(4, "0"));
  const reused = new Map(
    subjects.map((subject) => [
      subject,
      { subject, output: { basis: w0Basis(basis) }, record: {} },
    ]),
  );
  const events: string[] = [];
  const options = {
    comp: {} as any,
    composition: "memory",
    lane: "xtdb" as const,
    scope: "order-test",
    subjects,
    basis,
    sweepId: "order",
    cursor: path.join(dir, "cursor"),
    workers: 2,
    reused,
    orderedPublication: true,
    onPage: async (_records: readonly any[], page: number) => {
      events.push("send" + page);
      if (!page) await new Promise((r) => setTimeout(r, 100));
      events.push("ack" + page);
    },
  };
  try {
    assert.equal((await runW0Sweep(options)).complete, true);
    assert.deepEqual(events, ["send0", "ack0", "send1", "ack1"]);
    assert.equal(
      (
        await runW0Sweep({
          ...options,
          onPage: async () => {
            throw Error("replayed");
          },
        })
      ).complete,
      true,
    );
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
