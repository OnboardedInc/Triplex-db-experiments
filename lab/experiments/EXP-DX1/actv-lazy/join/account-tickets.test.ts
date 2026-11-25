// [DX-ACT9] The account-ticket decisions without a database: node --test --experimental-transform-types <this file>
import assert from "node:assert/strict";
import test from "node:test";
import { erasureWriteTicket } from "../../../../../packages/datomic/dist/erasure.js";
import { withErasure } from "../../../../bench/lib/datomic-erasure.ts";
import { heldWorlds } from "../decision.ts";
import {
  accountTicketsOn,
  fingerprint,
  ticketAccount,
  ticketAccounts,
  touchedSubjects,
  verifyCopy,
  type AccountFrontier,
} from "./account-tickets.ts";

const held = { held: { account: "acc-7", prefix: "acct/acc-7/", people: 8, cut: 1, seal: "x", namespace: true,
  verifyThrough: async () => {}, committed: () => {} } } as const;
const env = (on: Record<string, string | undefined>, f: () => void) => {
  const before = { a: process.env.TX2_ACCOUNT_TICKETS, r: process.env.TX2_REMOVAL_PER_ACCOUNT };
  for (const [k, v] of Object.entries(on)) if (v === undefined) delete process.env[k]; else process.env[k] = v;
  try { f(); } finally {
    if (before.a === undefined) delete process.env.TX2_ACCOUNT_TICKETS; else process.env.TX2_ACCOUNT_TICKETS = before.a;
    if (before.r === undefined) delete process.env.TX2_REMOVAL_PER_ACCOUNT; else process.env.TX2_REMOVAL_PER_ACCOUNT = before.r;
  }
};
const frontier = (o: Partial<AccountFrontier>): AccountFrontier =>
  ({ database: "s2-x", protected: true, seq: 9, erased: {}, perAccount: true, accountSeq: 0, unscopedSeq: 0, ...o }) as AccountFrontier;

test("the option needs both switches and a held account of the one database", () => {
  env({ TX2_ACCOUNT_TICKETS: undefined, TX2_REMOVAL_PER_ACCOUNT: undefined }, () => {
    assert.equal(accountTicketsOn(), false);
    assert.equal(ticketAccount(held), undefined);
    assert.equal(ticketAccounts(held), undefined);
  });
  env({ TX2_ACCOUNT_TICKETS: "1", TX2_REMOVAL_PER_ACCOUNT: undefined }, () => assert.equal(ticketAccount(held), undefined));
  env({ TX2_ACCOUNT_TICKETS: undefined, TX2_REMOVAL_PER_ACCOUNT: "1" }, () => assert.equal(ticketAccount(held), undefined));
  env({ TX2_ACCOUNT_TICKETS: "1", TX2_REMOVAL_PER_ACCOUNT: "1" }, () => {
    assert.equal(ticketAccount(held), "acc-7");
    assert.deepEqual(ticketAccounts(held), ["acc-7"]);
    assert.equal(ticketAccount({ held: undefined }), undefined, "a store that is not held keeps its database-wide ticket");
    assert.equal(ticketAccount({ held: { ...held.held, prefix: "acct/other/" } }), undefined);
  });
});

test("with the option off the ticket carries no account (the wire is the Publish branch's)", () => {
  env({ TX2_ACCOUNT_TICKETS: undefined, TX2_REMOVAL_PER_ACCOUNT: "1" }, () => {
    const t = withErasure(5, () => erasureWriteTicket(), undefined, ticketAccounts(held));
    assert.deepEqual(t, { sequence: 5, replay: false });
  });
  env({ TX2_ACCOUNT_TICKETS: "1", TX2_REMOVAL_PER_ACCOUNT: "1" }, () => {
    const t = withErasure(5, () => erasureWriteTicket(), undefined, ticketAccounts(held));
    assert.deepEqual(t, { sequence: 5, replay: false, accounts: ["acc-7"] });
  });
});

