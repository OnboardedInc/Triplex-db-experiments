import assert from "node:assert/strict";
import { W0, canonical } from "../../../bench/lib/w0-world.ts";
import {
  Blocks,
  Conflict,
  Repository,
  absent,
  bucket,
  digest,
  live,
  prefix,
  replace,
  safeName,
  set,
  validMillis,
  type Cell,
  type Op,
  type Ref,
  type Store,
} from "./storage.ts";

export type Release = "R1" | "R2" | "R3";
export type SourceCut = { position: number; validTime: string };
export type Pair = readonly [string, string];
export interface Source {
  roster(cut: SourceCut): Promise<string[]>;
  worlds(ids: string[], cut: SourceCut): Promise<W0.World[]>;
  affected(pairs: Pair[], cut: SourceCut, releases: Release[]): Promise<string[]>;
}
export interface Certificate {
  root: Ref | null;
  roster: string;
  count: number;
  owed: number;
  input: number;
  publication: number;
  validTime: string;
  cut: number;
  predecessor: string | null;
  generation: string;
  release: Release;
  from: string;
  evaluator: string;
}
export interface Stage {
  generation: string;
  predecessor: string | null;
  release: Release;
  from: string;
  seal: Certificate | null;
}
export interface Control {
  generation: string | null;
  release: Release | null;
  input: number;
  settled: number;
  offset: number;
  publication: number;
  validTime: string;
  erasure: number;
}
export interface Leaf {
  subject: string;
  answer: Omit<W0.Output, "basis">;
  items: readonly W0.ItemState[];
  pending: readonly W0.Delivery[];
  added: readonly W0.Delivery[];
}
export interface Visible {
  seal: Certificate;
  previous: string | null;
  publication: number;
}
export type Batch =
  | { subjects: string[]; deliveries: readonly W0.Delivery[] }
  | { activation: string };
export interface Input {
  command: string;
  before: number;
  previousTime: string;
  validTime: string;
  timer: boolean;
  erasure: boolean;
}
type Body = { leaf: Leaf; basis: W0.Basis };
export function evaluate(world: W0.World, release: Release, basis: W0.Basis) {
  const out = W0.evaluateWorld(world, W0[release], basis);
  if ("error" in out) throw Error(world.subject + " " + out.error);
  return out;
}
export function transition(output: W0.Output, previous: W0.OutboxState): Leaf {
  const { basis: _, ...answer } = output;
  const { state, deliveries } = W0.publish(previous, [W0.recordOf(output)]);
  return {
    subject: output.subject,
    answer,
    items: state.items,
    pending: state.pending,
    added: deliveries,
  };
}
export function stateOf(body?: Body): W0.OutboxState {
  if (!body) return W0.EMPTY_OUTBOX;
  const { leaf, basis } = body;
  return {
    items: leaf.items,
    pending: leaf.pending,
    subjects: [
      { subject: leaf.subject, basis: { tx: BigInt(basis.tx), validTime: basis.validTime } },
    ],
  };
}

