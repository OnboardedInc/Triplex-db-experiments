// [DX-ACT10] Two accounts in one database: command IDs. Real JoinedAccount code over the in-process store (memstore.ts).
// Run: node --experimental-strip-types --test lab/experiments/EXP-DX1/act10/cross-account.test.ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { W0 } from "../../../bench/lib/w0-world.ts";
import { JoinedAccount } from "../actv-lazy/join/account.ts";
import { largeRelease, parseShape } from "../actv-lazy/join/large-release.ts";
import { heldAccount, memStore, MemDb, Proc, seedAccount } from "./memstore.ts";

const validTime = W0.POPULATION_VALID_TIME;
const people = 8;

async function twoAccounts(seed: number, names = ["account-001", "account-002"]) {
  const db = new MemDb("act10-x-" + seed + "-" + Math.random().toString(36).slice(2, 8), seed);
  db.maxYield = 0;
  const cuts: number[] = [];
  for (const n of names) cuts.push(await seedAccount(db, n, people));
  const proc = new Proc(db, "main");
  const accounts = [];
  for (const [i, n] of names.entries()) {
    const s = memStore(proc, heldAccount(n, people, cuts[i]!)) as any;
    const a = new JoinedAccount(s);
    await a.installHeld(validTime);
    accounts.push({ name: n, s, a });
  }
  return { db, accounts };
}
const releasesOf = async (x: { s: any }) => (await x.s.controls(await x.s.head())).releases;
const tailOf = async (x: { a: JoinedAccount }) => (await x.a.notices.observe()).value.sequence;

for (const beside of ["0", "1"])
  test("X1 (TX2_PUBLISH_BESIDE=" + beside + "): two accounts publish with the same command ID and the same document", async () => {
    process.env.TX2_PUBLISH_BESIDE = beside;
    try {
      const { accounts: [A, B] } = await twoAccounts(1);
      const ra = await A!.a.publish("release-2026-11-24", W0.R1.doc, validTime, "owed");
      const rb = await B!.a.publish("release-2026-11-24", W0.R1.doc, validTime, "owed");
      const out = {
        aPosition: ra.position,
        bPosition: rb.position,
        bReceiptIsAs: rb.txId === ra.txId,
        aReleases: (await releasesOf(A!)).length,
        bReleases: (await releasesOf(B!)).length,
        aTail: await tailOf(A!),
        bTail: await tailOf(B!),
      };
      console.log("[X1 beside=" + beside + "] " + JSON.stringify(out));
      // The break: B's Publish is acknowledged with A's receipt; B has no release and no notice event.
      assert.equal(out.bReceiptIsAs, true, "B's Publish returned its own receipt");
      assert.equal(out.bReleases, 0);
      assert.equal(out.bTail, 0);
    } finally {
      delete process.env.TX2_PUBLISH_BESIDE;
    }
  });

test("X2: two accounts publish with the same command ID and different documents", async () => {
  process.env.TX2_PUBLISH_BESIDE = "1";
  try {
    const { accounts: [A, B] } = await twoAccounts(2);
    await A!.a.publish("r1", W0.R1.doc, validTime, "owed");
    const e = await B!.a.publish("r1", W0.R2.doc, validTime, "owed").then(() => null, (x) => x);
    console.log("[X2] " + JSON.stringify({ refused: e ? String(e.message).slice(0, 120) : null, bReleases: (await releasesOf(B!)).length }));
    assert(e, "B's Publish under another account's command ID was accepted");
    assert.match(String(e.message), /Reused command ID has different input/);
  } finally {
    delete process.env.TX2_PUBLISH_BESIDE;
  }
});

test("X3 (TX2_RELEASE_DOCS=ref): two accounts publish the same document by reference with their own command IDs", async () => {
  process.env.TX2_PUBLISH_BESIDE = "1";
  process.env.TX2_RELEASE_DOCS = "ref";
  try {
    const { accounts: [A, B] } = await twoAccounts(3);
    const doc = largeRelease(W0.R1.doc, parseShape("forms=20,policies=20,permille=1000"));
    const ra = await A!.a.publish("account-001:large", doc, validTime, "owed");
    const e = await B!.a.publish("account-002:large", doc, validTime, "owed").then(() => null, (x) => x);
    const out = {
      aPosition: ra.position,
      bRefused: e ? String(e.message).slice(0, 160) : null,
      bReleases: (await releasesOf(B!)).length,
      bTail: await tailOf(B!),
    };
    console.log("[X3] " + JSON.stringify(out));
    assert(e, "B published");
    assert.equal(out.bReleases, 0);
  } finally {
    delete process.env.TX2_PUBLISH_BESIDE;
    delete process.env.TX2_RELEASE_DOCS;
  }
});

test("X4 (TX2_RELEASE_DOCS=ref): an account cannot publish anything by reference once another account staged their shared predecessor", async () => {
  process.env.TX2_PUBLISH_BESIDE = "1";
  try {
    const { accounts: [A, B] } = await twoAccounts(4);
    // Both accounts' first release is the standard R1 with full documents (as every account before the option).
    await A!.a.publish("account-001:R1", W0.R1.doc, validTime, "owed", undefined, { docs: "inline" });
    await B!.a.publish("account-002:R1", W0.R1.doc, validTime, "owed", undefined, { docs: "inline" });
    // B turns on definitions by reference: its Publish also stores its predecessor R1 by reference.
    const large = (permille: number) => largeRelease(W0.R1.doc, parseShape("forms=20,policies=20,permille=" + permille));
    await B!.a.publish("account-002:large", large(1000), validTime, "owed", undefined, { docs: "ref" });
    // A, with a different new document, by reference: refused, every time.
    const tries: string[] = [];
    for (let k = 0; k < 3; k++) {
      const e = await A!.a.publish("account-001:large-" + k, large(500), validTime, "owed", undefined, { docs: "ref" }).then(() => null, (x) => x);
      tries.push(e ? String(e.message).slice(0, 90) : "published");
    }
    const out = { tries, aReleases: (await releasesOf(A!)).length, bReleases: (await releasesOf(B!)).length };
    console.log("[X4] " + JSON.stringify(out));
    assert(tries.every((t) => t !== "published"));
    assert.equal(out.aReleases, 1);
    // With full documents A still publishes (the option is the trigger).
    await A!.a.publish("account-001:large-inline", large(500), validTime, "owed", undefined, { docs: "inline" });
    assert.equal((await releasesOf(A!)).length, 2);
  } finally {
    delete process.env.TX2_PUBLISH_BESIDE;
  }
});
