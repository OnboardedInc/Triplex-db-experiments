import assert from "node:assert/strict";
import { W0, canonical } from "../../../bench/lib/w0-world.ts";
import { Account } from "./account.ts";
import { projection, type Difference } from "./rules.ts";
import { Objects, Conflict, hash } from "./store.ts";
import { encodeBig, decodeBig, owedRecord, type Recipe } from "./model.ts";
import { width } from "./pages.ts";

type Chunk = {
  seq: number;
  offset: number;
  request: string;
  subjects: string[];
  rows: Difference[];
  deliveries: string;
  state?: string;
};
type Expansion = {
  seq: number;
  event: string;
  parts: string[];
  subjects: number;
  rows: number;
  notices: number;
  digest: string;
};
export type Hook = (
  stage: "before-chunk" | "after-chunk" | "before-effect" | "after-effect" | "after-ack",
  i: number,
) => void | Promise<void>;
async function immutable<T>(
  db: Objects,
  key: string,
  value: T,
  committed?: (position: number, at: number) => void,
) {
  try {
    const r = await db.commit("put:" + key, [{ key, value }], [{ key, cell: undefined }]);
    committed?.(r.position, performance.now());
  } catch (e) {
    if (!(e instanceof Conflict)) throw e;
  }
  const cell = await db.get<T>(key, await db.comp.currentPosition());
  assert.equal(canonical(cell.value), canonical(value), "durable object replay differs");
  return cell;
}
async function publication(a: Account, seq: number, now: number) {
  const db = a.db,
    rec = seq === 0 ? undefined : await db.get<Recipe>("event:" + seq, now),
    eventHash = rec?.hash ?? (await db.get("bootstrap", now)).hash;
  let subjects: string[], after: number, before: number;
  if (rec) {
    const e = rec.value,
      source = await a.head(e.sourceCut);
    assert(
      e.seq === seq &&
        source.hash === e.parentHash &&
        source.value.seq === e.parent &&
        e.parent === seq - 1,
    );
    subjects =
      e.shape === "live"
        ? e.subjects!
        : e.shape === "packed"
          ? e.packed!
          : (await a.selected(e)).subjects;
    before = e.sourceCut;
    after = rec.position;
  } else {
    const result = await db.comp.transactionByCommand(db.entity("cmd:initialize"));
    assert(result.ok && result.value);
    before = 0;
    after = result.value.position;
    const h = (await a.head(after)).value;
    subjects = [
      ...(
        await a.pages(
          h,
          after,
          Array.from({ length: Math.ceil(h.size / width) }, (_, i) => i),
        )
      ).values(),
    ].flatMap((c) => c.value.roster);
  }
  assert.equal(new Set(subjects).size, subjects.length);
  subjects.sort();
  return { subjects, before, after, eventHash };
}

async function* publicationChunks(
  a: Account,
  seq: number,
  plan: Awaited<ReturnType<typeof publication>>,
  stored = false,
) {
  const { subjects, before, after, eventHash } = plan;
  for (let i = 0; i < subjects.length; i += width) {
    const ids = subjects.slice(i, i + width),
      newViews = await a.views(ids, after),
      oldViews = before ? await a.views(ids, before) : new Map();
    const rows: Difference[] = [],
      deliveries: W0.Delivery[] = [],
      changedSubjects: string[] = [],
      states: unknown[] = [];
    for (const s of ids) {
      const next = newViews.get(s)!,
        prev = oldViews.get(s),
        x = prev ? projection(prev.output) : new Map(),
        y = projection(next.output);
      const changes = [...new Set([...x.keys(), ...y.keys()])]
        .sort()
        .filter((k) => x.get(k) !== y.get(k));
      if (changes.length) changedSubjects.push(s);
      for (const k of changes) rows.push([k, x.get(k) ?? null, y.get(k) ?? null]);
      const pending: W0.Delivery[] = next.state.pending.slice(prev?.state.pending.length ?? 0);
      if (prev)
        assert.equal(
          encodeBig(next.state.pending.slice(0, prev.state.pending.length)),
          encodeBig(prev.state.pending),
          "outbox prefix changed",
        );
      deliveries.push(...pending);
      if (stored && (changes.length || pending.length)) {
        states.push([s, next.state.subjects, next.state.items]);
      }
    }
    const chunk: Chunk = {
      seq,
      offset: i,
      request: eventHash,
      subjects: changedSubjects,
      rows,
      deliveries: encodeBig(deliveries),
      ...(stored ? { state: encodeBig(states) } : {}),
    };
    yield { chunk, notices: deliveries.length };
  }
}

