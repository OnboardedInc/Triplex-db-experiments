import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { W0, canonical } from "../../../bench/lib/w0-world.ts";
import {
  Account,
  evaluate,
  stateOf,
  transition,
  type Batch,
  type Certificate,
  type Input,
  type Leaf,
} from "./account.ts";
import {
  Blocks,
  Conflict,
  NotReady,
  bucket,
  digest,
  fanout,
  live,
  replace,
  type Ref,
} from "./storage.ts";

export const evaluator = createHash("sha256")
  .update(readFileSync(new URL("../../../../packages/w0/dist/kernel.js", import.meta.url)))
  .update(readFileSync(new URL("../../../../packages/w0/dist/outbox.js", import.meta.url)))
  .digest("hex");
export async function directory(blocks: Blocks, root: Ref | null, at: number): Promise<Ref[]> {
  if (!root) return [];
  if (root.first === root.last) return [root];
  const children = await blocks.get<Ref[]>(root.hash, "index", at);
  assert(children.length > 1 && children.length <= fanout);
  assert(children[0]!.first === root.first && children.at(-1)!.last === root.last);
  assert(children.every((x, i) => i === 0 || x.first > children[i - 1]!.last));
  assert.equal(
    children.reduce((s, x) => s + x.count, 0),
    root.count,
  );
  return (await Promise.all(children.map((x) => directory(blocks, x, at)))).flat();
}

// [DX-STG1] Why: capture a stable business frontier, finish the entire range, then replay both durable suffixes. Rejected: restarting a full stage on every live save, which never reaches Ready under traffic.
export async function prepare(a: Account, generation: string) {
  const at = await a.head();
  const [control, stage] = await Promise.all([a.control(at), a.stage(at)]);
  const c = control.data;
  if (!stage?.data || stage.data.generation !== generation) throw new NotReady("Stage superseded");
  const s = stage.data;
  assert(s.predecessor === c.generation);
  const cut = { position: at, validTime: c.validTime },
    basis = { tx: at, validTime: c.validTime };
  const prior = s.seal;
  if (
    prior &&
    prior.input === c.input &&
    prior.publication === c.publication &&
    prior.validTime === c.validTime
  )
    return { seal: prior, evaluated: 0, writtenBytes: 0 };
  const blocks = new Blocks(a.db, generation),
    roster = await a.source.roster(cut);
  assert(
    roster.every((id, n) => n === 0 || id > roster[n - 1]!),
    "Unsorted or duplicate roster",
  );
  const grouped = new Map<number, string[]>();
  for (const id of roster) {
    const p = bucket(id);
    if (!grouped.has(p)) grouped.set(p, []);
    grouped.get(p)!.push(id);
  }
  const old = new Map((await directory(blocks, prior?.root ?? null, at)).map((r) => [r.first, r]));
  const changed = new Set<string>();
  if (prior) {
    assert(prior.evaluator === evaluator && prior.generation === generation);
    for (let i = prior.input + 1; i <= c.input; i++) {
      const event = await a.db.must<Input>("input:" + i, at);
      for (const id of await a.impact(event, c.release ? [c.release, s.release] : [s.release]))
        changed.add(id);
    }
    for (let j = prior.publication + 1; j <= c.publication; j++) {
      const batch = (await a.db.must<Batch>("batch:" + j, at)).data;
      assert("subjects" in batch);
      for (const id of batch.subjects) changed.add(id);
    }
  }
  let evaluated = 0;
  const refs: Ref[] = [];
  let pending: { leaves: Leaf[]; page: number; members: string }[] = [];
  const flush = async () => {
    if (!pending.length) return;
    const hashes = await blocks.put(
      "page",
      pending.map((x) => x.leaves),
      stage,
    );
    pending.forEach(({ leaves, page, members }, i) =>
      refs.push({
        hash: hashes[i]!,
        first: page,
        last: page,
        count: leaves.length,
        owed: leaves.reduce((n, o) => n + o.added.length, 0),
        members,
      }),
    );
    pending = [];
  };
  for (const [page, ids] of grouped) {
    const previous = old.get(page),
      members = digest(ids);
    const dirty =
      previous && prior?.validTime === c.validTime ? ids.filter((id) => changed.has(id)) : ids;
    if (previous?.members === members && !dirty.length) {
      refs.push(previous);
      continue;
    }
    const retained = previous ? await blocks.get<Leaf[]>(previous.hash, "page", at) : [];
    const by = new Map(retained.map((leaf) => [leaf.subject, leaf]));
    const update = ids.filter((id) => !by.has(id) || dirty.includes(id));
    const [worlds, bodies] = await Promise.all([
      a.source.worlds(update, cut),
      a.bodies(update, c, at),
    ]);
    assert.deepEqual(
      worlds.map((w) => w.subject),
      update,
    );
    for (const world of worlds) {
      const output = evaluate(world, s.release, basis);
      by.set(world.subject, transition(output, stateOf(bodies.get(world.subject))));
    }
    const leaves = ids.map((id) => by.get(id)!);
    assert.deepEqual(
      leaves.map((x) => x.subject),
      ids,
    );
    assert(leaves.every((x) => x.answer.release === W0[s.release].hash));
    pending.push({ leaves, page, members });
    evaluated += update.length;
    if (pending.length === 8) await flush();
  }
  await flush();
  refs.sort((x, y) => x.first - y.first);
  assert.deepEqual(
    refs.map((r) => [r.first, r.last, r.count, r.members]),
    [...grouped].map(([p, ids]) => [p, p, ids.length, digest(ids)]),
  );
  let level = refs;
  while (level.length > 1) {
    const groups: Ref[][] = [];
    for (let i = 0; i < level.length; i += fanout) groups.push(level.slice(i, i + fanout));
    const packed = groups.filter((g) => g.length > 1);
    const hashes = await blocks.put("index", packed, stage);
    let index = 0;
    level = groups.map((g) =>
      g.length === 1
        ? g[0]!
        : {
            hash: hashes[index++]!,
            first: g[0]!.first,
            last: g.at(-1)!.last,
            count: g.reduce((n, x) => n + x.count, 0),
            owed: g.reduce((n, x) => n + x.owed, 0),
            members: digest(g.map((x) => x.members)),
          },
    );
  }
  const root = level[0] ?? null;
  const seal: Certificate = {
    generation,
    release: s.release,
    from: s.from,
    predecessor: c.generation,
    input: c.input,
    publication: c.publication,
    validTime: c.validTime,
    cut: at,
    roster: digest(roster),
    count: roster.length,
    owed: root?.owed ?? 0,
    root,
    evaluator,
  };
  assert.equal(root?.count ?? 0, roster.length);
  await a.db.write(
    "seal:" + generation + ":" + digest(seal),
    seal,
    replace(stage, { ...s, seal }),
    [live(stage)],
  );
  return { seal, evaluated, writtenBytes: blocks.bytes };
}

export async function maintain(a: Account, generation: string) {
  for (;;) {
    await a.settle();
    try {
      return await prepare(a, generation);
    } catch (err) {
      if (!(err instanceof Conflict)) throw err;
    }
  }
}
