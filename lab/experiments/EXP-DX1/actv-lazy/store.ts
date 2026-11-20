import { bytes as wireBytes } from "../import1/source.ts";
import assert from "node:assert/strict";
import {
  requireDatomicSourcePosition,
  DatomicClient,
} from "../../../../packages/datomic/dist/index.js";
import { Effect, openTriples, runtimeApi } from "../../../bench/lib/triplex.ts";
import { openComposition } from "../../../bench/lib/composition.ts";
import { canonical, sha256, W0, type WorldRow } from "../../../bench/lib/w0-world.ts";

export const RELEASE = "lazy/account/releases",
  ORIGIN = "lazy/account/origin",
  CLOCK = "lazy/account/clock",
  MASK = "lazy/account/erasure",
  CURSOR = "lazy/account/dispatcher";
export const membership = (s: string) => "lazy/member/" + s;
export const epoch = "2000-01-01T00:00:00.000000Z";
export function millis(v: string) {
  assert(W0.isInstant(v), "Invalid W0 business instant");
  return Date.parse(v.slice(0, 19) + "Z") + Number(v.slice(20, 26)) / 1000;
}
export const fact = (entityId: string, attribute: string, data: unknown) => ({
  op: "assert" as const,
  entityId,
  attribute,
  value: { type: "string", value: canonical(data) },
  validFrom: 0,
});
export const value = (row: WorldRow) => JSON.parse(row.value.value);
export class Conflict extends Error {}
export type EventKind = "activation" | "source" | "due" | "erase" | "baseline";
export interface Event {
  kind: EventKind;
  at: string;
  from?: string;
  release?: string;
  subject?: string;
  attribute?: string;
  due?: string;
}
export async function openStore(
  scope: string,
  profile: "w0" | "act2-deep" = "w0",
  access: "write" | "read" = "write",
) {
  assert(/^lazy-[a-z0-9-]+$/.test(scope));
  const key = String(runtimeApi.DatabaseScope.test(scope)),
    client = new DatomicClient(process.env.DATOMIC_URL!);
  try {
    const policy = await client.create(key, "lean", true);
    assert(
      policy.strictRecordClocks && policy.db === "s2-" + Buffer.from(key).toString("base64url"),
    );
  } finally {
    client.close();
  }
  const h = access === "write" ? await openTriples("datomic", scope) : undefined,
    comp = await openComposition("reach", "datomic", scope);
  const counters = { writes: 0, accountReads: 0, subjectRoots: 0, rosterRoots: 0, ackObserved: 0 };
  const rows = async (ids: string[], position: number, validTime = epoch) => {
    const basis = { position, validAt: millis(validTime) };
    for (const id of ids) {
      if (id.startsWith("members/page/")) counters.rosterRoots++;
      else if (id.startsWith("lazy/account/")) counters.accountReads++;
      else counters.subjectRoots++;
    }
    const page = await comp.sweepPage(ids, basis);
    assert.deepEqual(page.reportedBasis, basis);
    return page.rows;
  };
  async function lookup(id: string) {
    const r = await comp.transactionByCommand(id);
    assert(r.ok);
    return r.value;
  }
  async function commit(
    id: string,
    actor: string,
    ops: readonly any[],
    expected: number,
    context: unknown = null,
    afterFence?: () => Promise<void>,
    onAck?: (t: number) => void,
  ) {
    assert(h, "A demand reader has no publication authority");
    assert(id.length && Number.isSafeInteger(expected) && expected >= 0);
    const correlationId = canonical({ context, hash: sha256(wireBytes([scope, id, actor, ops])) });
    const check = (r: any) => {
      assert(
        r &&
          r.commandId === id &&
          r.actor === actor &&
          r.correlationId === correlationId &&
          r.txId &&
          Number.isSafeInteger(r.position),
      );
      assert.equal(r.changes.length, ops.length);
      for (const [i, o] of ops.entries()) {
        const c = r.changes[i];
        if (o.op === "assert")
          assert.deepEqual(
            [
              c.op,
              c.entityId,
              c.attribute,
              c.value,
              c.validFrom,
              c.validTo ?? null,
              c.assertionTxId,
            ],
            [o.op, o.entityId, o.attribute, o.value, o.validFrom, o.validTo ?? null, r.txId],
          );
        else {
          assert.equal(o.op, "retract");
          assert.deepEqual([c.op, c.tripleId, c.retractionTxId], [o.op, o.id, r.txId]);
        }
      }
      return r;
    };
    const old = await lookup(id);
    if (old) return check(old);
    const exit = await h.runExit(
      h.storage.withTransaction(
        Effect.gen(function* () {
          yield* requireDatomicSourcePosition(key, expected);
          if (afterFence) yield* Effect.promise(afterFence);
          return yield* h.triples.transact(ops, {
            commandId: id,
            actor,
            correlationId,
            preconditions: ops
              .filter((o) => o.op === "retract")
              .map((o) => ({ _tag: "TripleLive", id: o.id })),
          });
        }),
      ),
    );
    if (exit._tag === "Success") {
      counters.writes++;
      counters.ackObserved = performance.now();
      onAck?.(counters.ackObserved);
    }
    const stored = await lookup(id);
    if (stored) return check(stored);
    if ((await comp.currentPosition()) !== expected)
      throw new Conflict("Source changed at admission");
    throw Error(
      "Native write had no receipt: " +
        String(exit.cause?.reasons?.[0]?.error?.message ?? exit._tag),
    );
  }
  async function controls(p: number, inputOnly = false) {
    const all = await rows(
      inputOnly ? [RELEASE, CLOCK, ORIGIN] : [RELEASE, CLOCK, MASK, CURSOR, ORIGIN],
      p,
    );
    const birth = all.find(
      (r) => r.position === 1 && (r.entityId === ORIGIN || r.entityId === RELEASE),
    );
    if (p)
      assert(birth && value(birth).profile === profile, "Foreign source profile or generation");
    const releases = all
      .filter((r) => r.entityId === RELEASE)
      .map((r) => ({ ...value(r), tx: r.position, id: r.id }));
    const clocks = all.filter((r) => r.entityId === CLOCK);
    assert(clocks.length <= 1);
    const at = [epoch, ...releases.map((r) => r.at), ...clocks.map((r) => value(r).at)]
      .sort()
      .at(-1)!;
    const cursors = all.filter((r) => r.entityId === CURSOR);
    assert(cursors.length <= 1);
    const masks = all.filter((r) => r.entityId === MASK);
    const input = Math.max(
      0,
      ...releases.map((r) => r.tx),
      ...clocks.map((r) => r.position),
      ...masks.map((r) => r.position),
    );
    return {
      generation: birth?.id ?? "uninitialized",
      releases,
      at,
      clock: clocks[0],
      cursor: cursors[0],
      masks,
      input,
    };
  }
  async function input(
    id: string,
    event: Event,
    ops: readonly any[] = [],
    onAck?: (t: number) => void,
  ) {
    assert(h, "A demand reader has no source write authority");
    assert(
      W0.isInstant(event.at) &&
        ["activation", "source", "due", "erase", "baseline"].includes(event.kind),
    );
    const prior = await lookup(id);
    const intent = sha256(wireBytes([scope, id, event, ops]));
    if (prior) {
      assert.equal(prior.actor, "lazy/input");
      assert.deepEqual(JSON.parse(prior.correlationId).context, { event, intent, profile });
      return prior;
    }
    for (;;) {
      const p = await comp.currentPosition(),
        c = await controls(p, true);
      assert(!c.clock || !value(c.clock).joined, "Use joined source admission");
      assert(event.at >= c.at, "Business slots must be monotone");
      let writes: any[];
      if (event.kind === "activation") {
        assert(
          !ops.length &&
            event.release &&
            W0.RELEASES_BY_HASH.has(event.release) &&
            event.from &&
            W0.isInstant(event.from),
        );
        writes = [fact(RELEASE, "lazy/activation", { ...event, profile })];
      } else {
        assert(
          ops.every((o) => o.op === "retract" || !o.entityId.startsWith("lazy/")),
          "Reserved account metadata",
        );
        for (const op of ops)
          if (op.op === "retract") {
            const previous: any = await h.run(h.storage.getById(op.id));
            assert(
              previous &&
                !previous.entity_id.startsWith("lazy/") &&
                !previous.entity_id.startsWith("members/page/"),
              "Reserved or absent retraction",
            );
          }
        writes = [
          ...ops,
          ...(c.clock ? [{ op: "retract", id: c.clock.id }] : []),
          fact(CLOCK, "lazy/slot", event),
        ];
        for (const op of ops)
          if (op.op === "assert" && op.entityId.startsWith("members/page/")) {
            const people: string[] = JSON.parse(op.value.value);
            assert(
              op.attribute === "lazy/members" &&
                people.every((x) => typeof x === "string" && x.startsWith("pl:")),
            );
            assert.deepEqual(people, [...new Set(people)].sort());
            for (const subject of people)
              writes.push(fact(membership(subject), "lazy/member", { subject }));
          }
        if (!p) writes.push(fact(ORIGIN, "lazy/generation", { profile }));
        if (event.kind === "erase") {
          assert(event.subject && event.attribute);
          writes.push(fact(MASK, "lazy/redact", event));
        }
      }
      try {
        return await commit(
          id,
          "lazy/input",
          writes,
          p,
          { event, intent, profile },
          undefined,
          onAck,
        );
      } catch (e) {
        if (!(e instanceof Conflict)) throw e;
        const won = await lookup(id);
        if (won) {
          assert.deepEqual(JSON.parse(won.correlationId).context, { event, intent, profile });
          return won;
        }
      }
    }
  }
  let verifiedEffects = 0;
  let verifiedCursor: string | undefined;
  async function cursorReceipt(row: WorldRow | undefined) {
    if (!row) return false;
    if (row.id === verifiedCursor) return true;
    const cur = value(row),
      t = (await comp.feedPage(row.position - 1, 1)).transactions[0];
    if (
      t?.actor !== "lazy/event" ||
      t.position !== row.position ||
      !t.changes.some(
        (c: any) =>
          c.op === "assert" &&
          c.tripleId === row.id &&
          c.entityId === CURSOR &&
          c.value.value === canonical(cur),
      ) ||
      canonical(JSON.parse(t.correlationId).context.next) !== canonical(cur)
    )
      return false;
    if (cur.done) {
      const original = (await comp.feedPage(cur.done - 1, 1)).transactions[0];
      if (
        original?.actor !== "lazy/input" ||
        original.position !== cur.done ||
        original.txId !== cur.eventId ||
        typeof cur.digest !== "string" ||
        !/^[a-f0-9]{64}$/.test(cur.digest)
      )
        return false;
    }
    verifiedCursor = row.id;
    return true;
  }
  async function effectsClear(cursorPosition: number, p: number) {
    let at = Math.max(cursorPosition, Math.min(p, verifiedEffects));
    while (at < p) {
      const page = await comp.feedPage(at, 16);
      assert(page.transactions.length, "Missing effect prefix");
      for (const t of page.transactions) {
        if (t.position > p) break;
        assert.equal(t.position, ++at);
        if (
          !["lazy/ack", "lazy/live", "lazy/event"].includes(t.actor) ||
          t.changes.some((c: any) => !c.entityId.startsWith("lazy/"))
        )
          return false;
      }
    }
    verifiedEffects = Math.max(verifiedEffects, p);
    return true;
  }
  return {
    scope,
    profile,
    counters,
    effectsClear,
    cursorReceipt,
    comp,
    rows,
    lookup,
    commit,
    controls,
    input,
    head: () => comp.currentPosition(),
    close: async () => {
      await comp.close();
      await h?.close();
    },
  };
}
export type Store = Awaited<ReturnType<typeof openStore>>;
export type Controls = Awaited<ReturnType<Store["controls"]>>;
export const activation = (
  s: Store,
  id: string,
  r: W0.CompiledRelease,
  at: string,
  from = at,
  onAck?: (t: number) => void,
) => s.input(id, { kind: "activation", at, from, release: r.hash }, [], onAck);
