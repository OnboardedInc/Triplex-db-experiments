import assert from "node:assert/strict";
import { setTimeout as sleep } from "node:timers/promises";
import type { CompositionHandle } from "../../../bench/lib/composition.ts";
import { W0 } from "../../../bench/lib/w0-world.ts";
import { Dispatcher } from "./dispatcher.ts";
import { Notices, type Inputs, type Cut, type Request } from "./journal.ts";
import { Documents, hash, type Op, type Check } from "./store.ts";
import { type Offered, verify } from "./verify.ts";

export type Offer = {
  atMs: number;
  seq: number;
  subject: number;
  resend?: boolean;
  ackLoss?: boolean;
};
export interface Profile {
  inputs: Inputs;
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
  receiver: CompositionHandle;
  epoch: string;
  gapMs: number;
  readers: number;
  duration?: number;
  pace: number;
  phase?: (s: string) => void;
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
  await a.create(epoch, p.validTime);
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
  await new Dispatcher(a, sink).drain();
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
  const packetReaders = opts.readers;
  const saves: { seq: number; atMs: number; ackMs: number; position: number }[] = [],
    reads: {
      ordinal: number;
      atMs: number;
      latency: number;
      subject: string;
      position: number;
      world: string;
    }[] = [];
  let through = broad.receipt.position,
    duration = opts.duration ?? Infinity;
  const worker = new Dispatcher(a, sink),
    prepared = new Map<number, { req: Request; ops: Op[]; checks: Check[]; initial: Offered }>();
  const start = performance.now();
  opts.phase?.(
    opts.duration === undefined ? "dispatching with live traffic" : "matched baseline traffic",
  );
  const writeLoop = async () => {
    for (const e of p.offers) {
      if (e.atMs >= duration) break;
      while (performance.now() - start < e.atMs && e.atMs < duration)
        await sleep(Math.min(50, e.atMs - (performance.now() - start)));
      if (e.atMs >= duration) break;
      const cached = prepared.get(e.seq),
        t = await a.observe();
      const req: Request = cached?.req ?? {
        id: "save-" + e.seq,
        kind: "reconcile",
        release: "R2",
        from: p.validTime,
        validTime: p.validTime,
        selection: { kind: "subjects", ids: [W0.placementId(e.subject)] },
      };
      const input = cached ?? (await p.write(e, { position: t.at, validTime: p.validTime }));
      const ack = await a.append(t, req, input.ops, input.checks);
      if (!cached) {
        const entry = { req, receipt: ack };
        history.push(entry);
        p.committed?.(e, entry);
        prepared.set(e.seq, { req, ops: input.ops, checks: input.checks, initial: entry });
      } else assert.deepEqual(ack, cached.initial.receipt);
      if (e.ackLoss) assert.deepEqual(await a.append(t, req, input.ops, input.checks), ack);
      through = Math.max(through, ack.position);
      saves.push({
        seq: e.seq,
        atMs: e.atMs,
        ackMs: performance.now() - start - e.atMs,
        position: ack.position,
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
        position = through;
      const t = performance.now(),
        [world] = await p.inputs.worlds([subject], { position, validTime: p.validTime });
      assert.equal(world?.subject, subject);
      const out = W0.evaluateWorld(world!, W0.R2, { tx: position, validTime: p.validTime });
      assert(!("error" in out));
      const end = performance.now();
      reads.push({
        ordinal: reader,
        atMs: scheduled,
        latency: end - t,
        subject,
        position,
        world: hash(world!.facts.map((f) => hash(f)).sort()),
      });
    }
  };
  let drainMs: number | undefined;
  const run = async () => {
    if (opts.duration !== undefined) {
      await sleep(opts.duration);
      return;
    }
    try {
      await worker.drain({ through: 2, gapMs: opts.gapMs });
    } finally {
      duration = performance.now() - start;
      drainMs = duration;
    }
  };
  try {
    await Promise.all([
      run(),
      writeLoop(),
      ...Array.from({ length: packetReaders }, (_, i) => readLoop(i)),
    ]);
  } finally {
    duration = Math.min(duration, performance.now() - start);
  }
  assert(
    Number.isFinite(duration) && p.offers.at(-1)!.atMs > duration,
    "Offered trace ended before measured window",
  );
  const dispatch = { ...worker.metrics };
  opts.phase?.("checking exact reads and ordered receiver bytes");
  const seen = new Map<string, string>();
  for (const r of reads) {
    const key = r.subject + "/" + r.position;
    if (seen.has(key)) assert.equal(seen.get(key), r.world);
    else seen.set(key, r.world);
  }
  for (const [key, observed] of seen) {
    const [subject, pos] = key.split("/");
    const [expected] = await p.witness([subject!], {
      position: Number(pos),
      validTime: p.validTime,
    });
    assert.equal(
      observed,
      hash(expected!.facts.map((f) => hash(f)).sort()),
      "Pinned live read diverged",
    );
  }
  let proof;
  if (opts.duration === undefined) {
    await new Dispatcher(a, sink).drain();
    proof = await verify(worker, p.ids, history, p.witness.bind(p));
    assert.equal(proof.eventCounts[1], dispatch.deliveries);
  }
  return {
    epoch,
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
    deliveriesPerSecond: drainMs ? (dispatch.deliveries * 1000) / drainMs : null,
    readP99: p99(reads.map((x) => x.latency)),
    saveP99: p99(saves.map((x) => x.ackMs)),
    readCount: reads.length,
    saveCount: saves.length,
    offerDigest: hash(saves.map((x) => [x.seq, x.atMs])),
    proof,
    history,
    reads,
    saves,
  };
}
