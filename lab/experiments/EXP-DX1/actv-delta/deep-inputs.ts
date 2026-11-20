import assert from "node:assert/strict";
import { W0, canonical } from "../../../bench/lib/w0-world.ts";
import { ids, subjectOf } from "../../../bench/lib/world.ts";
import type { BuiltCommand } from "../../../bench/lib/commands.ts";
import type { CompositionHandle, Receipt } from "../../../bench/lib/composition.ts";

type Source = {
  entityId: string;
  attribute: string;
  value: { type: string; value: string };
  validFrom: number;
  validTo?: number | null;
  id: string;
  tx: number;
  removed?: number;
};
const fields = new Set([
  ":person/custom-start",
  ":person/custom-pay-cents",
  ":person/custom-weekly-minutes",
  ":person/custom-state-floor",
  ":person/custom-local-floor",
  ":person/custom-background",
  ":placement/task",
  ":task/progress",
  ":person/file",
  ":file/expiresOn",
]);
function through(value: any): number | null {
  if (value == null || value._tag === "None") return null;
  const t = value._tag === "Some" ? value.value : value;
  assert(Number.isSafeInteger(t), "native assertion has an invalid upper valid bound");
  return t;
}
const bytes = (r: Pick<Source, "entityId" | "attribute" | "value" | "validFrom" | "validTo">) =>
  canonical([r.entityId, r.attribute, r.value, r.validFrom, through(r.validTo)]);
const ordered = (xs: readonly unknown[]) => xs.map(canonical).sort();
export function compareWorlds(actual: readonly W0.World[], expected: readonly W0.World[]) {
  assert.deepEqual(
    actual.map((w) => [w.subject, ordered(w.facts)]),
    expected.map((w) => [w.subject, ordered(w.facts)]),
    "native source projection differs from commanded inputs",
  );
}

// [DX-ACT2] Why: derive expected rule inputs from the commanded native assertions and verified journal changes. Rejected: feeding the product's projected World to both the publisher and the oracle.
export class DeepInputs {
  private readonly bySubject = new Map<number, Map<string, Source>>();
  ingestSeed(ops: readonly any[], ack: Receipt) {
    const native = new Map(ack.triples.map((r) => [bytes(r as Source), r.id]));
    for (const row of ops) {
      if (!fields.has(row.attribute)) continue;
      const id = native.get(bytes(row));
      assert(id, "expected fixture input was absent from the native receipt: " + bytes(row));
      this.put({ ...row, id, tx: ack.position });
    }
  }
  private put(row: Source) {
    if (!fields.has(row.attribute)) return;
    const n = subjectOf(row.entityId);
    assert(n !== null);
    const group = this.bySubject.get(n) ?? new Map<string, Source>();
    group.set(row.id, { ...row, validTo: through(row.validTo) });
    this.bySubject.set(n, group);
  }
  async save(
    journal: CompositionHandle,
    command: string,
    n: number,
    sent: BuiltCommand,
    ack: Receipt,
  ) {
    const observed = await journal.transactionByCommand(command),
      actual = observed.ok ? observed.value : null;
    assert(
      actual &&
        actual.commandId === command &&
        actual.txId === ack.txId &&
        actual.position === ack.position,
    );
    const written = actual.changes.filter(
        (x: any) => fields.has(x.attribute) || subjectOf(x.entityId) !== null,
      ),
      additions = written.filter((x: any) => x.op === "assert"),
      removals = written.filter((x: any) => x.op === "retract");
    const wants = sent.operations.filter((x) => x.op === "assert");
    assert.deepEqual(
      additions.map(bytes).sort(),
      wants.map(bytes).sort(),
      "native assertions differ from save command",
    );
    assert.deepEqual(
      removals.map((x: any) => x.tripleId).sort(),
      sent.operations.flatMap((x) => (x.op === "retract" ? [x.id] : [])).sort(),
      "native retractions differ from the save command",
    );
    assert.deepEqual(
      removals.map(bytes).sort(),
      sent.removed
        .map((x, i) =>
          bytes({
            entityId: x.e,
            attribute: x.a,
            value: x.v as Source["value"],
            validFrom: sent.removedValidFrom[i]!,
          }),
        )
        .sort(),
    );
    for (const r of removals) {
      const old = this.bySubject.get(n)?.get(r.tripleId);
      if (old) {
        assert(old.removed === undefined);
        old.removed = ack.position;
      }
    }
    for (const r of additions) this.put({ ...r, id: r.tripleId, tx: nativeOrdinal(ack.position) });
  }
  world(n: number, position: number, valid: number, floorPosition: number): W0.World {
    const S = W0.placementId(n),
      loc = "loc:l" + n,
      scoped = n % 100 === 17,
      jur = scoped
        ? "jur:j" + String(10 * (1 + (Math.floor(n / 100) % 10))).padStart(3, "0")
        : "jur:u" + n;
    const facts: W0.Fact[] = [];
    const source = [...(this.bySubject.get(n)?.values() ?? [])].filter(
      (x) =>
        x.tx <= position &&
        (x.removed === undefined || position < x.removed) &&
        x.validFrom <= valid &&
        (x.validTo == null || valid < x.validTo),
    );
    const single = (entity: string, attr: string) => {
      const only = source.filter((x) => x.entityId === entity && x.attribute === attr);
      assert.equal(only.length, 1, "invalid source cardinality for " + attr);
      return only[0]!;
    };
    const leaf = (attr: string) => single(ids.worker(n), ":person/custom-" + attr);
    const put = (e: string, a: string, v: W0.Fact["v"], tx: number) => facts.push({ e, a, v, tx });
    for (const [attr, name, integer] of [
      ["start", "startDate", false],
      ["pay-cents", "payRateCents", true],
      ["weekly-minutes", "weeklyMinutes", true],
      ["background", "bgcStatus", false],
    ] as const) {
      const r = leaf(attr);
      put(S, name, integer ? Number(r.value.value) : r.value.value, r.tx);
    }
    const local = leaf("local-floor"),
      state = leaf("state-floor");
    put(S, "location", loc, local.tx);
    put(loc, "jurisdiction", jur, state.tx);
    put(loc, "localMinWageCents", Number(local.value.value), local.tx);
    put(
      jur,
      "stateMinWageCents",
      scoped ? 1500 : Number(state.value.value),
      scoped ? floorPosition : state.tx,
    );
    assert(!scoped || state.value.value === "1500");
    const p = single(ids.i9(n), ":task/progress");
    if (Number(p.value.value) > 0)
      put(S, "section1AttestedAt", leaf("start").value.value + "T12:00:00.000000Z", p.tx);
    const files = source
      .filter((x) => x.attribute === ":person/file")
      .sort((a, b) => a.value.value.localeCompare(b.value.value));
    for (const [i, r] of files.entries()) {
      const id = S + "/doc:d" + i,
        expires = single(r.value.value, ":file/expiresOn");
      put(S, "documents", id, r.tx);
      put(id, "docType", i === 0 ? "ead" : "visa", r.tx);
      put(id, "expiresOn", expires.value.value, expires.tx);
    }
    return { subject: S, facts };
  }
}
function nativeOrdinal(position: number) {
  assert(Number.isSafeInteger(position) && position > 0, "invalid native source ordinal");
  return position;
}
