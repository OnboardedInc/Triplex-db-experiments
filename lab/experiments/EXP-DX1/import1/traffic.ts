import assert from "node:assert/strict";
import { fork } from "node:child_process";
import { DatabaseSync } from "node:sqlite";
import { setTimeout as delay } from "node:timers/promises";
import { join } from "node:path";
import { buildTraceCommand, type SubjectState } from "../../../bench/lib/commands.ts";
import { deepOwnFacts, deepShape } from "../../../bench/lib/deep-world.ts";
import { ids, SEED_VALID_FROM, type Fact } from "../../../bench/lib/world.ts";
import { generateTrace, traceDigest, type TraceEvent } from "../../../bench/lib/trace.ts";
import { checkV3Trace } from "../../../bench/lib/verdict-plan.ts";
import { openComposition, type Basis } from "../../../bench/lib/composition.ts";
import { openNative } from "./native.ts";
import { bytes, sha } from "./source.ts";
export const cycleMs = 7200000;
export const frozen = () => {
  const events = generateTrace({ seed: "ns-v2", subjects: 10000, durationS: 7200 });
  checkV3Trace(events);
  return events;
};
export interface TrafficSpec {
  scope: string;
  index: number;
  scopes: number;
  readers: number;
  full: boolean;
  dir: string;
  tag: string;
  offset: number;
  smallWindow: number;
}
const rowKey = (e: string, a: string, v: unknown, from: number, to: number | null = null) =>
  bytes([e, a, v, from, to]);
