import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { W0, canonical, sha256 } from "../../../../bench/lib/w0-world.ts";
import { DomainOracle } from "../../../../bench/lib/w0-gates.ts";
import type { Point } from "../decision.ts";
import type { JoinedAccount } from "./account.ts";
import { pack, unpack } from "../../notify1/store.ts";
import type { Tail } from "../../notify1/journal.ts";
import { width } from "../../notify1/census.ts";
export const toWire = (d: any) => ({ ...d, seq: Number(d.seq), payload: JSON.parse(d.payload) });
export class Reference {
  readonly oracle = new DomainOracle(new URL("./oracle.py", import.meta.url).pathname);
  readonly owed: any[] = [];
  readonly items = new Map<string, any[]>();
  readonly receivers = new Map<string, any>();
  async check(
    a: JoinedAccount,
    ids: string[],
    world: (i: number) => W0.World,
    doc: W0.ReleaseDoc,
    b: Point,
    old: W0.ReleaseDoc | null,
    seq?: number,
    fold = true,
    allReads = true,
    proveNotice = false,
  ) {
    const physical = seq === undefined ? undefined : await a.physical(seq),
      stored: any[] = [],
      digest = createHash("sha256");
    const envelope = { rawBytes: 0, encodedBytes: 0, chunks: 0 };
    let page: unknown[] = [],
      size = 0;
    const envelopeHashes: string[] = [];
    const flushEnvelope = () => {
      if (!page.length) return;
      const encoded = pack(page);
      envelope.encodedBytes += Buffer.byteLength(encoded);
      envelopeHashes.push(sha256(encoded));
      envelope.chunks++;
      page = [];
      size = 0;
    };
    let changes = 0;
    const affected: string[] = [],
      complement: string[] = [];
    const changedOwners: string[] = [];
    for (let lo = 0; lo < ids.length; lo += 32) {
      const subset = ids.slice(lo, lo + 32),
        ws = subset.map((_, j) => world(lo + j));
      const expected = JSON.parse(
        await this.oracle.call("check", { document: doc, old, basis: b, worlds: ws, fold }),
      );
      const outputs = allReads ? await a.reader().readMany(subset, b.tx, b.validTime) : null;
      for (const [j, o] of expected.entries()) {
        assert.equal(o.subject, subset[j]);
        if (outputs) assert.equal(outputs[j], o.json);
        digest.update(o.json + "\n");
        changes += o.rows.length;
        if (o.rows.length) changedOwners.push(o.subject);
        if (
          physical &&
          physical.marker.storage !== "owed" &&
          (o.rows.length || physical.marker.storage === "envelopes")
        )
          stored.push({
            subject: o.subject,
            rows:
              physical.marker.codec === "compact"
                ? o.rows.map(([k, , v]: [string, string | null, string | null]) => [k, null, v])
                : o.rows,
            ...(physical.marker.storage === "envelopes" ? { json: o.json } : {}),
          });
        if (physical && physical.marker.storage !== "owed") {
          const literal = { subject: o.subject, rows: o.rows, json: o.json };
          const bytes = Buffer.byteLength(canonical(literal));
          if (size + bytes > 96000) flushEnvelope();
          page.push(literal);
          size += bytes;
          envelope.rawBytes += bytes;
        }
        if (fold) {
          if (proveNotice) {
            const previous = this.items.get(o.subject) ?? [];
            (o.deliveries.length || canonical(previous) !== canonical(o.items)
              ? affected
              : complement
            ).push(o.subject);
          }
          this.owed.push(...o.deliveries);
          this.items.set(o.subject, o.items);
          this.receivers.set(o.subject, o.receiver);
        }
      }
    }
    flushEnvelope();
    if (physical?.marker.storage === "envelopes") {
      assert.equal(sha256(canonical(envelopeHashes)), physical.marker.output.hash);
      assert.equal(envelope.chunks, physical.marker.output.chunks);
    }
    if (physical) {
      assert.deepEqual(physical.values, stored);
      assert.equal(physical.marker.output.count, physical.marker.storage === "owed" ? 0 : changes);
    }
    let coverage;
    if (proveNotice) {
      assert(fold);
      const tail = await a.db.get<Tail>("tail", b.tx);
      assert.equal(tail.at, b.tx);
      const event = await a.notices.event(tail.value.sequence, b.tx);
      const size =
        event.value.selection.kind === "census"
          ? event.value.census.count
          : event.value.selection.ids.length;
      const selected: string[] = [];
      for (let from = 0; from < size; from += width)
        selected.push(...(await a.notices.members(event, from)));
      if (event.value.selection.kind === "census") assert.deepEqual(selected, ids);
      const covered = new Set(selected);
      assert(
        affected.every((s) => covered.has(s)) && selected.every((s) => ids.includes(s)),
        "Durable recipe omits affected subject",
      );
      coverage = { affected, complement, selected: sha256(canonical(selected)) };
    }
    return {
      count: ids.length,
      digest: digest.digest("hex"),
      changes,
      changedOwners: changedOwners.length,
      changedRoster: sha256(canonical(changedOwners)),
      envelope,
      stored: stored.length,
      owed: this.owed.length,
      ...(coverage ? { coverage } : {}),
    };
  }
  async receiver(a: JoinedAccount, dispatcher: ReturnType<JoinedAccount["dispatcher"]>) {
    const actual = (await dispatcher.effects()).map(toWire);
    assert.deepEqual(actual, this.owed);
    const origin = sha256(canonical([a.db.prefix, (await a.notices.observe()).value.epoch])),
      ids = [...this.items.keys()];
    for (let i = 0; i < ids.length; i += 32) {
      const batch = ids.slice(i, i + 32);
      const [ledger, sink] = await Promise.all([
        a.db.rows<string>(
          batch.map((s) => "ledger:" + s),
          await a.s.head(),
        ),
        dispatcher.sink.rows<string>(
          batch.map((s) => "receiver:" + origin + ":" + s),
          await dispatcher.sink.head(),
        ),
      ]);
      for (const s of batch) {
        const l = ledger.get("ledger:" + s),
          r = sink.get("receiver:" + origin + ":" + s);
        assert.deepEqual(l ? unpack<any[]>(l.value).map(toWire) : [], this.items.get(s));
        const state = r ? unpack<any>(r.value) : W0.EMPTY_RECEIVER;
        assert.equal(
          canonical({
            ...state,
            projection: state.projection.map((v: any) => ({
              ...v,
              payload: JSON.parse(v.payload),
            })),
          }),
          canonical(this.receivers.get(s)),
        );
      }
    }
    return { effects: actual.length, hash: sha256(canonical(actual)) };
  }
}
