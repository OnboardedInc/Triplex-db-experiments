import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import * as api from "../../../../packages/datomic/dist/index.js";
import { openComposition, type CompositionHandle } from "../../../bench/lib/composition.ts";
import { runtimeApi } from "../../../bench/lib/triplex.ts";
import { SEED_VALID_FROM } from "../../../bench/lib/world.ts";
import { frames, sha, sourceId } from "./source.ts";
import { Snapshot } from "./snapshot.ts";
import { maxBulkFacts, SerialBudget } from "./budget.ts";
import { isolatedImport } from "./isolated.ts";
import { sharedMono } from "./split-import.ts";
import { microLoad, splitLoad } from "../ha1/common.ts";
import { offers, pipelineTimings, type Offer } from "./live-evidence.ts";
import { ack, record, type Seen } from "./oracle.ts";
import {
  FrameCredits,
  microCycleMs,
  microDuration,
  microFixture,
  microHz,
  queryMarker,
  temporalExercise,
  temporalPrefix,
  volumeWindow,
} from "./micro.ts";
import { pacedHz, TailPacer, type Baseline } from "./pacing.ts";
import type { Frame } from "./source.ts";
import { installSnapshotImportClass } from "./import-class.ts";
import { pipelineDuration, pipelineHz, pipelineLimit, PipelineCredits } from "./pipeline.ts";

