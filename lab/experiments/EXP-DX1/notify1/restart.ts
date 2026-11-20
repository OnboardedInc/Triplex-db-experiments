import assert from "node:assert/strict";
import fs from "node:fs";
import { openComposition } from "../../../bench/lib/composition.ts";
import { Fixture } from "./fixture.ts";
import { Notices, type Cut } from "./journal.ts";
import { Documents } from "./store.ts";
import { Dispatcher } from "./dispatcher.ts";
import { Relay } from "./relay.ts";
import { recipient } from "./worker.ts";

const input = JSON.parse(fs.readFileSync(0, "utf8")),
  { scope, nonce, subject, erased, action } = input;
assert(
  (action === "recipient-page"
    ? scope === "notice-relay-" + nonce
    : /^notify-[0-9a-f-]+$/.test(scope)) &&
    nonce &&
    Number.isSafeInteger(erased),
);
const comp = await openComposition("reach", "datomic", scope),
  sink =
    action === "recipient-page"
      ? await recipient("act1-notify-" + nonce, process.env.NOTIFY_DIR!)
      : await openComposition("reach", "datomic", scope + "-sink");
try {
  const fixture = new Fixture(comp);
  const account = new Notices(comp, "account", {
    identity: fixture.identity,
    roster: (c) => fixture.roster(c),
    worlds: (ids: string[], c: Cut) => {
      assert(
        !(ids.includes(subject) && c.position < erased),
        "Protected historical input unavailable",
      );
      return fixture.worlds(ids, c);
    },
  });
  const dispatch = new Dispatcher(account, new Documents(sink, "sink"));
  if (action === "recipient-page") {
    assert.equal((await account.observe()).value.epoch, nonce);
    assert(await new Relay(account, new Documents(sink, "effects"), 2).turn({}));
  } else if (action === "effect-before-ack") {
    await assert.rejects(
      dispatch.drain({
        afterReceive: async () => {
          throw Error("drop reply");
        },
      }),
      /drop reply/,
    );
  } else {
    assert.equal(action, "finish");
    await dispatch.drain();
  }
  console.log(
    JSON.stringify({
      scope,
      nonce,
      action,
      position: await account.db.head(),
      receiver: await sink.currentPosition(),
    }),
  );
} finally {
  await comp.close();
  await sink.close();
}
