// [Opus W1] The migrated-subject read sampler against an in-memory store that saves the same subject again between the
// sampler's two reads, as the bench 4 tape did (2026-11-23). A correct store gives no errors; a store whose pinned read
// drops a row or answers from an older position gives errors that name the subject and both reads' positions.
// Run: node --no-warnings --experimental-transform-types --test lab/experiments/EXP-DX1/w1/migrated-reads.test.ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { sampleMigratedReads } from "./migrated-reads.ts";

type Row = { id: string; entity_id: string; recorded_position: number; retracted_position?: number };

// Every save of the subject replaces its one field row; each current read is followed at once by another save.
function store(fault?: "older" | "drop") {
  let head = 100;
  const rows: Row[] = [{ id: "r100", entity_id: "p", recorded_position: 100 }];
  const save = () => {
    head++;
    for (const r of rows) if (r.retracted_position === undefined) r.retracted_position = head;
    rows.push({ id: "r" + head, entity_id: "p", recorded_position: head });
  };
  const at = (p: number) => rows.filter((r) => r.recorded_position <= p && (r.retracted_position ?? Infinity) > p);
  return {
    save,
    reader: {
      async rows(_db: string, input: Record<string, unknown>) {
        const basis = input["basis"] as { recordedPosition?: number };
        if (basis.recordedPosition === undefined) {
          const answer = at(head);
          save(); // another save of the same subject lands before the pinned read
          return answer as never;
        }
        const p = basis.recordedPosition;
        assert(p <= head);
        const answer = at(fault === "older" ? p - 1 : p);
        return (fault === "drop" ? answer.slice(1) : answer) as never;
      },
    },
  };
}

const run = (s: ReturnType<typeof store>) => sampleMigratedReads(s.reader as never, "db", { phase: "loaded",
  start: Date.now(), seconds: 0.5, firstCut: 50, validAt: 0, rate: 20, candidates: () => ["p"] });

test("a save of the same subject between the current and pinned read is not an error", async () => {
  const s = store();
  const result = await run(s);
  assert(result.attempted >= 8);
  assert.equal(result.errorCount, 0, result.errors.join("\n"));
  assert.equal(result.pinned.count, result.attempted);
  assert.equal(result.notYetSaved + result.pinnedSkipped, 0);
});

for (const fault of ["older", "drop"] as const) {
  test(`a pinned read that ${fault === "older" ? "answers from an older position" : "drops the saved row"} is an error`, async () => {
    const result = await run(store(fault));
    assert(result.attempted >= 8);
    assert.equal(result.errorCount, result.attempted);
    assert.equal(result.pinned.count, 0);
    const first = JSON.parse(result.errors[0]!);
    assert.equal(first.entity, "p");
    assert(Number.isSafeInteger(first.saved) && first.current.length === 1 && first.current[0][1] === first.saved);
    assert.match(first.error, /pinned read at the saved position lacks the current rows/);
  });
}
