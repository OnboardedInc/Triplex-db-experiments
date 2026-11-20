import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { setImmediate as yieldTurn, setTimeout as sleep } from "node:timers/promises";
import { W0, canonical } from "../../../bench/lib/w0-world.ts";
import { memberRange, width } from "./census.ts";
import { Dispatcher, emptyMetrics, type Packet } from "./dispatcher.ts";
import { Notices, type Tail } from "./journal.ts";
import { receiveOrdered } from "./receiver.ts";
import { Conflict, Documents, hash, pack, unpack } from "./store.ts";

interface Cursor {
  event: number;
  start: number;
  parent: string;
  batch: number;
  previous: string;
}

export class Relay {
  readonly notices: Notices;
  readonly sink: Documents;
  readonly pages: number;
  readonly readIntervalMs: number;
  private lastRead = -Infinity;
  readonly metrics = emptyMetrics();
  constructor(source: Notices, sink: Documents, pages: number, readIntervalMs = 0) {
    assert(Number.isFinite(readIntervalMs) && readIntervalMs >= 0 && readIntervalMs <= 1000);
    this.readIntervalMs = readIntervalMs;
    assert(Number.isSafeInteger(pages) && pages >= 1 && pages <= 32);
    this.notices = source;
    this.sink = sink;
    this.pages = pages;
  }
  ledgerStore(epoch: string) {
    return new Documents(this.sink.store, "relay-" + hash([this.notices.db.prefix, epoch]));
  }
  async create(epoch: string, validTime: string) {
    const a = this.notices,
      s = this.ledgerStore(epoch);
    const old = await a.db.row<Tail>("tail", await a.db.head());
    if (old) {
      assert.equal(old.value.epoch, epoch);
      await this.identify(old.value, s, await s.head());
      return;
    }
    let id = await s.row<string>("identity", await s.head());
    if (!id) {
      try {
        await s.commit(
          "identity",
          "register",
          [s.put("identity", randomUUID())],
          [s.guard("identity", undefined)],
        );
      } catch (e) {
        if (!(e instanceof Conflict)) throw e;
      }
      id = await s.get<string>("identity", await s.head());
    }
    // [DX-STG1] Why: bind the original transactional receiver before publication. An empty database reusing its name cannot replace an already-paid subscriber. Rejected: silently reconstructing a new recipient on reopen.
    await a.create(epoch, validTime, { sink: this.sink.prefix, identity: id.value });
  }
  private async identify(t: Tail, s: Documents, at: number) {
    assert(
      t.recipient && t.recipient.sink === this.sink.prefix,
      "Unregistered recipient for this account",
    );
    assert.equal(
      (await s.get<string>("identity", at)).value,
      t.recipient.identity,
      "Recipient generation changed",
    );
  }
  effects() {
    return new Dispatcher(this.notices, this.sink).effects();
  }
  async turn(opts: {
    through?: number;
    grant?: () => Promise<void>;
    afterReceive?: (p: Packet) => Promise<void>;
  }) {
    const a = this.notices,
      source = a.db,
      sourceAt = await source.head();
    const t = (await source.get<Tail>("tail", sourceAt)).value,
      state = this.ledgerStore(t.epoch),
      at = await state.head();
    await this.identify(t, state, at);
    const held = await state.row<Cursor>("cursor", at);
    const cur = held?.value ?? {
      event: 1,
      start: 0,
      parent: hash([source.prefix, t.epoch, t.census]),
      batch: 0,
      previous: hash([source.prefix, t.epoch, "receiver-genesis"]),
    };
    if (cur.event > Math.min(opts.through ?? t.sequence, t.sequence)) return false;
    const [e, erasure] = await Promise.all([
      a.event(cur.event, sourceAt),
      source.get<number>("erasure", sourceAt),
    ]);
    assert(
      e.value.epoch === t.epoch && e.value.parent === cur.parent,
      "Missing original publication",
    );
    const sel = e.value.selection;
    const ids =
      sel.kind === "subjects"
        ? sel.ids
        : await memberRange(source, e.value.census, cur.start, e.at, this.pages);
    const size = sel.kind === "subjects" ? sel.ids.length : e.value.census.count;
    assert.equal(ids.length, Math.min(this.pages * width, size - cur.start));
    const ledger = (s: string) => "ledger:" + s;
    const old = await state.rows<string>(ids.map(ledger), at);
    const ops = [] as ReturnType<Documents["change"]>;
    const deliveries: W0.Delivery[] = [];
    const start = performance.now();
    try {
      // [DX-STG1] Why: overlap at most two pinned native pages and fold them in census order, leaving an admission opportunity before each pair. Rejected: firing an entire account's reads at the foreground gateway.
      const interval = sel.kind === "census" ? this.readIntervalMs : 0;
      const quantum = interval ? 16 : 2 * width;
      for (let i = 0; i < ids.length; i += quantum) {
        if (interval) {
          const remaining = this.lastRead + interval - performance.now();
          if (remaining > 0) {
            const began = performance.timeOrigin + performance.now();
            await sleep(remaining);
            a.budget?.mark("read-pacing", began);
          }
        }
        await opts.grant?.();
        this.lastRead = performance.now();
        const groups = (
          interval
            ? [ids.slice(i, i + quantum)]
            : [ids.slice(i, i + width), ids.slice(i + width, i + 2 * width)]
        ).filter((g) => g.length);
        const records = await Promise.all(groups.map((group) => a.work(e, group, sourceAt)));
        for (const [j, group] of groups.entries())
          for (const [k, s] of group.entries()) {
            const prev = old.get(ledger(s)),
              items = prev ? unpack<W0.ItemState[]>(prev.value) : [];
            const result = W0.publish({ items, subjects: [], pending: [] }, [
              {
                subject: s,
                release: e.value.nextHash,
                basis: { tx: BigInt(e.at), validTime: e.value.validTime },
                workItems: records[j]![k]!,
              },
            ]);
            if (canonical(result.state.items) !== canonical(items))
              ops.push(...state.change(ledger(s), prev, pack(result.state.items)));
            deliveries.push(...result.deliveries);
          }
      }
    } catch (error) {
      if ((await source.get<number>("erasure", await source.head())).id !== erasure.id)
        throw new Conflict("Erasure changed during evaluation");
      throw error;
    }
    // [DX-STG1] Why: erasure seals the historical work before destroying its evidence. If it moved during our reads, repeat at the new barrier. After this check a later erasure can only preserve the already-computed debt. Rejected: a cross-database source CAS that would put every batch back on the live write queue.
    if ((await source.get<number>("erasure", await source.head())).id !== erasure.id)
      throw new Conflict("Erasure changed during evaluation");
    const through = cur.start + ids.length,
      done = through === size;
    const next: Cursor = {
      ...cur,
      event: done ? cur.event + 1 : cur.event,
      start: done ? 0 : through,
      parent: done ? hash(e.value) : cur.parent,
    };
    let packet: Packet | undefined;
    if (deliveries.length) {
      packet = {
        epoch: t.epoch,
        account: source.prefix,
        batch: cur.batch + 1,
        previous: cur.previous,
        event: cur.event,
        position: e.at,
        recipe: hash(e.value),
        start: cur.start,
        through,
        deliveries,
      };
      next.batch = packet.batch;
      next.previous = hash(packet);
    }
    ops.push(...state.change("cursor", held, next));
    const checks = [state.guard("cursor", held)],
      binding = hash([source.prefix, t.epoch, e.id, cur, ops]);
    this.metrics.evaluationMs += performance.now() - start;
    await opts.grant?.();
    const apply = performance.now();
    try {
      if (packet) {
        if (
          !(await receiveOrdered(this.sink, source.prefix, packet, next.previous, undefined, {
            binding,
            ops,
            checks,
          }))
        )
          return true;
        a.budget?.packet(packet);
      } else {
        await state.commit("checkpoint:" + cur.event + ":" + cur.start, binding, ops, checks);
      }
    } catch (error) {
      if (error instanceof assert.AssertionError) {
        const settled = await state.row<Cursor>("cursor", await state.head());
        if (
          settled &&
          (settled.value.event > cur.event ||
            (settled.value.event === cur.event && settled.value.start > cur.start))
        )
          throw new Conflict("A different receiver batch won this cursor");
      }
      throw error;
    }
    this.metrics.receiverMs += performance.now() - apply;
    this.metrics.sinkWrites++;
    this.metrics.visits++;
    this.metrics.evaluations += ids.length;
    if (packet) {
      this.metrics.packets++;
      this.metrics.deliveries += deliveries.length;
      await opts.afterReceive?.(packet);
    }
    return true;
  }
  async drain(
    opts: {
      through?: number;
      gapMs?: number;
      grant?: () => Promise<void>;
      afterReceive?: (p: Packet) => Promise<void>;
    } = {},
  ) {
    for (;;) {
      try {
        if (!(await this.turn(opts))) return this.metrics;
      } catch (e) {
        if (!(e instanceof Conflict)) throw e;
        this.metrics.conflicts++;
      }
      if (opts.gapMs) {
        const at = performance.timeOrigin + performance.now();
        await sleep(opts.gapMs);
        this.notices.budget?.mark("sleep", at);
      } else await yieldTurn();
    }
  }
}
