import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { W0, sha256 } from "../../../../bench/lib/w0-world.ts";
import { Documents } from "../../notify1/store.ts";
import { openStore } from "../store.ts";
import { seed, valid } from "../fixture.ts";
import { Reference } from "./check.ts";
import { JoinedAccount } from "./account.ts";
import { rawDeep, replaceDeep } from "./deep.ts";
import { ids as deepIds } from "../../../../bench/lib/world.ts";
import { integer } from "../../../../bench/lib/deep-world.ts";
import { millis } from "../store.ts";
import { stageActor } from "./staging.ts";

const s = await openStore("lazy-stage-gate-" + randomUUID(), "act2-deep"),
  other = await openStore(s.scope, "act2-deep"),
  target = await openStore("lazy-stage-sink-" + randomUUID());
const a = new JoinedAccount(s),
  b = new JoinedAccount(other),
  o = new Reference();
const opts = { sources: "indexed", workers: 2 } as const;
const change = (limit: number, name: W0.ReleaseDoc["name"] = "R1") => {
  const d: W0.ReleaseDoc = { ...structuredClone(W0.R1.doc), name };
  Object.assign(d.rules.find((r) => r.id === "OT")!, { params: { thresholdMinutes: limit } });
  return d;
};
const high = change(4700),
  low = change(1),
  lookalike = change(4700, "R2"),
  same = change(1, "R3");
