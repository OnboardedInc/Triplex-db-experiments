import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { attrs } from "./fixture.ts";
import { openSnapshot, parseSnapshot, snapshotSamples, writeSnapshot } from "./snapshot.ts";

test("snapshot chunks bind their bytes, tier and ordered cut positions", async () => {
  const dir = await mkdtemp(join(tmpdir(), "triplex-playground-snapshot-"));
  try {
    const input = join(dir, "probe");
    const target = join(dir, "snapshot");
    const content = Buffer.from("bytes standing in for a PostgreSQL dump");
    await writeFile(input, content);
    const { manifest, checksum } = await writeSnapshot(input, target, {
      tier: "probe",
      run: "tx2-dxplay1-0123456789ab",
      plan: "small",
      codec: "a".repeat(64),
      checkpoint: { early: 1, middle: 2, head: 3 },
    });
    const opened = await openSnapshot(target, join(dir, "cache"), "probe");
    assert.equal(opened.checksum, checksum);
    assert.deepEqual(await readFile(opened.inputs[0]!), content);
    await assert.rejects(openSnapshot(target, dir, "other-tier"), /incompatible/);
    assert.throws(
      () =>
        parseSnapshot(
          Buffer.from(
            JSON.stringify({
              ...manifest,
              checkpoint: { early: 1, middle: 3, head: 2 },
            }),
          ),
          "probe",
        ),
      /cut positions/,
    );
    content[0] = content[0]! ^ 1;
    await writeFile(opened.inputs[0]!, content);
    await assert.rejects(openSnapshot(target, dir, "probe"), /Invalid bundle object/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("the three cuts have independently generated values for edited deep and wide people", () => {
  for (const plan of ["small", { deep: 32, daily: 5 }] as const) {
    const samples = snapshotSamples(plan);
    for (const id of ["person:deep-1:0000001", "person:wide-2:0000001"]) {
      const note = samples.map((cut) => cut.byPerson.get(id)?.get(id)?.get(attrs.note));
      assert(note.every(Boolean));
      assert.equal(new Set(note).size, 3);
    }
  }
});
