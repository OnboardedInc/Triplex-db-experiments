import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { W0, canonical, sha256 } from "../../../../bench/lib/w0-world.ts";
import { runtimeApi } from "../../../../bench/lib/triplex.ts";
import { measureW0Http } from "../../../../bench/lib/w0-http.ts";
import { openStore } from "../store.ts";
import { seed, valid } from "../fixture.ts";
import type { Tail } from "../../notify1/journal.ts";
import { JoinedAccount } from "./account.ts";
import { AccountAdmission, type PublishObservation } from "./admission.ts";
import { Reference } from "./check.ts";

export async function liveGateway(scope: string, nonce: string) {
  const db =
    "s2-" + Buffer.from(String(runtimeApi.DatabaseScope.test(scope))).toString("base64url");
  const response = await fetch(new URL(`/v1/db/${db}/write-options`, process.env.DATOMIC_URL));
  assert(response.ok);
  const observed = await response.json();
  // [DX-ACT2] Why: the joined turns depend on the reviewed native fair queue actually loaded on this request's scope. Rejected: inferring active scheduling from launch arguments.
  assert(
    observed.database === db &&
      observed.attempt === nonce &&
      observed.options.livePriority === true,
  );
  assert(observed.strictRecordClocks && observed.commitFunctionInstalled);
  return observed;
}

export async function run(
  dir: string,
  attempt: { source: string; nonce: string; identity: string },
) {
  const scope = "lazy-join-admission-" + attempt.nonce,
    source = await openStore(scope),
    lane = new AccountAdmission("priority"),
    a = new JoinedAccount(source, lane),
    other = new JoinedAccount(source),
    ref = new Reference();
  try {
    const options = await liveGateway(scope, attempt.nonce),
      seeded = await seed(source, 8);
    await a.install(seeded.roster, valid);
    await a.publish("baseline", W0.R1.doc, valid, "owed");
    const subject = seeded.roster[1]!,
      edit = (value: number) => ({ e: subject, a: "payRateCents", values: [value] });
    const before = a.save("before", edit(1531), valid),
      after = a.save("after", edit(2407), valid),
      observation: PublishObservation = { attempts: [] },
      released = measureW0Http(() =>
        a.publish("priority", W0.R2.doc, valid, "owed", undefined, { observation }),
      );
    const [saveBefore, saveAfter, measured] = await Promise.all([before, after, released]);
    const receipt = measured.value,
      writes = measured.samples.filter((sample) => String(sample.path).endsWith("/transact"));
    assert.equal(writes.length, 1, "Queued Publish lost its native request observation");
    assert.equal(measured.nativeFrames.length, 1);
    assert(writes[0]!.timeline);
    assert(
      saveBefore.position + 1 === receipt.position && receipt.position + 1 === saveAfter.position,
    );
    assert.equal(receipt.changes.length, 4);
    assert(observation.turn?.waitingSaves === 2 && observation.attempts.length === 1);
    assert.equal(observation.attempts[0]!.cut, saveBefore.position);
    const tail = await a.db.get<Tail>("tail", receipt.position),
      sealed = await a.receipt(tail.value.sequence, receipt.position);
    assert.equal(sealed.marker.cut, saveBefore.position);
    assert.equal(sealed.marker.release, W0.R2.hash);
    assert.equal(sealed.event.at, receipt.position);
    const verify = async (position: number, authored: number, at: number) => {
      const base = seeded.world(1);
      const world = {
        subject,
        facts: [
          ...base.facts.filter((f) => f.e !== subject || f.a !== "payRateCents"),
          { e: subject, a: "payRateCents", v: authored, tx: at },
        ],
      };
      const read = await a.reader().readAt(subject, { position, validTime: valid });
      const [expected] = JSON.parse(
        await ref.oracle.call("check", {
          document: W0.R2.doc,
          old: W0.R1.doc,
          basis: { tx: position, validTime: valid },
          worlds: [world],
          fold: false,
        }),
      );
      assert.equal(expected.subject, subject);
      assert.equal(read.json, expected.json);
      return sha256(read.json);
    };
    const exact = [
      await verify(receipt.position, 1531, saveBefore.position),
      await verify(saveAfter.position, 2407, saveAfter.position),
    ];
    assert.deepEqual(await a.publish("priority", W0.R2.doc, valid, "owed"), receipt);
    const external: PublishObservation = { attempts: [] };
    let crossed = 0;
    // [DX-ACT2] Why: a second writer can still race a native predecessor. Deliberately move it at all three attempts and require the contender to stop without a new receipt. Rejected: testing only co-operative in-process callers.
    await assert.rejects(
      a.publish(
        "raced",
        W0.R3.doc,
        valid,
        "owed",
        async () => {
          crossed++;
          await other.save("outside-" + crossed, edit(2500 + crossed), valid);
        },
        { observation: external },
      ),
      /three serial predecessor attempts/,
    );
    assert.equal(crossed, 3);
    assert.equal(external.attempts.filter((x) => x.conflict).length, 3);
    assert.equal(await source.lookup("joined:raced"), null);
    writeFileSync(
      join(dir, "joined-admission.json"),
      JSON.stringify({
        attempt,
        scope,
        options,
        before: saveBefore.position,
        after: saveAfter.position,
        receipt: {
          position: receipt.position,
          tx: receipt.txId,
          cut: sealed.marker.cut,
          hash: sha256(canonical(sealed.event.value)),
        },
        oracle: exact,
        nativeRequest: writes[0],
        externalConflicts: crossed,
      }) + "\n",
      { flag: "wx" },
    );
  } finally {
    ref.oracle.close();
    await source.close();
  }
}
