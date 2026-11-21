import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  DatomicClient,
  DatomicTransportError,
  orderedSaveIdentity,
} from "../../../../packages/datomic/dist/index.js";
import { W0 } from "../../../bench/lib/w0-world.ts";
import { SEED_VALID_FROM } from "../../../bench/lib/world.ts";
import { JoinedAccount } from "../actv-lazy/join/account.ts";
import { seedToy } from "../actv-lazy/join/held-campaign.ts";
import { HeldLedger } from "../actv-lazy/join/held-ledger.ts";
import { openStore } from "../actv-lazy/store.ts";
import { until } from "../ha1/common.ts";
import type { Stack } from "../ha1/stack.ts";
import { checkProfileFlags, launchOptions, startupFlags } from "../jvm1/launch.mjs";
import { importFrame } from "../load1/fair-campaign.ts";
import { creditModeSelection } from "../prep1/rolling-credits.ts";
import { load } from "../real1/load.ts";
import { roster } from "../real1/population.ts";
import { decodeFeed, now } from "../scale1/decision/observer.ts";
import { field, keyFor, operationId, sha, task, type Write } from "../scale1/decision/plan.ts";
import {
  expectedJournal,
  expectedSave,
  play,
  resolveUncertain,
  type Sender,
} from "../scale1/decision/writes.ts";
import { hex, openScaleSeal } from "../v01/adopt.ts";
import { pinnedFields } from "../v01/pinned-fields.ts";
import { replay, type Receipt } from "./replay.ts";

