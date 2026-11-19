import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { inputs } from "./preflight.ts";
import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { openComposition, type CompositionHandle } from "../../../bench/lib/composition.ts";
import { DeepSeedWitness } from "../../../bench/lib/deep-profile.ts";
import { SEED_VALID_FROM, type Fact } from "../../../bench/lib/world.ts";
import { tenantFacts, tenantQueries, tenantRows, keyFor, type Account } from "../scale1/tenants.ts";

export const accountsAt = (people: number): Account[] => [
  { index: 0, key: keyFor(0), first: 0, people: 8 },
  { index: 1, key: keyFor(1), first: 8, people },
];

export async function seedAccounts(comp: CompositionHandle, accounts: Account[]) {
  assert.equal(await comp.currentPosition(), 0, "Seed requires an empty database");
  const pin = createHash("sha256"),
    witness = new DeepSeedWitness();
  let batch: { subject: number; rows: Fact[] }[] = [],
    size = 0;
  let receipts = 0;
  const ends: { commandId: string; txId: string; position: number }[] = [];
  async function flush() {
    if (!size) return;
    const ops = batch.flatMap(({ rows }) =>
      rows.map(({ e, a, v }) => ({
        op: "assert",
        entityId: e,
        attribute: a,
        value: v,
        validFrom: SEED_VALID_FROM,
      })),
    );
    const commandId = "act2:seed:" + batch[0]!.subject;
    const r = await comp.transact(ops, {
      commandId,
      actor: "act2-seed",
    });
    if (!r.ok) throw Error("Seed failed " + r.tag);
    witness.observe(batch, r.value, SEED_VALID_FROM);
    ends[receipts === 0 ? 0 : 1] = { commandId, txId: r.value.txId, position: r.value.position };
    size = 0;
    batch = [];
    if (++receipts % 50 === 0)
      console.log(JSON.stringify({ subjects: witness.subjects, receipts }));
  }
  for (const account of accounts)
    for (let i = 0; i < account.people; i++) {
      const rows = tenantRows(account, i);
      if (size + rows.length > 2000) await flush();
      pin.update(JSON.stringify(rows) + "\n");
      size += rows.length;
      batch.push({ subject: account.first + i, rows });
    }
  await flush();
  const seen = witness.finish(
    accounts.reduce((n, a) => n + a.people, 0),
    tenantFacts(accounts),
    pin.digest("hex"),
  );
  const membership = await tenantQueries(comp, accounts, {
    position: seen.position,
    validAt: Date.now(),
  });
  return { ...seen, receipts, ends, membership: membership.counts };
}

if (process.argv[1] === import.meta.filename) {
  const [dir, n] = process.argv.slice(2),
    people = Number(n);
  assert([1000, 10000].includes(people));
  const owner = fs.readFileSync(process.env.TRIPLEX_LAB_SLOT_OWNER!);
  const slot = JSON.parse(owner.toString());
  assert(
    slot.holder === "DX-ACT2" &&
      slot.mode === "exclusive" &&
      slot.endpoint === process.env.DATOMIC_URL,
  );
  fs.mkdirSync(dir!);
  const nonce = randomUUID(),
    scope = "act2-deep-" + nonce,
    accounts = accountsAt(people);
  const source = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
    sourceInputs = inputs();
  const attempt = {
    nonce,
    scope,
    source,
    sourceInputs,
    accounts,
    slot: slot.container,
    ownerSha256: createHash("sha256").update(owner).digest("hex"),
  };
  fs.writeFileSync(path.join(dir!, "attempt.json"), JSON.stringify(attempt) + "\n", { flag: "wx" });
  fs.writeFileSync(path.join(dir!, "owner.json"), owner, { flag: "wx" });
  const comp = await openComposition("reach", "datomic", scope);
  try {
    const seed = await seedAccounts(comp, accounts);
    assert.equal(inputs(), sourceInputs);
    assert(fs.readFileSync(process.env.TRIPLEX_LAB_SLOT_OWNER!).equals(owner));
    fs.writeFileSync(
      path.join(dir!, "seed.json"),
      JSON.stringify({
        source,
        sourceInputs,
        nonce,
        scope,
        accounts,
        seed,
        slot: slot.container,
        ownerSha256: createHash("sha256").update(owner).digest("hex"),
      }) + "\n",
      { flag: "wx" },
    );
    console.log(JSON.stringify(seed));
  } finally {
    await comp.close();
  }
}
