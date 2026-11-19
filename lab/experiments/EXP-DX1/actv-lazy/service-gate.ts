import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { W0, canonical, triplexValue } from "../../../bench/lib/w0-world.ts";
import { openStore, fact, activation } from "./store.ts";
import { rosterRoot, rosterSeal } from "./read.ts";
import { Dispatcher, Receiver } from "./dispatch.ts";
import { NoticeService } from "./service.ts";
const dir = process.argv[2]!,
  s = await openStore("lazy-service-" + randomUUID()),
  person = "pl:idle",
  doc = person + "/doc:one",
  at = W0.POPULATION_VALID_TIME;
const add = (e: string, a: string, v: string) => ({
  op: "assert",
  entityId: e,
  attribute: a,
  value: triplexValue(a, v),
  validFrom: 0,
});
const first = await s.input("start", { kind: "baseline", at }, [
  fact(rosterRoot(0), "lazy/members", [person]),
  fact("members/seal", "lazy/roster-seal", rosterSeal([person])),
  add(person, "bgcStatus", "clear"),
  add(person, "documents", doc),
  add(doc, "docType", "ead"),
  add(doc, "expiresOn", "2026-11-04"),
]);
const receiver = new Receiver(join(dir, "offline-recipient.sqlite"), s.scope, first.txId);
let now = at,
  service = new NoticeService(s, receiver, "w0", () => now);
try {
  await service.activate("first", W0.R1, at);
  await service.settled();
  assert.equal(receiver.effects().length, 0);
  await service.close();
  await activation(s, "unwoken", W0.R2, at, "2026-11-05T00:00:00.000000Z");
  now = "2026-11-05T00:00:01.000000Z";
  service = new NoticeService(s, receiver, "w0", () => now);
  service.wake();
  await service.settled();
  assert.deepEqual(
    receiver.effects().map((x) => [x.kind, String(x.seq)]),
    [["notify.document-expired", "1"]],
  );
  const cut = await s.head();
  await service.settled();
  assert.equal(await s.head(), cut);
  const protectedScope = await openStore("lazy-eligibility-" + randomUUID()),
    guard = new Dispatcher(protectedScope);
  try {
    await protectedScope.input("person", { kind: "baseline", at }, [
      fact(rosterRoot(0), "lazy/members", [person]),
      fact("members/seal", "lazy/roster-seal", rosterSeal([person])),
      add(person, "ssn", "000000000"),
    ]);
    await guard.drain();
    await activation(protectedScope, "release", W0.R1, at);
    const prior = await protectedScope.head();
    await assert.rejects(guard.drain(), /ProtectedSubscriberNeedsRuling/);
    assert.equal(await protectedScope.head(), prior);
  } finally {
    guard.close();
    await protectedScope.close();
  }
  writeFileSync(
    join(dir, "idle-service.json"),
    canonical({
      scope: s.scope,
      cut,
      effects: receiver.effects().map((x) => [x.id, String(x.seq)]),
    }) + "\n",
    { flag: "wx" },
  );
} finally {
  await service.close();
  receiver.close();
  await s.close();
}
