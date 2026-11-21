import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { attrs, earlyAt } from "./fixture.ts";
import { saves, scaledDailySaves } from "./bundle.ts";
import {
  openSnapshot,
  parseSnapshot,
  snapshotProfiles,
  snapshotSamples,
  writeSnapshot,
} from "./snapshot.ts";

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
  for (const plan of ["small", { deep: 32, daily: 5 }, { deep: 32, daily: "scaled" }] as const) {
    const samples = snapshotSamples(plan);
    for (const id of ["person:deep-1:0000001", "person:wide-2:0000001"]) {
      const note = samples.map((cut) => cut.byPerson.get(id)?.get(id)?.get(attrs.note));
      assert(note.every(Boolean));
      assert.equal(new Set(note).size, 3);
    }
  }
});

test("the proportional schedule keeps the full day's save budget and minute bursts", () => {
  const accounts = snapshotProfiles({ deep: 500, daily: "scaled" });
  const daily = scaledDailySaves(500);
  const firstDay = [...saves(1, accounts, false, undefined, { daily, active: 10 })];
  for (const account of accounts.slice(0, 2)) {
    const events = firstDay.filter(
      (frame) => frame.kind === "save" && frame.target.startsWith("person:" + account.id + ":"),
    );
    assert.equal(events.length, daily);
    const counts = new Map<number, number>();
    for (const event of events) {
      assert.equal(event.kind, "save");
      const minute = Math.floor((event.validAt - earlyAt) / 60_000) - 1440;
      assert(minute >= 0 && minute < 1440);
      counts.set(minute, (counts.get(minute) ?? 0) + 1);
    }
    assert(Math.max(...counts.values()) >= 10);
  }
});
