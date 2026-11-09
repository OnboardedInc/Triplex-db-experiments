// [EXP-RQ01] Why: retain CX-VRQ01's independent ledger and five planted faults.
// Rejected: replacing the review controls with the harness fold (would lose the independent check).
// Copied from verify/RQ01 ae6b802 review.mjs; adaptations: explicit scope/contracts,
// independent Q89i masking and inverted expectations for the four repaired findings.
import assert from "node:assert/strict";
import { expect, it } from "vitest";
import {
  generateRouteHistory,
  generateRouteBases,
  routeHead,
  routeRow,
  routeShape,
  RouteRefusal,
  runRouteEquivalence,
  makeRouteEquivalenceCases,
  replayRouteAnswer,
  makeOfflineRouteFixture,
  requireRouteCoverage,
  makeRouteExecutionPlan,
} from "@triplex-build/triplex-testkit/route";
const modelRows = (history, request, mode = "", contract = "snapshot") => {
  const ledger = new Map();
  for (const commit of history.commits) {
    if (
      mode === "ignore-real-valid-edit" &&
      commit.writes.some(
        (a) =>
          a.op === "assert" &&
          a.row.valid_to !== null &&
          commit.writes.some(
            (r) =>
              r.op === "retract" &&
              ledger.get(r.id)?.entity_id === a.row.entity_id &&
              ledger.get(r.id)?.attribute === a.row.attribute,
          ),
      )
    )
      continue;
    for (const write of commit.writes) {
      if (mode === "ignore-correction" && commit.position === 2048) continue;
      if (write.op === "assert")
        ledger.set(write.row.id, {
          ...write.row,
          recorded_at: commit.instant,
          recorded_position: commit.position,
        });
      else if (mode !== "drop-retraction")
        Object.assign(ledger.get(write.id), {
          retracted_at: commit.instant,
          retracted_position: commit.position,
          retract_tx_id: `tx:${commit.position}`,
        });
    }
  }
  const p = request.basis.recordedPosition ?? history.commits.at(-1).position;
  const t = request.basis.recordedAt ?? Infinity;
  const v = request.basis.validAt ?? history.now;
  return [...ledger.values()]
    .filter(
      (r) =>
        (request.entityId === undefined || r.entity_id === request.entityId) &&
        r.recorded_position <= p &&
        r.recorded_at <= t &&
        !(mode === "drop-same-ms-tie" && r.id === "tie:B") &&
        (request.history ||
          (!((r.retracted_position ?? Infinity) <= p && (r.retracted_at ?? Infinity) <= t) &&
            r.valid_from <= v &&
            (r.valid_to === null || v < r.valid_to))),
    )
    .map((r) =>
      contract === "snapshot" &&
      r.retracted_position !== null &&
      (r.retracted_position > p || r.retracted_at > t)
        ? { ...r, retracted_position: null, retracted_at: null, retract_tx_id: null }
        : r,
    );
};
const modelFixture = (mode = "", contract = "snapshot") => {
  let history;
  return {
    lane: "CX-VRQ01-independent-model",
    reset: (h) => {
      history = structuredClone(h);
    },
    append: (c) => {
      history.commits.push(structuredClone(c));
    },
    event: () => {},
    routes: ["control", "injected"].map((id) => ({
      id,
      contract,
      retention: { kind: "complete", plan: () => [] },
      eligible: (r, h) => (r.basis.recordedPosition ?? 0) <= routeHead(h),
      refusals: ["BasisNotAvailable"],
      force: () => {},
      read: async (request) => {
        const activeMode = id === "injected" ? mode : "";
        if (activeMode === "empty-without-flag")
          return { rows: [], taken: id, basis: request.basis };
        if (activeMode === "empty-ineligible")
          return { rows: [], eligible: false, taken: id, basis: request.basis };
        if (
          (request.basis.recordedPosition ?? 0) > routeHead(history) &&
          activeMode !== "future-old-data"
        )
          throw new RouteRefusal("BasisNotAvailable", "Future position");
        return {
          rows: modelRows(history, request, activeMode, contract),
          taken: id,
          basis: request.basis,
        };
      },
    })),
  };
};
const row = (id, subject = "s", value = id, from = 0, to = null) => ({
  op: "assert",
  row: routeRow(id, subject, value, from, to),
});
const base = (commits) => ({ seed: 89001, now: 2000, commits });
const retractHistory = base([
  { position: 1024, instant: 1000, writes: [row("retracted")] },
  { position: 2048, instant: 1001, writes: [{ op: "retract", id: "retracted" }] },
]);
const tieHistory = base([
  { position: 1024, instant: 1000, writes: [row("tie:A")] },
  { position: 2048, instant: 1000, writes: [row("tie:B")] },
]);
const correctionHistory = base([
  { position: 1024, instant: 1000, writes: [row("old")] },
  {
    position: 2048,
    instant: 1001,
    writes: [{ op: "retract", id: "old" }, row("corrected", "s", "new", 10, 20)],
  },
]);
const faultCases = [
  [
    "drop-retraction",
    retractHistory,
    { basis: { validAt: 2000, recordedPosition: 2048 } },
    ["HE-1", "HE-2"],
  ],
  [
    "drop-same-ms-tie",
    tieHistory,
    { basis: { validAt: 2000, recordedAt: 1000 } },
    ["HE-1", "HE-2"],
  ],
  [
    "future-old-data",
    tieHistory,
    { basis: { validAt: 2000, recordedPosition: 999999 } },
    ["HE-1", "HE-3"],
  ],
  [
    "empty-ineligible",
    tieHistory,
    { basis: { validAt: 2000, recordedPosition: 999999 } },
    ["HE-1", "HE-3", "HE-6"],
  ],
  [
    "ignore-correction",
    correctionHistory,
    { basis: { validAt: 15, recordedPosition: 2048 } },
    ["HE-1", "HE-2"],
  ],
];

