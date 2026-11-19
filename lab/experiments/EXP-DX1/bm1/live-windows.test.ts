import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { mapW0Trace } from "../../../bench/lib/w0-trace.ts";
import { W0 } from "../../../bench/lib/w0-world.ts";
import type { TraceEvent } from "../../../bench/lib/trace.ts";

test("repeating a live command across windows preserves a valid W0 world and within-window retry identity", () => {
  const event: TraceEvent = {
    seq: 2299, subject: 6011, atMs: 159750, facts: 12, kind: "agent", correction: true,
    ackLoss: false, resend: false, burst: true, active: true, stream: "background",
  };
  const baseline = mapW0Trace(event, "baseline");
  const sweep = mapW0Trace(event, "sweep");
  const repeated = mapW0Trace({ ...event, resend: true }, "baseline");
  const old = mapW0Trace(event);
  assert.deepEqual(baseline, repeated);
  assert.equal(sweep.validFrom, baseline.validFrom);
  assert.equal(sweep.commandId, baseline.commandId);
  assert.equal(baseline.rows.length, event.facts);
  assert.equal(sweep.rows.length, event.facts);
  const subject = W0.placementId(event.subject);
  const evaluate = (windows: typeof baseline[]) => {
    const facts = windows.flatMap((w, i) => w.rows.map(([e, a, v]) => ({ e, a, v, tx: i + 1 })));
    const input = { basis: { tx: 2, validTime: W0.POPULATION_VALID_TIME }, release: "R1", world: { subject, facts } };
    const oracle = spawnSync("python3", ["-I", "lab/oracles/domain/cli.py", "evaluate", "-"], {
      input: JSON.stringify(input), encoding: "utf8",
    });
    assert.equal(oracle.status, 0, oracle.stderr);
    return JSON.parse(oracle.stdout);
  };
  assert.deepEqual(evaluate([old, old]), { error: "W0.E_CARDINALITY" });
  assert.equal(evaluate([baseline, sweep]).subject, subject);
});