export async function campaign(stack: Stack, cell: string) {
  const { e, a } = stack;
  const realistic = cell === "real-fair" || cell === "scorecard";
  const cold = cell === "cold";
  const readStudy = cell === "read";
  const fair = !cold;
  const writerSettings = {
    TX2_SUBJECT_APPEND_RETIREMENT: "1",
    TX2_SUBJECT_NARROW_REVISION: "1",
    TX2_SUBJECT_REUSE_PREDECESSOR: "1",
    PREP1_LOOKUP_EVERY: "64",
  };
  await stack.tool();
  await stack.postgres("pg", a);
  await stack.database("pg", "moving");
  assert.equal(
    await stack.sql("pg", "SHOW synchronous_commit; SHOW fsync; SHOW full_page_writes", "moving"),
    "on\non\non",
  );
  await stack.tx("active", a, "pg", "moving");
  await until("ordered writer", async () => (await stack.broker("active")) || undefined);
  await stack.gateway("write", a, "pg", "moving", {
    settings: writerSettings,
    cores: 2,
    java: launchOptions("gw-w", 2, "-Xms96m -Xmx320m -Ddatomic.objectCacheMax=32m"),
  });
  const readFlags = launchOptions(
    "gw-r",
    readStudy ? 3 : 2,
    "-Xms96m -Xmx320m -Ddatomic.objectCacheMax=32m",
  );
  await stack.gateway("read", a, "pg", "moving", {
    settings: { TX2_READ_FILTER_EARLY: readStudy ? "1" : "0" },
    cores: readStudy ? 3 : 2,
    java: readFlags + " " + startupFlags.join(" "),
  });
  const [writeUrl, readUrl] = await Promise.all([stack.ready("write"), stack.ready("read")]);
  const readMember = stack.members.get("read")!;
  const readLaunch = {
    major: "21",
    collector: "G1",
    cores: readStudy ? 3 : 2,
    cacheMiB: 32,
    memoryMiB: 768,
    cpus: null,
    flags: readFlags.split(" "),
  };
  checkProfileFlags(readLaunch, await a.docker(["logs", readMember.id]));
  assert.equal(
    (await stack.view("read")).Config.Env.includes("TX2_READ_FILTER_EARLY=" + Number(readStudy)),
    true,
  );
  Object.assign(process.env, {
    DATOMIC_URL: writeUrl,
    DATOMIC_READ_URLS: readUrl,
    TRIPLEX_DATOMIC_LAYOUT: "lean",
    DX_STRICT_RECORD_CLOCKS: "1",
    DX_SERVER_RECORD_TIME: "1",
    TX2_W0_POINT_JOURNAL: "1",
    TX2_W0_RESTORE_INDEXED_JOURNAL: "1",
  });
  const writer = new DatomicClient(writeUrl, 35_000);
  const reader = new DatomicClient(readUrl, 35_000);
  const bulk = new DatomicClient(writeUrl, 35_000);
  const receipts: Receipt[] = [];
  const fixture = path.join(e.dir, "fixture");
  fs.mkdirSync(fixture);
  try {
    let scope: string, db: string, cut: number, people: number, pin: string;
    if (realistic) {
      scope = "dx-scale-decision-" + e.nonce + "-0";
      const key = JSON.stringify(["triplex-scope-v1", "test", "test", scope, 0]);
      db = "s2-" + Buffer.from(key).toString("base64url");
      const result = await load(
        {
          scope,
          db,
          tag: "toy-parent",
          imageSha: hex(key),
          pgdataSha: hex("toy"),
          transferSha: hex(e.nonce),
          cut: 0,
          facts: 0,
          people: 500,
        },
        "toy",
        e.source.git,
        writeUrl,
        fixture,
        () => {
          const free = fs.statfsSync(fixture);
          assert(free.bavail * free.bsize >= 5 * 2 ** 30);
        },
      );
      cut = result.cut;
      pin = result.ledgerSha;
      people = 50;
      e.write("realistic-seed", { db, cut, pin, accounts: roster("toy"), result });
    } else {
      seedToy(fixture, e.nonce, writeUrl, e.source.git);
      const file = path.join(fixture, "fixture.json");
      const seal = openScaleSeal(file, hex(fs.readFileSync(file)), true);
      ({ name: scope, db, cut } = seal.scope);
      people = seal.image.people;
      pin = seal.pin;
    }
    const options = await writer.request<{
      attempt: string;
      database: string;
      gatewaySourceHash: string;
      position: number;
      subjectFunction: string;
      subjectOrderedIds: boolean;
      subjectAppendRetirement: boolean;
      subjectNarrowRevision: boolean;
    }>("GET", "/v1/db/" + db + "/write-options");
    assert.deepEqual(
      [
        options.attempt,
        options.database,
        options.gatewaySourceHash,
        options.position,
        options.subjectOrderedIds,
        options.subjectAppendRetirement,
        options.subjectNarrowRevision,
      ],
      [e.nonce, db, e.source.gateway, cut, true, true, true],
    );
    const record = (id: string, ack: Awaited<ReturnType<DatomicClient["transactCommand"]>>) => {
      assert.equal(ack.operationId, id);
      receipts.push({ id, p: ack.position, clock: ack.recordedAt, t: ack.t, tx: ack.txId });
    };
    let ledger: HeldLedger | undefined;
    const store = fair
      ? await openStore(scope, "act2-deep", "write", {
          account: keyFor(0),
          prefix: "acct/" + keyFor(0) + "/",
          people,
          cut,
          seal: pin,
          verifyThrough: (p) => ledger!.verifyThrough(p),
          committed: (r) => ledger?.joined(r),
        })
      : undefined;
    try {
      const activation = store && new JoinedAccount(store);
      if (activation) {
        await activation.installHeld(W0.POPULATION_VALID_TIME);
        cut = await store!.head();
        ledger = new HeldLedger(reader, db, cut, options.subjectFunction);
      }
      const entities = Array.from({ length: 6 }, (_, i) => task(i, 0));
      const old = await reader.rows(db, {
        entityIds: entities,
        pattern: { attribute: field(0) },
        basis: { recordedPosition: cut, validAt: SEED_VALID_FROM },
      });
      assert.equal(old.length, entities.length);
      const scopeInfo = { name: scope, db, cut, seedCut: cut, accounts: [0, 1, 2, 3, 4, 5] };
      const senders: Sender[] = entities.map((entity) => ({
        client: writer,
        scope: scopeInfo,
        rows: new Map([[entity, old.filter((row) => row.entity_id === entity)]]),
      }));
      const out = new Map<string, ReturnType<typeof expectedSave>["input"]>();
      let lost: string | undefined;
      let lostAck: unknown;
      const transmit = writer.transact.bind(writer);
      writer.transact = async (...args) => {
        const input = args[1];
        out.set(input.operationId, input);
        const ack = await transmit(...args);
        const p = Number(ack.position.v);
        const fresh = input.rows[0]!;
        assert.deepEqual(
          (
            await reader.rows(db, {
              entityIds: [fresh.entity_id],
              pattern: { attribute: field(0) },
              basis: { recordedPosition: p, validAt: SEED_VALID_FROM },
            })
          ).map((r) => [r.id, r.value_string]),
          [[fresh.id, fresh.value_string]],
        );
        if (input.operationId === lost) {
          lostAck = ack;
          throw new DatomicTransportError("Combined gate withheld one durable response");
        }
        return ack;
      };
      const selection = creditModeSelection("rolling6");
      const tape: Write[] = cold
        ? [
            { ordinal: 0, account: 1, subject: 0, ms: 0, width: 1, version: "rate-refused" },
            { ordinal: 1, account: 0, subject: 0, ms: 100, width: 1, version: "quiet" },
            { ordinal: 2, account: 1, subject: 0, ms: 250, width: 1, version: "lost" },
          ]
        : Array.from({ length: 24 }, (_, ordinal) => ({
            ordinal,
            account: ordinal % 6,
            subject: 0,
            ms: Math.floor(ordinal / 6) * 250 + (ordinal % 6) * 10,
            width: 1,
            version: "live-" + ordinal,
          }));
      if (cold) lost = operationId(e.nonce, "lost");
      const imports: {
        index: number;
        frame: ReturnType<typeof importFrame>;
        receipt: Awaited<ReturnType<DatomicClient["transactCommand"]>>;
      }[] = [];
      let sent = 0;
      let importActive = 0;
      let peak = 0;
      let fire: () => void = () => {};
      const offered = new Promise<void>((resolve) => {
        fire = resolve;
      });
      const start = now() + 100;
      const gate = {
        paused: false,
        committed: (row: Parameters<HeldLedger["saved"]>[0]) => ledger?.saved(row),
        drain: undefined as (() => Promise<void>) | undefined,
        resume: undefined as (() => void) | undefined,
      };
      const activity = play(
        senders,
        tape,
        start,
        e.nonce,
        true,
        true,
        selection,
        fair ? gate : undefined,
        false,
        cold ? { ramp: true, stopped: () => false } : undefined,
        fair
          ? {
              limit: 2,
              end: start + 5_000,
              ready: () => sent < 8,
              async send(grant) {
                assert(grant.neighboursAhead! < selection.credits - 1);
                const index = sent++;
                const frame = importFrame(e.nonce, 8, index);
                peak = Math.max(peak, ++importActive);
                fire();
                try {
                  const receipt = await bulk.transactCommand(db, frame.input);
                  assert.equal(receipt.txId, frame.input.claims[0]!.txId);
                  record(frame.input.operationId, receipt);
                  ledger!.joined({
                    txId: receipt.txId,
                    position: receipt.position,
                    commandId: receipt.commandId,
                  });
                  imports.push({ index, frame, receipt });
                } finally {
                  importActive--;
                }
              },
            }
          : undefined,
      );
      void activity.catch(() => {});
      const publish =
        activation &&
        (async () => {
          // [DX-CHK1] Why: include both credit classes in the same Publish handoff and freeze at its exact source cut.
          // Rejected: running the isolated held-Publish gate after import traffic ends.
          await Promise.race([
            offered,
            activity.then(() => {
              assert(sent > 0);
            }),
          ]);
          gate.paused = true;
          try {
            await gate.drain!();
            const doc = W0.R1.doc;
            const id = "combined-" + e.nonce;
            const result = await activation.publish(id, doc, W0.POPULATION_VALID_TIME, "owed");
            const marker = await activation.receipt(
              (await activation.notices.observe()).value.sequence,
              result.position,
            );
            assert.deepEqual(
              [marker.marker.document, marker.event.value.request, marker.marker.cut],
              [doc, id, result.position - 1],
            );
            const claim = await writer.request<{
              txId: string;
              receipt: Awaited<ReturnType<DatomicClient["operation"]>>;
            }>("POST", "/v1/db/" + db + "/claim", {
              commandId: "joined:" + id,
              position: result.position,
              receipt: true,
            });
            const op = claim.receipt;
            assert.deepEqual(
              [claim.txId, op.status, Number(op.position?.v)],
              [result.txId, "committed", result.position],
            );
            assert(op.operationId);
            receipts.push({
              id: op.operationId,
              command: "joined:" + id,
              p: result.position,
              t: String(op.t!.v),
              clock: Number(op.recordedAt!.v),
              tx: result.txId,
            });
            const answer = await activation.reader().readAt(W0.placementId(0), {
              position: result.position,
              validTime: W0.POPULATION_VALID_TIME,
            });
            assert.equal(answer.basis.tx, result.position);
            return result.position;
          } finally {
            gate.paused = false;
            gate.resume!();
          }
        })();
      const batchSizes: number[] = [];
      const batched = pinnedFields(
        reader,
        db,
        field(0),
        { recordedPosition: cut, validAt: SEED_VALID_FROM },
        readStudy ? 8 : 1,
        (send, size) => {
          batchSizes.push(size);
          return send();
        },
      );
      const probes = (async () => {
        const initial = new Map(
          old.map((r) => [r.entity_id, [r.id, r.value_string, r.recorded_position]]),
        );
        for (let i = 0; i < 8; i++) {
          const reads = await Promise.all(entities.map(batched));
          assert.deepEqual(
            reads.map((R) => R.map((r) => [r.id, r.value_string, r.recorded_position])),
            entities.map((entity) => [initial.get(entity)]),
          );
        }
      })();
      const [result, published] = await Promise.all([activity, publish, probes]);
      await resolveUncertain(senders, result.unresolved);
      assert.equal(result.rows.length, tape.length);
      for (const r of result.rows) {
        if (r.id === lost) {
          assert.equal(r.status, "recovered");
          assert(lostAck && r.receipt);
          const original = lostAck as {
            position: { v: string };
            t: { v: string };
            recordedAt: { v: number };
          };
          assert.deepEqual(
            [r.receipt.p, r.receipt.t, r.receipt.clock],
            [Number(original.position.v), original.t.v, original.recordedAt.v],
          );
          await assert.rejects(() => transmit(db, out.get(r.id)!), { code: "OperationDuplicate" });
        } else if (cold && r.id === operationId(e.nonce, "rate-refused")) {
          assert.deepEqual(
            [r.status, r.startupRefusal, r.sent, r.dispatched],
            ["startup-refused", "rate", undefined, undefined],
          );
          assert.equal((await writer.operation(db, r.id)).status, "absent");
          const current = senders[1]!.rows.get(entities[1]!)!;
          r.orderedToken = orderedSaveIdentity().token;
          const resend = expectedSave(r, tape[0]!, current).input;
          resend.sourceK = current[0]!.recorded_position;
          const accepted = await writer.transactCommand(db, resend);
          record(r.id, accepted);
          assert.deepEqual(await writer.transactCommand(db, resend), accepted);
        } else
          assert(
            r.status === "acked" && r.stage?.subjectAppendRetirement === true,
            JSON.stringify(r),
          );
        if (r.receipt) receipts.push({ ...r.receipt, id: r.id });
      }
      const terminal = Number((await writer.basis(db)).position.v);
      assert.equal(terminal - cut, receipts.length);
      const commits = await replay(readUrl, db, terminal, receipts);
      if (ledger) await ledger.verifyThrough(terminal);
      assert.equal(readStudy ? Math.max(...batchSizes) : 1, readStudy ? entities.length : 1);
      if (fair) {
        assert.equal(imports.length, 8);
        assert.equal(peak, 2);
        assert(
          published &&
            imports.some((f) => f.receipt.position < published) &&
            imports.some((f) => f.receipt.position > published),
        );
      }
      let prev = 0;
      for (const { index, frame, receipt } of imports.toSorted((x, y) => x.index - y.index)) {
        assert(receipt.position > prev);
        prev = receipt.position;
        const rows = await reader.rows(db, {
          entityIds: [frame.entity],
          basis: { recordedPosition: terminal, validAt: SEED_VALID_FROM },
        });
        const actual = rows
          .map((r) => [r.attribute, r.value_type, r.value_ref ?? r.value_string])
          .sort();
        assert.deepEqual(actual, frame.facts.map((f) => [f.a, f.v.type, f.v.value]).sort());
        const wire = await reader.request<{ transactions: Parameters<typeof decodeFeed>[1][] }>(
          "POST",
          "/v2/db/" + db + "/transactions",
          { after: receipt.position - 1, limit: 1 },
        );
        assert.equal(
          decodeFeed(db, wire.transactions[0]!, now()).digest,
          expectedJournal({ input: frame.input, entity: frame.entity }, receipt.recordedAt),
        );
      }
      e.write("recap", {
        cell,
        db,
        cut,
        pin,
        terminal,
        published,
        rows: result.rows,
        receipts,
        imports: imports.length,
        batches: batchSizes,
        replayCommits: commits.length,
        input: sha(tape),
      });
      return {
        cell,
        terminal,
        receipts: receipts.length,
        published,
        imports: imports.length,
        replayCommits: commits.length,
      };
    } finally {
      await store?.close();
    }
  } finally {
    [writer, reader, bulk].forEach((client) => client.close());
  }
}
