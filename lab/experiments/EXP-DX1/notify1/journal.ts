import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { W0, sha256 } from "../../../bench/lib/w0-world.ts";
import type { Budget } from "./budget.ts";
import { type Census, installCensus, memberPage, width } from "./census.ts";
import type { CommittedRanges, Coverage } from "./ranges.ts";
import type { ReleaseCopy } from "./copy-plan.ts";
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
  ranges?: Pick<CommittedRanges, "suggest">;
  releaseCopy?: Pick<ReleaseCopy, "suggest" | "results">;
}
export type Selection = { kind: "census" } | { kind: "subjects"; ids: string[] };
export interface Request {
  document?: W0.ReleaseDoc;
  id: string;
  kind: "activation" | "reconcile" | "erase";
  release: Release;
  validTime: string;
  from: string;
  selection: Selection;
}
export interface Tail {
  recipient?: { sink: string; identity: string };
  custom?: { hash: string; definition: number };
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
  definition?: number;
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
  budget?: Budget;
  readonly db: Documents;
  readonly inputs: Inputs;
  constructor(store: Store, account: string, inputs: Inputs) {
    this.db = new Documents(store, account);
    this.inputs = inputs;
  }
  async create(epoch: string, validTime: string, recipient?: Tail["recipient"]) {
    assert(epoch && W0.isInstant(validTime));
    const at = await this.db.head(),
      roster = await this.inputs.roster({ position: at, validTime });
    const census = await installCensus(this.db, roster);
    const tail: Tail = {
      ...(recipient ? { recipient } : {}),
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
    return this.checkedEvent(await this.db.get<Recipe>("event:" + n, at), n);
  }
  checkedEvent(e: Event, n: number) {
    const r = e.value;
    assert(
      r.version === 1 &&
        r.sequence === n &&
        r.account === this.db.prefix &&
        r.inputs === this.inputs.identity &&
        r.evaluator === interpreter &&
        (r.definition !== undefined
          ? Number.isSafeInteger(r.definition) && r.definition > 0 && r.definition <= n
          : r.nextHash === releaseIdentity(r.next)) &&
        (r.kind === "activation"
          ? r.document && r.document.name === r.next && "sha256:" + hash(r.document) === r.nextHash
          : r.document === null) &&
        (r.old
          ? typeof r.oldHash === "string" && /^sha256:[a-f0-9]{64}$/.test(r.oldHash)
          : r.oldHash === null) &&
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
    if (req.document)
      assert(
        req.kind === "activation" && req.document.name === req.release,
        "Release document belongs to a different intent",
      );
    const policy = req.document ? W0.compileRelease(req.document) : W0[req.release];
    const priorHash = old.custom?.hash ?? (old.release ? releaseIdentity(old.release) : null);
    const custom =
      req.kind === "activation"
        ? policy.hash !== releaseIdentity(req.release)
          ? { hash: policy.hash, definition: sequence }
          : undefined
        : old.custom;

    const recipe: Recipe = {
      version: 1,
      account: this.db.prefix,
      epoch: old.epoch,
      sequence,
      parent: old.parent,
      old: old.release,
      next: req.release,
      oldHash: priorHash,
      nextHash: custom?.hash ?? releaseIdentity(req.release),
      ...(custom ? { definition: custom.definition } : {}),
      document: req.kind === "activation" ? policy.doc : null,
      from: req.from,
      validTime: req.validTime,
      request: req.id,
      kind: req.kind,
      census: old.census,
      // [DX-STG1] Why: generic source ops do not attest the full reverse dependency
      // closure at the predecessor and committed cuts, including valid-time changes.
      // Rejected: trusting the caller's subjects or the edited entity's owner.
      selection: { kind: "census" },
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
    if (custom) next.custom = custom;
    else delete next.custom;
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
  censusFor(e: Event): Census {
    // [DX-STG1] Why: an event already written with the old caller list can
    // contain real unpaid debt outside that list. Rejected: advancing its
    // cursor or retroactively treating an already paid span as a whole census.
    assert(e.value.selection.kind === "census", "Legacy selection lacks coverage proof");
    return e.value.census;
  }
  async members(e: Event, start: number) {
    return memberPage(this.db, this.censusFor(e), start, e.at);
  }
  async coverage(e: Event, ledger: Documents, at: number) {
    if (e.value.kind === "erase") return;
    const row = await ledger.row<string>("range:" + e.value.sequence, at);
    if (!row) return;
    const saved = unpack<{ assertion: string; recipe: string; coverage: Coverage }>(row.value);
    assert(saved.assertion === e.id && saved.recipe === hash(e.value));
    return saved.coverage;
  }
  async select(e: Event, ledger: Documents, at: number, sourceAt: number, start: number) {
    this.censusFor(e);
    const previous = await this.coverage(e, ledger, at);
    if (previous || start !== 0) return { coverage: previous };
    const planner = e.value.kind === "activation" ? this.inputs.releaseCopy : this.inputs.ranges;
    const coverage = await planner?.suggest(this, e, sourceAt);
    return {
      coverage,
      write: coverage
        ? ledger.put(
            "range:" + e.value.sequence,
            pack({
              assertion: e.id,
              recipe: hash(e.value),
              coverage,
            }),
          )
        : undefined,
    };
  }
  async work(e: Event, ids: string[], at: number): Promise<Work[]> {
    this.censusFor(e);
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
    let policy = W0.RELEASES_BY_HASH.get(e.value.nextHash);
    if (!policy) {
      assert(e.value.definition, "Unregistered release");
      const origin = e.value.document ? e : await this.event(e.value.definition, e.at);
      assert(
        origin.value.kind === "activation" &&
          origin.value.epoch === e.value.epoch &&
          origin.value.nextHash === e.value.nextHash &&
          origin.value.document,
      );
      policy = W0.compileRelease(origin.value.document);
      assert.equal(policy.hash, e.value.nextHash);
    }
    const by = new Map<string, Work>();
    const began = this.budget ? performance.timeOrigin + performance.now() : 0;
    for (const world of worlds) {
      const result = W0.evaluateWorld(world, policy, {
        tx: e.at,
        validTime: e.value.validTime,
      });
      if ("error" in result) throw Error(result.error + " for " + world.subject);
      by.set(world.subject, result.workItems);
    }
    this.budget?.mark("kernel", began, { evaluations: worlds.length });
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
        census = this.censusFor(e);
      const members = await this.inputs.roster({ position: e.at, validTime: e.value.validTime });
      assert.equal(hash(members), census.members);
      if (!members.includes(subject)) continue;
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
