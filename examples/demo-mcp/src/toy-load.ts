// [DX-DEMO1] Build the Mac toy: the 1 billion database's exact shape (one lean scope with strict record clocks, ten
// accounts, SCALE1's deep person facts under the same entity names), at a few people per account. demo/toy/build-toy.sh
// then ages it with AGE1's own loader code (demo/toy/aged_live.clj), as the 1 billion database was aged.
// Why: prove every demo tool against the same layout before the 30-minute slot on the rented machine.
// Rejected: AGE1's bulk loader (not on this branch, and the toy needs minutes, not hours).
// Usage: node src/toy-load.ts WRITE_URL READ_URL PEOPLE_PER_ACCOUNT  -> prints one JSON line "TOY {...}"
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { EntityId, type TransactOp } from "@triplex-build/triplex";
import { DatabaseScope } from "@triplex-build/triplex/runtime";
import { DatomicClient } from "@triplex-build/triplex-datomic";
import { person, keyFor, accounts } from "../../../lab/experiments/EXP-DX1/scale1/decision/plan.ts";
import { Demo, SEED_VALID_FROM, type Connection } from "./store.ts";

const [writeUrl, readUrl, perText] = process.argv.slice(2);
const per = Number(perText);
assert(writeUrl && readUrl && Number.isSafeInteger(per) && per >= 2 && per <= 64);
const name = "dx-scale-decision-" + randomUUID() + "-0";
const scope = DatabaseScope.test(name);
const database = "s2-" + Buffer.from(scope).toString("base64url");
const opener = new DatomicClient(writeUrl, 60_000);
const opened = await opener.create(scope, "lean", true, 60_000);
assert(opened.created && opened.db === database && opened.strictRecordClocks);
opener.close();
const roster = accounts.map((a) => ({ account: keyFor(a), namespace: "acct/" + keyFor(a) + "/", firstPerson: 0, people: per }));
const connection: Connection = {
  version: "triplex-demo-connection/1", kind: "toy", database, scope, writeUrl, readUrl, workingCopy: true,
  recordsAtBringUp: 0, headAtBringUp: 0, physicalTAtBringUp: 0, sealed: { head: 0, physicalT: 0, records: 0 },
  roster, clocks: null, connectedAt: new Date().toISOString(),
};
const demo = new Demo(connection);
const started = Date.now();
let facts = 0;
for (const a of accounts)
  for (let i = 0; i < per; i++) {
    const ops: TransactOp[] = person(a, i).map((f) => ({
      op: "assert",
      entityId: EntityId.make(f.e),
      attribute: f.a,
      value: (f.v.type === "ref" ? { type: "ref", value: EntityId.make(f.v.value) } : f.v) as never,
      validFrom: SEED_VALID_FROM,
    }));
    facts += ops.length;
    await demo.transact(ops, { commandId: `toy-seed/${a}/${i}`, actor: "toy-seed" });
  }
const seedHead = (await demo.head()).position;
const seedRecordedAt = Date.now();
const head = await demo.head();
demo.close();
console.log("TOY " + JSON.stringify({
  database, scope, roster, people: per * accounts.length, seedFacts: facts, logicalHead: head.position,
  clocks: { seedHead, seedRecordedAt, seedValidFrom: SEED_VALID_FROM, loadMs: Date.now() - started },
}));
