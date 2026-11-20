import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { hash, sleep, type Evidence } from "../ha1/common.ts";
import { Account, errorCode, immutable, type Receipt } from "../ha1/one-db.ts";
import { DatomicClient, type Input } from "../../../../packages/datomic/test/ha1-account.ts";

export const fieldRate = 5;
const requestMs = 5500;
const callerMs = 1000;
const maxWindowMs = 90000;
const initialLeadMs = 900;
const recoveryTailMs = 1500;
const maxInFlight = { save: 32, read: 64 };
type Kind = "save" | "read";
type Result = "acknowledged" | "refused" | "timed-out" | "answered-late" | "wrong";
type Offer = {
  key: string;
  kind: Kind;
  ordinal: number;
  due: number;
  called: number | null;
  sent: number | null;
  finished: number;
  result: Result;
  code?: string;
  receipt?: Receipt;
  deep?: { subject: number; t: string; sha256: string };
};
type Plan = {
  format?: "field-offers/2";
  nonce: string;
  source: Evidence["source"];
  slot: string;
  database: string;
  label: string;
  start: number;
  rates: Record<Kind, number>;
  callerMs: number;
  requestMs: number;
  horizonMs: number;
};
type Marks = { fault?: number; routed?: number };
const kinds = ["save", "read"] as const;
const outcomes = ["acknowledged", "refused", "timed-out", "answered-late", "wrong"] as const;
const success = (r: Offer) => r.result === "acknowledged" || r.result === "answered-late";
const count = (rows: Offer[]) =>
  Object.fromEntries(outcomes.map((type) => [type, rows.filter((r) => r.result === type).length]));
const dueAt = (p: Plan, kind: Kind, n: number) => p.start + n * (1000 / p.rates[kind]);

// [DX-HASYNC1] Why: completions from work sent before the cut can land during it. Rejected: treating the full bracket between old and new receipts as one continuous outage.
export function unavailableOffers(rows: readonly Offer[], fault: number | undefined, end: number) {
  const scheduled = rows
    .filter((r) => r.kind === "save" && fault !== undefined && r.due >= fault && r.due < end)
    .sort((a, b) => a.due - b.due);
  let from: number | undefined;
  let longest: { from: number; to: number; ms: number } | null = null;
  const close = (to: number) => {
    if (from !== undefined && to - from > (longest?.ms ?? 0)) longest = { from, to, ms: to - from };
    from = undefined;
  };
  for (const r of scheduled) {
    if (r.result === "acknowledged") close(r.due);
    else from ??= r.due;
  }
  close(end);
  return { longest, outcomes: count(scheduled) };
}