export async function expand(a: Account, seq: number, hook?: Hook) {
  const db = a.db,
    now = await db.comp.currentPosition(),
    old = (await db.many<Expansion>(["expanded:" + seq], now)).get("expanded:" + seq);
  if (old) {
    const source = await db.get(seq ? "event:" + seq : "bootstrap", now);
    assert.equal(old.value.event, source.hash);
    return old.value;
  }
  const plan = await publication(a, seq, now),
    parts: string[] = [];
  let rowCount = 0,
    notices = 0,
    changed = 0;
  for await (const { chunk, notices: n } of publicationChunks(a, seq, plan)) {
    await hook?.("before-chunk", chunk.offset);
    const c = await immutable(db, "chunk:" + seq + ":" + parts.length, chunk);
    parts.push(hash(c.value));
    await hook?.("after-chunk", chunk.offset);
    rowCount += chunk.rows.length;
    notices += n;
    changed += chunk.subjects.length;
  }
  const result: Expansion = {
    seq,
    event: plan.eventHash,
    parts,
    subjects: changed,
    rows: rowCount,
    notices,
    digest: hash(parts),
  };
  return (await immutable(db, "expanded:" + seq, result)).value;
}

export async function decodeOwed(a: Account, seq: number, cut: number) {
  const e = await a.db.get<Recipe>("event:" + seq, cut),
    owed = await a.db.get("owed:" + seq, cut);
  assert(e.position === cut && owed.position === cut && e.value.kind === "release");
  assert.deepEqual(owed.value, owedRecord(e.value, e.hash));
  const plan = await publication(a, seq, cut);
  assert.equal(plan.after, cut);
  return { owed: owed.hash, chunks: publicationChunks(a, seq, plan, true) };
}

export async function persistPublication(a: Account, seq: number, cut: number) {
  const record = await decodeOwed(a, seq, cut),
    e = await a.db.get<Recipe>("event:" + seq, cut),
    parts: { position: number; hash: string }[] = [];
  let lastNotice: { position: number; at: number } | undefined;
  for await (const { chunk, notices } of record.chunks) {
    if (!chunk.rows.length && !notices) continue;
    const cell = await immutable(
      a.db,
      "stored:" + seq + ":" + parts.length,
      chunk,
      (position, at) => {
        if (notices) lastNotice = { position, at };
      },
    );
    assert(cell.position > cut);
    parts.push({ position: cell.position, hash: hash(cell.value) });
  }
  // [DX-ACT2] Why: the account guard commits the covered census and binds all changed values, retirements and debt to the original cut. Rejected: timing an expansion loop without authenticating its durable end.
  const value = {
    seq,
    cut,
    root: e.value.root,
    census: e.value.census,
    owed: record.owed,
    guard: { validTime: e.value.basis.validTime, tx: cut },
    parts,
  };
  let at: number | undefined;
  const cell = await immutable(a.db, "stored:" + seq, value, (_, t) => {
    at = t;
  });
  assert(at !== undefined, "stored-mode measurement requires a newly committed guard");
  return {
    position: cell.position,
    digest: cell.hash,
    at,
    lastNotice: lastNotice ?? { position: cell.position, at },
  };
}

