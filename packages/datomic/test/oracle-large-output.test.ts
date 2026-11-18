import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { expect, it } from "vitest";
import { oracleTimeouts } from "../../../lab/bench/lib/oracle-budget.mjs";
import {
  readBoundedOracleEnvelope,
  requireOracleBinding,
} from "../../../lab/bench/lib/oracle-output.ts";

const caseDoc = { caseId: "large", queries: [{ id: "r0|root", kind: "entityTriples" }] };
const input = JSON.stringify(caseDoc);
const fixture = {
  format: "triplex-db-2/o-replay-expected/1",
  oracle: { id: "O-REPLAY" },
  caseId: caseDoc.caseId,
  caseSha256: createHash("sha256").update(input).digest("hex"),
  verdict: "PASS",
  divergedAtCommand: null,
  receiptConsistency: { status: "PASS", violations: [] },
  commandOutcomes: [],
  state: [{ note: '\n "queries": []' }],
  queries: [{ ...caseDoc.queries[0]!, result: { raw: [] } }],
  rulesInEffect: {},
};
const output = (doc: unknown) => JSON.stringify(doc, null, 1) + "\n";

function read(text: string) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dx-t1-oracle-output-"));
  try {
    const file = path.join(dir, "output.json");
    fs.writeFileSync(file, text);
    return readBoundedOracleEnvelope(file);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

it("keeps every comparison field when the queries header crosses a read block", () => {
  const start = output(fixture).indexOf('\n "queries":');
  const padding = 1024 ** 2 - 2 - start;
  const result = read(output({ ...fixture, state: [{ note: fixture.state[0]!.note + "x".repeat(padding) }] }));
  requireOracleBinding(result, input, caseDoc);
  expect(result.queries).toEqual(fixture.queries);
  expect(result.receiptConsistency).toEqual(fixture.receiptConsistency);
  expect(result).not.toHaveProperty("state");
  expect(() => requireOracleBinding(result, input + " ", caseDoc)).toThrow(/bound/);
});

it("refuses a truncated, duplicate or incomplete envelope and an incomplete query set", () => {
  const text = output(fixture);
  expect(() => read(text.slice(0, -4))).toThrow(/framing/);
  expect(() => read(text.replace('\n "queries":', '\n "state":'))).toThrow(/field/);
  expect(() => read(output({ ...fixture, queries: undefined }))).toThrow(/field|incomplete/i);
  expect(() => requireOracleBinding(read(output({ ...fixture, queries: [] })), input, caseDoc))
    .toThrow(/coverage/);
});

it("reserves transport time after the regular and large independent replay deadlines", () => {
  const regular = oracleTimeouts(128 * 1024 ** 2);
  const large = oracleTimeouts(128 * 1024 ** 2 + 1);
  expect(regular.runMs).toBe(900_000);
  expect(large.runMs).toBe(1_800_000);
  for (const { runMs, bridgeMs, clientMs } of [regular, large]) {
    expect(bridgeMs - runMs).toBe(30_000);
    expect(clientMs - bridgeMs).toBe(30_000);
  }
});
