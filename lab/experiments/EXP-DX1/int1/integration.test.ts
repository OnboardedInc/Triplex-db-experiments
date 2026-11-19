import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createHash, randomUUID } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { Account, policyId, seedFacts, verifyTenants } from "./account.ts";
import { activate, eadRelease } from "./activation.ts";
import { DeepProjectionIndex } from "../../../bench/lib/deep-projection-index.ts";
import { policyWorld } from "../../../bench/lib/deep-activation.ts";
import { memoryComposition } from "../../../bench/lib/memory.ts";
import { W0, V_W0, canonical } from "../../../bench/lib/w0-world.ts";
import { keyFor } from "../scale1/tenants.ts";
import { smallPeople } from "../scale1/small-plan.ts";
import { cases, verifyPages, verifyLatencies } from "./bench-cases.ts";
import { regularDeepProof } from "./receipt-proof.ts";
import { validatedSubjectReader } from "../../../bench/lib/touched-reads.ts";
import type { Basis } from "../../../bench/lib/composition.ts";
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), "int1-suite-"));
test("a latest read hands its interposed write to the ordinary cut resolver exactly once", async () => {
  let opens = 0, writes = 0;
  const write = async () => { writes++; };
  const result = { triples: [], entities: 1, depth: 0, roundTrips: 2, route: "source", language: "ordinary", waitedMs: 0 };
  const reader = validatedSubjectReader("latest-scope", async (root, basis, between) => {
    opens++;
    assert.equal(root, "person");
    assert.deepEqual(basis, { validAt: 7 });
    assert.equal(between, write);
    await between();
    return result;
  });
  assert.equal(await reader.pull("person", { validAt: 7 } as Basis, write), result);
  assert.deepEqual([opens, writes, reader.usage().bytes], [1, 1, 0]);
  reader.close();
});
test("the import-only observer replays every original seed identity after sampling", async () => {
  const comp = await memoryComposition("datomic", "seed-feed-" + randomUUID());
  const db = new DatabaseSync(":memory:");
  let pages = 0, corrupt = false;
  const observed = { ...comp, feedPage: async (...args: Parameters<typeof comp.feedPage>) => {
    pages++;
    const page = await comp.feedPage(...args);
    return corrupt ? { ...page, transactions: page.transactions.map(t => ({ ...t, txId: "wrong" })) } : page;
  } };
  try {
    const a = new Account(observed, "thin", randomUUID(), 0, 2, db, undefined, undefined, undefined, true);
    await a.seed([0]); await a.seed([1]);
    assert.equal(pages, 0);
    const proof = await a.verifySeedFeed(async () => {});
    assert(proof && proof.count === 2 && proof.facts === 16);
    assert.equal(pages,2);
    corrupt = true;
    await assert.rejects(a.verifySeedFeed(async () => {}));
    corrupt = false;
    db.exec("DELETE FROM seed_feed WHERE p=1");
    await assert.rejects(a.verifySeedFeed(async () => {}));
  } finally { db.close(); await comp.close(); }
});
test("latency collection recomputes the nearest-rank statistic and rejects another attempt", () => {
  const dir = tmp(),
    file = "latency-samples.json",
    attempt = randomUUID(),
    binding = randomUUID();
  try {
    const kinds = ["cold", "commit", "resident", "ryow"];
    const samples = Object.fromEntries(kinds.map((kind) => [kind, [8, 1, 3, 2]]));
    const bytes = JSON.stringify({ binding, attempt, samples });
    fs.writeFileSync(path.join(dir, file), bytes);
    const r = {
      latencyReceipt: { file, sha256: createHash("sha256").update(bytes).digest("hex") },
      latency: Object.fromEntries(kinds.map((kind) => [kind, { n: 4, p50: 2, p99: 8 }])),
    };
    verifyLatencies(dir, r, binding, attempt);
    assert.throws(() => verifyLatencies(dir, r, binding, randomUUID()));
    r.latency.cold.p99 = 3;
    assert.throws(() => verifyLatencies(dir, r, binding, attempt));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
test("the ordinary deep activation runs the page selector and Python oracle without fetching a cold person's closure", async () => {
  const dir = tmp();
  const comp = await memoryComposition("datomic", "deep-ordinary-" + randomUUID());
  try {
    const proof = await regularDeepProof(
      { ...comp, name: "reach-touched" },
      path.join(dir, "regular"),
    );
    assert.equal(proof.guardComparisons, 12);
  } finally {
    await comp.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
test("certified deep worlds avoid a source pull, dirty worlds use it, and a changed committed prefix refuses restart", async () => {
  const dir = tmp(),
    comp = await memoryComposition("datomic", "deep-projection-" + randomUUID());
  let pulls = 0;
  const original = comp.sweepPage;
  comp.sweepPage = async (...args) => {
    pulls++;
    return original(...args);
  };
  const db = path.join(dir, "index");
  let index = new DeepProjectionIndex(db, "scope-generation", policyWorld);
  try {
    const ack = await comp.transact(seedFacts("deep", 0), { commandId: "seed", actor: "import" });
    assert(ack.ok);
    let cut = { position: ack.value.position, validAt: V_W0 };
    await index.catchUp(comp, cut);
    const [w] = [...(await index.worlds(comp, [0], cut)).values()];
    assert.equal(pulls, 0);
    const actual = await original(["pl:00000000"], cut);
    assert.deepEqual(w, policyWorld(0, actual.rows, cut));
    index.close();
    index = new DeepProjectionIndex(db, "scope-generation", policyWorld);
    const change = await comp.transact(
      [
        {
          op: "assert",
          entityId: "pl:00000000",
          attribute: ":int1/activity",
          value: { type: "string", value: "x" },
          validFrom: V_W0,
        },
      ],
      { commandId: "next", actor: "import" },
    );
    assert(change.ok);
    const newer = { ...cut, position: change.value.position };
    await index.catchUp(comp, newer);
    await index.worlds(comp, [0], cut);
    assert.equal(pulls, 0);
    await index.worlds(comp, [0], newer);
    assert.equal(pulls, 1);
    const foreign = await memoryComposition("datomic", "foreign-" + randomUUID());
    try {
      await assert.rejects(index.catchUp(foreign, newer));
    } finally {
      await foreign.close();
    }
  } finally {
    index.close();
    await comp.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
test("eight deep accounts keep identical original intents, roster, oracle decisions and every durable guard across placements", async () => {
  const arm = async (pooled: boolean) => {
    const dir = tmp(),
      handles = [] as Awaited<ReturnType<typeof memoryComposition>>[],
      accounts: Account[] = [];
    try {
      for (let n = 0; n < 8; n++) {
        const c =
          pooled && n ? handles[0]! : await memoryComposition("datomic", "account-" + randomUUID());
        if (!handles.includes(c)) handles.push(c);
        const a = new Account(
          c,
          "deep",
          "bound-" + n,
          n * 4,
          4,
          new DatabaseSync(":memory:"),
          pooled ? accounts[0]?.cursor : undefined,
          { index: n, key: keyFor(n), first: n * 4, people: 4 },
          pooled ? accounts[0]?.membership : undefined,
        );
        accounts.push(a);
        await a.seed([0, 1, 2, 3].map((i) => i + n * 4));
      }
      const out = [];
      for (const a of accounts) {
        await a.update(a.first);
        const values = [];
        for (const r of [W0.R1, eadRelease()]) {
          const write = await a.comp.transact(
            [
              {
                op: "assert",
                entityId: "release-" + a.first,
                attribute: "active",
                value: { type: "string", value: r.hash },
                validFrom: V_W0,
              },
            ],
            { commandId: "release-" + a.first + r.name, actor: "release" },
          );
          assert(write.ok);
          a.head = write.value.position;
          const d = await activate(a, dir, r, a.head, async () => {});
          assert.equal(d.oracle, 4);
          assert.equal(d.guardReadbacks, 4);
          await verifyPages(dir, d, a.first, a.count);
          const file = path.join(dir, d.receiptFile);
          const bytes = fs.readFileSync(file);
          fs.writeFileSync(file, bytes.subarray(0, -1));
          await assert.rejects(verifyPages(dir, d, a.first, a.count));
          fs.writeFileSync(file, bytes);
          await assert.rejects(
            verifyPages(
              dir,
              { ...d, cut: { ...d.cut, scope: "different-scope" } },
              a.first,
              a.count,
            ),
          );
          values.push(d.logical);
          a.head = await a.comp.currentPosition();
        }
        assert.match(a.seedIntent!, /^[0-9a-f]{64}$/);
        out.push([a.first, a.seedIntent, a.roster(), values]);
      }
      assert.equal(handles.length, pooled ? 1 : 8);
      const membership = await verifyTenants(accounts);
      assert.equal(membership.length, handles.length);
      assert.equal(
        membership.reduce((n, a) => n + a.total, 0),
        32,
      );
      return out;
    } finally {
      for (const a of accounts) a.db.close();
      for (const h of handles) await h.close();
      fs.rmSync(dir, { recursive: true, force: true });
    }
  };
  assert.deepEqual(await arm(true), await arm(false));
});
test("the physical plan freezes the same 29,000 people in both 100-account placements", () => {
  const sizes = Array.from({ length: 100 }, (_, i) => smallPeople(i));
  assert.equal(
    sizes.reduce<number>((a, b) => a + b, 0),
    29000,
  );
  assert.equal(sizes.filter((n) => n === 2000).length, 10);
  assert.deepEqual(
    cases.map((c) => [c.size, c.scopes]),
    [
      [1000000, 1],
      [4000000, 1],
      [29000, 1],
      [29000, 100],
    ],
  );
});

test("SCALE1 selects a nonzero tenant crossing the guarded page boundary without cold source pulls", async () => {
  const dir = tmp(),
    comp = await memoryComposition("datomic", "ordinary-tenant-" + randomUUID());
  try {
    const result = await regularDeepProof(
      { ...comp, name: "reach-touched" },
      path.join(dir, "tenant"),
      true,
    );
    assert.equal(result.pages, 2);
    assert.equal(result.firstPerson, 254);
    assert.equal(result.guardComparisons, 12);
  } finally {
    await comp.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