export function summarizeOffers(plan: Plan, rows: Offer[], stopAt: number, marks: Marks) {
  assert(stopAt >= plan.start && stopAt <= plan.start + plan.horizonMs);
  assert(new Set(rows.map((r) => r.key)).size === rows.length);
  for (const kind of kinds) {
    const own = rows.filter((r) => r.kind === kind).sort((a, b) => a.ordinal - b.ordinal);
    for (const [n, r] of own.entries()) {
      assert.equal(r.ordinal, n);
      assert.equal(r.due, dueAt(plan, kind, n));
      assert.equal(r.key, plan.label + "-" + kind + "-" + n);
      assert(r.due < stopAt && r.finished >= r.due && outcomes.includes(r.result));
      assert(r.called === null || (r.called >= r.due && r.called <= r.finished));
      assert(r.sent === null || (r.called !== null && r.sent >= r.called && r.sent <= r.finished));
      if (kind === "save" && success(r)) {
        assert(r.sent !== null && immutable(r.receipt).operationId.endsWith("-" + r.key));
      }
      if (success(r))
        assert.equal(r.finished - r.due <= plan.callerMs, r.result === "acknowledged");
    }
    assert(dueAt(plan, kind, own.length) >= stopAt, "Missing scheduled offer");
  }
  const { fault, routed } = marks;
  if (fault !== undefined) assert(fault >= plan.start);
  if (routed !== undefined && fault !== undefined) assert(routed >= fault);
  const saves = rows.filter((r) => r.kind === "save");
  const reads = rows.filter((r) => r.kind === "read");
  const last =
    fault === undefined
      ? undefined
      : saves
          .filter((r) => r.result === "acknowledged" && r.finished < fault)
          .sort((a, b) => b.finished - a.finished)[0];
  const first =
    fault === undefined || routed === undefined
      ? undefined
      : saves
          .filter(
            (r) => r.due >= fault && (r.called ?? -1) >= routed && r.result === "acknowledged",
          )
          .sort((a, b) => a.finished - b.finished)[0];
  const cut = {
    low: last?.finished ?? (fault === undefined ? null : plan.start),
    high: first?.finished ?? null,
    leftCensored: !last,
  };
  const end = cut.high ?? stopAt;
  const during = cut.low === null ? [] : saves.filter((r) => r.due >= cut.low! && r.due < end);
  const answerTimes = [
    plan.start,
    ...reads
      .filter((r) => r.result === "acknowledged" && r.finished < stopAt)
      .map((r) => r.finished)
      .sort((a, b) => a - b),
    stopAt,
  ];
  const deep = reads.filter((r) => r.deep !== undefined);
  const deepAfterRoute = deep
    .filter((r) => r.result === "acknowledged" && routed !== undefined && r.due >= routed)
    .sort((a, b) => a.finished - b.finished);
  const maxReadGapMs = Math.max(...answerTimes.slice(1).map((t, i) => t - answerTimes[i]!));
  return {
    plan,
    marks,
    stopAt,
    first: first ?? null,
    last: last ?? null,
    cut,
    writeGapMs: cut.low === null || cut.high === null ? null : cut.high - cut.low,
    faultToNewWriteMs: first && fault !== undefined ? first.finished - fault : null,
    save: count(saves),
    read: count(reads),
    during: count(during),
    duringKeys: during.map((o) => o.key),
    ...(plan.format === "field-offers/2"
      ? { unavailable: unavailableOffers(saves, fault, first?.due ?? stopAt) }
      : {}),
    maxReadGapMs,
    ...(deep.length
      ? {
          deep: count(deep),
          firstDeepAfterRouteMs: deepAfterRoute.length
            ? deepAfterRoute[0]!.finished - routed!
            : null,
          firstDeepServiceMs: deepAfterRoute.length
            ? deepAfterRoute[0]!.finished - deepAfterRoute[0]!.due
            : null,
        }
      : {}),
    maxDispatchLagMs: Math.max(0, ...rows.map((r) => (r.called ?? r.finished) - r.due)),
    neverCalled: rows.filter((r) => r.called === null).length,
  };
}

export function recountTraffic(
  raw: string,
  timing: ReturnType<typeof summarizeOffers> & { sha256: string; raw: string },
  binding: Pick<Plan, "nonce" | "slot" | "source" | "database">,
) {
  assert.equal(hash(raw), timing.sha256);
  const lines = raw
    .trimEnd()
    .split("\n")
    .map((s) => JSON.parse(s));
  const plan = lines.shift();
  const stop = lines.pop();
  assert.equal(plan.stage, "plan");
  assert.equal(stop.stage, "stop");
  assert.deepEqual(plan.data, timing.plan);
  const { nonce, slot, database, source } = plan.data as Plan;
  assert.deepEqual({ nonce, slot, source, database }, binding);
  assert.equal(plan.data.rates.save, fieldRate);
  assert.equal(plan.data.rates.read, fieldRate * 10);
  assert.deepEqual([plan.data.callerMs, plan.data.requestMs], [callerMs, requestMs]);
  assert(
    Number.isSafeInteger(plan.data.horizonMs) &&
      plan.data.horizonMs >= maxWindowMs &&
      plan.data.horizonMs <= 600000,
  );
  assert(
    [...lines, plan, stop].every(
      (x) => x.nonce === nonce && x.slot === slot && x.database === database,
    ),
  );
  const definitions = new Map<
    string,
    { kind: Kind; ordinal: number; due: number; deep?: Offer["deep"] }
  >();
  const rows: Offer[] = [];
  for (const line of lines) {
    const d = line.data;
    if (line.stage === "offer") {
      assert(!definitions.has(d.key));
      if (d.kind === "save") assert.match(d.inputSha256, /^[a-f0-9]{64}$/);
      else {
        immutable(d.pin);
        if (d.deep) {
          assert(Number.isSafeInteger(d.deep.subject) && d.deep.subject >= 0);
          assert.match(d.deep.t, /^\d+$/);
          assert.match(d.deep.sha256, /^[0-9a-f]{64}$/);
        }
      }
      definitions.set(d.key, { kind: d.kind, ordinal: d.ordinal, due: d.due, deep: d.deep });
    } else {
      assert.equal(line.stage, "outcome");
      assert.deepEqual(definitions.get(d.key), {
        kind: d.kind,
        ordinal: d.ordinal,
        due: d.due,
        deep: d.deep,
      });
      definitions.delete(d.key);
      rows.push(d);
    }
  }
  assert.equal(definitions.size, 0);
  const result = summarizeOffers(plan.data, rows, stop.data.stopAt, stop.data.marks);
  assert.deepEqual({ ...result, raw: timing.raw, sha256: hash(raw) }, timing);
  return result;
}

