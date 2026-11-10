import { expect, it } from "vitest";
import { publishChanged } from "./w0-replica.ts";
import type { CompositionHandle } from "./composition.ts";
import { W0, canonical } from "./w0-world.ts";
// [DX-R1] Why: independent fixture expectations distinguish stable payload, replacement, retirement and new work.
// Rejected: generating the expected difference set by calling the implementation's filter again.
it("publishes only new, changed or retired work, in frames of at most 64", async () => {
  const subjects = Array.from({ length: 130 }, (_, i) => "s" + i);
  const records = subjects.map(
    (subject): W0.EvaluationRecord => ({
      subject,
      release: "R2",
      basis: { tx: 20n, validTime: "2026-11-04T12:00:00Z" },
      workItems: [
        {
          id: subject + ":item",
          key: "k",
          kind: "create",
          payload: '{"value":2}',
          rule: "OT",
          version: "v2",
        },
      ],
    }),
  );
  records[1] = { ...records[1], workItems: [] };
  const submitted: string[][] = [];
  const comp = {
    currentPosition: async () => 21,
    sweepPage: async (ids: string[]) => ({
      rows: ids
        .filter((id) => !id.endsWith(":s2"))
        .map((entityId) => {
          const subject = entityId.slice("p5:outbox:".length);
          return {
            entityId,
            attribute: "p5/state",
            value: {
              type: "string",
              value: canonical({
                items: [
                  {
                    id: subject + ":item",
                    payload: subject === "s0" || subject === "s1" ? '{"value":1}' : '{"value":2}',
                    retired: false,
                    seq: 1n,
                    subject,
                  },
                ],
                pending: [],
                subjects: [{ subject, basis: { tx: 1n, validTime: "2026-11-04T12:00:00Z" } }],
              }),
            },
          };
        }),
    }),
    publishOutbox: async (rs: W0.EvaluationRecord[]) => {
      submitted.push(rs.map((r) => r.subject));
      return { deliveries: [], retry: false };
    },
  } as unknown as CompositionHandle;
  const result = await publishChanged(comp, records);
  expect(result.changed).toBe(3);
  expect(result.commits).toBe(1);
  expect(submitted).toEqual([["s0", "s1", "s2"]]);
});
