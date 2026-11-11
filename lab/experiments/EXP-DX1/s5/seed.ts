import assert from "node:assert/strict";
import fs from "node:fs";
import { gzipSync, gunzipSync } from "node:zlib";
import { openComposition } from "../../../bench/lib/composition.ts";
import { seedCommands, seedW0 } from "../../../bench/lib/w0-seed.ts";
import { readW0Fingerprint } from "../../../bench/lib/w0-fingerprint.ts";
import { W0, V_W0, many, canonical, triplexValue } from "../../../bench/lib/w0-world.ts";
import { openBulkCounts } from "../h6/bulk-counts.ts";

// [DX-S5] Why: the checkpoint is operational state, never a verdict; the database journal repairs a killed suffix.
// Rejected: resuming from a process-local ACK count or trusting an earlier fingerprint as fresh evidence.
const [scope, ns, ends, mode = "seed"] = process.argv.slice(2);
const N = Number(ns),
  endSubjects = Number(ends);
const R = W0.rung(N);
assert(scope?.startsWith("dxs5-"));
assert(endSubjects > 0 && endSubjects <= N && endSubjects % 50 === 0);
process.env.TX2_P5_CLOCK_START = String(V_W0);
process.env.TX2_W0_POINT_JOURNAL = "1";
process.env.TX2_W0_RESTORE_INDEXED_JOURNAL = "1";
const comp = await openComposition("reach", "datomic", scope);
const bulk = await openBulkCounts(comp);
comp.storeCounts = bulk.count;
const stateFile = "/state/checkpoint.json.gz";
const latest = new Map<string, string>();
try {
  let from = 0;
  if (fs.existsSync(stateFile)) {
    const saved = JSON.parse(gunzipSync(fs.readFileSync(stateFile)).toString());
    assert.equal(saved.scope, scope);
    assert.equal(saved.N, N);
    from = saved.position;
    for (const [k, v] of saved.latest) latest.set(k, v);
  }
  const head = await comp.currentPosition();
  assert(head >= from, "database behind checkpoint");
  // Recover every already committed command since the last checkpoint and verify actual stored assertion content.
  const commands = seedCommands(N);
  let next = commands.next();
  while (!next.done && next.value.position <= from) next = commands.next();
  for (let after = from; after < head; ) {
    const page = await comp.feedPage(after, Math.min(100, head - after));
    assert(page.transactions.length > 0, "missing recovery journals");
    for (const tx of page.transactions as any[]) {
      assert.equal(tx.position, after + 1);
      assert(!next.done);
      const c = next.value!;
      assert.equal(tx.commandId, `p5:seed:${c.position}`);
      const actual = tx.changes.filter((x: any) => x.op === "assert");
      assert.equal(actual.length, c.rows.length);
      for (let i = 0; i < actual.length; i++) {
        const [e, a, v] = c.rows[i];
        const x = actual.find(
          (x: any) =>
            x.entityId === e &&
            x.attribute === a &&
            canonical(x.value) === canonical(triplexValue(a, v)),
        );
        assert(x, "recovery assertion differs");
        assert.equal(x.validFrom, c.validFrom);
        if (!many.has(a)) latest.set(e + "\0" + a, x.tripleId);
      }
      after = tx.position;
      next = commands.next();
    }
  }
  console.log(
    JSON.stringify({ event: "resume", scope, N, checkpoint: from, head, recovered: head - from }),
  );
  let through = R.K + R.L;
  let subjects = 0;
  for (const p of W0.population(R)) {
    if (subjects++ >= endSubjects) break;
    through += p.commands;
  }
  assert(head <= through, "range already passed");
  if (mode === "seed") {
    const result = await seedW0(comp, N, "/dev/null", undefined, 32, 0, {
      from: head,
      through,
      latest,
      discardLog: true,
    });
    console.log(JSON.stringify({ event: "chunk-seeded", endSubjects, ...result }));
    const data = gzipSync(JSON.stringify({ scope, N, position: through, latest: [...latest] }));
    const fd = fs.openSync(stateFile + ".tmp", "w");
    fs.writeSync(fd, data);
    fs.fsyncSync(fd);
    fs.closeSync(fd);
    fs.renameSync(stateFile + ".tmp", stateFile);
  } else assert.equal(head, through);
  const fingerprint = await readW0Fingerprint(
    comp,
    endSubjects,
    { position: through, validAt: V_W0 },
    AbortSignal.timeout(600000),
  );
  const counts = await comp.storeCounts();
  assert.equal(await comp.currentPosition(), through);
  const expected =
    N === endSubjects
      ? (
          {
            1000: "sha256:ca15387e66e25ed5e19a4adc602e941f7f06dd8b0f1c6ca7d1a5d2f02f8171ad",
            10000: "sha256:7b4c292331396ab379423ed7faa1a095c324dcdb72afb411d0f48f93efa5624d",
          } as Record<number, string>
        )[N]
      : undefined;
  if (expected) assert.equal(fingerprint.worlds, expected);
  console.log(
    JSON.stringify({
      event: "chunk-readback",
      scope,
      N,
      endSubjects,
      counts,
      fingerprint,
      expected,
    }),
  );
} finally {
  bulk.close();
  await comp.close();
}