export async function driveOffers(
  e: Evidence,
  ac: Account,
  pin: Receipt,
  options: {
    label?: string;
    rate?: number;
    writer: string;
    reader: string;
    horizonMs?: number;
    deepRead?:
      | ((ordinal: number) =>
          | {
              identity: NonNullable<Offer["deep"]>;
              query: (client: DatomicClient) => Promise<void>;
            }
          | undefined)
      | undefined;
  },
) {
  const label = options.label ?? "field";
  const rate = options.rate ?? fieldRate;
  assert(/^[a-z][a-z0-9-]{0,24}$/.test(label) && rate > 0 && rate <= 40);
  const clients = {
    save: new DatomicClient(options.writer, requestMs),
    read: new DatomicClient(options.reader, requestMs),
  };
  const plan: Plan = {
    format: "field-offers/2",
    nonce: e.nonce,
    source: e.source,
    slot: e.slot,
    database: ac.db,
    label,
    start: performance.now(),
    rates: { save: rate, read: 10 * rate },
    callerMs,
    requestMs,
    horizonMs: options.horizonMs ?? maxWindowMs,
  };
  const rawName = "traffic-" + label + ".jsonl";
  const fd = fs.openSync(path.join(e.dir, rawName), "wx");
  const log = (stage: string, data: unknown) =>
    fs.writeSync(
      fd,
      JSON.stringify({ stage, nonce: e.nonce, slot: e.slot, database: ac.db, data }) + "\n",
    );
  log("plan", plan);
  const offers: Offer[] = [];
  const inputs = new Map<string, Input>();
  const owned = { save: 0, read: 0 };
  const next = { save: 0, read: 0 };
  const pending = new Set<Promise<void>>();
  let timer: ReturnType<typeof setTimeout>;
  let stop: number | undefined;
  let summary: ReturnType<typeof summarizeOffers> | undefined;

  function dispatch(kind: Kind, ordinal: number, due: number) {
    const key = label + "-" + kind + "-" + ordinal;
    const input = kind === "save" ? ac.intent(key, 1 + (ordinal % 3), key) : undefined;
    const probe = kind === "read" ? options.deepRead?.(ordinal) : undefined;
    if (input) inputs.set(key, input);
    log("offer", {
      key,
      kind,
      ordinal,
      due,
      inputSha256: input ? hash(JSON.stringify(input)) : null,
      pin: input ? null : pin,
      deep: probe?.identity,
    });
    const save = (v: Offer) => {
      if (probe) v.deep = probe.identity;
      offers.push(v);
      log("outcome", v);
    };
    const now = performance.now();
    if (owned[kind] >= maxInFlight[kind] || now - due > callerMs) {
      save({
        key,
        kind,
        ordinal,
        due,
        called: null,
        sent: null,
        finished: now,
        result: now - due > callerMs ? "timed-out" : "refused",
        code: now - due > callerMs ? "sender-expired" : "sender-cap",
      });
      return;
    }
    owned[kind]++;
    // [DX-HASYNC1] Why: every due time and primary outcome survives the failed cell for independent recount. Rejected: pacing with ACKs or quietly retrying before accounting for the missed caller deadline.
    const work = (async () => {
      const called = performance.now();
      let sent: number | null = null;
      let receipt: Receipt | undefined;
      let code: string | undefined;
      let result: Result;
      try {
        if (input) {
          const raw = await clients.save.transact(ac.db, input, () => {
            sent ??= performance.now();
          });
          receipt = ac.remember(input, raw);
        } else await (probe?.query(clients.read) ?? ac.pinned(pin, clients.read));
        result = "acknowledged";
      } catch (error) {
        code = errorCode(error) ?? "value-mismatch";
        result =
          code === "value-mismatch"
            ? "wrong"
            : code === "Transport" || code === "OutcomeUnknown"
              ? "timed-out"
              : "refused";
      }
      const finished = performance.now();
      if (result === "acknowledged" && finished - due > callerMs) result = "answered-late";
      save({
        key,
        kind,
        ordinal,
        due,
        called,
        sent,
        finished,
        result,
        ...(code === undefined ? {} : { code }),
        ...(receipt === undefined ? {} : { receipt }),
      });
    })().finally(() => {
      active();
    });
    function active() {
      owned[kind]--;
      pending.delete(work);
    }
    pending.add(work);
  }
  const tick = () => {
    const limit = Math.min(stop ?? performance.now(), plan.start + plan.horizonMs);
    for (const kind of kinds) {
      while (dueAt(plan, kind, next[kind]) < limit)
        dispatch(kind, next[kind], dueAt(plan, kind, next[kind]++));
    }
    if (stop === undefined && performance.now() < plan.start + plan.horizonMs) {
      const nextDue = Math.min(...kinds.map((kind) => dueAt(plan, kind, next[kind])));
      timer = setTimeout(tick, Math.max(1, Math.ceil(nextDue - performance.now())));
    }
  };
  tick();
  return {
    lead: () => sleep(initialLeadMs),
    async finish(marks: Marks = {}, withRecoveryTail = false) {
      if (summary) return summary;
      if (withRecoveryTail) await sleep(recoveryTailMs);
      stop = Math.min(performance.now(), plan.start + plan.horizonMs);
      clearTimeout(timer);
      tick();
      try {
        await Promise.all(pending);
        log("stop", { stopAt: stop, marks });
      } finally {
        fs.closeSync(fd);
        for (const c of Object.values(clients)) c.close();
      }
      summary = summarizeOffers(plan, offers, stop, marks);
      e.write("traffic-" + label + "-timing", {
        ...summary,
        raw: rawName,
        sha256: hash(fs.readFileSync(path.join(e.dir, rawName))),
      });
      return summary;
    },
    async resolve() {
      assert(summary, "Seal timed evidence before retrying");
      assert(!offers.some((o) => o.result === "wrong"), "Wrong answer in scheduled traffic");
      const settlements: { key: string; disposition: "original" | "retried"; receipt: Receipt }[] =
        [];
      const todo = [...inputs];
      let work = 0;
      const verification = await Promise.allSettled(
        Array.from({ length: 4 }, async () => {
          for (;;) {
            const job = todo[work++];
            if (!job) return;
            const [key, input] = job;
            const found = await ac.r.operation(ac.db, input.operationId);
            let receipt: Receipt;
            const disposition = found.status === "committed" ? "original" : "retried";
            if (found.status === "committed") {
              receipt = ac.remember(input, found);
            } else {
              assert(
                !ac.receipts.has(input.operationId),
                "Acknowledged offer missing from survivor",
              );
              receipt = await ac.send(input);
            }
            await ac.pinned(receipt);
            settlements.push({ key, disposition, receipt });
          }
        }),
      );
      e.write("traffic-" + label + "-settlement", {
        nonce: e.nonce,
        database: ac.db,
        source: e.source,
        slot: e.slot,
        raw: rawName,
        settlements,
      });
      for (const v of verification) if (v.status === "rejected") throw v.reason;
      assert.equal(settlements.length, inputs.size);
      assert.equal(new Set(settlements.map((s) => s.receipt.position.v)).size, inputs.size);
      return { inputs: [...inputs.values()], settlements };
    },
  };
}