export async function openStored(a: Account, seq: number, position: number) {
  const manifest = await a.db.get<{
    seq: number;
    cut: number;
    root: string;
    census: string;
    owed: string;
    guard: { validTime: string; tx: number };
    parts: { position: number; hash: string }[];
  }>("stored:" + seq, position);
  const m = manifest.value,
    e = await a.db.get<Recipe>("event:" + seq, m.cut),
    owed = await a.db.get("owed:" + seq, m.cut);
  assert(
    manifest.position === position &&
      m.seq === seq &&
      e.position === m.cut &&
      owed.position === m.cut,
  );
  assert(
    m.cut < position &&
      m.owed === owed.hash &&
      m.root === e.value.root &&
      m.census === e.value.census,
  );
  assert.deepEqual(owed.value, owedRecord(e.value, e.hash));
  assert.deepEqual(m.guard, { validTime: e.value.basis.validTime, tx: m.cut });
  const keys = m.parts.map((_, i) => "stored:" + seq + ":" + i);
  const cells = await a.db.many<Chunk>(keys, position);
  const chunks = keys.map((k, i) => {
    const c = cells.get(k),
      witness = m.parts[i]!;
    assert(
      c &&
        c.position === witness.position &&
        c.position > m.cut &&
        c.position < position &&
        hash(c.value) === witness.hash &&
        c.value.seq === seq &&
        c.value.request === e.hash,
    );
    return c.value;
  });
  const lastOwed = chunks.flatMap((c, i) =>
    decodeBig<W0.Delivery[]>(c.deliveries).length ? [m.parts[i]!.position] : [],
  );
  return {
    cut: m.cut,
    digest: manifest.hash,
    chunks,
    owedPosition: lastOwed.at(-1) ?? manifest.position,
  };
}
export async function concrete(db: Objects, x: Expansion) {
  const p = await db.comp.currentPosition(),
    keys = x.parts.map((_, i) => "chunk:" + x.seq + ":" + i),
    chunks = await db.many<Chunk>(keys, p);
  assert.equal(hash(x.parts), x.digest);
  return keys.map((k, i) => {
    const c = chunks.get(k);
    assert(
      c && c.value.seq === x.seq && c.value.request === x.event && hash(c.value) === x.parts[i],
    );
    return c.value;
  });
}
type Receipt = { request: string; applied: string };
export class Receiver {
  readonly db: Objects;
  constructor(db: Objects) {
    this.db = db;
  }
  async send(batch: string, deliveries: readonly W0.Delivery[]) {
    const key = "incoming:" + batch,
      sig = hash(encodeBig(deliveries));
    for (;;) {
      const p = await this.db.comp.currentPosition(),
        done = (await this.db.many<Receipt>([key], p)).get(key);
      if (done) {
        assert.equal(done.value.request, sig);
        return done.value;
      }
      const ids = [...new Set(deliveries.map((d) => d.id))],
        states = await this.db.many<string>(
          ids.map((i) => "sink:" + i),
          p,
        );
      const pieces = [...states.values()].map((c) => decodeBig<W0.ReceiverState>(c.value));
      const got = W0.receive(
        {
          effects: pieces.flatMap((s) => s.effects),
          projection: pieces.flatMap((s) => s.projection),
        },
        deliveries,
      );
      const result = { request: sig, applied: encodeBig(got.applied) };
      const patches = ids.map((id) => {
        const k = "sink:" + id;
        return {
          key: k,
          prior: states.get(k),
          value: encodeBig({
            effects: got.state.effects.filter((e) => e.id === id),
            projection: got.state.projection.filter((e) => e.id === id),
          }),
        };
      });
      try {
        await this.db.commit(
          key,
          [...patches, { key, value: result }],
          [{ key, cell: undefined }, ...patches.map((x) => ({ key: x.key, cell: x.prior }))],
        );
      } catch (e) {
        if (e instanceof Conflict) continue;
        throw e;
      }
      return (await this.db.get<Receipt>(key, await this.db.comp.currentPosition())).value;
    }
  }
}
export async function drain(a: Account, sink: Receiver, to: number, hook?: Hook) {
  const db = a.db;
  let sends = 0,
    applied = 0,
    lastSend: number | null = null,
    lastEffect: number | null = null;
  const expansion = await expand(a, to, hook);
  for (;;) {
    const p = await db.comp.currentPosition(),
      cursor = (await db.many<{ seq: number; part: number }>(["cursor"], p)).get("cursor"),
      { seq, part } = cursor?.value ?? { seq: 0, part: 0 };
    if (seq > to) break;
    const x = seq === to ? expansion : await expand(a, seq, hook),
      k = "chunk:" + seq + ":" + part;
    if (part < x.parts.length) {
      const c = await db.get<Chunk>(k, await db.comp.currentPosition());
      assert.equal(hash(c.value), x.parts[part]);
      assert.equal(c.value.request, x.event);
      const deliveries = decodeBig<W0.Delivery[]>(c.value.deliveries);
      if (deliveries.length) {
        await hook?.("before-effect", part);
        lastSend = performance.now();
        const result = await sink.send(hash([db.account, x.event, seq, part]), deliveries);
        const actual = decodeBig<{ effects: W0.Delivery[] }>(result.applied);
        assert.equal(result.request, hash(encodeBig(deliveries)));
        sends += deliveries.length;
        applied += actual.effects.length;
        lastEffect = performance.now();
        await hook?.("after-effect", part);
      }
    }
    const next = part + 1 >= x.parts.length ? { seq: seq + 1, part: 0 } : { seq, part: part + 1 };
    try {
      await db.commit(
        "cursor:" + seq + ":" + part,
        [{ key: "cursor", value: next, prior: cursor }],
        [{ key: "cursor", cell: cursor }],
      );
    } catch (e) {
      if (e instanceof Conflict) continue;
      throw e;
    }
    await hook?.("after-ack", part);
  }
  return { sends, applied, lastSend, lastEffect, expansion };
}
