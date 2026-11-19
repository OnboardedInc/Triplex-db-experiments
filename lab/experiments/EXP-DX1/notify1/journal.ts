import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { W0, canonical, sha256 } from "../../../bench/lib/w0-world.ts";
import { type Census, installCensus, memberPage, width } from "./census.ts";
import {
  Documents,
  hash,
  pack,
  unpack,
  type Op,
  type Check,
  type Row,
  type Store,
} from "./store.ts";

export type Release = "R1" | "R2" | "R3";
export type Cut = { position: number; validTime: string };
export interface Inputs {
  identity: string;
  roster(cut: Cut): Promise<string[]>;
  worlds(subjects: string[], cut: Cut): Promise<W0.World[]>;
}
export type Selection = { kind: "census" } | { kind: "subjects"; ids: string[] };
export interface Request {
  id: string;
  kind: "activation" | "reconcile" | "erase";
  release: Release;
  validTime: string;
  from: string;
  selection: Selection;
}
export interface Tail {
  epoch: string;
  census: Census;
  sequence: number;
  parent: string;
  release: Release | null;
  from: string;
  validTime: string;
  inputs: string;
  evaluator: string;
}
export interface Recipe {
  version: 1;
  account: string;
  epoch: string;
  sequence: number;
  parent: string;
  old: Release | null;
  next: Release;
  oldHash: string | null;
  nextHash: string;
  document: W0.ReleaseDoc | null;
  from: string;
  validTime: string;
  request: string;
  kind: Request["kind"];
  census: Census;
  selection: Selection;
  inputs: string;
  evaluator: string;
  sourceBefore: number;
}
export type Event = Row<Recipe>;
type Erased = { through: number };
type Work = W0.EvaluationRecord["workItems"];
const kernelDir = new URL("../../../../packages/w0/dist/", import.meta.url);
export const interpreter = hash([
  "W0.publish/notify1-v1",
  ...readdirSync(kernelDir)
    .filter((f) => f.endsWith(".js"))
    .sort()
    .map((f) => [f, sha256(readFileSync(new URL(f, kernelDir)))]),
]);
const releaseIdentity = (r: Release) => W0[r].hash;
const receiptsAt = (s: string, n: number) => "erase-proof:" + hash(s) + ":" + n;
export class Notices {
  readonly db: Documents;
  readonly inputs: Inputs;
  constructor(store: Store, account: string, inputs: Inputs) {
    this.db = new Documents(store, account);
    this.inputs = inputs;
  }
  async create(epoch: string, validTime: string) {
    assert(epoch && W0.isInstant(validTime));
    const at = await this.db.head(),
      roster = await this.inputs.roster({ position: at, validTime });
    const census = await installCensus(this.db, roster);
    const tail: Tail = {
      epoch,
      census,
      sequence: 0,
      parent: hash([this.db.prefix, epoch, census]),
      release: null,
      from: validTime,
      validTime,
      inputs: this.inputs.identity,
      evaluator: interpreter,
    };
    return this.db.commit(
      "genesis",
      tail,
      [this.db.put("tail", tail), this.db.put("erasure", 0)],
      [this.db.guard("tail", undefined)],
    );
  }
  async observe() {
    return this.db.get<Tail>("tail", await this.db.head());
  }
  async event(n: number, at: number) {
    const e = await this.db.get<Recipe>("event:" + n, at),
      r = e.value;
    assert(
      r.version === 1 &&
        r.sequence === n &&
        r.account === this.db.prefix &&
        r.inputs === this.inputs.identity &&
        r.evaluator === interpreter &&
        r.nextHash === releaseIdentity(r.next) &&
        (r.kind === "activation"
          ? r.document && "sha256:" + hash(r.document) === r.nextHash
          : r.document === null) &&
        r.oldHash === (r.old ? releaseIdentity(r.old) : null) &&
        r.sourceBefore < e.at,
    );
    return e;
  }
  // [DX-STG1] Why: both activation hosts append these operations in their own guarded transaction. The stored event's assertion position is A. Rejected: guessing A or enqueuing a second transaction after the release ACK.
  plan(tail: Row<Tail>, req: Request) {
    const old = tail.value;
    assert(
      tail.key === "tail" &&
        old.inputs === this.inputs.identity &&
        old.evaluator === interpreter &&
        W0.isInstant(req.validTime) &&
        W0.isInstant(req.from),
    );
    assert(
      req.validTime >= old.validTime &&
        req.from <= req.validTime &&
        /^[a-zA-Z0-9_.:-]{1,160}$/.test(req.id),
    );
    if (req.kind === "activation")
      assert(
        req.selection.kind === "census" && (!old.release || req.from >= old.from),
        "Release must win at live time",
      );
    else assert(req.release === old.release && req.from === old.from, "Stale release admission");
    if (req.selection.kind === "subjects")
      assert(
        req.selection.ids.length <= width &&
          req.selection.ids.every((id, i, a) => W0.isPlacementId(id) && (!i || id > a[i - 1]!)),
      );
    const sequence = old.sequence + 1;
    const recipe: Recipe = {
      version: 1,
      account: this.db.prefix,
      epoch: old.epoch,
      sequence,
      parent: old.parent,
      old: old.release,
      next: req.release,
      oldHash: old.release ? releaseIdentity(old.release) : null,
      nextHash: releaseIdentity(req.release),
      document: req.kind === "activation" ? W0[req.release].doc : null,
      from: req.from,
      validTime: req.validTime,
      request: req.id,
      kind: req.kind,
      census: old.census,
      selection: req.selection,
      inputs: old.inputs,
      evaluator: interpreter,
      sourceBefore: tail.at,
    };
    const next: Tail = {
      ...old,
      sequence,
      parent: hash(recipe),
      release: req.release,
      from: req.from,
      validTime: req.validTime,
    };
    return {
      recipe,
      operations: [...this.db.change("tail", tail, next), this.db.put("event:" + sequence, recipe)],
      preconditions: [this.db.guard("tail", tail)],
    };
  }
  async append(tail: Row<Tail>, req: Request, sourceOps: Op[] = [], sourceChecks: Check[] = []) {
    assert(req.kind !== "erase", "Use erase before removing protected source bytes");
    assert(sourceOps.every((o) => o.op === "retract" || !o.entityId.startsWith("notice:v1:")));
    const id = "event-command:" + req.id,
      intent = [req, sourceOps, sourceChecks];
    const prior = await this.db.original(id, intent);
    if (prior) return prior;
    const p = this.plan(tail, req);
    return this.db.commit(
      id,
      intent,
      [...sourceOps, ...p.operations],
      [...sourceChecks, ...p.preconditions],
    );
  }
  async members(e: Event, start: number) {
    const selection = e.value.selection;
    if (selection.kind === "subjects") return selection.ids.slice(start, start + width);
    return memberPage(this.db, e.value.census, start, e.at);
  }
  async work(e: Event, ids: string[], at: number): Promise<Work[]> {
    const markers = await this.db.rows<Erased>(
      ids.map((s) => "erased:" + s),
      at,
    );
    const frozen = ids.filter(
      (s) => (markers.get("erased:" + s)?.value.through ?? 0) >= e.value.sequence,
    );
    const proofs = await this.db.rows<{ event: string; subject: string; items: string }>(
      frozen.map((s) => receiptsAt(s, e.value.sequence)),
      at,
    );
    const fresh = ids.filter((s) => !proofs.has(receiptsAt(s, e.value.sequence)));
    assert.equal(
      fresh.length + frozen.length,
      ids.length,
      "Erased delivery has no replay-safe preimage",
    );
    const worlds = fresh.length
      ? await this.inputs.worlds(fresh, { position: e.at, validTime: e.value.validTime })
      : [];
    assert.deepEqual(
      worlds.map((w) => w.subject),
      fresh,
    );
    const by = new Map<string, Work>();
    for (const world of worlds) {
      const result = W0.evaluateWorld(world, W0[e.value.next], {
        tx: e.at,
        validTime: e.value.validTime,
      });
      if ("error" in result) throw Error(result.error + " for " + world.subject);
      by.set(world.subject, result.workItems);
    }
    return ids.map((s) => {
      const sealed = proofs.get(receiptsAt(s, e.value.sequence))?.value;
      if (!sealed) return by.get(s)!;
      assert(sealed.subject === s && sealed.event === hash([e.at, e.value]));
      return unpack<Work>(sealed.items);
    });
  }
  async erase(tail: Row<Tail>, req: Request, sourceOps: Op[], sourceChecks: Check[] = []) {
    assert(
      req.kind === "erase" && req.selection.kind === "subjects" && req.selection.ids.length === 1,
    );
    const subject = req.selection.ids[0]!,
      id = "event-command:" + req.id,
      intent = [req, sourceOps, sourceChecks];
    const original = await this.db.original(id, intent);
    if (original) return original;
    const p = this.plan(tail, req),
      at = await this.db.head(),
      guard = await this.db.get<number>("erasure", at);
    const key = "erased:" + subject,
      prev = await this.db.row<Erased>(key, at),
      proofs: Op[] = [];
    // [DX-STG1] Why: an owed EVSUB can depend on a value that will become unreadable at every old pin. Freeze only W0's replay-safe work records before erasure, even for a stalled receiver. Rejected: silently re-evaluating an old event with the erased marker.
    for (let i = (prev?.value.through ?? 0) + 1; i <= tail.value.sequence; i++) {
      const e = await this.event(i, at),
        sel = e.value.selection;
      if (sel.kind === "subjects" && !sel.ids.includes(subject)) continue;
      if (sel.kind === "census") {
        const members = await this.inputs.roster({ position: e.at, validTime: e.value.validTime });
        assert.equal(hash(members), e.value.census.members);
        if (!members.includes(subject)) continue;
      }
      const [items] = await this.work(e, [subject], at);
      proofs.push(
        this.db.put(receiptsAt(subject, i), {
          subject,
          event: hash([e.at, e.value]),
          items: pack(items),
        }),
      );
    }
    return this.db.commit(
      id,
      intent,
      [
        ...sourceOps,
        ...proofs,
        ...this.db.change(key, prev, { through: tail.value.sequence }),
        ...this.db.change("erasure", guard, guard.value + 1),
        ...p.operations,
      ],
      [...sourceChecks, ...p.preconditions, this.db.guard("erasure", guard)],
    );
  }
}
