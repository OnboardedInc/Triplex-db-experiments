import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { W0, canonical, triplexValue } from "../../../bench/lib/w0-world.ts";
import { parseOutbox } from "../../../bench/lib/w0-outbox-state.ts";
import { Dispatcher } from "./dispatch.ts";
import { activation, openStore, fact } from "./store.ts";
import { pendingRoot, progress } from "./decision.ts";
import { LazyReader, rosterRoot, rosterSeal } from "./read.ts";
const dir = process.argv[2]!,
  id = randomUUID(),
  s = await openStore("lazy-due-" + id),
  at = W0.POPULATION_VALID_TIME,
  due = "2026-11-05T00:00:00.000000Z",
  later = "2026-11-06T01:00:00.000000Z",
  person = "pl:night",
  doc = person + "/doc:d";
let d = new Dispatcher(s);
const events: any[] = [];
const add = (e: string, a: string, v: any) => ({
  op: "assert",
  entityId: e,
  attribute: a,
  value: triplexValue(a, v),
  validFrom: 0,
});
try {
  const seed = await s.input("data", { kind: "baseline", at }, [
    fact(rosterRoot(0), "lazy/members", [person]),
    add(person, "documents", doc),
    add(doc, "docType", "ead"),
    add(doc, "expiresOn", "2026-11-04"),
    add(person, "bgcStatus", "clear"),
    fact("members/seal", "lazy/roster-seal", rosterSeal([person])),
  ]);
  await activation(s, "r1", W0.R1, at);
  await activation(s, "scheduled", W0.R2, at, due);
  await d.drain();
  const unpaid = await s.head();
  const atMidnight = await new LazyReader(s, "w0", 1024, () => due).readAt(person);
  assert(
    JSON.parse(atMidnight.json).workItems.some((w: any) => w.kind === "notify.document-expired"),
  );
  assert.equal(await s.head(), unpaid);
  d.close();
  d = new Dispatcher(s);
  const correction = await s.input("next-day", { kind: "source", at: later }, [
    { op: "retract", id: seed.changes[3].tripleId },
    add(doc, "expiresOn", "2026-12-12"),
  ]);
  await d.drain((r) =>
    events.push({
      reason: r.reason,
      cut: r.receipt.correlationId,
      event: r.event,
      delivered: r.deliveries.map((x) => x.kind),
    }),
  );
  const debts = (await s.rows([pendingRoot(person)], await s.head())).map((r) =>
    parseOutbox(r.value.value),
  );
  assert.deepEqual(
    debts.map((x) => x.kind),
    ["notify.document-expired"],
  );
  assert(
    events.some(
      (r) =>
        r.reason.startsWith("business-boundary/") &&
        r.delivered.includes("notify.document-expired") &&
        JSON.parse(r.cut).context.cut === correction.position - 1,
    ),
  );
  const wake = await d.wakeDue("2026-12-13T01:00:00.000000Z");
  assert(wake);
  await d.drain();
  const after = (await s.rows([pendingRoot(person)], await s.head())).map((r) =>
    parseOutbox(r.value.value),
  );
  assert.deepEqual(after.map((x) => String(x.seq)).sort(), ["1", "2"]);
  const start = await s.head();
  assert.equal(await d.wakeDue("2026-12-13T01:00:00.000000Z"), undefined);
  assert.equal(await s.head(), start);
  await s.input("protected", { kind: "source", at: "2026-12-14T00:00:00.000000Z" }, [
    add(person, "ssn", "000000000"),
  ]);
  await s.input("erase", {
    kind: "erase",
    at: "2026-12-14T01:00:00.000000Z",
    subject: person,
    attribute: "ssn",
  });
  const before = progress(await s.controls(await s.head()));
  await assert.rejects(d.step(), /UnrecoverableProtectedEvent/);
  assert.deepEqual(progress(await s.controls(await s.head())), before);
  writeFileSync(
    join(dir, "due-erasure.json"),
    canonical({
      id,
      scope: s.scope,
      events,
      cut: start,
      owed: after.map((x) => ({ id: x.id, seq: String(x.seq) })),
      blocked: before,
    }) + "\n",
    { flag: "wx" },
  );
} finally {
  d.close();
  await s.close();
}
