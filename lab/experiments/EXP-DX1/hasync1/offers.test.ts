import assert from "node:assert/strict";
import test from "node:test";
import { hash } from "../ha1/common.ts";
import { recountTraffic, summarizeOffers } from "./offers.ts";

test("recount keeps interrupted, late and sent offers separate and rejects a forged outcome", () => {
  const source = {
    git: "head",
    experiment: "script",
    gateway: "server",
    codec: "codec",
    client: "peer",
    core: "core",
  };
  const identity = { nonce: "605c3118-1541-445f-be6b-766adec3dd87", slot: "obs", database: "db" };
  const plan = {
    format: "field-offers/2" as const,
    ...identity,
    source,
    label: "field",
    start: 100,
    rates: { save: 5, read: 50 },
    callerMs: 1000,
    requestMs: 5500,
    horizonMs: 90000,
  };
  const receipt = {
    operationId: "scope-field-save-2",
    position: { t: "long", v: "1" },
    t: { t: "long", v: "1000" },
    recordedAt: { t: "double", v: 10 },
  } as const;
  const stop = { stopAt: 511, marks: { fault: 275, routed: 480 } };
  const rows: Parameters<typeof summarizeOffers>[1] = [
    {
      key: "field-save-0",
      kind: "save",
      ordinal: 0,
      due: 100,
      called: null,
      sent: null,
      finished: 105,
      result: "refused",
      code: "sender-cap",
    },
    {
      key: "field-save-1",
      kind: "save",
      ordinal: 1,
      due: 300,
      called: 301,
      sent: 305,
      finished: 1400,
      result: "timed-out",
      code: "Transport",
    },
    {
      key: "field-save-2",
      kind: "save",
      ordinal: 2,
      due: 500,
      called: 501,
      sent: 502,
      finished: 505,
      result: "acknowledged",
      receipt,
    },
    ...Array.from({ length: 21 }, (_, ordinal) => {
      const due = 100 + 20 * ordinal;
      return {
        key: "field-read-" + ordinal,
        kind: "read" as const,
        ordinal,
        due,
        called: due,
        sent: null,
        finished: ordinal === 10 ? due + 1100 : due + 1,
        result: ordinal === 10 ? ("answered-late" as const) : ("acknowledged" as const),
      };
    }),
  ];
  const line = (stage: string, data: unknown) => JSON.stringify({ ...identity, stage, data });
  const records = [
    line("plan", plan),
    ...rows.flatMap((row) => [
      line("offer", {
        key: row.key,
        kind: row.kind,
        ordinal: row.ordinal,
        due: row.due,
        ...(row.kind === "save" ? { inputSha256: hash(row.key) } : { pin: receipt }),
      }),
      line("outcome", row),
    ]),
    line("stop", stop),
  ];
  const raw = records.join("\n") + "\n";
  const timing = {
    ...summarizeOffers(plan, rows, stop.stopAt, stop.marks),
    raw: "traffic-field.jsonl",
    sha256: hash(raw),
  };
  const actual = recountTraffic(raw, timing, { ...identity, source });
  assert.equal(actual.read["answered-late"], 1);
  assert.equal(actual.during["timed-out"], 1);
  assert.equal(actual.neverCalled, 1);
  assert.equal(actual.faultToNewWriteMs, 230);
  assert.equal(actual.maxReadGapMs, 40);
  assert.deepEqual(actual.unavailable?.longest, { from: 300, to: 500, ms: 200 });
  const tampered = raw.replace('"result":"timed-out"', '"result":"refused"');
  assert.throws(() =>
    recountTraffic(tampered, { ...timing, sha256: hash(tampered) }, { ...identity, source }),
  );
  assert.throws(() => recountTraffic(raw, timing, { ...identity, slot: "wrong", source }));
});
