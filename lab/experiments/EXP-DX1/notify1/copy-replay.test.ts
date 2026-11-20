import assert from "node:assert/strict";
import { test } from "node:test";
import { memoryComposition } from "../../../bench/lib/memory.ts";
import { W0 } from "../../../bench/lib/w0-world.ts";
import { wageRangeMember } from "./copy-plan.ts";
import { Notices, type Inputs, type Request } from "./journal.ts";
import { Relay } from "./relay.ts";
import { Documents, transportHash } from "./store.ts";
import { verify } from "./verify.ts";

test("a copied release survives a lost reply and reopens without its local copy", async () => {
  const source = memoryComposition("datomic", "copy-replay");
  const recipient = memoryComposition("datomic", "copy-replay-recipient");
  const validTime = W0.POPULATION_VALID_TIME;
  const ids = Array.from({ length: 80 }, (_, i) => W0.placementId(i));
  const input: Inputs = {
    identity: "copy-replay-worlds",
    async roster() {
      return ids;
    },
    async worlds(subjects) {
      return subjects.map((subject) => ({
        subject,
        facts: [
          { e: subject, a: "location", v: "loc:a", tx: 1 },
          { e: subject, a: "payRateCents", v: subject === ids.at(-1) ? 1900 : 1700, tx: 1 },
          { e: subject, a: "bgcStatus", v: "clear", tx: 1 },
          { e: "loc:a", a: "jurisdiction", v: "jur:a", tx: 1 },
          { e: "loc:a", a: "localMinWageCents", v: 1800, tx: 1 },
          { e: "jur:a", a: "stateMinWageCents", v: 1650, tx: 1 },
        ],
      }));
    },
  };
  const inputs: Inputs = {
    ...input,
    releaseCopy: {
      async suggest(notices, event) {
        if (event.value.next !== "R2") return;
        const previous = await notices.event(event.value.sequence - 1, event.at - 1);
        const r = (await source.feedPage(event.at - 1, 1)).transactions[0];
        assert.equal(r.position, event.at);
        const selected = (await input.worlds(ids, { position: event.at, validTime }))
          .filter(wageRangeMember)
          .map((w) => w.subject);
        return {
          parent: previous.id,
          txId: r.txId,
          edits: transportHash(r.changes),
          ids: selected,
          evaluated: 0,
        };
      },
      results() {
        return undefined;
      },
    },
  };
  const a = new Notices(source, "account", inputs);
  const sink = new Documents(recipient, "effects");
  const sender = new Relay(a, sink, 1);
  await sender.create("replay", validTime);
  const history = [];
  for (const release of ["R1", "R2"] as const) {
    const req: Request = {
      kind: "activation",
      id: release,
      selection: { kind: "census" },
      release,
      from: validTime,
      validTime,
    };
    history.push({ req, receipt: await a.append(await a.observe(), req) });
  }
  await sender.drain({ through: 1 });
  await assert.rejects(
    sender.turn({
      afterReceive: async () => {
        throw Error("lost reply");
      },
    }),
    /lost reply/,
  );
  assert.equal((await sender.effects()).length, 64);
  const reopened = new Relay(new Notices(source, "account", input), sink, 1);
  await reopened.drain();
  const proof = await verify(reopened, ids, history, input.worlds);
  assert.deepEqual(proof.eventCounts, [0, 79]);
});
