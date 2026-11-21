import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { DatomicClient, orderedSaveIdentity } from "../../../../../packages/datomic/dist/index.js";
import { SEED_VALID_FROM, type Fact } from "../../../../bench/lib/world.ts";
import { command } from "../group/workload.ts";

const [phase, file, cap, treatment] = process.argv.slice(2);
const attempt = process.env.PREP1_ATTEMPT!;
const client = new DatomicClient(process.env.PREP1_PEERS!, 20_000);
const root = (i: number) => "cache-owner/" + i;
const facts = (i: number, n: number, label: string): Fact[] => Array.from({ length: n }, (_, j) => ({
  e: root(i), a: ":cache/f" + j, v: { type: "string", value: createHash("sha256").update(label + i + "/" + j).digest("hex") },
}));
const owners = 512, depth = 160, saves = 96;
const selected = (i: number) => (i * 67) % owners;
type Row = Parameters<DatomicClient["transact"]>[1]["rows"][number];
type Ack = { operationId: string; position: { v: string }; t: { v: string }; recordedAt: { v: number };
  subjectAppendRetirement?: boolean; subjectSave?: string; subjectOrderedIds?: boolean;
  nativeIoStats?: { reads: Record<string, number> } };
type Seed = { db: string; scope: string; position: number; rows: Row[][] };

try {
  assert(file && (phase === "seed" || phase === "measure"));
  if (phase === "seed") {
    const scope = JSON.stringify(["triplex-scope-v1", "test", "cache", attempt, 0]);
    const { db, created } = await client.create(scope, "lean", true, 35_000);
    assert(created);
    const old: Row[][] = [];
    for (let i = 0; i < owners; i += 8) {
      const offers = Array.from({ length: 8 }, (_, j) => command("seed-" + (i + j), facts(i + j, depth, "seed"), [], false));
      const input = { ...offers[0]!, entities: offers.flatMap((x) => x.entities ?? []),
        rows: offers.flatMap((x) => x.rows), newIds: offers.flatMap((x) => x.newIds) };
      const ack = await client.transact(db, input) as Ack;
      assert.deepEqual([ack.operationId, Number(ack.position.v)], [input.operationId, i / 8 + 1]);
      old.push(...offers.map((x) => x.rows.slice(0, 3).map((r) => ({
        ...r, recorded_position: Number(ack.position.v), recorded_at: ack.recordedAt.v,
      }))));
    }
    const seed: Seed = { db, scope, position: owners / 8, rows: old };
    writeFileSync(file, JSON.stringify(seed), { flag: "wx" });
    console.log(db);
  } else {
    const seed: Seed = JSON.parse(readFileSync(file, "utf8"));
    const { db, created } = await client.create(seed.scope, "lean", true, 35000);
    const pin = await client.begin(db);
    await client.release(db, pin.handle);
    assert(db === seed.db && !created && pin.position === seed.position);
    const options = await client.request<{ subjectAppendRetirement: boolean; subjectFunction: string;
      subjectNumericOwner: boolean; subjectOrderedIds: boolean }>("GET", "/v1/db/" + db + "/write-options");
    assert(options.subjectNumericOwner && options.subjectOrderedIds);
    assert.equal(options.subjectAppendRetirement, treatment === "1");
    const writes = [];
    for (let i = 0; i < saves; i++) {
      const person = selected(i), width = 1 + i % 3, id = "edit-" + i;
      const now = facts(person, width, "edit");
      const prior = seed.rows[person]!.slice(0, width);
      const input = command(id, now, prior, true, false, orderedSaveIdentity());
      const ack = await client.transact(db, { ...input, sourceK: seed.position }) as Ack;
      const position = seed.position + i + 1;
      assert.deepEqual([ack.operationId, Number(ack.position.v), ack.subjectSave, ack.subjectOrderedIds],
        [id, position, options.subjectFunction, true]);
      assert.equal(Boolean(ack.subjectAppendRetirement), treatment === "1");
      assert(ack.nativeIoStats?.reads);
      const stored = await client.operation(db, id);
      assert.deepEqual([stored.status, stored.operationId, stored.position, stored.t, stored.recordedAt],
        ["committed", id, ack.position, ack.t, ack.recordedAt]);
      const current = await client.rows(db, { entityIds: [root(person)], basis: { recordedPosition: position, validAt: SEED_VALID_FROM } });
      const old = await client.rows(db, { entityIds: [root(person)], basis: { recordedPosition: seed.position, validAt: SEED_VALID_FROM } });
      assert.deepEqual(now.map((f) => current.find((r) => r.attribute === f.a)?.value_string),
        now.map((f) => f.v.value));
      assert.deepEqual(prior.map((r) => old.find((x) => x.attribute === r.attribute)?.id), prior.map((r) => r.id));
      writes.push({ id, position, t: ack.t.v, reads: ack.nativeIoStats.reads });
    }
    console.log("DX-W1_CACHE " + JSON.stringify({ attempt, db, cap, treatment, options,
      seed: process.env.DX_W1_CACHE_SEED, position: seed.position, writes }));
  }
} finally {
  client.close();
}