for (const [mode, history, request, required] of faultCases) {
  it(`CX-VRQ01 planted fault: ${mode}`, async () => {
    const scope = { shapes: [routeShape(request)] };
    const clean = await runRouteEquivalence({
      fixture: modelFixture(),
      history,
      requests: [request],
      scope,
    });
    assert.equal(clean.violations.length, 0, `${mode}: clean control must pass`);
    const broken = await runRouteEquivalence({
      fixture: modelFixture(mode),
      history,
      requests: [request],
      scope,
    });
    for (const rule of required)
      assert(
        broken.violations.some(
          (v) => v.rule === rule && (v.route === "injected" || v.route === "*"),
        ),
        `${mode}: missing ${rule}`,
      );
    assert(
      !broken.violations.some((v) => v.route === "control"),
      "Correct route must remain clean",
    );
  });
}
for (const seed of [1, 42, 890, 89, 891]) {
  it(`CX-VRQ01 F1/F2 seed ${seed}: actual semantic witnesses and all R31 cuts`, () => {
    const history = generateRouteHistory(seed);
    const plan = makeRouteExecutionPlan({ history, fixture: makeOfflineRouteFixture("xtdb") });
    const coverage = requireRouteCoverage(history, plan.requests, plan);
    expect(coverage.missing).toEqual([]);
    const seen = new Map();
    let bounded = 0,
      replacements = 0;
    for (const commit of history.commits) {
      for (const retract of commit.writes.filter((w) => w.op === "retract")) {
        const prior = seen.get(retract.id);
        for (const next of commit.writes.filter((w) => w.op === "assert")) {
          if (!prior) continue;
          assert.equal(next.row.entity_id, prior.entity_id);
          assert.equal(next.row.attribute, prior.attribute);
          replacements++;
          if (next.row.valid_to !== null) {
            bounded++;
            for (const v of [
              next.row.valid_from - 1,
              next.row.valid_from,
              next.row.valid_to - 1,
              next.row.valid_to,
            ]) {
              const answer = replayRouteAnswer(history, {
                basis: { recordedPosition: commit.position, validAt: v },
              });
              assert.equal(
                answer.some((r) => r.id === next.row.id),
                v >= next.row.valid_from && v < next.row.valid_to,
              );
              assert(!answer.some((r) => r.id === prior.id));
            }
          }
        }
      }
      for (const w of commit.writes) {
        if (w.op === "assert") seen.set(w.row.id, w.row);
        else seen.delete(w.id);
      }
    }
    assert(bounded > 0 && replacements > 0);
  });
}
it("CX-VRQ01 F1: correction-ignoring route fails the default generated gate", async () => {
  const history = generateRouteHistory(42);
  const clean = await runRouteEquivalence({ fixture: modelFixture(), history });
  expect(clean.violations).toEqual([]);
  const broken = await runRouteEquivalence({
    fixture: modelFixture("ignore-real-valid-edit"),
    history,
  });
  expect(broken.violations.some((v) => v.rule === "HE-1" && v.route === "injected")).toBe(true);
  expect(broken.violations.some((v) => v.rule === "HE-2")).toBe(true);
  expect(broken.violations.some((v) => v.route === "control")).toBe(false);
}, 60_000);
it("CX-VRQ01 F4: empty and filtered-to-empty gates reject before any reads", async () => {
  for (const requests of [[], generateRouteBases(tieHistory).filter(() => false)])
    await assert.rejects(
      () =>
        makeRouteEquivalenceCases({
          fixture: modelFixture("drop-retraction"),
          history: tieHistory,
          requests,
        })[0].run(),
      /nonempty requests/,
    );
  await assert.rejects(
    () =>
      makeRouteEquivalenceCases({
        fixture: modelFixture(),
        history: tieHistory,
        requests: [{ basis: {} }],
      })[0].run(),
    /minimum coverage/,
  );
  await assert.rejects(
    () =>
      runRouteEquivalence({
        fixture: modelFixture(),
        history: tieHistory,
        requests: [{ basis: {} }],
        scope: { shapes: ["L"], minimumPerShape: 2 },
      }),
    /minimum coverage/,
  );
  await assert.rejects(
    () =>
      runRouteEquivalence({
        fixture: modelFixture(),
        history: tieHistory,
        requests: [{ basis: {} }],
        scope: { shapes: [] },
      }),
    /nonempty shape scope/,
  );
});
it("CX-VRQ01 F3 / Q89i: existing-row retirement preserves snapshot bytes and separately compares raw lifetime", async () => {
  const history = base([{ position: 1024, instant: 1000, writes: [row("metadata")] }]);
  const extension = { position: 2048, instant: 1001, writes: [{ op: "retract", id: "metadata" }] };
  const requests = [
    { basis: { validAt: 2000, recordedPosition: 1024 } },
    { basis: { validAt: 2000, recordedAt: 1000 } },
    { basis: { validAt: 2000, recordedAt: 1000, recordedPosition: 2048 } },
    { history: true, basis: { recordedPosition: 1024 } },
  ];
  for (const contract of ["snapshot", "raw-lifetime"]) {
    const fixture = modelFixture("", contract);
    const result = await runRouteEquivalence({
      fixture,
      history,
      requests,
      extension,
      scope: { shapes: ["P", "T", "TP", "H"] },
    });
    expect(result.violations).toEqual([]);
    expect(new Set(result.observations.map((o) => o.contract))).toEqual(new Set([contract]));
  }
  const snapshot = modelFixture(),
    raw = modelFixture("", "raw-lifetime");
  const mixed = {
    ...snapshot,
    routes: [
      ...snapshot.routes,
      ...raw.routes.map((r) => ({
        ...r,
        id: `${r.id}-raw`,
        read: async (request) => ({ ...(await r.read(request)), taken: `${r.id}-raw` }),
      })),
    ],
    reset: async (h) => {
      await snapshot.reset(h);
      await raw.reset(h);
    },
    append: async (c) => {
      await snapshot.append(c);
      await raw.append(c);
    },
  };
  const result = await runRouteEquivalence({
    fixture: mixed,
    history,
    requests,
    extension,
    scope: { shapes: ["P", "T", "TP", "H"] },
  });
  expect(result.violations).toEqual([]);
  const known = { ...history, commits: [...history.commits, extension] };
  const snapshotRow = replayRouteAnswer(known, requests[0], "snapshot")[0];
  const rawRow = replayRouteAnswer(known, requests[0], "raw-lifetime")[0];
  expect([
    snapshotRow.retracted_at,
    snapshotRow.retracted_position,
    snapshotRow.retract_tx_id,
  ]).toEqual([null, null, null]);
  expect([rawRow.retracted_at, rawRow.retracted_position, rawRow.retract_tx_id]).toEqual([
    1001,
    2048,
    "tx:2048",
  ]);
});
it("Q89i keeps metadata comparison: an incorrect in-cut retirement field fails HE-1", async () => {
  const fixture = modelFixture();
  const original = fixture.routes[1].read;
  fixture.routes[1].read = async (request) => {
    const answer = await original(request);
    return { ...answer, rows: answer.rows.map((r) => ({ ...r, retract_tx_id: "incorrect" })) };
  };
  const result = await runRouteEquivalence({
    fixture,
    history: retractHistory,
    requests: [{ history: true, basis: { recordedPosition: 2048 } }],
    scope: { shapes: ["H"] },
  });
  expect(result.violations.some((v) => v.rule === "HE-1" && v.route === "injected")).toBe(true);
});
it("Q89a / D-C1 stays known-failing after Q89i metadata repair", async () => {
  const history = base([{ position: 1024, instant: 1001, writes: [row("B", "Y")] }]);
  const options = {
    history,
    requests: [{ entityId: "X", basis: { validAt: 2000, recordedAt: 1001 } }],
    scope: { shapes: ["T"] },
    extension: { position: 2048, instant: 1000, writes: [row("A", "X")] },
  };
  const result = await runRouteEquivalence({
    fixture: makeOfflineRouteFixture("qlever"),
    ...options,
  });
  assert(result.violations.length > 0 && result.violations.every((v) => v.rule === "HE-5"));
  await assert.rejects(() =>
    makeRouteEquivalenceCases({ fixture: makeOfflineRouteFixture("qlever"), ...options })[0].run(),
  );
});

