import assert from "node:assert/strict";
import { W0 } from "../../../bench/lib/w0-world.ts";
import type { CompositionHandle } from "../../../bench/lib/composition.ts";
import {
  Account,
  evaluate,
  stateOf,
  type Batch,
  type Certificate,
  type Leaf,
  type Release,
  type SourceCut,
  type Visible,
} from "./account.ts";
import { evaluator } from "./prepare.ts";
import {
  Conflict,
  NotReady,
  digest,
  live,
  replace,
  safeName,
  set,
  validMillis,
} from "./storage.ts";

export type Intent = {
  command: string;
  generation: string;
  release: Release;
  from: string;
  predecessor: string | null;
};
export async function close(a: Account, intent: Intent, beforeSubmit?: () => Promise<void>) {
  const id = "activate:" + safeName(intent.command);
  const recovered = await a.db.recovered(id, intent);
  if (recovered) return recovered;
  const at = await a.head(),
    [control, stage] = await Promise.all([a.control(at), a.stage(at)]);
  const c = control.data,
    seal = stage?.data?.seal;
  if (
    !stage ||
    !seal ||
    seal.generation !== intent.generation ||
    seal.release !== intent.release ||
    seal.from !== intent.from ||
    seal.predecessor !== intent.predecessor ||
    c.generation !== seal.predecessor
  )
    throw new NotReady("Different or unprepared deployment");
  if (
    seal.evaluator !== evaluator ||
    c.input !== c.settled ||
    c.input !== seal.input ||
    c.publication !== seal.publication ||
    c.validTime !== seal.validTime ||
    seal.from > c.validTime
  )
    throw new NotReady("Preparation is behind live facts, publication or time");
  if (c.generation && (await a.visible(c.generation, at)).data.seal.from > seal.from)
    throw new NotReady("Candidate cannot win the live release calendar");
  const sequence = c.publication + 1;
  const visible: Visible = { seal, previous: c.generation, publication: sequence };
  const next = {
    ...c,
    generation: intent.generation,
    release: intent.release,
    publication: sequence,
  };
  // [DX-STG1] Why: the Datomic transaction that claims Publish also exposes the certified output and outbox at its real ordinal. Rejected: estimating A from the previous head or checking the seal outside the serial write.
  const ops = [
    ...replace(control, next),
    ...replace(stage, null),
    set("visible:" + intent.generation, visible),
    set("batch:" + sequence, { activation: intent.generation } satisfies Batch),
  ];
  await beforeSubmit?.();
  return a.db.write(id, intent, ops, [live(control), live(stage)]);
}
async function resolve(a: Account, generation: string | null, cut: SourceCut) {
  while (generation) {
    const row = await a.visible(generation, cut.position);
    if (row.data.seal.from <= cut.validTime) return row;
    generation = row.data.previous;
  }
  throw Error("W0.E_NO_RELEASE");
}
export async function read(
  a: Account,
  subject: string,
  cut: SourceCut,
  between?: () => Promise<void>,
) {
  validMillis(cut.validTime);
  const control = (await a.control(cut.position)).data;
  const selected = await resolve(a, control.generation, cut),
    seal = selected.data.seal;
  // [DX-STG1] Why: the present erasure frontier dominates even an old source pin. Rejected: serving a durable pre-erasure projection to a newly opened historical reader.
  const current = await a.control(await a.head());
  if (current.data.erasure !== control.erasure)
    throw new NotReady("Historical read needs the current erasure ledger");
  await between?.();
  const member = a.source.contains
    ? await a.source.contains(subject, cut)
    : (await a.source.roster(cut)).includes(subject);
  if (!member) throw Error("Outside account roster");
  const basis = { tx: cut.position, validTime: cut.validTime };
  if (
    control.generation === seal.generation &&
    control.validTime === cut.validTime &&
    control.settled === control.input
  ) {
    const body = (await a.bodies([subject], control, cut.position)).get(subject);
    if (
      body &&
      body.basis.validTime === cut.validTime &&
      body.leaf.answer.release === W0[seal.release].hash
    )
      return { route: "prepared", output: { ...body.leaf.answer, basis } };
  }
  const [world] = await a.source.worlds([subject], cut);
  assert(world?.subject === subject);
  return { route: "exact-source", output: evaluate(world, seal.release, basis) };
}
export async function outbox(a: Account, subject: string, position: number) {
  const c = (await a.control(position)).data,
    body = (await a.bodies([subject], c, position)).get(subject);
  const ledger = stateOf(body);
  const ack = (await a.db.cell<number>("ack:" + subject, position))?.data ?? 0;
  assert(ack <= ledger.pending.length);
  return { ...ledger, pending: ledger.pending.slice(ack) };
}
export async function atRecordTime(
  store: Pick<CompositionHandle, "currentPosition" | "feedPage">,
  instant: number,
) {
  assert(Number.isFinite(instant));
  let low = 0,
    high = await store.currentPosition();
  while (low < high) {
    const mid = Math.ceil((low + high) / 2),
      row = (await store.feedPage(mid - 1, 1)).transactions[0];
    assert(
      row?.position === mid && Number.isFinite(row.instant),
      "Strict record-time journal missing",
    );
    if (row.instant <= instant) low = mid;
    else high = mid - 1;
  }
  return low;
}
