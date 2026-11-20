import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { W0, sha256, triplexValue } from "../../../../bench/lib/w0-world.ts";
import { Documents } from "../../notify1/store.ts";
import { fact, openStore } from "../store.ts";
import { rosterRoot, rosterSeal } from "../read.ts";
import { JoinedAccount } from "./account.ts";
import { deadlines } from "./deadline.ts";
import { Reference } from "./check.ts";

const start = "2026-11-04T23:59:59.998000Z",
  boundary = "2026-11-05T00:00:00.000000Z";
const s = await openStore("lazy-clock-gate-" + randomUUID()),
  sink = await openStore("lazy-clock-sink-" + randomUUID());
const a = new JoinedAccount(s),
  o = new Reference();
const ids = ["pl:deadline"],
  doc = ids[0]! + "/doc:d";
const input: [string, string, string][] = [
  [ids[0]!, "documents", doc],
  [doc, "docType", "ead"],
  [doc, "expiresOn", "2026-11-04"],
];
let now = start,
  wake: (() => void) | undefined,
  waits: number[] = [];
try {
  const initial = await s.input("origin-clock", { kind: "baseline", at: start }, [
    fact(rosterRoot(0), "lazy/members", ids),
    fact("members/seal", "lazy/roster-seal", rosterSeal(ids)),
    ...input.map(([e, a, v]) => ({
      op: "assert",
      entityId: e,
      attribute: a,
      value: triplexValue(a, v),
      validFrom: 0,
    })),
  ]);
  const world = () => ({
    subject: ids[0]!,
    facts: input.map(([e, a, v]) => ({ e, a, v, tx: initial.position })),
  });
  await a.install(ids, start);
  const first = await a.publish("initial", W0.R1.doc, start, "owed");
  await o.check(a, ids, world, W0.R1.doc, { tx: first.position, validTime: start }, null, 1);
  const svc = deadlines(
    a,
    () => now,
    (ms, timer) => {
      waits.push(ms);
      wake = timer;
      return () => {
        wake = undefined;
      };
    },
  );
  try {
    await svc.settled();
    assert(wake && waits.length === 1 && waits[0]! > 0 && waits[0]! < 3);
    assert.equal(await s.head(), first.position);
    now = boundary;
    wake();
    await svc.settled();
  } finally {
    await svc.close();
  }
  const due = await s.lookup("joined:deadline/" + sha256(boundary));
  assert(due && due.position === first.position + 1);
  const reopen = await openStore(s.scope);
  try {
    const recovered = new JoinedAccount(reopen),
      restarted = deadlines(recovered, () => boundary);
    await restarted.settled();
    await restarted.close();
    assert.equal(await s.head(), due.position);
    const expected = await o.check(
      recovered,
      ids,
      world,
      W0.R1.doc,
      { tx: due.position, validTime: boundary },
      W0.R1.doc,
    );
    const observed = (await recovered.notices.event(2, due.position)).value;
    assert(observed.kind === "reconcile" && observed.validTime === boundary);
    const dispatch = recovered.dispatcher(new Documents(sink.comp, "sink"));
    await dispatch.drain();
    const received = await o.receiver(recovered, dispatch);
    assert.equal(
      (await dispatch.effects()).filter((d) => d.kind === "notify.document-expired").length,
      1,
    );
    writeFileSync(
      join(process.argv[2]!, "idle-deadline.json"),
      JSON.stringify(
        {
          scope: s.scope,
          initial: initial.txId,
          before: first.txId,
          due: due.txId,
          at: boundary,
          expected,
          received,
        },
        null,
        2,
      ) + "\n",
      { flag: "wx" },
    );
  } finally {
    await reopen.close();
  }
} finally {
  o.oracle.close();
  await sink.close();
  await s.close();
}
