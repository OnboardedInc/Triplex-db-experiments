import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { hash, root, runFile, type Evidence } from "../ha1/common.ts";
import type { Account, Receipt } from "../ha1/one-db.ts";

type Witness = {
  id: string;
  entityId: string;
  attribute: string;
  value: { type: string; value: string };
  validFrom: number;
  validTo: number | null;
  recordedPosition: number;
  recordedAt: number;
  txId: string | null;
};

export async function replayEvidence(
  e: Evidence,
  ac: Account,
  selected: typeof ac.inputs,
  label?: string,
) {
  assert(selected.length && selected.every((input) => input.rows.length));
  const receipts = selected.map((input) => ac.receipts.get(input.operationId)!);
  assert(receipts.every((r) => r && Number.isSafeInteger(Number(r.position.v))));
  const ids = [...new Set(selected.flatMap((v) => v.rows.map((r) => r.entity_id)))];
  const sorted = (rows: Witness[]) => rows.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const input = {
    format: "triplex-db-2/o-replay-case/1",
    caseId: [e.nonce, e.mode, label].filter(Boolean).join("/"),
    defaultScope: "witness",
    adapter: { schemaVersion: 1 },
    initialPositions: { witness: Number(receipts[0]!.position.v) - 1 },
    commands: selected.map((command) => {
      const newIds = new Set(command.newIds);
      const rows = command.rows;
      return {
        clock: command.claims[0]!.timestamp,
        meta: { commandId: command.claims[0]!.commandId, actor: "lab" },
        // [DX-HASYNC1] Why: replay the authored retirement before asserting its replacement. Rejected: comparing two snapshots of the recovered database.
        operations: [
          ...rows.filter((r) => !newIds.has(r.id)).map((r) => ({ op: "retract", target: r.id })),
          ...rows
            .filter((r) => newIds.has(r.id))
            .map((r) => ({
              op: "assert",
              ref: r.id,
              entityId: r.entity_id,
              entityType: r.entity_type,
              attribute: ":" + r.attribute,
              value: { type: "string", value: r.value_string },
              validFrom: r.valid_from,
            })),
        ],
      };
    }),
    receipts: selected.map((command, i) => ({
      command: i,
      outcome: "committed",
      position: Number(receipts[i]!.position.v),
      instant: receipts[i]!.recordedAt.v,
      txId: command.claims[0]!.txId,
      assertionIds: command.newIds,
    })),
    queries: receipts.map((r, i) => ({
      id: "cut-" + i,
      kind: "match",
      cut: { position: Number(r.position.v), validAt: 10 },
      pattern: {},
    })),
  };
  const name = label ? label + "-oracle" : "oracle";
  e.write(name + "-case", input);
  const casePath = path.join(e.dir, name + "-case.json");
  const observedPath = path.join(e.dir, name + "-expected.json");
  await runFile("python3", ["-IB", "lab/oracles/replay/cli.py", casePath, "-o", observedPath], {
    cwd: root,
    timeout: 30000,
  });
  const bytes = fs.readFileSync(observedPath);
  const output = JSON.parse(bytes.toString());
  assert.equal(output.caseId, input.caseId);
  assert.equal(output.caseSha256, hash(fs.readFileSync(casePath)));
  assert.equal(output.oracle.id, "O-REPLAY");
  assert.equal(output.verdict, "PASS");
  assert.equal(output.receiptConsistency.status, "PASS");
  assert.equal(output.queries.length, receipts.length);
  const observed: { pin: Receipt; digest: string; rows: number }[] = [];
  for (const [i, r] of receipts.entries()) {
    const rows = await ac.r.rows(ac.db, {
      entityIds: ids,
      basis: {
        recordedPosition: Number(r.position.v),
        validAt: 10,
      },
      basisT: r.t.v,
    });
    const actual = sorted(
      rows.map((v) => ({
        id: v.id,
        entityId: v.entity_id,
        attribute: ":" + v.attribute,
        value: { type: v.value_type, value: v.value_string! },
        validFrom: v.valid_from,
        validTo: v.valid_to,
        recordedPosition: v.recorded_position,
        recordedAt: v.recorded_at,
        txId: v.tx_id,
      })),
    );
    assert.equal(output.queries[i].id, "cut-" + i);
    const expected = sorted(
      (output.queries[i].result.raw as Witness[]).map(
        ({
          id,
          entityId,
          attribute,
          value,
          validFrom,
          validTo,
          recordedPosition,
          recordedAt,
          txId,
        }) => ({
          id,
          entityId,
          attribute,
          value,
          validFrom,
          validTo,
          recordedPosition,
          recordedAt,
          txId,
        }),
      ),
    );
    assert.deepEqual(actual, expected);
    observed.push({ pin: r, digest: hash(JSON.stringify(actual)), rows: actual.length });
  }
  return {
    case: input.caseId,
    commandCount: selected.length,
    source: output.oracle.sourceSha256,
    output: hash(bytes),
    cuts: observed,
  };
}
