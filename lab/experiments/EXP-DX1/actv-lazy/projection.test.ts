import assert from "node:assert/strict";
import test from "node:test";
import { W0, canonical, sha256, triplexValue } from "../../../bench/lib/w0-world.ts";
import { DomainOracle } from "../../../bench/lib/w0-gates.ts";
import { Projection } from "./projection.ts";
import { fact, RELEASE } from "./store.ts";
import { rosterRoot, rosterSeal } from "./read.ts";
test("wage index covers every independently changed item and structural overtime touches no person", async () => {
  const db = new Projection("lazy-grid", "w0"),
    oracle = new DomainOracle(),
    at = W0.POPULATION_VALID_TIME,
    all: any[] = [],
    facts: any[] = [];
  const add = (e: string, a: string, v: any) => ({ e, a, v, tx: 1 });
  let n = 0;
  for (const path of [0, 1, 2])
    for (const j of [null, 1650, 1750])
      for (const l of [null, 1600, 1700, 1800])
        for (const pay of [null, 1550, 1650, 1700, 1800]) {
          const s = W0.placementId(n),
            loc = "loc:l" + n,
            jur = "jur:j" + n;
          n++;
          const fs = [
            ...(path ? [add(s, "location", loc)] : []),
            ...(path === 2 ? [add(loc, "jurisdiction", jur)] : []),
            ...(l !== null ? [add(loc, "localMinWageCents", l)] : []),
            ...(j !== null ? [add(jur, "stateMinWageCents", j)] : []),
            ...(pay !== null ? [add(s, "payRateCents", pay)] : []),
          ];
          all.push({
            subject: s,
            facts: fs.filter(
              (f) => f.e === s || (f.e === loc && path >= 1) || (f.e === jur && path === 2),
            ),
          });
          facts.push(...fs);
        }
  const tx = (p: number, event: any, ops: any[]) => ({
    position: p,
    txId: "transaction-" + p,
    commandId: "cmd-" + p,
    actor: "lazy/input",
    correlationId: canonical({
      context: {
        event,
        profile: "w0",
        intent: sha256(
          canonical([
            "lazy-grid",
            "cmd-" + p,
            event,
            ops.filter((o) => !o.entityId.startsWith("lazy/")),
          ]),
        ),
      },
    }),
    changes: ops.map((o, i) => ({ ...o, tripleId: "row-" + p + "-" + i })),
  });
  const act = (p: number, r: W0.CompiledRelease) => {
    const event = { kind: "activation", at, from: at, release: r.hash };
    return db.advance(
      tx(p, event, [fact(RELEASE, "lazy/activation", { ...event, profile: "w0" })]),
    )!;
  };
  try {
    db.advance(
      tx(1, { kind: "baseline", at }, [
        ...facts.map((f) => ({
          op: "assert",
          entityId: f.e,
          attribute: f.a,
          value: triplexValue(f.a, f.v),
          validFrom: 0,
        })),
        fact(
          rosterRoot(0),
          "lazy/members",
          all.map((w) => w.subject),
        ),
        fact("members/seal", "lazy/roster-seal", rosterSeal(all.map((w) => w.subject))),
      ]),
    );
    assert.equal(act(2, W0.R1).slices[0]!.subjects.length, 180);
    const a = act(3, W0.R2),
      delta = [];
    for (const world of all) {
      const outs = await Promise.all(
        ["R1", "R2"].map((release) =>
          oracle.call("evaluate", { release, world, basis: { tx: 3, validTime: at } }),
        ),
      );
      const items = (o: string) => JSON.parse(o).workItems.map((w: any) => [w.id, w.payload]);
      if (canonical(items(outs[0]!)) !== canonical(items(outs[1]!))) delta.push(world.subject);
    }
    assert.equal(delta.length, 32);
    assert.deepEqual(a.slices[0]!.subjects, delta);
    assert.equal(act(4, W0.R3).slices[0]!.examined, 0);
    assert.equal(act(5, W0.R2).slices[0]!.subjects.length, 0);
    assert.deepEqual(act(6, W0.R1).slices[0]!.subjects, delta);
    assert(db.queryPlans.flat().every((q) => String(q).includes("SEARCH")));
    assert.throws(() => act(8, W0.R2), /unbroken/);
  } finally {
    db.close();
    oracle.close();
  }
});

test("an omitted posting, equal-count substituted roster and wrong source generation leave an open prefix", () => {
  const at = W0.POPULATION_VALID_TIME,
    profile = "w0",
    event = { kind: "baseline", at },
    scope = "lazy-range",
    members = ["pl:a", "pl:b"];
  const ops = [
    fact(rosterRoot(0), "lazy/members", members),
    fact("members/seal", "lazy/roster-seal", rosterSeal(members)),
  ];
  const record = (original: any[], actual: any[], mode = profile) => ({
    position: 1,
    txId: "t",
    commandId: "c",
    actor: "lazy/input",
    correlationId: canonical({
      context: { profile: mode, event, intent: sha256(canonical([scope, "c", event, original])) },
    }),
    changes: actual.map((o, i) => ({ ...o, tripleId: "id" + i })),
  });
  for (const [r, reason] of [
    [record(ops, [ops[1]]), /original command/],
    [
      record(
        [fact(rosterRoot(0), "lazy/members", ["pl:a", "pl:c"]), ops[1]],
        [fact(rosterRoot(0), "lazy/members", ["pl:a", "pl:c"]), ops[1]],
      ),
      /independent roster/,
    ],
    [record(ops, ops, "act2-deep"), /Foreign projection/],
  ] as const) {
    const p = new Projection(scope, "w0");
    try {
      assert.throws(() => p.advance(r), reason);
      assert.equal(p.seen, 0);
    } finally {
      p.close();
    }
  }
});
