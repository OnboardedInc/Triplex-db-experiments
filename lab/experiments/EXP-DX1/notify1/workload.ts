import assert from "node:assert/strict";
import { setTimeout as sleep } from "node:timers/promises";
import type { CompositionHandle } from "../../../bench/lib/composition.ts";
import { W0, sha256 } from "../../../bench/lib/w0-world.ts";
import { Dispatcher } from "./dispatcher.ts";
import { Relay } from "./relay.ts";
import { Notices, type Inputs, type Cut, type Request } from "./journal.ts";
import { Documents, hash, type Op, type Check, type Store } from "./store.ts";
import { type Offered, verify } from "./verify.ts";
import type { Budget } from "./budget.ts";

export type Offer = {
  atMs: number;
  seq: number;
  subject: number;
  resend?: boolean;
  ackLoss?: boolean;
  validTime?: string;
};
export interface Profile {
  inputs: Inputs;
  readWorlds?: Inputs["worlds"];
  ids: string[];
  validTime: string;
  offers: Offer[];
  write(e: Offer, cut: Cut): Promise<{ ops: Op[]; checks: Check[] }>;
  committed?(e: Offer, ack: Offered): void;
  witness(ids: string[], cut: Cut): Promise<W0.World[]>;
}
const p99 = (xs: number[]) =>
  xs.length ? [...xs].sort((a, b) => a - b)[Math.ceil(xs.length * 0.99) - 1]! : null;
