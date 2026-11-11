import assert from "node:assert/strict";
import { test } from "node:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { SpillThread } from "../../../bench/lib/spill-thread.ts";
import { completeSplitEvidence } from "../../../bench/lib/split-evidence.ts";
// [DX-R3] Why: real straddles require actual application between completed first step and second step.
// Rejected: substituting a later ACK for an application witness.
test("split steps persist before batch ACK and join exact applications, retaining missing witnesses", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "dxr3-split-")),
    directory = path.join(root, "observations");
  const spill = new SpillThread(directory),
    port = spill.connect();
  try {
    const events = [
      {
        rule: "pending",
        assignedAt: 1,
        firstStepEnd: 4,
        acknowledgedAt: 6,
        secondStepStart: 7,
        secondStepEnd: 8,
        position: 10,
      },
      {
        rule: "mixed",
        assignedAt: 2,
        firstStepEnd: 5,
        acknowledgedAt: 7,
        secondStepStart: 8,
        secondStepEnd: 9,
        position: 11,
      },
      {
        rule: "mixed",
        assignedAt: 2,
        firstStepEnd: 5,
        acknowledgedAt: 7,
        secondStepStart: 8,
        secondStepEnd: 9,
        position: 12,
      },
    ];
    const ack = new Promise<void>((resolve) => port.once("message", () => resolve()));
    port.postMessage({ id: 1, records: [], samples: [], splitEvents: events });
    await ack;
    assert.equal(
      fs.readFileSync(`${directory}-split-steps.jsonl`, "utf8").trim().split("\n").length,
      3,
    );
    const retained = await spill.finish();
    retained.dispose();
    assert(fs.existsSync(`${directory}-split-steps.jsonl`));
    const applications = [
      { position: 10, at: 3 },
      { position: 11, at: 6 },
      { position: 11, at: 10 },
    ];
    fs.writeFileSync(`${directory}-copy-applied.jsonl`, applications.map(x => JSON.stringify(x)).join("\n") + "\n");
    const summary = await completeSplitEvidence(directory, []);
    assert.equal(summary.selected, 3);
    assert.equal(summary.complete, 3);
    assert.equal(summary.acknowledgedBetween, 3);
    assert.equal(summary.appliedBetween, 1);
    assert.equal(summary.applicationUnknown, 1);
    const rows = fs
      .readFileSync(summary.file!, "utf8")
      .trim()
      .split("\n")
      .map((x) => JSON.parse(x));
    assert.deepEqual(
      rows.map((x) => x.appliedAt),
      [3, 6, null],
    );
  } finally {
    port.close();
    fs.rmSync(root, { recursive: true });
  }
});
