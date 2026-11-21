import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { addedFacts, facts, namespace, roster, source, subject } from "./population.ts";
import { stoppedInventory } from "./seal.ts";
import { offers } from "./workload.ts";

test("realistic profiles retain one deep cohort and deterministically cover every added subject", () => {
  const expected = [
    ["first", 111, 2_029_000, 14_323_490],
    ["full", 111, 5_529_000, 49_323_490],
  ] as const;
  for (const [profile, count, people, additional] of expected) {
    const accounts = roster(profile);
    assert.equal(accounts.length, count);
    assert.equal(
      accounts.reduce((total, a) => total + a.people, 0),
      people,
    );
    assert.equal(
      accounts.filter((a) => a.kind !== "deep").reduce((n, a) => n + addedFacts(a), 0),
      additional,
    );
  }
  const newAccounts = roster("toy").filter((a) => a.kind !== "deep");
  const fixture = source(newAccounts, "a", "b");
  let cursor = 0,
    total = 0;
  for (const frame of fixture.batches()) {
    assert.equal(frame.first, cursor);
    assert.deepEqual(fixture.batches(cursor).next().value, frame);
    for (const row of frame.operations) {
      assert(row.entityId.startsWith(namespace));
      if (row.value.type === "ref") assert(row.value.value.startsWith(namespace));
    }
    cursor = frame.end;
    total += frame.operations.length;
  }
  assert.equal(cursor, fixture.groups);
  assert.equal(
    total,
    newAccounts.reduce((n, account) => n + addedFacts(account), 0),
  );
  const thin = newAccounts[0]!;
  assert.equal(facts(thin, 123).length, 10);
  assert.notEqual(subject(thin, 0), subject(newAccounts[1]!, 0));
});

test("mixed tape holds the quiet control constant and excludes reserved first-read IDs", () => {
  const accounts = roster("toy");
  const mixed = offers(accounts, 5, 25, true, false);
  assert.deepEqual(mixed, offers(accounts, 5, 25, true, false));
  assert.deepEqual(
    mixed.filter((o) => o.kind === "quiet"),
    offers(accounts, 5, 25, true, true),
  );
  assert.equal(new Set(mixed.filter((o) => o.kind === "small").map((o) => o.account.id)).size, 10);
  for (const item of mixed.filter((o) => o.kind === "thin")) assert(item.person < 4_973);
  for (const duplicate of mixed.filter((o) => o.event.resend)) {
    const primary = mixed.find(
      (o) => !o.event.resend && o.kind === duplicate.kind && o.event.seq === duplicate.event.seq,
    );
    assert(primary && primary.account === duplicate.account && primary.person === duplicate.person);
  }
});

test("physical inventory detects changed relation bytes and refuses links and running directories", async () => {
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "real1-pgdata-")));
  try {
    fs.mkdirSync(path.join(dir, "global"));
    fs.mkdirSync(path.join(dir, "pg_wal"));
    fs.writeFileSync(path.join(dir, "PG_VERSION"), "17\n");
    fs.writeFileSync(path.join(dir, "global", "pg_control"), Buffer.alloc(8192));
    const relation = path.join(dir, "relation");
    fs.writeFileSync(relation, "test");
    const before = await stoppedInventory(dir);
    fs.writeFileSync(relation, "next");
    const after = await stoppedInventory(dir);
    assert.equal(before.controlSha, after.controlSha);
    assert.equal(before.bytes, after.bytes);
    assert.notEqual(before.treeSha, after.treeSha);
    fs.linkSync(relation, path.join(dir, "second"));
    await assert.rejects(stoppedInventory(dir), /private files/);
    fs.unlinkSync(path.join(dir, "second"));
    fs.writeFileSync(path.join(dir, "postmaster.pid"), "99\n");
    await assert.rejects(stoppedInventory(dir));
  } finally {
    fs.rmSync(dir, { recursive: true });
  }
});
