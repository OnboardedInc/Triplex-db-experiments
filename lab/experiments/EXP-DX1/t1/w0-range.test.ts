import { test } from "node:test";
import assert from "node:assert/strict";
import { memoryComposition } from "../../../bench/lib/memory.ts";
import { seedW0, seedCommands } from "../../../bench/lib/w0-seed.ts";
import { W0, V_W0, worldOf, canonical } from "../../../bench/lib/w0-world.ts";

// [DX-S5] Why: split within a subject to exercise scalar replacement across ranges, not merely appending disjoint subjects.
// Rejected: only checking command totals (would miss lost retractions or a future raise).
test("range resumes scalar IDs and matches every full-seed world", async () => {
  const N = 50,
    full = memoryComposition("xtdb", "s5-full"),
    split = memoryComposition("xtdb", "s5-split");
  const latest = new Map<string, string>();
  const total = W0.populationBasis(W0.rung(N)).tx;
  const cut = [...seedCommands(N)].find((c) =>
    c.rows.some((r) => r[1] === "payRateCents" && c.position > 30),
  )!.position;
  await seedW0(full, N, "/dev/null", undefined, 32, 0, {
    from: 0,
    through: total,
    latest: new Map(),
    discardLog: true,
  });
  await seedW0(split, N, "/dev/null", undefined, 32, 0, {
    from: 0,
    through: cut,
    latest,
    discardLog: true,
    boundedState: true,
  });
  const restored = new Map<string, string>(JSON.parse(JSON.stringify([...latest])));
  await seedW0(split, N, "/dev/null", undefined, 32, 0, {
    from: cut,
    through: total,
    latest: restored,
    discardLog: true,
    boundedState: true,
  });
  assert(restored.size < 8192, "scalar state must be root-bounded");
  const basis = { position: total, validAt: V_W0 };
  for (let i = 0; i < N; i++) {
    const subject = W0.placementId(i);
    assert.equal(
      canonical(worldOf(subject, (await full.sweepPage([subject], basis)).rows)),
      canonical(worldOf(subject, (await split.sweepPage([subject], basis)).rows)),
    );
  }
  await assert.rejects(
    seedW0(split, N, "/dev/null", undefined, 32, 0, {
      from: cut,
      through: total,
      latest,
      discardLog: true,
      boundedState: true,
    }),
    /head mismatch/,
  );
});
