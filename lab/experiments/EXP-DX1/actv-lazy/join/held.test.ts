import assert from "node:assert/strict";
import test from "node:test";
import { person, keyFor } from "../../scale1/decision/plan.ts";
import { SEED_VALID_FROM } from "../../../../bench/lib/world.ts";
import { heldWorlds } from "../decision.ts";
import { authoredSeed, expectedPolicy } from "./deep-reference.ts";
import { heldTape, rates, total } from "./held-campaign.ts";
import { HeldLedger } from "./held-ledger.ts";
import type { DatomicClient } from "../../../../../packages/datomic/dist/index.js";

test("held cohort keeps the exact per-account and pooled arrival counts", () => {
  for (const rate of rates) {
    const tape = heldTape(100_000, rate, 150);
    assert.equal(tape.length, Math.round(total(rate) * 150));
    assert.equal(tape.filter((r) => r.account === 0).length, Math.round(rate * 150));
    assert.equal(new Set(tape.map((r) => r.version)).size, tape.length);
    assert(tape.every((r, i) => r.ms >= 0 && r.ms < 150_000 && (!i || r.ms >= tape[i - 1]!.ms)));
    const adjacent = Array.from(
      { length: 9 },
      (_, a) => tape.filter((r) => r.account === a + 1).length,
    );
    assert(Math.max(...adjacent) - Math.min(...adjacent) <= 1);
  }
});

test("account-qualified deep facts preserve independent answer provenance and reject foreign sources", () => {
  const i = 1,
    prefix = "acct/" + keyFor(0) + "/",
    position = 23;
  const body = person(0, i).map((f, offset) => ({
    id: "source:" + offset,
    entityId: f.e,
    attribute: f.a,
    value: f.v,
    position,
    validFrom: SEED_VALID_FROM,
  }));
  const project = () =>
    heldWorlds(body, prefix, keyFor(0), [i], { position, validAt: SEED_VALID_FROM });
  const [actual] = project(),
    expected = expectedPolicy(i, authoredSeed(i, position));
  const order = (r: typeof actual.facts) => r.map((f) => JSON.stringify(f)).sort();
  assert.deepEqual(order(actual!.facts), order(expected.facts));
  const ref = body.find((r) => r.value.type === "ref")!;
  assert.equal(typeof ref.value.value, "string");
  ref.value = {
    type: "ref",
    value: String(ref.value.value).replace(prefix, "acct/" + keyFor(1) + "/"),
  };
  assert.throws(project, /Foreign account/);
});

test("adoption does not consume a journal hole while waiting for an acknowledgement", async () => {
  const reader = {
    request: async () => ({ transactions: [["unknown", 8, []]] }),
  } as unknown as DatomicClient;
  const ledger = new HeldLedger(reader, "database", 7);
  await ledger.verifyThrough(8, true);
  await assert.rejects(ledger.verifyThrough(8), /Unknown writer.*8/);
});