it("CX-VRQ01 empty-without-flag: a bare empty answer for a future cut fails", async () => {
  const request = { basis: { validAt: 2000, recordedPosition: 999999 } };
  const result = await runRouteEquivalence({
    fixture: modelFixture("empty-without-flag"),
    history: tieHistory,
    requests: [request],
    scope: { shapes: ["P"] },
  });
  expect(result.violations.some((v) => v.rule === "HE-1" && v.route === "injected")).toBe(true);
  expect(result.violations.some((v) => v.rule === "HE-3" && v.route === "injected")).toBe(true);
  expect(result.violations.some((v) => v.rule === "HE-6")).toBe(false);
  expect(result.violations.some((v) => v.route === "control")).toBe(false);
});
it("F2 coverage gate rejects missing receipt/abort identities and missing retention cuts", () => {
  const history = generateRouteHistory(42);
  const fixture = makeOfflineRouteFixture("xtdb");
  expect(() => makeRouteExecutionPlan({ fixture, history: { ...history, attempts: [] } })).toThrow(
    /Invalid route history/,
  );
  const requests = generateRouteBases(history).filter(
    (r) => r.basis.recordedPosition !== routeHead(history) + 2048,
  );
  expect(() => makeRouteExecutionPlan({ fixture, history, requests })).toThrow(
    /retention boundary/,
  );
});
it("Q89i rejects a driver that does not name its result contract", async () => {
  const fixture = modelFixture();
  delete fixture.routes[0].contract;
  await expect(runRouteEquivalence({ fixture, history: tieHistory })).rejects.toThrow(
    /declare its result contract/,
  );
});