export class Account {
  readonly db: Repository;
  readonly source: Source;
  constructor(store: Store, source: Source) {
    this.db = new Repository(store);
    this.source = source;
  }
  head() {
    return this.db.store.currentPosition();
  }
  control(at: number) {
    return this.db.must<Control>("account", at);
  }
  stage(at: number) {
    return this.db.cell<Stage | null>("stage", at);
  }
  async initialize(validTime: string) {
    validMillis(validTime);
    const control: Control = {
      generation: null,
      release: null,
      input: 0,
      settled: 0,
      offset: 0,
      publication: 0,
      validTime,
      erasure: 0,
    };
    return this.db.write("initialize", validTime, [set("account", control)], [absent("account")]);
  }
  async open(generation: string, release: Release, from: string) {
    safeName(generation);
    validMillis(from);
    const intent = [generation, release, from];
    const id = "open:" + generation;
    const prior = await this.db.recovered(id, intent);
    if (prior) return prior;
    const at = await this.head();
    const [control, stage] = await Promise.all([this.control(at), this.stage(at)]);
    assert(!stage?.data, "Cancel or close the existing stage");
    const next: Stage = {
      generation,
      release,
      from,
      predecessor: control.data.generation,
      seal: null,
    };
    return this.db.write(id, intent, stage ? replace(stage, next) : [set("stage", next)], [
      live(control),
      stage ? live(stage) : absent("stage"),
    ]);
  }
  async cancel(generation: string) {
    const id = "cancel:" + generation,
      prior = await this.db.recovered(id, generation);
    if (prior) return prior;
    const stage = await this.stage(await this.head());
    assert(stage?.data?.generation === generation, "Different open deployment");
    return this.db.write(id, generation, replace(stage, null), [live(stage)]);
  }
  async save(
    command: string,
    ops: Op[],
    options: { clock?: string; erasure?: boolean } = {},
    conditions: Parameters<Repository["write"]>[3] = [],
  ) {
    const id = "save:" + safeName(command),
      intent = { ops, options, conditions };
    if (options.clock) validMillis(options.clock);
    assert(
      ops.every((op) => op.op === "retract" || !op.entityId.startsWith(prefix)),
      "Reserved staging entity",
    );
    for (;;) {
      const prior = await this.db.recovered(id, intent);
      if (prior) return prior;
      const at = await this.head(),
        c = await this.control(at),
        old = c.data;
      const validTime = options.clock ?? old.validTime;
      assert(validTime >= old.validTime, "Live business clock cannot move backwards");
      const event: Input = {
        command: id,
        before: at,
        previousTime: old.validTime,
        validTime,
        timer: validTime !== old.validTime,
        erasure: options.erasure === true,
      };
      const next = {
        ...old,
        input: old.input + 1,
        validTime,
        erasure: old.erasure + Number(event.erasure),
      };
      try {
        return await this.db.write(
          id,
          intent,
          [...ops, ...replace(c, next), set("input:" + next.input, event)],
          [live(c), ...conditions],
        );
      } catch (err) {
        if (!(err instanceof Conflict) || (await this.control(await this.head())).id === c.id)
          throw err;
      }
    }
  }
  async impact(event: Cell<Input>, releases: Release[]) {
    const { data } = event;
    const before = { position: data.before, validTime: data.previousTime },
      after = { position: event.at, validTime: data.validTime };
    if (data.timer || data.erasure) return this.source.roster(after);
    const claimed = await this.db.store.transactionByCommand(this.db.command(data.command));
    assert(claimed.ok && claimed.value?.position === event.at);
    const changes = claimed.value.changes as { entityId: string; attribute: string }[];
    assert(Array.isArray(changes));
    const pairs: Pair[] = changes
      .filter((x) => !x.entityId.startsWith(prefix))
      .map((x) => [x.entityId, x.attribute]);
    return this.source.affected(pairs, before, releases);
  }
  async visible(generation: string, at: number) {
    return this.db.must<Visible>("visible:" + generation, at);
  }
  async page(ref: Ref | null, generation: string, number: number, at: number): Promise<Leaf[]> {
    const blocks = new Blocks(this.db, generation);
    while (ref && ref.first <= number && number <= ref.last) {
      if (ref.first === ref.last) {
        const leaves = await blocks.get<Leaf[]>(ref.hash, "page", at);
        assert(leaves.length === ref.count && leaves.every((x) => bucket(x.subject) === number));
        return leaves;
      }
      const refs: Ref[] = await blocks.get<Ref[]>(ref.hash, "index", at);
      ref = refs.find((r) => r.first <= number && number <= r.last) ?? null;
    }
    return [];
  }
  async bodies(subjects: string[], c: Control, at: number): Promise<Map<string, Body>> {
    const result = new Map<string, Body>();
    if (!c.generation || !subjects.length) return result;
    const gen = c.generation;
    const vs = await this.visible(gen, at);
    const keys = subjects.map((s) => "body:" + gen + ":" + s);
    const overrides = await this.db.cells<Body>(keys, at);
    const grouped = new Map<number, Set<string>>();
    for (const [i, s] of subjects.entries()) {
      const override = overrides.get(keys[i]!);
      if (override) {
        assert(override.data.leaf.subject === s);
        result.set(s, override.data);
      } else {
        const n = bucket(s);
        if (!grouped.has(n)) grouped.set(n, new Set());
        grouped.get(n)!.add(s);
      }
    }
    await Promise.all(
      [...grouped].map(async ([n, subset]) => {
        for (const leaf of await this.page(vs.data.seal.root, gen, n, vs.at)) {
          if (subset.has(leaf.subject))
            result.set(leaf.subject, {
              leaf,
              basis: { tx: vs.at, validTime: vs.data.seal.validTime },
            });
        }
      }),
    );
    return result;
  }
  async settle() {
    let evaluated = 0;
    for (;;) {
      const at = await this.head(),
        control = await this.control(at),
        c = control.data;
      if (c.settled === c.input) return evaluated;
      const sequence = c.settled + 1,
        event = await this.db.must<Input>("input:" + sequence, at);
      const affected = c.release ? await this.impact(event, [c.release]) : [];
      const ids = affected.slice(c.offset, c.offset + 64);
      const cut = { position: event.at, validTime: event.data.validTime };
      const [worlds, prior] = await Promise.all([
        this.source.worlds(ids, cut),
        this.bodies(ids, c, at),
      ]);
      assert.deepEqual(
        worlds.map((w) => w.subject),
        ids,
      );
      const basis = { tx: cut.position, validTime: cut.validTime };
      const bodies = worlds.map((world) => ({
        leaf: transition(evaluate(world, c.release!, basis), stateOf(prior.get(world.subject))),
        basis,
      }));
      const done = c.offset + ids.length >= affected.length;
      const next = {
        ...c,
        settled: done ? sequence : c.settled,
        offset: done ? 0 : c.offset + ids.length,
        publication: c.publication + 1,
      };
      const key = (s: string) => "body:" + c.generation + ":" + s;
      const oldRows = await this.db.cells<Body>(ids.map(key), at);
      const ops = bodies.flatMap((b) => {
        const row = oldRows.get(key(b.leaf.subject));
        return row ? replace(row, b) : [set(key(b.leaf.subject), b)];
      });
      const batch: Batch = { subjects: ids, deliveries: bodies.flatMap((b) => b.leaf.added) };
      try {
        await this.db.write(
          "settle:" + sequence + ":" + c.offset,
          [event.id, ids],
          [...ops, ...replace(control, next), set("batch:" + next.publication, batch)],
          [live(control)],
        );
        evaluated += ids.length;
      } catch (err) {
        if (!(err instanceof Conflict)) throw err;
      }
    }
  }
  async ticket(subject: string) {
    const at = await this.head(),
      control = await this.control(at),
      c = control.data;
    assert(c.release && c.generation && c.input === c.settled, "Unsettled live input");
    const cut = { position: at, validTime: c.validTime };
    const world = (await this.source.worlds([subject], cut))[0]!;
    assert.equal(world.subject, subject);
    const output = evaluate(world, c.release, { tx: at, validTime: c.validTime });
    return { generation: c.generation, input: c.input, output };
  }
  async publish(command: string, ticket: Awaited<ReturnType<Account["ticket"]>>) {
    const id = "publish:" + safeName(command),
      intent = digest(ticket);
    for (;;) {
      const recovered = await this.db.recovered(id, intent);
      if (recovered) return recovered;
      const at = await this.head(),
        control = await this.control(at),
        c = control.data,
        out = ticket.output;
      if (
        ticket.generation !== c.generation ||
        c.input !== ticket.input ||
        c.input !== c.settled ||
        out.basis.validTime !== c.validTime ||
        !c.release ||
        out.release !== W0[c.release].hash ||
        out.basis.tx > at
      )
        return null;
      const old = (await this.bodies([out.subject], c, at)).get(out.subject);
      if (
        !old ||
        out.basis.tx < old.basis.tx ||
        (out.basis.tx === old.basis.tx && out.basis.validTime < old.basis.validTime)
      )
        return null;
      const key = "body:" + c.generation + ":" + out.subject,
        row = await this.db.cell<Body>(key, at);
      const body = { leaf: transition(out, stateOf(old)), basis: out.basis };
      const next = { ...c, publication: c.publication + 1 };
      const batch: Batch = { subjects: [out.subject], deliveries: body.leaf.added };
      try {
        return await this.db.write(
          id,
          intent,
          [
            ...(row ? replace(row, body) : [set(key, body)]),
            ...replace(control, next),
            set("batch:" + next.publication, batch),
          ],
          [live(control)],
        );
      } catch (err) {
        if (!(err instanceof Conflict)) throw err;
      }
    }
  }
}