function logical(i: number, edits: Map<string, { fact: Fact; from: number } | null>) {
  const rows = new Map<string, { fact: Fact; from: number }>();
  for (const f of deepOwnFacts(i))
    rows.set(rowKey(f.e, f.a, f.v, SEED_VALID_FROM), { fact: f, from: SEED_VALID_FROM });
  for (const [k, v] of edits) {
    if (v) rows.set(k, v);
    else rows.delete(k);
  }
  const by = new Map<string, typeof rows>();
  for (const [k, v] of rows) {
    const a = by.get(v.fact.e) ?? new Map();
    a.set(k, v);
    by.set(v.fact.e, a);
  }
  const seen = new Set([ids.placement(i)]),
    keys: string[] = [];
  for (const e of seen)
    for (const [k, v] of by.get(e) ?? []) {
      keys.push(k);
      if (v.fact.v.type === "ref") seen.add(v.fact.v.value);
    }
  return sha(bytes(keys.sort()));
}
export async function serveTraffic(s: TrafficSpec) {
  const t = await openNative(s.scope, "snapshot"),
    reader = await openComposition("reach-touched", "datomic", s.scope);
  const events = frozen(),
    digest = traceDigest(events),
    roster = s.full
      ? Array.from({ length: 10000 }, (_, i) => i)
      : [
          ...new Set([
            ...events
              .filter(
                (e) =>
                  e.subject % s.scopes === s.index &&
                  e.atMs >= s.offset - 5000 &&
                  e.atMs < s.offset + s.smallWindow + 3000,
              )
              .map((e) => e.subject),
            s.index,
          ]),
        ].sort((a, b) => a - b);
  const states = new Map<number, SubjectState>(),
    edits = new Map<number, Map<string, { fact: Fact; from: number } | null>>(),
    expected = new Map<number, string>();
  const db = new DatabaseSync(join(s.dir, "traffic-" + s.index + ".sqlite"));
  db.exec(
    "PRAGMA journal_mode=WAL; CREATE TABLE samples(kind TEXT, offset REAL, ms REAL, key TEXT, cut INTEGER, digest TEXT); CREATE INDEX times ON samples(kind,offset); BEGIN",
  );
  const insert = db.prepare("INSERT INTO samples VALUES(?,?,?,?,?,?)");
  let samples = 0;
  const record = (kind: string, offset: number, ms: number, key: string, p: number, d: string) => {
    insert.run(kind, offset, ms, key, p, d);
    if (++samples % 2048 === 0) db.exec("COMMIT; BEGIN");
  };
  let head = await t.currentPosition(),
    seedFacts = 0,
    sent = 0,
    acked = 0,
    observed = 0;
  assert.equal(head, 0, "Live scope must start empty");
  try {
    let batch: any[] = [];
    const flush = async () => {
      if (!batch.length) return;
      const id = s.tag + "/seed/" + seedFacts;
      const ack = await t.transact(batch, { commandId: id, actor: "live-seed" });
      assert(ack.ok);
      assert.equal(ack.value.triples.length, batch.length);
      for (const [j, a] of ack.value.triples.entries()) {
        const op = batch[j];
        assert.deepEqual([a.entityId, a.attribute, a.value], [op.entityId, op.attribute, op.value]);
        const i = Number(a.entityId.split(":")[1]);
        if (a.attribute === ":placement/stamp")
          states.set(i, {
            ...states.get(i),
            stamp: 0,
            stampId: a.id,
            stampValidFrom: SEED_VALID_FROM,
          } as SubjectState);
        if (a.attribute === ":worker/address")
          states.set(i, {
            ...states.get(i),
            addressId: a.id,
            address: a.value.value,
            addressValidFrom: SEED_VALID_FROM,
          } as SubjectState);
      }
      seedFacts += batch.length;
      head = ack.value.position;
      batch = [];
    };
    for (const i of roster) {
      const a = deepOwnFacts(i);
      assert.equal(a.length, deepShape(i).facts);
      if (batch.length + a.length > 2000) await flush();
      batch.push(
        ...a.map((f) => ({
          op: "assert",
          entityId: f.e,
          attribute: f.a,
          value: f.v,
          validFrom: SEED_VALID_FROM,
        })),
      );
    }
    await flush();
    assert.equal(states.size, roster.length);
    for (const st of states.values()) assert(st.stampId && st.addressId);
    const start = Promise.withResolvers<number>();
    let end = Infinity,
      aborted = false;
    process.on("message", (m: any) => {
      if (m.type === "start") {
        assert.equal(m.tag, s.tag);
        end = m.end ?? Infinity;
        start.resolve(m.at);
      }
      if (m.type === "stop") {
        assert.equal(m.tag, s.tag);
        end = Math.min(end, m.at);
      }
      if (m.type === "abort") {
        aborted = true;
        end = Date.now();
        start.reject(Error("Aborted cohort"));
      }
    });
    process.send!({
      type: "ready",
      tag: s.tag,
      scope: s.scope,
      seedFacts,
      people: roster.length,
      digest,
    });
    const at = await start.promise;
    await delay(Math.max(0, at - Date.now()));
    let failure: unknown;
    const fail = (e: unknown) => {
      failure ??= e;
      end = Date.now();
    };
    const read = async (n: number) => {
      let turn = n;
      while (Date.now() < end && !failure && !aborted) {
        const i = roster[(turn++ * 37) % roster.length]!,
          root = ids.placement(i),
          p = head;
        const wanted = expected.get(i) ?? logical(i, edits.get(i) ?? new Map());
        expected.set(i, wanted);
        const wall = Date.now(),
          tick = performance.now();
        const r = await reader.pull(root, {
          recordedPosition: p,
          validAt: SEED_VALID_FROM + cycleMs + 1,
        } as Basis);
        const ms = performance.now() - tick,
          actual = sha(
            bytes(
              r.triples
                .map((a) =>
                  rowKey(a.entityId, a.attribute, a.value, a.validFrom!, a.validTo?.value ?? null),
                )
                .sort(),
            ),
          );
        assert.equal(
          actual,
          wanted,
          "Pinned live world differs from source and acknowledged edits",
        );
        record("read", wall - at, ms, root, p, actual);
        observed++;
      }
    };
    const reading = Array.from({ length: s.readers }, (_, j) => read(j).catch(fail));
    const mine = events.filter((e) => e.subject % s.scopes === s.index);
    const write = async (e: TraceEvent, cycle: number, offset: number) => {
      const key = s.tag + "/" + cycle,
        cmd = key + ":t" + e.seq;
      const st = states.get(e.subject);
      assert(st);
      if (e.resend) {
        const prior = await t.transactionByCommand(cmd);
        assert(prior.ok && prior.value && prior.value.commandId === cmd);
        return;
      }
      const b = buildTraceCommand({
        runTag: key,
        event: e,
        state: st,
        scheduledAbsMs: SEED_VALID_FROM + e.atMs,
      });
      // [DX-ACT1] Why: retain the frozen offers and bytes while giving event entities in repeated two-hour trace epochs distinct identities. Rejected: replaying a later epoch into earlier event entities.
      const epoch = (x: string) => (cycle && x.startsWith("evt:") ? "e" + cycle + "/" + x : x);
      for (const o of b.operations)
        if (o.op === "assert") {
          o.entityId = epoch(o.entityId);
          if (o.value.type === "ref") o.value = { ...o.value, value: epoch(o.value.value) };
        }
      const r = await t.transact(b.operations, {
        commandId: b.commandId,
        actor: e.kind,
        preconditions: b.preconditions,
      });
      assert(r.ok);
      if (e.ackLoss) {
        const q = await t.transactionByCommand(cmd);
        assert(q.ok && q.value.txId === r.value.txId && q.value.position === r.value.position);
      }
      const done = performance.timeOrigin + performance.now(),
        map = edits.get(e.subject) ?? new Map();
      for (const [j, f] of b.removed.entries())
        map.set(rowKey(f.e, f.a, f.v, b.removedValidFrom[j]!), null);
      const adds = b.operations.filter((o) => o.op === "assert");
      assert.equal(r.value.triples.length, adds.length);
      for (const [j, a] of r.value.triples.entries()) {
        const o = adds[j];
        assert.deepEqual([a.entityId, a.attribute, a.value], [o.entityId, o.attribute, o.value]);
        const fact = { e: o.entityId, a: o.attribute, v: o.value };
        map.set(rowKey(fact.e, fact.a, fact.v, o.validFrom), { fact, from: o.validFrom });
        if (a.attribute === ":placement/stamp")
          Object.assign(st, { stamp: b.newStamp, stampId: a.id, stampValidFrom: o.validFrom });
        if (a.attribute === ":worker/address")
          Object.assign(st, {
            address: b.newAddress,
            addressId: a.id,
            addressValidFrom: o.validFrom,
          });
      }
      edits.set(e.subject, map);
      expected.delete(e.subject);
      head = r.value.position;
      record("commit", offset, done - (at + offset), cmd, head, sha(bytes(b.operations)));
      acked++;
    };
    let chain = Promise.resolve(),
      cycle = 0,
      oldest = 0;
    while (Date.now() < end && !failure && !aborted) {
      for (const e of mine) {
        const offset = cycle * cycleMs + e.atMs - s.offset;
        if (offset < 0) continue;
        // Resends whose original fell before this sampled window have no source claim in this fresh scope.
        if (!cycle && e.resend && events.find((x) => !x.resend && x.seq === e.seq)!.atMs < s.offset)
          continue;
        const due = at + offset;
        while (Date.now() < Math.min(due, end) && !failure && !aborted)
          await delay(Math.min(50, Math.max(1, Math.min(due, end) - Date.now())));
        if (due >= end || failure || aborted) break;
        if (!e.resend) sent++;
        process.send!({ type: "live", change: 1, tag: s.tag });
        const cycleForJob = cycle;
        chain = chain
          .then(async () => {
            if (failure) return;
            oldest = Math.max(oldest, Date.now() - due);
            await write(e, cycleForJob, offset);
          })
          .catch(fail)
          .finally(() => process.send!({ type: "live", change: -1, tag: s.tag }));
      }
      cycle++;
    }
    await chain;
    await Promise.all(reading);
    if (failure) throw failure;
    assert(!aborted && sent === acked && observed > 0);
    db.exec("COMMIT");
    process.send!({
      type: "done",
      tag: s.tag,
      scope: s.scope,
      offered: sent,
      committed: acked,
      observed,
      oldest,
      head,
      seedFacts,
      digest,
    });
  } finally {
    db.close();
    await reader.close();
    await t.close();
  }
}
export function actor(s: TrafficSpec, notify: (d: number) => void) {
  const c = fork(import.meta.filename, ["--actor"], {
    stdio: ["ignore", "inherit", "inherit", "ipc"],
  });
  let terminal: any;
  const ready = Promise.withResolvers<any>(),
    done = Promise.withResolvers<any>();
  void ready.promise.catch(() => {});
  void done.promise.catch(() => {});
  c.on("message", (m: any) => {
    if (m.tag !== s.tag) {
      ready.reject(Error("Foreign actor"));
      done.reject(Error("Foreign actor"));
      return;
    }
    if (m.type === "ready") ready.resolve(m);
    if (m.type === "done") terminal = m;
    if (m.type === "live") notify(m.change);
  });
  const fail = (e: Error) => {
    ready.reject(e);
    done.reject(e);
  };
  c.on("error", fail);
  c.on("exit", (code) => {
    if (code !== 0) fail(Error("Traffic process exited " + code));
    else {
      ready.reject(Error("Missing readiness"));
      if (terminal) done.resolve(terminal);
      else done.reject(Error("Missing terminal"));
    }
  });
  c.send(s);
  return {
    ready: ready.promise,
    done: done.promise,
    send: (m: object) => c.send({ ...m, tag: s.tag }),
    close: () => {
      if (c.connected) c.kill();
    },
  };
}
if (process.argv[2] === "--actor")
  process.once(
    "message",
    (s: TrafficSpec) =>
      void serveTraffic(s)
        .then(() => process.disconnect!())
        .catch((e) => {
          console.error(e);
          process.exit(1);
        }),
  );
