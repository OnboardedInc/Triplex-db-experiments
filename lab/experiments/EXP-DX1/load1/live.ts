import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import * as api from "../../../../packages/datomic/dist/index.js";
import { openComposition, type CompositionHandle } from "../../../bench/lib/composition.ts";
import { runtimeApi } from "../../../bench/lib/triplex.ts";
import { SEED_VALID_FROM } from "../../../bench/lib/world.ts";
import { frames, sha, sourceId } from "./source.ts";
import { Snapshot } from "./snapshot.ts";
import { ack, record, type Seen } from "./oracle.ts";

type Sample = {
  actor: string;
  kind: "save" | "read";
  seq: number;
  due: number;
  offered: number;
  end: number;
  outcome: string;
  seen?: Seen;
};
const nearest = (values: number[]) =>
  values.length ? values.sort((a, b) => a - b)[Math.ceil(values.length * 0.99) - 1] : null;
// [DX-LOAD2] Why: bracket the guest clock with both host timestamps; compare guest-native clocks directly.
// Rejected: assuming wall time on a VM is the same as the client's clock, or hiding uncertain overlaps.
async function sampleClock() {
  const samples = [];
  for (let i = 0; i < 12; i++) {
    const send = performance.now(),
      r = await fetch(process.env.DATOMIC_URL + "/health");
    assert(r.ok);
    const { loadClock: guest } = (await r.json()) as {
      loadClock: { bootId: string; monoMs: number; run: string };
    };
    const recv = performance.now();
    assert(guest?.bootId && Number.isFinite(guest.monoMs));
    assert.equal(guest.run, process.env.TRIPLEX_TRACE_RUN);
    samples.push({ send, recv, ...guest });
  }
  return samples;
}
function save(actor: string, n: number, pin = false) {
  const operations = Array.from({ length: pin ? 1 : 1 + (n % 3) }, (_, j) => ({
    op: "assert" as const,
    entityId: "acct/" + actor + "/" + (pin ? "pinned" : "person-" + (n % 1000)),
    attribute: ":save/field-" + j,
    value: { type: "string" as const, value: actor + "/" + n + "/" + j },
    validFrom: SEED_VALID_FROM,
  }));
  const meta = {
    actor,
    commandId: "save/" + actor + "/" + (pin ? "pin" : n),
    correlationId: sha(JSON.stringify(operations)),
  };
  return { frame: { first: n, end: n + 1, operations }, meta };
}
export async function live(
  comp: CompositionHandle,
  scope: string,
  rate: number,
  dir: string,
  arm: string,
  server: boolean,
  traceTail = false,
) {
  assert([50, 235, 390].includes(rate));
  const width = Number(arm.split("-")[1]),
    duration = (traceTail ? 108 : server ? 60 : 12) * 1000,
    subjects = server || traceTail ? 100000 : 20000;
  const samples: Sample[] = [];
  type Native = {
    command: string;
    op: string;
    t: string;
    position: number;
    submit: number;
    end: number;
    group?: number;
    grant?: { bulk: boolean; "runnable-live": boolean };
    queueUs?: number;
    toEntryMs?: number;
    serialHold?: { start: number; end: number };
    recovered?: true;
  };
  const native = new Map<string, Native>();
  const attempted = new Map<string, { command: string; submit: number }>();
  let invalidReceipt: unknown;
  const expectedDb =
    "s2-" + Buffer.from(String(runtimeApi.DatabaseScope.test(scope))).toString("base64url");
  const original = api.DatomicClient.prototype.transact;
  const operation = api.DatomicClient.prototype.operation;
  api.DatomicClient.prototype.transact = async function (db, input, onSent) {
    const start = performance.now();
    assert.equal(db, expectedDb);
    assert.equal(input.claims.length, 1);
    const command = input.claims[0]!.commandId;
    attempted.set(input.operationId, { command, submit: start });
    const reply: any = await original.call(this, db, input, onSent);
    try {
      assert.equal(input.operationId, reply.operationId);
      const bulk = command.startsWith("load1/");
      assert(reply.bulkGrant && reply.bulkGrant.bulk === bulk);
      if (bulk) assert(!reply.bulkGrant["runnable-live"] && reply.groupSize === 1);
      assert(Number.isSafeInteger(reply.groupSize) && reply.groupSize >= 1 && reply.groupSize <= 8);
      native.set(input.operationId, {
        command,
        op: reply.operationId,
        t: String(reply.t.v),
        position: Number(reply.position.v),
        group: reply.groupSize,
        grant: reply.bulkGrant,
        queueUs: reply.groupQueueMicros,
        toEntryMs: reply.submitToNativeEntryMs,
        serialHold: reply.serialHold,
        submit: start,
        end: performance.now(),
      });
    } catch (error) {
      invalidReceipt ??= error;
      throw error;
    }
    return reply;
  };
  // [DX-LOAD1] Why: a queued bulk request can lose its HTTP reply yet commit during drain. Rejected: counting it as a miss or fabricating its original grant from the durable receipt.
  api.DatomicClient.prototype.operation = async function (db, id) {
    assert.equal(db, expectedDb);
    const result = await operation.call(this, db, id);
    if (result.status === "committed" && !native.has(id)) {
      try {
        const sent = attempted.get(id);
        assert(
          sent &&
            result.operationId === id &&
            result.position?.t === "long" &&
            result.t?.t === "long",
        );
        const p = Number(result.position.v);
        assert(Number.isSafeInteger(p) && p > 0 && BigInt(result.t.v) > 0n);
        native.set(id, {
          ...sent,
          op: id,
          t: String(result.t.v),
          position: p,
          end: performance.now(),
          recovered: true,
        });
      } catch (error) {
        invalidReceipt ??= error;
        throw error;
      }
    }
    return result;
  };
  const quiet = await openComposition("reach", "datomic", scope);
  const importer = await Snapshot.open(
    comp,
    "thin",
    subjects,
    Math.max(width, 128),
    path.join(dir, arm + ".sqlite"),
  );
  try {
    const seed = save("quiet", 0, true),
      initial = await quiet.transact(seed.frame.operations, seed.meta);
    if (!initial.ok) throw Error(initial.tag);
    const pin = ack(seed.frame, initial.value),
      pinRow = initial.value.triples[0]!;
    const clockBefore = traceTail ? await sampleClock() : undefined;
    const start = performance.now(),
      end = start + duration;
    const checks = new Map<string, Seen>([[seed.meta.commandId, pin]]);
    let inFlight = 0,
      quietInFlight = 0,
      bulkInFlight = 0,
      peakBulk = 0,
      factsInWindow = 0,
      completedBulk = 0;
    const pending = new Set<Promise<void>>(),
      ordered: any[] = [];
    let fatal: unknown;
    function launch(actor: string, kind: Sample["kind"], seq: number, due: number) {
      const offered = performance.now(),
        sentinel = actor === "quiet";
      const s: Sample = {
        actor,
        kind,
        seq,
        due,
        offered: offered - start,
        end: offered - start,
        outcome: "pending",
      };
      samples.push(s);
      if (offered >= end || (sentinel ? quietInFlight >= 12 : inFlight >= 48)) {
        s.outcome = offered >= end ? "window-expired" : "client-capacity";
        return;
      }
      if (sentinel) quietInFlight++;
      else inFlight++;
      const work = (async () => {
        if (kind === "read") {
          const r = await quiet.pull(pinRow.entityId, {
            recordedPosition: pin.position,
            recordedAt: pin.instant,
            validAt: SEED_VALID_FROM,
          });
          assert.equal(r.triples.length, 1);
          const v = r.triples[0]!;
          assert.deepEqual(
            [
              v.id,
              v.entityId,
              v.attribute,
              v.value,
              v.validFrom,
              v.recordedAt,
              (v.txId as any)?.value,
            ],
            [
              pinRow.id,
              pinRow.entityId,
              pinRow.attribute,
              pinRow.value,
              SEED_VALID_FROM,
              pin.instant,
              pin.txId,
            ],
          );
          s.outcome = "verified";
        } else {
          const { frame, meta } = save(actor, seq),
            h = sentinel ? quiet : comp;
          const out = await h.transact(frame.operations, meta);
          if (!out.ok) {
            s.outcome = out.tag;
            return;
          }
          s.seen = ack(frame, out.value);
          checks.set(meta.commandId, s.seen);
          s.outcome = "verified";
        }
      })()
        .catch((e) => {
          s.outcome = "exception";
          fatal ??= e;
        })
        .finally(() => {
          s.end = performance.now() - start;
          if (sentinel) quietInFlight--;
          else inFlight--;
          pending.delete(work);
        });
      pending.add(work);
    }
    const bulk = (async () => {
      if (!width) return;
      for (const f of frames("thin", subjects, width)) {
        if (performance.now() >= end) break;
        const offered = performance.now();
        bulkInFlight++;
        peakBulk = Math.max(peakBulk, bulkInFlight);
        const entry = await importer.write(f);
        bulkInFlight--;
        const done = performance.now();
        if (done <= end) factsInWindow += entry.facts;
        completedBulk += entry.facts;
        ordered.push({
          first: f.first,
          end: f.end,
          command: entry.command,
          position: entry.position,
          facts: entry.facts,
          offer: offered - start,
          ack: done - start,
        });
      }
    })().catch((e) => {
      fatal ??= e;
    });
    let noisy = 0,
      q = 0;
    const nNoisy = Math.floor((rate * duration) / 1000),
      nQuiet = Math.floor((5 * duration) / 1000);
    while (noisy < nNoisy || q < nQuiet) {
      const nextNoise = noisy < nNoisy ? (1000 * noisy) / rate : Infinity,
        nextQuiet = q < nQuiet ? 200 * q : Infinity;
      const due = Math.min(nextNoise, nextQuiet),
        wait = start + due - performance.now();
      if (wait > 0) await delay(wait);
      if (nextQuiet <= nextNoise) {
        launch("quiet", "save", q, due);
        launch("quiet", "read", q++, due);
      } else {
        launch("live" + (noisy % 10), "save", noisy, nextNoise);
        noisy++;
      }
    }
    await Promise.all([...pending, bulk]);
    if (invalidReceipt) throw invalidReceipt;
    if (fatal) throw fatal;
    const drained = performance.now() - start;
    const clockAfter = traceTail ? await sampleClock() : undefined;
    assert.equal(peakBulk, width ? 1 : 0);
    const seen = new Set<string>();
    const proof = await importer.verify(false, (r) => {
      const parts = String(r.commandId).split("/");
      assert(parts[0] === "save" && parts.length === 3 && !seen.has(r.commandId));
      const { frame, meta } = save(
        parts[1]!,
        parts[2] === "pin" ? 0 : Number(parts[2]),
        parts[2] === "pin",
      );
      const expected = checks.get(r.commandId);
      assert(expected, "Unacknowledged live command committed; outcome requires resolution");
      assert.deepEqual(record(frame, meta, r), expected);
      seen.add(r.commandId);
    });
    assert.equal(seen.size, checks.size);
    const observations = [...native.values()],
      published = new Map(observations.map((n) => [n.command, n.position]));
    assert.equal(observations.length, proof.cut);
    assert.equal(new Set(observations.map((n) => n.position)).size, proof.cut);
    assert.equal(published.size, proof.cut);
    for (const [command, receipt] of checks) assert.equal(published.get(command), receipt.position);
    for (const f of ordered) assert.equal(published.get(f.command), f.position);
    const stats = (a: Sample[]) => {
      const ok = a.filter((s) => s.outcome === "verified");
      return {
        offered: a.length,
        ok: ok.length,
        p99Ms: nearest(ok.map((s) => s.end - s.due)),
        outcomes: a.reduce(
          (m, s) => ((m[s.outcome] = (m[s.outcome] ?? 0) + 1), m),
          {} as Record<string, number>,
        ),
      };
    };
    const neighbors = Object.fromEntries(
      [...new Set(samples.map((s) => s.actor))].map((a) => [
        a,
        {
          save: stats(samples.filter((s) => s.actor === a && s.kind === "save")),
          read: stats(samples.filter((s) => s.actor === a && s.kind === "read")),
        },
      ]),
    );
    fs.writeFileSync(
      path.join(dir, arm + ".offers.json"),
      JSON.stringify({
        nonce: process.env.TRIPLEX_TRACE_RUN,
        source: process.env.TRIPLEX_TRACE_SOURCE,
        slot: process.env.TRIPLEX_TRACE_SLOT,
        scope,
        expectedDb,
        start,
        duration,
        clockBefore,
        clockAfter,
        native: observations,
        ordered,
        samples,
      }),
      { flag: "wx" },
    );
    if (traceTail) {
      assert(
        neighbors.quiet!.save.ok >= 500 && neighbors.quiet!.read.ok >= 500,
        "Tail arm collected fewer than 500 verified quiet saves or reads",
      );
      assert(
        ordered.every(({ command }) =>
          observations.some((n) => n.command === command && n.serialHold),
        ),
        "At least one bulk frame has no measured serial interval",
      );
    }
    return {
      scope,
      rate,
      width,
      sourceSeal: sourceId("thin", subjects),
      duration,
      elapsedMs: drained,
      facts: factsInWindow,
      completedBulk,
      fps: factsInWindow / (duration / 1000),
      neighbors,
      peakBulk,
      proof,
    };
  } finally {
    api.DatomicClient.prototype.transact = original;
    api.DatomicClient.prototype.operation = operation;
    importer.close();
    await quiet.close();
  }
}