test("touched subjects: exact per subject, or all when that cannot be told", () => {
  const p = "acct/acc-7/";
  assert.equal(touchedSubjects(undefined, p, 3), "all");
  assert.equal(touchedSubjects(frontier({ perAccount: false }), p, 3), "all");
  assert.equal(touchedSubjects(frontier({ unscopedSeq: 4 }), p, 3), "all", "an unscoped removal can reach any input");
  assert.equal(touchedSubjects(frontier({ seq: 2 }), p, 3), "all", "a stamp ahead of the published log");
  assert.deepEqual(touchedSubjects(frontier({ accountSeq: 3 }), p, 3), new Set(), "nothing of this account after the stamp");
  assert.equal(touchedSubjects(frontier({ accountSeq: 4, touched: ["acct/acc-7/pl:00000002"], touchedComplete: false }), p, 3), "all");
  assert.equal(touchedSubjects(frontier({ accountSeq: 4 }), p, 3), "all", "an old gateway reports no list");
  assert.deepEqual(touchedSubjects(frontier({ accountSeq: 6, touchedComplete: true,
    touched: ["acct/acc-7/pl:00000002", "acct/acc-7/doc:00000005:i9", "acct/acc-7/act9-note-1"] }), p, 3), new Set([2, 5]),
    "subject entities by number; an entity that belongs to no subject is in no world");
  assert.equal(touchedSubjects(frontier({ accountSeq: 6, touchedComplete: true, touched: ["acct/other/pl:00000001"] }), p, 3), "all");
});

test("a recorded copy is served while no removal after its stamp touched its subjects or the unscoped account", () => {
  const p = "acct/acc-7/";
  const ok = (f: AccountFrontier, stamp: number, subjects: string[]) => { verifyCopy(f, p, stamp, subjects); return true; };
  const refused = (f: AccountFrontier | undefined, stamp: number, subjects: string[]) =>
    assert.throws(() => verifyCopy(f, p, stamp, subjects), { name: "ErasureFrontierChanged" });
  // database-wide frontier: the stamp must be current, as before
  assert(ok(frontier({ perAccount: false, seq: 3 }), 3, ["pl:s00000001"]));
  refused(frontier({ perAccount: false, seq: 4 }), 3, ["pl:s00000001"]);
  refused(undefined, 3, ["pl:s00000001"]);
  // removals in other accounts only (the account's counter is behind the stamp)
  assert(ok(frontier({ seq: 40, accountSeq: 2 }), 3, ["pl:s00000001", "pl:s00000002"]));
  // a removal of this account's subject 2 after the stamp
  const f = frontier({ seq: 40, accountSeq: 7, touched: ["acct/acc-7/pl:00000002"], touchedComplete: true });
  assert(ok(f, 3, ["pl:s00000001", "pl:s00000003"]), "a packet without subject 2");
  refused(f, 3, ["pl:s00000001", "pl:s00000002"]);
  assert(ok(f, 7, ["pl:s00000002"]), "a packet stamped at or after that removal");
  // an unscoped removal after the stamp refuses every copy
  refused(frontier({ seq: 40, unscopedSeq: 5 }), 3, []);
  // a removal of an entity of this account that belongs to no subject refuses nothing
  assert(ok(frontier({ seq: 40, accountSeq: 9, touched: ["acct/acc-7/act9-note-4"], touchedComplete: true }), 3, ["pl:s00000004"]));
});

test("a cache keyed on the account's removal state survives removals elsewhere", () => {
  const a = fingerprint(frontier({ seq: 5, accountSeq: 2, unscopedSeq: 0 }));
  assert.equal(fingerprint(frontier({ seq: 9, accountSeq: 2, unscopedSeq: 0 })), a);
  assert.notEqual(fingerprint(frontier({ seq: 9, accountSeq: 8, unscopedSeq: 0 })), a);
  assert.notEqual(fingerprint(frontier({ seq: 9, accountSeq: 2, unscopedSeq: 9 })), a);
  assert.equal(fingerprint(frontier({ perAccount: false, seq: 9 })), 9, "a database-wide frontier keys on its sequence");
  assert.equal(fingerprint(undefined), undefined);
});

test("a held world refuses another account's or another subject's rows (a ticket can name only its account)", () => {
  const p = "acct/acc-7/", b = { position: 1, validAt: 0 };
  const row = (entityId: string, value: { type: string; value: string } = { type: "string", value: "x" }) =>
    ({ entityId, attribute: ":person/note", value, validFrom: 0, validTo: null }) as never;
  // a row of another account
  assert.throws(() => heldWorlds([row("acct/other/pl:00000001")], p, "acc-7", [1], b), /Foreign account in a pinned world/);
  // a reference into another account
  assert.throws(() => heldWorlds([row(p + "pl:00000001", { type: "ref", value: "acct/other/pl:00000001" })], p, "acc-7", [1], b),
    /Foreign account in a pinned world/);
  // a row of another subject of the same account, and of an entity that belongs to no subject
  assert.throws(() => heldWorlds([row(p + "pl:00000002")], p, "acc-7", [1], b), /Foreign subject in a pinned world/);
  assert.throws(() => heldWorlds([row(p + "act9-note-1")], p, "acc-7", [1], b), /Foreign subject in a pinned world/);
  // an unscoped entity
  assert.throws(() => heldWorlds([row("pl:00000001")], p, "acc-7", [1], b), /Foreign account in a pinned world/);
});