export async function runWindow(opts: {
  profile: Profile;
  source: CompositionHandle;
  receiver: Store;
  workerJob?: import("./worker.ts").Job;
  epoch: string;
  gapMs: number;
  readers: number;
  duration?: number;
  pace: number;
  priority?: boolean;
  phase?: (s: string) => void;
  budget?: Budget;
  cpuSnapshot?: () => unknown;
  idle?: boolean;
  recipientPages?: number;
  releases?: number;
  readIntervalMs?: number;
}) {
  const { profile: p, source, receiver, epoch } = opts;
  const a = new Notices(source, "account", p.inputs),
    sink = new Documents(receiver, "effects");
  const release = (id: string, r: "R1" | "R2"): Request => ({
    kind: "activation",
    id,
    selection: { kind: "census" },
    release: r,
    from: p.validTime,
    validTime: p.validTime,
  });
  const sender = () =>
    opts.recipientPages
      ? new Relay(a, sink, opts.recipientPages, opts.readIntervalMs)
      : new Dispatcher(a, sink);
  if (opts.recipientPages) await new Relay(a, sink, opts.recipientPages).create(epoch, p.validTime);
  else await a.create(epoch, p.validTime);
  const history: Offered[] = [];
  const append = async (req: Request) => {
    const t = await a.observe(),
      receipt = await a.append(t, req);
    const observed = { req, receipt };
    history.push(observed);
    return observed;
  };
  await append(release("first", "R1"));
  opts.phase?.("building the original live R1 ledger");
  await sender().drain();
  // [DX-STG1] Why: retain the original quiet-window recipe timing as a
  // component measurement. Rejected: using this timer as activation proof.
  const startClick = performance.now(),
    broad = await append(release("publish", "R2")),
    activationMs = performance.now() - startClick;
  const claim = await source.transactionByCommand(a.db.command("event-command:publish"));
  assert(
    claim.ok &&
      claim.value.txId === broad.receipt.txId &&
      claim.value.position === broad.receipt.position,
  );
  const changes = claim.value.changes as { entityId: string; op: string }[];
  assert(changes.length === 4 && changes.every((x) => x.entityId.startsWith(a.db.prefix)));
  const releases = opts.releases ?? 1;
  assert(Number.isSafeInteger(releases) && releases >= 1 && releases <= 127 && releases % 2 === 1);
  // [DX-STG1] Why: multiple genuinely committed release changes keep dispatch active long enough to observe a live latency tail. Rejected: resending an already-applied packet or warming an idle worker.
  let lastPublication = broad;
  for (let i = 1; i < releases; i++)
    lastPublication = await append(release("publication-" + i, i % 2 ? "R1" : "R2"));
  const packetReaders = opts.readers;
  const saves: {
      seq: number;
      atMs: number;
      ackMs: number;
      position: number;
      beganMs: number;
      appendMs: number;
      txId: string;
    }[] = [],
    reads: {
      ordinal: number;
      atMs: number;
      latency: number;
      beganMs: number;
      subject: string;
      position: number;
      world: string;
      validTime: string;
    }[] = [];
  let through = lastPublication.receipt.position,
    latestValid = p.validTime,
    duration = opts.duration ?? Infinity;
  const worker = sender(),
    prepared = new Map<number, { req: Request; ops: Op[]; checks: Check[]; initial: Offered }>();
  const cpuBefore = opts.cpuSnapshot?.(),
    processBefore = process.cpuUsage();
  if (opts.budget) opts.budget.enabled = true;
  const start = performance.now();
  opts.phase?.(
    opts.duration === undefined ? "dispatching with live traffic" : "matched baseline traffic",
  );
  let acknowledged = 0,
    yieldingMs = 0,
    yields = 0;
  const grant = opts.priority
    ? async () => {
        const began = performance.now();
        while (
          (p.offers[acknowledged]?.atMs ?? Infinity) <= performance.now() - start &&
          performance.now() - began < 500
        )
          await sleep(2);
        const waited = performance.now() - began;
        if (waited >= 1) {
          yieldingMs += waited;
          yields++;
        }
      }
    : undefined;
  const writeLoop = async () => {
    for (const e of p.offers) {
      if (e.atMs >= duration) break;
      while (performance.now() - start < e.atMs && e.atMs < duration)
        await sleep(Math.min(50, e.atMs - (performance.now() - start)));
      if (e.atMs >= duration) break;
      const beganMs = performance.now() - start;
      const cached = prepared.get(e.seq),
        t = await a.observe();
      const req: Request = cached?.req ?? {
        id: "save-" + e.seq,
        kind: "reconcile",
        release: "R2",
        from: p.validTime,
        validTime: e.validTime ?? p.validTime,
        selection: { kind: "subjects", ids: [W0.placementId(e.subject)] },
      };
      const input = cached ?? (await p.write(e, { position: t.at, validTime: req.validTime }));
      const appendMs = performance.now() - start;
      const ack = await a.append(t, req, input.ops, input.checks);
      if (!cached) {
        const entry = { req, receipt: ack };
        history.push(entry);
        p.committed?.(e, entry);
        prepared.set(e.seq, { req, ops: input.ops, checks: input.checks, initial: entry });
      } else assert.deepEqual(ack, cached.initial.receipt);
      if (e.ackLoss) assert.deepEqual(await a.append(t, req, input.ops, input.checks), ack);
      acknowledged++;
      if (ack.position >= through) {
        through = ack.position;
        latestValid = req.validTime;
      }
      saves.push({
        seq: e.seq,
        atMs: e.atMs,
        ackMs: performance.now() - start - e.atMs,
        position: ack.position,
        beganMs,
        appendMs,
        txId: ack.txId,
      });
    }
  };
  const readLoop = async (reader: number) => {
    for (let j = 0; ; j++) {
      const scheduled = opts.pace
        ? j * opts.pace + (reader * opts.pace) / packetReaders
        : performance.now() - start;
      if (scheduled >= duration) break;
      if (opts.pace) await sleep(Math.max(0, scheduled - (performance.now() - start)));
      if (scheduled >= duration) break;
      const i = (j * 37 + reader * 13) % p.ids.length,
        subject = p.ids[i]!,
        position = through,
        validTime = latestValid;
      const t = performance.now(),
        [world] = await (p.readWorlds ?? p.inputs.worlds.bind(p.inputs))([subject], {
          position,
          validTime,
        });
      assert.equal(world?.subject, subject);
      const out = W0.evaluateWorld(world!, W0.R2, { tx: position, validTime });
      assert(!("error" in out));
      const end = performance.now();
      reads.push({
        ordinal: reader,
        atMs: scheduled,
        latency: end - t,
        beganMs: t - start,
        subject,
        position,
        validTime,
        world: hash(world!.facts.map((f) => hash(f)).sort()),
      });
    }
  };
  let drainMs: number | undefined,
    firstEffectMs: number | null = null,
    lastEffectMs: number | null = null;
  const onEffect = () => {
    lastEffectMs = performance.now() - start;
    firstEffectMs ??= lastEffectMs;
  };
  const abort = new AbortController();
  let external: typeof worker.metrics | undefined;
  const run = async () => {
    if (opts.duration !== undefined) {
      await sleep(opts.duration);
      return;
    }
    try {
      if (opts.workerJob)
        external = await (
          await import("./worker.ts")
        ).separate(opts.workerJob, grant, onEffect, abort.signal);
      else
        await worker.drain({
          through: releases + 1,
          gapMs: opts.gapMs,
          grant: async () => {
            abort.signal.throwIfAborted();
            await grant?.();
          },
          afterReceive: async () => onEffect(),
        });
    } finally {
      duration = performance.now() - start;
      drainMs = duration;
    }
  };
  const jobs = [
    run(),
    ...(opts.idle
      ? []
      : [writeLoop(), ...Array.from({ length: packetReaders }, (_, i) => readLoop(i))]),
  ];
  try {
    await Promise.all(jobs);
  } catch (e) {
    abort.abort();
    duration = 0;
    await Promise.allSettled(jobs);
    throw e;
  }
  const processCpu = process.cpuUsage(processBefore),
    cpuAfter = opts.cpuSnapshot?.();
  opts.budget?.finish();
  assert(
    Number.isFinite(duration) && p.offers.at(-1)!.atMs > duration,
    "Offered trace ended before measured window",
  );
  const dispatch = { ...(external ?? worker.metrics) };
  opts.phase?.("checking exact reads and ordered receiver bytes");
  const byCut = new Map<string, Map<string, string>>();
  for (const r of reads) {
    const key = JSON.stringify([r.position, r.validTime]),
      seen = byCut.get(key) ?? new Map<string, string>();
    if (seen.has(r.subject)) assert.equal(seen.get(r.subject), r.world);
    seen.set(r.subject, r.world);
    byCut.set(key, seen);
  }
  for (const [key, seen] of byCut) {
    const [position, validTime] = JSON.parse(key),
      subjects = [...seen.keys()];
    for (let i = 0; i < subjects.length; i += 32) {
      const group = subjects.slice(i, i + 32),
        expected = await p.witness(group, { position, validTime });
      assert.deepEqual(
        expected.map((w) => w.subject),
        group,
      );
      for (const w of expected)
        assert.equal(
          seen.get(w.subject),
          hash(w.facts.map((f) => hash(f)).sort()),
          "Pinned live read diverged",
        );
    }
  }
  let proof,
    catchupMs = 0;
  if (opts.duration === undefined) {
    const started = performance.now();
    await sender().drain();
    catchupMs = performance.now() - started;
    proof = await verify(worker, p.ids, history, p.witness.bind(p));
    assert.equal(
      proof.eventCounts.slice(1, releases + 1).reduce((a, b) => a + b, 0),
      dispatch.deliveries,
    );
  }
  return {
    epoch,
    recipientPages: opts.recipientPages ?? null,
    releases,
    catchupMs,
    readIntervalMs: opts.readIntervalMs ?? 0,
    startedAt: performance.timeOrigin + start,
    processCpu,
    cpuBefore,
    cpuAfter,
    firstEffectMs,
    lastEffectMs,
    dispatcherProcess: opts.workerJob ? "separate" : "application",
    scope: source.scopeName,
    receiver: receiver.scopeName,
    profile: p.inputs.identity,
    readers: packetReaders,
    gapMs: opts.gapMs,
    duration,
    activationMs,
    activation: {
      ...broad.receipt,
      operations: changes.length,
      assertions: changes.filter((x) => x.op === "assert").length,
      journalBytes: Buffer.byteLength(JSON.stringify(claim.value.changes)),
    },
    dispatch,
    priority: !!opts.priority,
    yields,
    yieldingMs,
    deliveriesPerSecond: drainMs ? (dispatch.deliveries * 1000) / drainMs : null,
    readP99: p99(reads.map((x) => x.latency)),
    saveP99: p99(saves.map((x) => x.ackMs)),
    readCount: reads.length,
    saveCount: saves.length,
    offerDigest: sha256(JSON.stringify(saves.map((x) => [x.seq, x.atMs]))),
    proof,
    history,
    reads,
    saves,
  };
}