function kill(id: string, document: W0.ReleaseDoc, stop: "chunk" | "receipt") {
  const r = spawnSync(
    process.execPath,
    ["--experimental-strip-types", new URL("./stage-child.ts", import.meta.url).pathname],
    {
      input: JSON.stringify({ scope: s.scope, id, document, at: valid, options: opts, stop }),
      encoding: "utf8",
      timeout: 120000,
    },
  );
  assert.equal(r.signal, "SIGKILL", r.stderr);
}
try {
  const f = await seed(s, 12),
    traces: Record<string, unknown>[] = [];
  await a.install(f.roster, valid, true);
  const origin = await a.publish("initial", high, valid, "owed");
  let previous: W0.ReleaseDoc | null = null;
  let sequence = 0;
  async function verify(r: typeof origin, doc: W0.ReleaseDoc) {
    const proof = await o.check(
      a,
      f.roster,
      f.world,
      doc,
      { tx: r.position, validTime: valid },
      previous,
      ++sequence,
    );
    traces.push({
      position: r.position,
      receipt: r.txId,
      command: r.commandId,
      hash: W0.compileRelease(doc).hash,
      ...proof,
    });
    previous = doc;
    return proof;
  }
  await verify(origin, high);
  kill("restart-stage", low, "chunk");
  assert.equal(await s.lookup("joined:restart-stage"), null);
  await assert.rejects(a.physical(sequence + 1), /Missing durable/);
  const documents = (await s.comp.feedPage(origin.position, 16)).transactions;
  const aborted = documents.find((t) => t.actor === stageActor);
  assert(aborted && !documents.some((t) => t.actor === "lazy/join"));
  const abandoned = JSON.parse(aborted.correlationId).context.attempt;
  const nonce = randomUUID(),
    coldSubject = f.roster.at(-1)!;
  const [ready, cold] = execFileSync(
    process.execPath,
    ["--experimental-strip-types", new URL("../timing-worker.ts", import.meta.url).pathname],
    {
      input:
        [
          { scope: s.scope, format: "act2-deep", valid, nonce, path: "shared-cut" },
          { subject: coldSubject, nonce },
          { close: true },
        ]
          .map((x) => JSON.stringify(x))
          .join("\n") + "\n",
      encoding: "utf8",
      timeout: 120000,
    },
  )
    .trim()
    .split("\n")
    .map((x) => JSON.parse(x));
  assert(
    ready.nonce === nonce &&
      ready.scope === s.scope &&
      cold.nonce === nonce &&
      cold.subject === coldSubject,
  );
  const [coldAnswer] = JSON.parse(
    await o.oracle.call("check", {
      document: high,
      old: null,
      basis: cold.basis,
      worlds: [f.world(f.n - 1)],
      fold: false,
    }),
  );
  assert.equal(cold.json, coldAnswer.json);
  const pinned = await a.reader().readAt(f.roster[0]!, { validTime: valid });
  const [expected] = JSON.parse(
    await o.oracle.call("check", {
      document: high,
      old: null,
      basis: pinned.basis,
      worlds: [f.world(0)],
      fold: false,
    }),
  );
  assert.equal(pinned.json, expected.json);
  await a.collect(abandoned);
  assert.equal(await a.db.row("join-stage:" + abandoned, await s.head()), undefined);
  let raced = false,
    intermediate: typeof origin | undefined;
  const appeared = await a.publish("restart-stage", low, valid, "staged", undefined, {
    ...opts,
    afterChunk: async () => {
      if (raced) return;
      raced = true;
      intermediate = await b.publish("second-while-staging", lookalike, valid, "owed");
    },
  });
  assert(intermediate && intermediate.position < appeared.position);
  assert.equal((await verify(intermediate, lookalike)).changes, 0);
  assert.equal((await verify(appeared, low)).stored, f.n);
  const material = (await a.physical(sequence)).marker.stage;
  assert(material);
  await assert.rejects(a.collect(material.attempt), /Cannot collect published/);
  const none = await b.publish("everyone-already-has-this", same, valid, "staged", undefined, opts);
  assert.equal((await verify(none, same)).changes, 0);
  assert.equal((await a.physical(sequence)).marker.stage, undefined);
  kill("staged-receipt", high, "receipt");
  const sent = await s.lookup("joined:staged-receipt");
  assert(sent);
  const found = await b.publish("staged-receipt", high, valid, "staged", undefined, opts);
  assert.deepEqual(sent, found);
  assert.equal((await verify(found, high)).changes, f.n);
  const person = 0,
    subject = f.roster[person]!,
    writer = deepIds.worker(person),
    at = millis(valid);
  function updated(minutes: number, tx: number): W0.World {
    return {
      subject,
      facts: f
        .world(person)
        .facts.map((x) =>
          x.e === subject && x.a === "weeklyMinutes" ? { ...x, v: minutes, tx } : x,
        ),
    };
  }
  let racedSave: typeof origin | undefined;
  const winner = await a.publish("same-person-race", low, valid, "staged", undefined, {
    ...opts,
    afterChunk: async () => {
      if (racedSave) return;
      const raw = await rawDeep(other, person, { tx: await other.head(), validTime: valid });
      racedSave = await b.saveDeep(
        "person-before",
        person,
        replaceDeep(raw, [{ e: writer, a: ":person/custom-weekly-minutes", v: integer(5000) }], at),
        valid,
      );
    },
  });
  assert(racedSave && racedSave.position < winner.position);
  await o.check(
    a,
    [subject],
    () => updated(5000, racedSave!.position),
    high,
    { tx: racedSave.position, validTime: valid },
    high,
  );
  const won = await o.check(
    a,
    f.roster,
    (i) => (i === person ? updated(5000, racedSave!.position) : f.world(i)),
    low,
    { tx: winner.position, validTime: valid },
    high,
    ++sequence,
  );
  assert.equal(won.changes, f.n - 1);
  const raw = await rawDeep(other, person, { tx: await other.head(), validTime: valid });
  const post = await b.saveDeep(
    "person-after",
    person,
    replaceDeep(raw, [{ e: writer, a: ":person/custom-weekly-minutes", v: integer(0) }], at),
    valid,
  );
  assert(post.position > winner.position);
  await o.check(
    a,
    [subject],
    () => updated(0, post.position),
    low,
    { tx: post.position, validTime: valid },
    low,
  );
  const dispatcher = a.dispatcher(new Documents(target.comp, "sink"));
  await dispatcher.drain();
  const receiver = await o.receiver(a, dispatcher);
  writeFileSync(
    join(process.argv[2]!, "stage-gate.json"),
    JSON.stringify(
      {
        scope: s.scope,
        roster: f.rosterHash,
        source: f.sourceHash,
        cut: origin.position,
        abandoned,
        priorRead: sha256(pinned.json),
        freshRead: { position: cold.basis.tx, hash: sha256(cold.json) },
        kills: 2,
        samePerson: [racedSave.position, winner.position, post.position],
        everyone: f.n,
        nobody: 0,
        receiver,
        traces,
      },
      null,
      2,
    ) + "\n",
    { flag: "wx" },
  );
} finally {
  o.oracle.close();
  await target.close();
  await other.close();
  await s.close();
}
