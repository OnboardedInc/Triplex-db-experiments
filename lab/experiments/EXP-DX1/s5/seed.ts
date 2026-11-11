import assert from "node:assert/strict";
import fs from "node:fs";
import { gzipSync, gunzipSync } from "node:zlib";
import { openComposition } from "../../../bench/lib/composition.ts";
import { seedCommands, seedW0 } from "../../../bench/lib/w0-seed.ts";
import { readW0Fingerprint } from "../../../bench/lib/w0-fingerprint.ts";
import { W0, V_W0, many, canonical, triplexValue, sha256 } from "../../../bench/lib/w0-world.ts";

// [DX-S5] Why: the checkpoint is operational state, never a verdict; the database journal repairs a killed suffix.
// Rejected: resuming from a process-local ACK count or trusting an earlier fingerprint as fresh evidence.
const [scope, ns, ends, mode = "seed"] = process.argv.slice(2);
const N = Number(ns),
  endSubjects = Number(ends);
const R = W0.rung(N);
assert(scope?.startsWith("dxs5-"));
assert(endSubjects > 0 && endSubjects <= N && endSubjects % 50 === 0);
// [DX-S5] Why: deterministic Runtime IDs restart at one in each driver process and would collide after a chunk restart.
// Rejected: resetting a scope-seeded ID generator. World fingerprints omit physical IDs and recorded wall times; logical positions stay exact.
delete process.env.TX2_P5_CLOCK_START;
process.env.TX2_W0_POINT_JOURNAL = "1";
process.env.TX2_W0_RESTORE_INDEXED_JOURNAL = "1";
const comp = await openComposition("reach", "datomic", scope);
// [DX-S5] Why: native maintenance counts all current/history rows once per chunk; replaying millions of journals just to enumerate entities is quadratic across chunks.
// Rejected: reporting generated assertions as observed stored row counts. This field names only the observed head.
comp.storeCounts = async () => ({ position: await comp.currentPosition() });
const stateFile = "/state/checkpoint.json.gz";
const latest = new Map<string, string>();
const mapper = sha256(fs.readFileSync(new URL("../../../bench/lib/w0-seed.ts", import.meta.url)));
const releaseHashes = [W0.R1.hash, W0.R2.hash, W0.R3.hash];
try {
  let from = 0,
    verifiedSubjects = 0;
  if (fs.existsSync(stateFile)) {
    const saved = JSON.parse(gunzipSync(fs.readFileSync(stateFile)).toString());
    assert.equal(saved.format, "dxs5-seed/2");
    assert.equal(saved.scope, scope);
    assert.equal(saved.N, N);
    assert.equal(saved.mapper, mapper);
    assert.deepEqual(saved.releaseHashes, releaseHashes);
    assert(Number.isSafeInteger(saved.position) && saved.position >= 0);
    assert(
      Number.isSafeInteger(saved.endSubjects) && saved.endSubjects >= 0 && saved.endSubjects <= N,
    );
    assert(
      Number.isSafeInteger(saved.verifiedSubjects) &&
        saved.verifiedSubjects >= 0 &&
        saved.verifiedSubjects <= saved.endSubjects,
    );
    verifiedSubjects = saved.verifiedSubjects;
    from = saved.position;
    for (const [k, v] of saved.latest) latest.set(k, v);
  }
  const head = await comp.currentPosition();
  assert(head >= from, "database behind checkpoint");
  if (process.env.S5_REQUIRE_RECOVERED === "1")
    assert(head > from, "kill test did not leave a committed suffix");
  // Recover every already committed command since the last checkpoint and verify actual stored assertion content.
  const commands = seedCommands(N);
  let next = commands.next(),
    previousRoot: string | undefined;
  while (!next.done && next.value.position <= from) {
    previousRoot = next.value.rows[0]![0];
    next = commands.next();
  }
  for (let after = from; after < head; ) {
    const page = await comp.feedPage(after, Math.min(100, head - after));
    assert(page.transactions.length > 0, "missing recovery journals");
    for (const tx of page.transactions as any[]) {
      assert.equal(tx.position, after + 1);
      assert(!next.done);
      const c = next.value!;
      const root = c.rows[0]![0];
      if (root !== previousRoot) latest.clear();
      previousRoot = root;
      assert.equal(tx.commandId, `p5:seed:${c.position}`);
      const expectedRetractions = c.rows
        .flatMap(([e, a]) => {
          const id = latest.get(e + "\0" + a);
          return !many.has(a) && c.validFrom <= V_W0 && id ? [id] : [];
        })
        .sort();
      assert.deepEqual(
        tx.changes
          .filter((x: any) => x.op === "retract")
          .map((x: any) => x.tripleId)
          .sort(),
        expectedRetractions,
      );
      assert(tx.changes.every((x: any) => x.op === "assert" || x.op === "retract"));
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
        assert.equal(
          x.validTo,
          a === "payRateCents" && c.validFrom <= V_W0 && W0.plan(R, Number(e.slice(4))).raise
            ? Date.parse("2026-11-16T00:00:00Z")
            : undefined,
        );
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
  // [DX-S5] Why: distinguish durable commits from a fully maintained/read-back chunk across controller restarts.
  // Rejected: treating a pre-maintenance checkpoint as a successful chunk or accepting different mapper/release inputs.
  const checkpoint = (verified: number) => {
    const data = gzipSync(
      JSON.stringify({
        format: "dxs5-seed/2",
        scope,
        N,
        position: through,
        endSubjects,
        verifiedSubjects: verified,
        mapper,
        releaseHashes,
        latest: [...latest],
      }),
    );
    const fd = fs.openSync(stateFile + ".tmp", "w");
    fs.writeSync(fd, data);
    fs.fsyncSync(fd);
    fs.closeSync(fd);
    fs.renameSync(stateFile + ".tmp", stateFile);
    const dir = fs.openSync("/state", "r");
    fs.fsyncSync(dir);
    fs.closeSync(dir);
  };
  if (mode === "seed") {
    const result = await seedW0(comp, N, "/dev/null", undefined, 32, 0, {
      from: head,
      through,
      latest,
      discardLog: true,
      boundedState: true,
    });
    console.log(JSON.stringify({ event: "chunk-seeded", endSubjects, ...result }));
    checkpoint(verifiedSubjects);
  } else assert.equal(head, through);
  if (mode !== "seed") {
    const writerURL = process.env.DATOMIC_URL;
    const readURL = process.env.DATOMIC_READ_URLS?.split(",")[0] ?? writerURL;
    let reader = comp;
    try {
      if (readURL !== writerURL) {
        process.env.DATOMIC_URL = readURL;
        try {
          reader = await openComposition("reach", "datomic", scope);
        } finally {
          process.env.DATOMIC_URL = writerURL;
        }
      }
      assert.equal(await reader.currentPosition(), through);
      const fingerprint = await readW0Fingerprint(
        reader,
        endSubjects,
        { position: through, validAt: V_W0 },
        AbortSignal.timeout(1200000),
        (records, page) => {
          // [DX-S5] Why: expose fresh readback progress while a large prefix is checked; this is never a verdict.
          // Rejected: treating a quiet, heap-stalled gateway as a long successful verification.
          if (page % 128 === 0 || page === Math.ceil(endSubjects / 64) - 1)
            console.log(
              JSON.stringify({
                event: "fingerprint-progress",
                endSubjects,
                page,
                records: records.length,
                position: through,
              }),
            );
        },
        4,
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
      checkpoint(endSubjects);
    } finally {
      if (reader !== comp) await reader.close();
    }
  }
} finally {
  await comp.close();
}
