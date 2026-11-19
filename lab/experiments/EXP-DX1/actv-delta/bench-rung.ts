import { parseOutbox } from "../../../bench/lib/w0-outbox-state.ts";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { DomainOracle } from "../../../bench/lib/w0-gates.ts";
import { W0, canonical } from "../../../bench/lib/w0-world.ts";
import { Account } from "./account.ts";
import { Objects, hash } from "./store.ts";
import { Receiver, concrete, drain, expand } from "./dispatch.ts";
import { decodeBig, type Edit, type Recipe } from "./model.ts";
import { width } from "./pages.ts";
export type Scheduled = {
  seq: number;
  basis: W0.Basis;
  doc: W0.ReleaseDoc;
  subject?: string;
  edits?: Edit[];
};
export const emptyAudit = () => new DomainOracle(new URL("./audit.py", import.meta.url).pathname);
export const query = async (o: DomainOracle, op: string, input: unknown) =>
  (op === "read" ? parseOutbox : JSON.parse)(await o.call(op, input));
export async function event(o: DomainOracle, item: Scheduled) {
  const got = await query(o, "event", item);
  assert.deepEqual(got, { seq: item.seq, release: W0.compileRelease(item.doc).hash });
}
const wire = (d: W0.Delivery) => ({ ...d, payload: JSON.parse(d.payload) });
export async function checkRoster(
  a: Account,
  census: readonly string[],
  p: number,
  seq: number,
  oracle: DomainOracle,
) {
  const rows: any[] = [],
    notices: any[] = [],
    docs: string[] = [];
  const checked: string[] = [];
  for (let i = 0; i < census.length; i += width) {
    const ids = census.slice(i, i + width),
      [views, expected] = await Promise.all([
        a.views([...ids], p),
        query(oracle, "read", { seq, subjects: ids }),
      ]);
    assert.deepEqual(
      expected.map((z: any) => z.subject),
      ids,
    );
    for (const x of expected) {
      const actual = views.get(x.subject)!;
      assert.equal(
        hash(JSON.parse(W0.outputJson(actual.output))),
        x.output,
        "full subject output " + x.subject,
      );
      assert.equal(
        hash(parseOutbox(W0.publishJson({ state: actual.state, deliveries: [] })).state),
        x.state,
        "full effective outbox " + x.subject,
      );
      checked.push(x.subject);
      docs.push(x.output, x.state);
      rows.push(...x.rows);
      notices.push(...x.deliveries);
    }
  }
  assert.deepEqual(checked, census);
  return { rows, notices, digest: hash(docs) };
}
type Context = {
  account: Account;
  reader: Account;
  sink: Receiver;
  census: string[];
  oracle: DomainOracle;
  dir: string;
  nonce: string;
  basis: W0.Basis;
};
export async function measure(
  ctx: Context,
  rel: W0.CompiledRelease,
  index: number,
  prevSeq: number,
  options: {
    live?: () => Promise<void>;
    registered?: () => void;
    full?: boolean;
    label?: string;
  } = {},
) {
  const { account: a, reader, sink, census, oracle } = ctx,
    id = "offer-" + index,
    offer = performance.now();
  const observed = { points: 0, leafReads: 0, queries: 0 };
  const input = new Objects(
    {
      ...a.db.comp,
      sweepPage: async (ids, ...rest) => {
        observed.queries++;
        observed.points += ids.filter((k) => k.startsWith(a.db.entity("point:"))).length;
        observed.leafReads += ids.filter((k) => k.startsWith(a.db.entity("page:"))).length;
        return a.db.comp.sweepPage(ids, ...rest);
      },
    },
    a.db.account,
  );
  const issuer = new Account(input, a.binding, a.keys.directory);
  const r = await issuer.seal(id, rel, { beforeCas: options.live });
  assert.equal(observed.points, 0, "subject reads inside activation");
  const ack = performance.now();
  const e = await reader.db.get<Recipe>("event:" + r.seq, r.position),
    actual = e.value,
    basis = actual.basis;
  assert.equal(r.seq, prevSeq + 1 + (options.live ? 1 : 0));
  assert.equal(W0.compileRelease(actual.next).hash, rel.hash);
  await event(oracle, { seq: r.seq, basis, doc: rel.doc });
  options.registered?.();
  const s = census[index % census.length]!,
    [v, expected] = await Promise.all([
      reader.readAt(s, r.position),
      query(oracle, "read", { seq: r.seq, subjects: [s] }),
    ]);
  assert.equal(hash(JSON.parse(W0.outputJson(v.output))), expected[0].output);
  assert.equal(
    hash(parseOutbox(W0.publishJson({ state: v.state, deliveries: [] })).state),
    expected[0].state,
  );
  const A = performance.now() - offer;
  const packedB = actual.shape === "packed" ? performance.now() - offer : null;
  const selection =
    actual.shape === "packed"
      ? { subjects: actual.packed!, yielded: actual.packed!.length, seeks: null, pages: null }
      : await reader.selected(actual);
  const x = await expand(a, r.seq),
    chunks = await concrete(reader.db, x);
  const actualRows = chunks.flatMap((c) => c.rows),
    actualDeliveries = chunks.flatMap((c) => decodeBig<W0.Delivery[]>(c.deliveries).map(wire)),
    actualPeople = chunks.flatMap((c) => c.subjects);
  assert.equal(hash(actualPeople), hash([...new Set(actualPeople)].sort()));
  if (actual.shape === "packed") {
    const literal = actual.flags!.map(([s, b, c]) => [
      canonical([s, "OT", "", "flags", "overtime"]),
      b ? canonical({ name: "overtime", rule: "OT" }) : null,
      c ? canonical({ name: "overtime", rule: "OT" }) : null,
    ]);
    assert.deepEqual(actualRows, literal);
  }
  const B = packedB ?? performance.now() - offer;
  const sinkResult = await drain(a, sink, r.seq),
    C = performance.now() - offer;
  const applied: any[] = [];
  for (const [i, c] of chunks.entries()) {
    const deliveries = decodeBig<W0.Delivery[]>(c.deliveries);
    if (!deliveries.length) continue;
    const receipt = await sink.db.get<{ request: string; applied: string }>(
      "incoming:" + hash([a.db.account, x.event, r.seq, i]),
      await sink.db.comp.currentPosition(),
    );
    assert.equal(receipt.value.request, hash(c.deliveries));
    applied.push(...decodeBig<{ effects: W0.Delivery[] }>(receipt.value.applied).effects.map(wire));
  }
  assert.deepEqual(applied, actualDeliveries);
  const audit = await checkRoster(reader, census, r.position, r.seq, oracle);
  assert.deepEqual(actualRows, audit.rows);
  assert.deepEqual(actualDeliveries, audit.notices);
  const people = [...new Set<string>(audit.rows.map((row) => JSON.parse(row[0])[0]))].sort();
  assert.deepEqual(actualPeople, people);
  if (actual.shape !== "full") assert.deepEqual(selection.subjects, people);
  const D = performance.now() - offer;
  const report = {
    nonce: ctx.nonce,
    account: a.db.account,
    label: options.label ?? rel.name,
    seq: r.seq,
    position: r.position,
    txId: "txId" in r ? r.txId : null,
    shape: actual.shape,
    old: W0.compileRelease(actual.old).hash,
    next: rel.hash,
    root: actual.root,
    census: actual.census,
    offer,
    ackMs: ack - offer,
    A,
    B,
    C,
    D,
    wireBytes: r.bytes,
    writes: r.operations,
    people: people.length,
    rows: actualRows.length,
    notices: actualDeliveries.length,
    applied: applied.length,
    firstPoint: s,
    domainSha: hash(actualRows),
    effectsSha: hash(applied),
    allSubjectsSha: audit.digest,
    selected: selection.subjects.length,
    seeks: selection.seeks,
    postingIds: selection.yielded,
    pages: selection.pages,
    activationWorldPulls: observed.points,
    sealNativeQueries: observed.queries,
    sealLeafReads: observed.leafReads,
    lastSendMs: sinkResult.lastSend === null ? null : sinkResult.lastSend - offer,
    lastAppliedMs: sinkResult.lastEffect === null ? null : sinkResult.lastEffect - offer,
  };
  fs.writeFileSync(path.join(ctx.dir, "offer-" + index + ".json"), JSON.stringify(report) + "\n", {
    flag: "wx",
  });
  return report;
}