// [DX-LOAD2] Why: bracket the guest clock with both host timestamps; compare guest-native clocks directly.
// Rejected: assuming wall time on a VM is the same as the client's clock, or hiding uncertain overlaps.
async function sampleClock(run = process.env.TRIPLEX_TRACE_RUN) {
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
    assert.equal(guest.run, run);
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
  mode = "load-live",
  held?: { after: number; maxGroup: number; clockRun: string; referenceImport?: boolean },
) {
  // [DX-IMP2] With the whole-subject import bound on, the snapshot frames here are import-class commits.
  installSnapshotImportClass();
  const traceTail = mode === "load-tail",
    frontier = mode.startsWith("load-frontier-");
  const split = splitLoad(mode),
    micro = microLoad(mode),
    volume = mode === "load-volume",
    pipeline = mode === "load-pipeline",
    paced = mode === "load-paced",
    depth = pipeline ? Number(arm.split("-")[2]) || 0 : 0;
  let sender = pipeline ? randomUUID() : undefined;
  let sequence = 0;
  const sends = new Map<string, number>();
  const alone = frontier && arm === "frontier-alone";
  const allReads = (split || frontier || micro) && !alone;
  const diagnosticVolume = volume && !server;
  const rates =
    (pipeline || paced) && !server
      ? [10]
      : diagnosticVolume
        ? [10, 50]
        : split || frontier
          ? [50, 100]
          : [50, 235, 390];
  assert(rates.includes(rate));
  if (held) {
    assert(paced && arm === "pace-32-fixed");
    assert(Number.isSafeInteger(held.after) && held.after > 0);
    assert(Number.isSafeInteger(held.maxGroup) && held.maxGroup > 0);
    assert.equal(await comp.currentPosition(), held.after);
  }
  const cell = alone ? "0" : arm.split("-")[1],
    width = frontier && cell !== "0" ? maxBulkFacts : Number(cell),
    duration = volume
      ? volumeWindow(arm, !server)
      : pipeline || paced
        ? pipelineDuration(!server)
        : micro
          ? microDuration
          : (traceTail || split || frontier ? 108 : server ? 60 : 12) * 1000,
    subjects = micro
      ? volume
        ? server
          ? 600000
          : 180000
        : 60000
      : server || traceTail || split || frontier
        ? 100000
        : 20000;
  const hz = pipeline ? pipelineHz : paced ? pacedHz : microHz;
  const feedback = paced && arm.endsWith("-feedback");
  const baseline = feedback
    ? (JSON.parse(process.env.DX_LOAD_PACED_BASELINE ?? "null") as Baseline)
    : undefined;
  if (feedback) assert(baseline);
  assert(
    !pipeline ||
      (width === 0 && depth === 0) ||
      ([16, 24].includes(width) && [1, 2, 4, 8].includes(depth)),
  );
  const fixture = micro ? microFixture(subjects, width || 24) : undefined;
  const budget =
    frontier && width
      ? new SerialBudget(Number(cell === "allowance" ? process.env.DX_LOAD2_ALLOWANCE_MS : cell))
      : undefined;
  const samples: Offer[] = [];
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
    frameSize?: { rows: number; bytes: number };
    peerTimings?: {
      payloadPrepared: number;
      predecessorReady?: number;
      submitted?: number;
      completed: number;
    };
    recovered?: true;
  };
  const native = new Map<string, Native>();
  const byCommand = new Map<string, Native>();
  const retain = (n: Native) => {
    assert(!byCommand.has(n.command) || byCommand.get(n.command)?.op === n.op);
    native.set(n.op, n);
    byCommand.set(n.command, n);
  };
  const attempted = new Map<string, { command: string; submit: number }>();
  let invalidReceipt: unknown,
    loseReplyFor = "",
    lostReplies = 0,
    missingCommand = "",
    missingCode: string | undefined;
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
    const sendSequence = sends.get(command);
    const reply: any = await original
      .call(
        this,
        db,
        sendSequence === undefined ? input : { ...input, clientId: sender, sendSequence },
        onSent,
      )
      .catch((error: unknown) => {
        if (command === missingCommand && error instanceof api.DatomicHttpError)
          missingCode = error.code;
        throw error;
      });
    try {
      assert.equal(input.operationId, reply.operationId);
      const bulk = command.startsWith("load1/");
      // [DX-V01] Why: the per-person profile dispatches imports through the reference writer.
      // Rejected: crediting that path with the grouped admission guarantees.
      if (held?.referenceImport) {
        assert(reply.bulkGrant == null && reply.serialHold == null);
        assert(reply.groupSize === undefined || reply.groupSize === 1);
      }
      else {
        assert(reply.bulkGrant && reply.bulkGrant.bulk === bulk);
        if (bulk) assert(!reply.bulkGrant["runnable-live"] && reply.groupSize === 1);
        assert(Number.isSafeInteger(reply.groupSize) && reply.groupSize >= 1 && reply.groupSize <= (held?.maxGroup ?? 8));
      }
      retain({
        command,
        op: reply.operationId,
        t: String(reply.t.v),
        position: Number(reply.position.v),
        group: reply.groupSize,
        grant: reply.bulkGrant,
        queueUs: reply.groupQueueMicros,
        toEntryMs: reply.submitToNativeEntryMs,
        serialHold: reply.serialHold,
        frameSize: reply.frameSize,
        peerTimings: traceTail || micro ? reply.timeline : undefined,
        submit: start,
        end: performance.now(),
      });
    } catch (error) {
      invalidReceipt ??= error;
      throw error;
    }
    if (command === loseReplyFor) {
      loseReplyFor = "";
      lostReplies++;
      throw new Error("Injected lost HTTP reply after a committed native write");
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
        retain({
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
  const writerForImport = micro ? await openComposition("reach", "datomic", scope) : comp;
  const openImporter = () =>
    Snapshot.open(
      writerForImport,
      fixture ?? "thin",
      subjects,
      budget ? maxBulkFacts : micro ? width || 24 : Math.max(width, 128),
      path.join(dir, arm + ".sqlite"),
      budget ? { budgetMs: budget.ms } : undefined,
      depth ? width / 8 : undefined,
    );
  let importer = await openImporter();
  let other: Awaited<ReturnType<typeof isolatedImport>> | undefined;
  try {
    const checks = new Map<string, Seen>();
    const writer = (actor: string) => (actor === "quiet" ? quiet : comp);
    const pins = new Map<
      string,
      { receipt: Seen; row: import("../../../bench/lib/composition.ts").Receipt["triples"][number] }
    >();
    for (const actor of [
      "quiet",
      ...Array.from({ length: allReads ? 10 : 0 }, (_, i) => "live" + i),
    ]) {
      const seed = save(actor, 0, true);
      const initial = await writer(actor).transact(seed.frame.operations, seed.meta);
      if (!initial.ok) throw Error(initial.tag);
      const receipt = ack(seed.frame, initial.value);
      checks.set(seed.meta.commandId, receipt);
      pins.set(actor, { receipt, row: initial.value.triples[0]! });
    }
    const measure = (command: string) => {
      const measured = byCommand.get(command);
      assert(measured?.serialHold && measured.frameSize);
      const { serialHold, frameSize } = measured;
      assert(
        frameSize.rows > 0 &&
          frameSize.rows <= 96 &&
          frameSize.bytes > 0 &&
          frameSize.bytes <= 65536,
      );
      return { ms: serialHold.end - serialHold.start, ...frameSize };
    };
    const pilots = [];
    if (budget) {
      for (let i = 0; i < 8; i++) {
        const f = importer.nextFrame(1);
        assert(f);
        const e = await importer.write(f);
        const v = measure(e.command);
        budget.observe(e.facts, v.ms);
        pilots.push({ command: e.command, position: e.position, facts: e.facts, ...v });
      }
    }
    if (split && width) {
      const url = process.env.DX_LOAD2_IMPORT_URL;
      assert(url && url !== process.env.DATOMIC_URL);
      other = await isolatedImport(url, scope + "-import", dir, arm, subjects, width);
    }
    const clockBefore = traceTail || micro ? await sampleClock(held?.clockRun) : undefined;
    const start = performance.now(),
      bridge = sharedMono(),
      end = start + duration;
    const isolated = other?.run(bridge, duration);
    if (isolated) void isolated.catch(() => {});
    let inFlight = 0,
      quietInFlight = 0,
      pendingSaves = 0,
      bulkInFlight = 0,
      peakBulk = 0,
      factsInWindow = 0,
      completedBulk = 0;
    const pending = new Set<Promise<void>>(),
      ordered: any[] = [];
    let fatal: unknown;
    function launch(actor: string, kind: Offer["kind"], seq: number, due: number) {
      const offered = performance.now(),
        sentinel = actor === "quiet";
      const s: Offer = {
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
      if (kind === "save") pendingSaves++;
      const work = (async () => {
        if (kind === "read") {
          const { receipt: pin, row: pinRow } = pins.get(actor)!;
          const r = await writer(actor).pull(pinRow.entityId, {
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
            h = writer(actor);
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
          if (kind === "save") pendingSaves--;
          pending.delete(work);
        });
      pending.add(work);
    }
    let budgetStopped = false;
    let lastFrame: { frame: Frame; position: number; ids: string } | undefined;
    const markers: (Awaited<ReturnType<typeof queryMarker>> & { done: number })[] = [];
    const temporalSeen: Awaited<ReturnType<typeof temporalExercise>> = new Map();
    const observeMarkers = (async () => {
      if (!fixture || !width) return;
      for (let at = 1000; at <= duration - 100; at += at < duration - 800 ? 1000 : 100) {
        await delay(Math.max(0, start + at - performance.now()));
        if (!lastFrame || markers.at(-1)?.position === lastFrame.position) continue;
        const { frame, ...entry } = lastFrame;
        const marker = await queryMarker(quiet, frame, entry);
        markers.push({ ...marker, done: performance.now() - start });
      }
    })().catch((error) => {
      fatal ??= error;
    });
    const credits = micro && !paced ? new FrameCredits(start) : undefined;
    const pacer = paced && width ? new TailPacer(start, duration, rate, baseline) : undefined;
    let resumeCursor: number | undefined;
    const pipelineChecks = { missingPredecessor: false };
    const exerciseTemporal = async () => {
      assert.equal(bulkInFlight, 0);
      bulkInFlight++;
      try {
        const tested = await temporalExercise(writerForImport, (command) => {
          loseReplyFor = command;
        });
        for (const [command, receipt] of tested) temporalSeen.set(command, receipt);
      } finally {
        bulkInFlight--;
      }
    };
    const submitPipeline = async () => {
      let fixed = fixture!.batches(importer.cursor());
      let staged = fixed.next().value;
      const admitted = new Set<Promise<void>>();
      const pace = new PipelineCredits(start);
      const settled = new Map<number, NonNullable<typeof lastFrame>>();
      // [DX-HA1] Why: advance the sampled marker only when every earlier checkpoint is durable.
      // Rejected: treating out-of-order HTTP completion as a queryable prefix.
      try {
        while (staged && performance.now() < end && !fatal) {
          if (!server && resumeCursor === undefined && sequence >= 4) {
            await Promise.all(admitted);
            if (fatal) break;
            const expected = importer.cursor();
            const resumed = await openImporter();
            assert.equal(resumed.cursor(), expected);
            importer.close();
            importer = resumed;
            resumeCursor = expected;
            sender = randomUUID();
            sequence = 0;
            fixed = fixture!.batches(resumed.cursor());
            staged = fixed.next().value;
            assert(staged);
          }
          if (!temporalSeen.size && performance.now() - start >= duration / 3) {
            await Promise.all(admitted);
            if (fatal) break;
            await exerciseTemporal();
          }
          await pace.wait(end);
          const limit = pipelineLimit(depth, pendingSaves);
          if (admitted.size >= limit) {
            // Pressure can fall through a live completion before the oldest import reply.
            await Promise.race([...admitted, delay(1)]);
            continue;
          }
          const at = performance.now();
          if (at >= end || fatal) break;
          const f = staged;
          const command = importer.frameIdentity(f).commandId;
          sends.set(command, ++sequence);
          if (f.first === 0) loseReplyFor = command;
          const pressure = { outstanding: admitted.size, pendingSaves, limit };
          pace.consume(at);
          peakBulk = Math.max(peakBulk, admitted.size + 1);
          const work = (async () => {
            try {
              const entry = await importer.write(f);
              const done = performance.now();
              if (done <= end) factsInWindow += entry.facts;
              completedBulk += entry.facts;
              const recovered = !server && byCommand.get(entry.command)?.recovered;
              const service = recovered ? undefined : measure(entry.command);
              settled.set(f.end, { frame: f, position: entry.position, ids: entry.ids });
              let next: NonNullable<typeof lastFrame> | undefined;
              while ((next = settled.get((lastFrame?.frame.end ?? 0) + width / 8))) {
                lastFrame = next;
                settled.delete(next.frame.end);
              }
              ordered.push({
                first: f.first,
                end: f.end,
                command: entry.command,
                position: entry.position,
                facts: entry.facts,
                offer: at - start,
                ack: done - start,
                service,
                pressure,
              });
            } catch (error) {
              fatal ??= error;
            } finally {
              sends.delete(command);
              admitted.delete(work);
            }
          })();
          admitted.add(work);
          staged = fixed.next().value;
        }
      } finally {
        await Promise.all(admitted);
      }
      ordered.sort((a, b) => a.first - b.first);
      assert.equal(settled.size, 0);
      assert.equal(lastFrame?.frame.end, importer.cursor());
      if (!server && !fatal) {
        const missing = fixed.next().value;
        assert(staged && missing);
        const meta = importer.frameIdentity(missing);
        missingCommand = meta.commandId;
        const refused = await writerForImport.transact(missing.operations, meta);
        assert(!refused.ok, "The transactor accepted a missing predecessor");
        assert.equal(missingCode, "ImportPredecessorMissing");
        const absent = await writerForImport.transactionByCommand(meta.commandId);
        assert(absent.ok && !absent.value, "The rejected suffix was published");
        pipelineChecks.missingPredecessor = true;
      }
    };
    const bulk = (async () => {
      if (!width || split) return;
      if (pipeline) return submitPipeline();
      const fixed = fixture?.batches(importer.cursor()) ?? frames("thin", subjects, width);
      let staged = fixed.next().value;
      while (performance.now() < end) {
        const limit = budget?.next();
        if (budget && limit === undefined) {
          budgetStopped = true;
          break;
        }
        const f = budget ? importer.nextFrame(limit!) : staged;
        if (!f || (credits && !(await credits.grant(end)))) break;
        if (micro && !temporalSeen.size && performance.now() - start >= duration / 3) {
          await exerciseTemporal();
          if (performance.now() >= end) break;
        }
        const offered = pacer ? await pacer.grant(samples) : performance.now();
        if (offered === undefined) break;
        bulkInFlight++;
        peakBulk = Math.max(peakBulk, bulkInFlight);
        const writing = importer.write(f);
        // [DX-LOAD3] Why: stage the next immutable input outside the acquisition of a serial grant.
        // Rejected: submitting a successor to the peer while the previous frame is outstanding.
        if (!budget) staged = fixed.next().value;
        const entry = await writing;
        bulkInFlight--;
        const done = performance.now();
        if (done <= end) factsInWindow += entry.facts;
        completedBulk += entry.facts;
        // [DX-LOAD3] Why: a busy diagnostic can recover an exact commit with no original timing reply.
        // Rejected: inventing its hold or repeating a committed rectangle to produce telemetry.
        const recoveredWithoutTiming =
          (diagnosticVolume || (paced && !server)) && byCommand.get(entry.command)?.recovered;
        const service =
          (budget || micro) && !recoveredWithoutTiming && !held?.referenceImport ? measure(entry.command) : undefined;
        if (micro) lastFrame = { frame: f, position: entry.position, ids: entry.ids };
        if (service && budget) budget.observe(entry.facts, service.ms);
        ordered.push({
          first: f.first,
          end: f.end,
          command: entry.command,
          position: entry.position,
          facts: entry.facts,
          offer: offered - start,
          ack: done - start,
          service,
        });
      }
    })().catch((e) => {
      fatal ??= e;
    });
    let noisy = 0,
      read = 0,
      q = 0;
    const nNoisy = alone ? 0 : Math.floor((rate * duration) / 1000),
      nQuiet = Math.floor((5 * duration) / 1000),
      nReads = allReads ? 10 * nQuiet : 0;
    while (noisy < nNoisy || q < nQuiet || read < nReads) {
      const nextNoise = noisy < nNoisy ? (1000 * noisy) / rate : Infinity,
        nextQuiet = q < nQuiet ? 200 * q : Infinity,
        nextRead = read < nReads ? 20 * read : Infinity;
      const due = Math.min(nextNoise, nextQuiet, nextRead),
        wait = start + due - performance.now();
      if (wait > 0) await delay(wait);
      // [DX-LOAD3] Why: Node timers can return before the absolute due time.
      // Rejected: subtracting an early completion from a server p99.
      if (micro) {
        while (performance.now() < start + due) await delay(1);
      }
      if (due === nextQuiet) {
        launch("quiet", "save", q, due);
        launch("quiet", "read", q++, due);
      } else if (due === nextRead) {
        launch("live" + (read % 10), "read", read++, due);
      } else {
        launch("live" + (noisy % 10), "save", noisy, nextNoise);
        noisy++;
      }
    }
    await Promise.all([...pending, bulk, observeMarkers]);
    const drained = performance.now() - start;
    const clockAfter = traceTail || micro ? await sampleClock(held?.clockRun) : undefined;
    fs.writeFileSync(
      path.join(dir, arm + ".offers.json"),
      JSON.stringify({
        nonce: process.env.TRIPLEX_TRACE_RUN,
        source: process.env.TRIPLEX_TRACE_SOURCE,
        slot: process.env.TRIPLEX_TRACE_SLOT,
        scope,
        expectedDb,
        ...(held ? { after: held.after, referenceImport: held.referenceImport } : {}),
        start,
        duration,
        clockBefore,
        clockAfter,
        budgetMs: budget?.ms,
        budgetStopped,
        pilots,
        native: [...native.values()],
        ...(micro
          ? {
              hz,
              ...(pipeline ? { depth, resumeCursor, pipelineChecks } : {}),
              ...(paced ? { pace: { baseline, decisions: pacer?.decisions ?? [] } } : {}),
              windowFacts: factsInWindow,
              cycleBudget: microCycleMs,
              markers,
              temporal: [...temporalSeen].map(
                ([command, { receipt, operations, correlationId, retryStatus }]) => ({
                  command,
                  position: receipt.position,
                  txId: receipt.txId,
                  operations,
                  correlationId,
                  retryStatus,
                }),
              ),
              lostReplies,
            }
          : {}),
        ordered,
        samples,
      }),
      { flag: "wx" },
    );
    if (invalidReceipt) throw invalidReceipt;
    if (fatal) throw fatal;
    if (pipeline && width) assert(peakBulk > 0 && peakBulk <= depth);
    else assert.equal(peakBulk, width && ordered.length ? 1 : 0);
    if (width && !budget && !split) assert(ordered.length > 0);
    const seen = new Set<string>();
    const proof = await importer.verify(
      false,
      (r) => {
        if (micro && String(r.commandId).startsWith(temporalPrefix)) {
          const expected = temporalSeen.get(r.commandId);
          assert(expected && !seen.has(r.commandId));
          assert.deepEqual(
            [r.position, r.txId, r.instant, r.actor, r.correlationId],
            [
              expected.receipt.position,
              expected.receipt.txId,
              expected.receipt.instant,
              "bulk-import",
              expected.correlationId,
            ],
          );
          assert.equal(r.changes.length, expected.operations.length);
          let asserted = 0;
          for (const [i, op] of expected.operations.entries()) {
            const c = r.changes[i];
            assert.equal(c.op, op.op);
            if (op.op === "retract") assert.equal(c.tripleId, op.id);
            else {
              const received = expected.receipt.triples[asserted++]!;
              assert.deepEqual(
                [c.tripleId, c.entityId, c.attribute, c.value, c.validFrom],
                [received.id, op.entityId, op.attribute, op.value, op.validFrom],
              );
            }
          }
          seen.add(r.commandId);
          return;
        }
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
      },
      { pageSize: micro ? 64 : allReads ? 24 : 8, readDepth: micro ? 4 : 1, assertionSweep: micro, after: held?.after },
    );
    assert.equal(seen.size, checks.size + temporalSeen.size);
    if (micro && width) {
      assert.equal(lostReplies, pipeline ? 2 : 1);
      if (pipeline) {
        assert(ordered.every((frame, i) => i === 0 || ordered[i - 1].position < frame.position));
        if (!server) assert(resumeCursor && pipelineChecks.missingPredecessor);
      }
      assert.equal(temporalSeen.size, 3);
      assert(markers.some((m) => m.done <= duration));
    }
    const otherProof = await isolated;
    if (split && width) {
      assert(otherProof);
      factsInWindow = otherProof.facts;
      completedBulk = otherProof.proof.facts;
    }
    const observations = [...native.values()],
      published = new Map(observations.map((n) => [n.command, n.position]));
    const after = held?.after ?? 0;
    const added = proof.cut - after;
    assert.equal(observations.length, added);
    assert.equal(new Set(observations.map((n) => n.position)).size, added);
    assert.equal(published.size, added);
    assert(observations.every((n) => n.position > after && n.position <= proof.cut));
    for (const [command, receipt] of checks) assert.equal(published.get(command), receipt.position);
    for (const f of ordered) assert.equal(published.get(f.command), f.position);
    const neighbors = Object.fromEntries(
      [...new Set(samples.map((s) => s.actor))].map((a) => [
        a,
        {
          save: offers(samples.filter((s) => s.actor === a && s.kind === "save")),
          read: offers(samples.filter((s) => s.actor === a && s.kind === "read")),
        },
      ]),
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
      sourceSeal: fixture?.seal ?? sourceId("thin", subjects),
      duration,
      elapsedMs: drained,
      facts: factsInWindow,
      completedBulk,
      budgetMs: budget?.ms,
      budgetStopped,
      pilots,
      aboveBudget: budget ? ordered.filter((r) => r.service.ms > budget.ms).length : undefined,
      committedFrames: otherProof?.proof.observed ?? ordered.length,
      fps: factsInWindow / (duration / 1000),
      ...(micro
        ? {
            offeredFrames: Math.floor((duration * hz) / 1000),
            ...(pipeline
              ? {
                  depth,
                  resumeCursor,
                  pipelineChecks,
                  limitedOffers: ordered.filter((f) => f.pressure.limit < depth).length,
                  pipelineTiming: pipelineTimings(ordered, observations),
                }
              : {}),
            ...(paced
              ? {
                  pacingDecisions: pacer?.decisions ?? [],
                  pipelineTiming: pipelineTimings(ordered, observations),
                }
              : {}),
            queryableFacts: (markers.findLast((m) => m.done <= duration)?.end ?? 0) * 8,
            cycleOverBudget: ordered.filter((r) => r.ack - r.offer > microCycleMs).length,
            framesWithoutService: ordered.filter((r) => !r.service).length,
            temporal: temporalSeen.size,
          }
        : {}),
      neighbors,
      peakBulk: otherProof?.peak ?? peakBulk,
      proof,
      isolated: otherProof,
    };
  } finally {
    api.DatomicClient.prototype.transact = original;
    api.DatomicClient.prototype.operation = operation;
    importer.close();
    if (other) await other.close();
    if (writerForImport !== comp) await writerForImport.close();
    await quiet.close();
  }
}
