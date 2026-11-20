import assert from "node:assert/strict";
import { W0 } from "../../../bench/lib/w0-world.ts";
import type { CompositionHandle } from "../../../bench/lib/composition.ts";
import { Account } from "./account.ts";
import type { AuditOffer } from "./audit-offers.ts";
import type { RawDecision } from "./audit-clock.ts";
import { event, query, type emptyAudit } from "./bench-rung.ts";
import { encodeBig, type Recipe } from "./model.ts";
import type { readerProcess } from "./audit-reader.ts";
import { hash } from "./store.ts";
import { scopedOvertimeRows } from "./solo-policy.ts";

type Observed = { seq: number; p: number; at: number; worldAfter?: W0.World; doc?: W0.ReleaseDoc };
export class AuditReplay {
  readonly source: CompositionHandle;
  readonly account: Account;
  readonly oracle: ReturnType<typeof emptyAudit>;
  readonly basis: W0.Basis;
  readonly baseline: number;
  private readonly applied: Observed[] = [];
  private readonly pending: Observed[] = [];
  constructor(
    source: CompositionHandle,
    account: Account,
    oracle: ReturnType<typeof emptyAudit>,
    basis: W0.Basis,
    baseline: number,
  ) {
    this.source = source;
    this.account = account;
    this.oracle = oracle;
    this.basis = basis;
    this.baseline = baseline;
  }
  sourceSave(p: number, seq: number, worldAfter: W0.World, at: number) {
    this.pending.push({ p, seq, worldAfter, at });
  }
  private async readReceipt(offer: AuditOffer) {
    const cut = offer.ack;
    if (!cut) return;
    const command = this.account.db.entity("cmd:event:" + offer.id),
      native = await this.source.transactionByCommand(command);
    assert(
      native.ok &&
        native.value?.commandId === command &&
        native.value.txId === cut.txId &&
        native.value.position === cut.position,
    );
    const e = await this.account.db.get<Recipe>("event:" + cut.seq, native.value.position);
    assert(
      e.position === native.value.position &&
        e.value.nativeBasis &&
        e.value.seq === cut.seq &&
        e.value.kind === "release",
    );
    assert.deepEqual(e.value.next, offer.doc);
    this.pending.push({ seq: cut.seq, p: native.value.position, at: cut.at, doc: offer.doc });
  }
  async verify(
    offers: readonly AuditOffer[],
    raw: readonly RawDecision[],
    ids: readonly string[],
    decoder: ReturnType<typeof readerProcess>,
  ) {
    for (const o of offers) await this.readReceipt(o);
    const until = raw.reduce((p, r) => Math.max(p, r.position), this.baseline);
    let doc = this.applied.filter((x) => x.doc).at(-1)?.doc ?? W0.R1.doc;
    this.pending.sort((a, b) => a.p - b.p);
    while (this.pending.length && this.pending[0]!.p <= until) {
      const e = this.pending.shift()!;
      assert(
        e.seq === this.applied.length + 1 && e.p > (this.applied.at(-1)?.p ?? this.baseline),
        "native journal has an omitted, duplicate or out-of-order activation input",
      );
      doc = e.doc ?? doc;
      await event(this.oracle, {
        seq: e.seq,
        basis: { ...this.basis, tx: e.p },
        doc,
        ...(e.worldAfter ? { worldAfter: e.worldAfter, subject: e.worldAfter.subject } : {}),
      });
      this.applied.push(e);
    }
    const byCut = new Map<number, Map<string, string>>(),
      cuts = [...this.applied].sort((a, b) => a.at - b.at);
    let last = 0,
      floor = this.baseline;
    for (const r of [...raw].sort((a, b) => a.invoked - b.invoked)) {
      while (last < cuts.length && cuts[last]!.at <= r.invoked)
        floor = Math.max(floor, cuts[last++]!.p);
      assert(r.position >= floor, "read missed a native receipt acknowledged before invocation");
      const rows = byCut.get(r.position) ?? new Map<string, string>(),
        prior = rows.get(r.id);
      if (prior !== undefined) assert.equal(r.raw, prior);
      rows.set(r.id, r.raw);
      byCut.set(r.position, rows);
    }
    const seqAt = new Map<number, number>();
    const answerTape: unknown[] = [];
    let i = 0,
      seq = 0;
    for (const [position, rows] of [...byCut].sort(([a], [b]) => a - b)) {
      while (i < this.applied.length && this.applied[i]!.p <= position)
        seq = this.applied[i++]!.seq;
      seqAt.set(position, seq);
      const expected = await query(this.oracle, "answers", {
        seq,
        tx: position,
        subjects: [...rows.keys()],
      });
      assert.deepEqual(
        expected,
        [...rows].map(([id, b]) => [id, hash(JSON.parse(b))]),
        "public read differs from independent journal replay",
      );
      answerTape.push([position, expected]);
    }
    for (const r of raw) assert.equal(r.seq, seqAt.get(r.position));
    return {
      observations: raw.length,
      answers: hash(answerTape),
      proofs: await this.verifyDurability(offers, ids, decoder),
    };
  }
  private async verifyDurability(
    offers: readonly AuditOffer[],
    ids: readonly string[],
    decoder: ReturnType<typeof readerProcess>,
  ) {
    const proofs = [];
    for (const o of offers) {
      if (!o.ack || !o.owed || (o.mode === "stored" && !o.stored)) continue;
      const { seq, position } = o.ack;
      const reopened = await decoder.proof(o.mode, seq, o.stored?.position ?? position),
        actual = {
          rows: reopened.chunks.flatMap((c) => c.rows),
          notices: reopened.chunks.flatMap((c) => parsePublication(c.deliveries)),
          state: reopened.chunks.flatMap((c) => parsePublication(c.state)),
        };
      assert.equal(
        reopened.owedPosition,
        o.owed.position,
        "timed owed cut differs from reopened native entries",
      );
      const expected: typeof actual = { rows: [], notices: [], state: [] };
      for (let i = 0; i < ids.length; i += 256) {
        const subjects = ids.slice(i, i + 256),
          batch = await query(this.oracle, "read", { seq, subjects, publication: true });
        assert.deepEqual(
          batch.map((x: any) => x.subject),
          subjects,
        );
        for (const x of batch) {
          expected.rows.push(...x.rows);
          expected.notices.push(...x.deliveries);
          if (x.rows.length || x.deliveries.length) expected.state.push(x.publication);
        }
      }
      assert.deepEqual(
        actual,
        expected,
        "durable cut bytes differ from independently replayed changed rows, retirements, guards or notices",
      );
      const people = new Set(expected.rows.map((x) => JSON.parse(x[0])[0])).size;
      if (o.phase === "broad")
        assert(
          people === ids.length && expected.notices.length > 0,
          "missing broad changes or owed notices",
        );
      if (o.phase === "narrow") {
        assert.deepEqual(expected.rows, scopedOvertimeRows(ids.length));
        assert.equal(expected.notices.length, 0);
      }
      if (o.phase === "no-change")
        assert(expected.rows.length === 0 && expected.notices.length === 0);
      proofs.push({
        id: o.id,
        mode: o.mode,
        pos: position,
        seq,
        stored: o.stored?.position ?? null,
        owedCut: reopened.owedPosition,
        people,
        rows: expected.rows.length,
        notices: expected.notices.length,
        digest: hash(encodeBig(actual)),
        object: reopened.digest,
      });
    }
    return proofs;
  }
}

function parsePublication(raw: string) {
  return JSON.parse(raw, (k, v) =>
    k === "payload" && typeof v === "string"
      ? JSON.parse(v)
      : (k === "tx" || k === "seq") && typeof v === "string"
        ? BigInt(v)
        : v,
  );
}
