import assert from "node:assert/strict";
import type { Seen } from "./oracle.ts";

export interface Offer {
  actor: string;
  kind: "save" | "read";
  seq: number;
  due: number;
  offered: number;
  end: number;
  outcome: string;
  seen?: Seen;
}
export interface OfferTape {
  nonce: string;
  source: string;
  slot: string;
  scope: string;
  start: number;
  duration: number;
  samples: Offer[];
  ordered: {
    first: number;
    end: number;
    command: string;
    position: number;
    facts: number;
    offer: number;
    ack: number;
    service?: { ms: number; rows: number; bytes: number };
  }[];
  native: { command: string; position: number; recovered?: boolean }[];
}
export interface Measure {
  offered: number;
  ok: number;
  p99Ms: number | null;
  outcomes: Record<string, number>;
}
export function percentile(values: number[], q: number) {
  return values.length
    ? [...values].sort((a, b) => a - b)[Math.ceil(values.length * q) - 1]!
    : null;
}
export function offers(rows: Offer[]): Measure {
  const ok = rows.filter((r) => r.outcome === "verified");
  return {
    offered: rows.length,
    ok: ok.length,
    p99Ms: percentile(
      ok.map((r) => r.end - r.due),
      0.99,
    ),
    outcomes: rows.reduce(
      (m, r) => ((m[r.outcome] = (m[r.outcome] ?? 0) + 1), m),
      {} as Record<string, number>,
    ),
  };
}

// [DX-LOAD2] Why: compare the same scheduled tape and recompute its timing from retained offers.
// Rejected: granting a fast p99 to a cell that made fewer offers, omitted late responses, or changed their pinned workload.
export function replayLive(
  tape: OfferTape,
  attempt: { nonce: string; source: { git: string }; slot: string; mode: string; prefix?: string },
  arm: {
    scope: string;
    arm: string;
    duration: number;
    rate: number;
    neighbors: Record<string, { save: Measure; read: Measure }>;
    facts: number;
    fps: number;
    aboveBudget?: number;
    committedFrames?: number;
    budgetMs?: number;
  },
) {
  if (!/^(load-tail|load-frontier-(low|high|allowance)|load-split-(sql|pg))$/.test(attempt.mode))
    return;
  const prefix = "tx2-ha1-" + attempt.nonce.slice(0, 8);
  assert.deepEqual(
    [tape.nonce, tape.source, tape.slot, tape.scope, tape.duration],
    [attempt.nonce, attempt.source.git, attempt.slot, prefix + "-" + arm.arm, 108000],
  );
  assert.equal(arm.scope, tape.scope);
  assert.equal(arm.duration, tape.duration);
  assert(Number.isFinite(tape.start));
  assert([50, 100].includes(arm.rate));
  if (attempt.mode === "load-tail") assert.equal(arm.rate, 50);
  const alone = arm.arm === "frontier-alone";
  assert(!alone || attempt.mode === "load-frontier-allowance");
  const quiet = (5 * arm.duration) / 1000,
    noisy = alone ? 0 : (arm.rate * arm.duration) / 1000;
  const expected = new Map<string, number>();
  for (let i = 0; i < quiet; i++) {
    expected.set("quiet/read/" + i, i * 200);
    expected.set("quiet/save/" + i, i * 200);
  }
  for (let i = 0; i < noisy; i++)
    expected.set("live" + (i % 10) + "/save/" + i, (1000 * i) / arm.rate);
  if (attempt.mode !== "load-tail" && !alone)
    for (let i = 0; i < quiet * 10; i++) expected.set("live" + (i % 10) + "/read/" + i, i * 20);
  const recorded = new Map(tape.native.map((n) => [n.command, n]));
  assert.equal(recorded.size, tape.native.length);
  const bins = new Map<string, { save: Offer[]; read: Offer[] }>();
  for (const row of tape.samples) {
    const id = row.actor + "/" + row.kind + "/" + row.seq;
    assert.ok(expected.has(id), id);
    assert.equal(row.due, expected.get(id), id);
    expected.delete(id);
    assert(
      Number.isFinite(row.offered) &&
        Number.isFinite(row.end) &&
        row.end >= row.offered &&
        row.offered >= row.due - 5 &&
        row.outcome !== "pending",
      id,
    );
    if (row.kind === "save" && row.outcome === "verified") {
      assert(
        row.seen?.position &&
          recorded.get("save/" + row.actor + "/" + row.seq)?.position === row.seen.position,
      );
    }
    let bin = bins.get(row.actor);
    if (!bin) bins.set(row.actor, (bin = { save: [], read: [] }));
    bin[row.kind].push(row);
  }
  assert.equal(expected.size, 0);
  assert.deepEqual(
    arm.neighbors,
    Object.fromEntries(
      [...bins].map(([actor, b]) => [
        actor,
        {
          save: offers(b.save),
          read: offers(b.read),
        },
      ]),
    ),
  );
  if (!attempt.mode.startsWith("load-split")) {
    let facts = 0;
    for (const row of tape.ordered) {
      assert(
        row.facts > 0 && row.first < row.end && row.offer < arm.duration && row.ack >= row.offer,
      );
      assert.equal(recorded.get(row.command)?.position, row.position);
      if (row.ack <= arm.duration) facts += row.facts;
    }
    assert.equal(arm.facts, facts);
    if (arm.budgetMs !== undefined) {
      for (const row of tape.ordered)
        assert(
          row.service && row.service.ms > 0 && row.service.rows <= 96 && row.service.bytes <= 65536,
        );
      assert.equal(
        arm.aboveBudget,
        tape.ordered.filter((r) => r.service!.ms > arm.budgetMs!).length,
      );
    }
  }
  assert.equal(arm.fps, arm.facts / (arm.duration / 1000));
}
