// [EXP-QH1] Why: real frame bytes enter the actual eval worker; isolated owned stores retain failures.
// Rejected: an in-memory model of the candidate SQL and codec.
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { TripleRow } from "@triplex-build/triplex/runtime";
import { HostLog } from "../../../packages/qlever/src/broker/log.js";
import { encodeCommitGroup } from "../../../packages/qlever/src/broker/frames.js";
import { FrameKind } from "../../../packages/qlever/src/broker/frame.js";
export const base = process.env.QH1_RESULT
  ? path.dirname(process.env.QH1_RESULT)
  : path.resolve("runs/QH1");
export const fresh = () => path.join(base, randomUUID());
export const row = (i: number, entity = "s:0", pos = 2048): TripleRow => ({
  id: i.toString(32).toUpperCase().padStart(26, "0"),
  entity_id: entity,
  attribute: ":x/value",
  value_type: "number",
  value_string: null,
  value_number: i,
  value_boolean: null,
  value_datetime: null,
  value_json: null,
  recorded_at: 100,
  recorded_position: pos,
  valid_from: 0,
  valid_to: null,
  created_by: null,
  retracted_at: null,
  retracted_position: null,
  retract_tx_id: null,
  entity_type: null,
  schema_version: 1,
  tx_id: "tx:" + pos,
});
export const append = async (log: HostLog, rows: readonly TripleRow[]) => {
  const lsn = log.nextLsn;
  await log.append(
    FrameKind.COMMIT_GROUP,
    encodeCommitGroup({
      v: 1,
      stream: "QH1",
      lsn,
      epoch: log.epoch,
      members: [
        {
          operationId: randomUUID(),
          attemptId: randomUUID(),
          positions: [Math.max(...rows.map((r) => r.retracted_position ?? r.recorded_position))],
          claims: [],
          rows,
          priors: [],
          subjects: [...new Set(rows.map((r) => r.entity_id))],
        },
      ],
    }),
  );
};
