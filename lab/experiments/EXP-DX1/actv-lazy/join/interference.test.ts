import assert from "node:assert/strict";
import test from "node:test";
import { buildTraceCommand } from "../../../../bench/lib/commands.ts";
import { generateTrace } from "../../../../bench/lib/trace.ts";
import { ids } from "../../../../bench/lib/world.ts";
import { W0, type WorldRow } from "../../../../bench/lib/w0-world.ts";
import { valid } from "../fixture.ts";
import { Reference } from "./check.ts";
import { authoredSeed, expectedPolicy } from "./deep-reference.ts";

test("fixed writer commands leave the independent W0 answers unchanged at the same cut", async () => {
  const events = generateTrace({ seed: "ns-v2", subjects: 128, durationS: 5910 });
  const ref = new Reference();
  const candidate = structuredClone(W0.R2.doc);
  Object.assign(candidate.rules.find((rule) => rule.id === "I9S2")!, {
    params: { businessDays: 5 },
  });
  try {
    for (const kind of ["person", "system", "agent", "runtime"]) {
      for (const correction of [false, true]) {
        const event = events.find(
          (e) => e.kind === kind && e.correction === correction && !e.resend,
        );
        assert(event);
        const i = event.subject;
        const prior = authoredSeed(i, 1);
        const stamp = prior.find(
          (r) => r.entityId === ids.placement(i) && r.attribute === ":placement/stamp",
        );
        const address = prior.find(
          (r) => r.entityId === ids.worker(i) && r.attribute === ":worker/address",
        );
        assert(stamp && address);
        const command = buildTraceCommand({
          runTag: "frozen",
          event,
          scheduledAbsMs: Date.parse(valid),
          state: {
            stamp: Number(stamp.value.value),
            stampId: stamp.id,
            stampValidFrom: stamp.validFrom,
            address: String(address.value.value),
            addressId: address.id,
            addressValidFrom: address.validFrom,
          },
        });
        const retired = new Set(
          command.operations.filter((op) => op.op === "retract").map((op) => op.id),
        );
        const changed: WorldRow[] = prior.filter((row) => !retired.has(row.id));
        for (const [index, entry] of command.added.entries()) {
          changed.push({
            id: "authored-change:" + index,
            entityId: entry.e,
            attribute: entry.a,
            value: entry.v,
            position: 2,
            validFrom: command.addedValidFrom[index]!,
          });
        }
        const worlds = [prior, changed].map((rows) => expectedPolicy(i, rows));
        // [DX-ACT1] Why: compare complete oracle bytes at one common cut after applying real trace inputs. Rejected: inferring that a correction or stamp is absent from the policy world.
        assert.notDeepEqual(worlds[0], worlds[1]);
        for (const document of [W0.R1.doc, candidate]) {
          const [before, after] = JSON.parse(
            await ref.oracle.call("check", {
              document,
              old: null,
              basis: { tx: 2, validTime: valid },
              worlds,
              fold: false,
            }),
          );
          assert.equal(after.json, before.json);
        }
      }
    }
  } finally {
    ref.oracle.close();
  }
});
