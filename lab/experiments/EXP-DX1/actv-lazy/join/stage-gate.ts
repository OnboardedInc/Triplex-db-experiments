import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { W0, sha256 } from "../../../../bench/lib/w0-world.ts";
import { Documents } from "../../notify1/store.ts";
import { openStore } from "../store.ts";
import { seed, valid } from "../fixture.ts";
import { Reference } from "./check.ts";
import { JoinedAccount } from "./account.ts";
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
        kills: 2,
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