it("Q89i: raw-history answers cannot conceal unavailable snapshot reads", async () => {
  const snapshot = modelFixture(),
    raw = modelFixture("", "raw-lifetime");
  const fixture = {
    ...snapshot,
    routes: [
      ...snapshot.routes.map((r) => ({
        ...r,
        eligible: () => false,
        read: async () => {
          throw new RouteRefusal("BasisNotAvailable", "snapshot unavailable");
        },
      })),
      ...raw.routes.map((r) => ({
        ...r,
        id: `${r.id}-raw`,
        read: async (request) => ({ ...(await r.read(request)), taken: `${r.id}-raw` }),
      })),
    ],
    reset: async (h) => {
      await snapshot.reset(h);
      await raw.reset(h);
    },
    append: async (c) => {
      await snapshot.append(c);
      await raw.append(c);
    },
  };
  const options = {
    fixture,
    history: tieHistory,
    requests: [{ basis: { recordedPosition: 2048 } }],
    scope: { shapes: ["P"] },
  };
  const result = await runRouteEquivalence(options);
  expect(result.violations.length).toBeGreaterThan(0);
  expect(result.violations.every((v) => v.rule === "HE-4" && v.route === "*:snapshot")).toBe(true);
  await expect(makeRouteEquivalenceCases(options)[0].run()).rejects.toThrow();
});
