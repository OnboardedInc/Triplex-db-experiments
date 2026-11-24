import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import type { DatomicClient } from "../../../../packages/datomic/dist/index.js";
import { fieldCount, fieldValue, taskSerial } from "../../../bench/lib/deep-world.ts";
import { SEED_VALID_FROM } from "../../../bench/lib/world.ts";
import { loadParams, productionOffers, slotAttribute, tapeReport, type ProductionOffer, type Shape } from "../w1/field/production.ts";
import { agedFieldRow } from "../prep1/ceiling-seed.ts";
import { task, type Write } from "../scale1/decision/plan.ts";
import { Histogram } from "../../../bench/lib/hist.ts";
import { cellPath, ratedTape, serverCells, type ServerCell, type WindowSeconds } from "./server-workload.ts";

// [DX-INT1] Why: the version 0.1 card measures real traffic. The production-shaped tape (REAL2, real2/PRODUCTION-TAPE.md)
// replaces the card's neighbour saves in its loaded cells, in either commit shape, while the quiet account keeps the
// card's own stream so the P6 pairs stay comparable. Saturday's tape stays selectable so earlier cards reproduce.
// Rejected: a second runner (the card's admission, journal and receipt checks must judge the new saves) and changing
// the quiet stream (its solo and loaded halves would no longer be the same tape).
export const cardTapes = ["saturday", "production-R", "production-S"] as const;
export type CardTape = (typeof cardTapes)[number];
export function parseCardTape(text: string | undefined): CardTape {
  const tape = cardTapes.find((t) => t === (text ?? "saturday"));
  assert(tape, "Choose --tape saturday, production-R or production-S");
  return tape;
}
export const tapeShape = (tape: CardTape): Shape | undefined =>
  tape === "production-R" ? "R" : tape === "production-S" ? "S" : undefined;
export const tapeTitle = (tape: CardTape) => tape === "saturday"
  ? "Saturday's tape (every neighbour save a one- or two-field replacement, nearly every save a subject not seen before)"
  : `the production-shaped tape, shape ${tapeShape(tape)} (${tapeShape(tape) === "R"
    ? "one commit per form row at the fixed row rates" : "one commit per subject's save, at the same saves as shape R"})`;

const paramsFile = new URL("../real2/production-shape.json", import.meta.url).pathname;
let loaded: ReturnType<typeof loadParams> | undefined;
export const productionParams = () => (loaded ??= loadParams(paramsFile));

/** REAL2's person bands: 235, 394 and 620 use bands 0 to 2, so those cells are REAL2's measured tapes; 50 shares band 0. */
export const productionBand = (rate: number) => rate === 394 ? 1 : rate === 620 ? 2 : 0;
const fieldExtraBase = 100;

export type ProductionWrite = Write & {
  owner: string;
  person: number;
  /** Field slots this commit writes (n is :task/field-n). */
  slots: number[];
  /** The subject's save this commit belongs to, as account/save. */
  saveKey: string;
  /** Form rows in this commit: one in shape R, every row of the save in shape S. */
  rows: number;
  /** Seconds since the subject's previous save (null for a first-ever save); only on a save's first commit. */
  gap?: number | null;
};
export const isProduction = (e: Write): e is ProductionWrite => Array.isArray((e as ProductionWrite).slots);

/**
 * The neighbour commits of one loaded cell. `fold` maps a tape person onto the database's people (the identity at full
 * size; the toy folds onto its few people per account, keeping each tape person on one toy subject).
 */
export function productionNeighbours(shape: Shape, rate: number, rowTargets: readonly number[], seconds: number,
  label: string, fold?: (account: number, person: number) => number): ProductionWrite[] {
  const { params } = productionParams();
  const offers = productionOffers(params, shape, productionBand(rate), rowTargets, seconds);
  const ordinal = new Map<number, number>();
  return offers.map((o: ProductionOffer) => {
    const person = fold ? fold(o.account, o.person) : o.person;
    const i = ordinal.get(o.account) ?? 0;
    ordinal.set(o.account, i + 1);
    const rows = o.slots.filter((s) => s < fieldExtraBase).length || 1;
    return {
      account: o.account, ordinal: i, subject: person, ms: o.ms, width: o.slots.length,
      version: [label, o.account, i].join("/"), owner: task(o.account, person), person,
      slots: [...o.slots], saveKey: o.account + "/" + o.save, rows, gap: o.gap,
    };
  });
}

/** Row targets for the nine neighbour accounts: the cell's offered rows minus the quiet account's saves. */
export function rowTargets(rate: number, seconds: number, quiet: number) {
  const remaining = rate * seconds - quiet;
  return Array.from({ length: 9 }, (_, n) => Math.floor(remaining / 9) + Number(n < remaining % 9));
}

export const sortTape = (tape: Write[]) =>
  tape.sort((a, b) => a.ms - b.ms || a.account - b.account || a.ordinal - b.ordinal);

/** A full-size loaded cell on the production tape: the card's own quiet stream, then the production neighbours. */
export function fullCellTape(shape: Shape, cell: ServerCell, seconds: WindowSeconds) {
  assert(cell.loaded);
  const quiet = ratedTape(100_000, cell, seconds).filter((e) => e.account === 0);
  return sortTape([...quiet, ...productionNeighbours(shape, cell.rate, rowTargets(cell.rate, seconds, quiet.length), seconds, cellPath(cell))]);
}

/**
 * The card's input binds every loaded cell's tape report before the first offer, so the card can show that each cell
 * offered the tape its report describes. Undefined for Saturday's tape, so earlier inputs stay byte-identical.
 */
export function tapeBinding(tape: CardTape, seconds: WindowSeconds) {
  const shape = tapeShape(tape);
  if (!shape) return undefined;
  return { name: tape, paramsSha256: productionParams().sha256, cells: serverCells.filter((c) => c.loaded).map((cell) => {
    const report = cardTapeReport(fullCellTape(shape, cell, seconds), seconds);
    return { cell: cellPath(cell), tapeSha256: report.tapeSha256, reportSha256: createHash("sha256").update(JSON.stringify(report)).digest("hex") };
  }) };
}

/** The tape report REAL2 writes beside each production run, for the card's neighbour commits. */
export function cardTapeReport(tape: readonly Write[], seconds: number) {
  const { params, sha256 } = productionParams();
  const offers = tape.filter(isProduction).map((e) => ({ account: e.account, person: e.person, subtask: 0, ordinal: e.ordinal,
    extra: false, ms: e.ms, slots: e.slots, save: Number(e.saveKey.split("/")[1]), gap: e.gap ?? null }));
  return { paramsSha256: sha256, tapeSha256: createHash("sha256").update(JSON.stringify(tape)).digest("hex"),
    ...tapeReport(offers, seconds, params) };
}

/** Assertions a commit carries: one per fact, one journal change per fact and per retired value, four journal rows. */
export const commitAssertions = (facts: number, retired: number) => 2 * facts + retired + 4;
export const orderedBlockLimit = 256;
// [DX-S1] A wide block (`wideOrderedSaveIdentity`, `TX2_SUBJECT_WIDE=1`) numbers up to 4,096 assertions.
export const wideOrderedBlockLimit = 4096;

type Row = Parameters<DatomicClient["transact"]>[1]["rows"][number];
export type AgedCut = Parameters<typeof agedFieldRow>[0];
const fieldNumber = (attribute: string) => /^:task\/field-(\d+)$/.exec(attribute)?.[1];

/**
 * The predecessors of every subject the production tape writes, read at `head`, and the check that covers every
 * field the tape writes. Each of task 0's seeded fields holds exactly one current row: at or before the seed cut it
 * is the seed's value; between the seed cut and the aged head it must be AGE1's own write (`agedFieldRow`, byte-exact
 * to AGE1's replay tape); after the aged head it is one of this campaign's earlier cells. Any other task field must
 * have been written by an earlier cell of this campaign, so every other slot the tape writes is a first write.
 * Rejected: reading only the fields the card's own saves edit (a production save writes up to all of them and more).
 */
export async function productionPredecessors(reader: DatomicClient, db: string, head: number, seedCut: number,
  subjects: readonly { account: number; person: number }[], aged?: { cut: AgedCut; head: number }) {
  const owners = [...new Map(subjects.map((s) => [task(s.account, s.person), s])).entries()];
  const fields = new Map<string, Row[]>();
  const counts = { subjects: owners.length, seedRows: 0, agedRows: 0, campaignRows: 0 };
  for (let i = 0; i < owners.length; i += 64) {
    const batch = owners.slice(i, i + 64);
    const rows = await reader.rows(db, { entityIds: batch.map(([e]) => e), basis: { recordedPosition: head, validAt: SEED_VALID_FROM } });
    for (const [e, { account, person }] of batch) {
      const own = rows.filter((r) => r.entity_id === e && fieldNumber(r.attribute) !== undefined);
      const seeded = fieldCount(taskSerial(person, 0));
      const numbers = own.map((r) => Number(fieldNumber(r.attribute)));
      assert.equal(new Set(numbers).size, numbers.length, `${e}: a task field has more than one current row`);
      assert.deepEqual(numbers.filter((n) => n < seeded).sort((a, b) => a - b), Array.from({ length: seeded }, (_, n) => n),
        `${e}: task fields differ from the seed's ${seeded}`);
      for (const row of own) {
        const n = Number(fieldNumber(row.attribute));
        // A field past the seeded ones exists only if an earlier cell of this campaign wrote it first.
        if (n >= seeded) assert(row.recorded_position > (aged?.head ?? seedCut), `${e} ${row.attribute}: not a seeded field and not this campaign's`);
        assert(row.id && row.recorded_position > 0 && row.recorded_position <= head && Number.isFinite(row.recorded_at));
        if (row.recorded_position <= seedCut) {
          assert.equal(row.value_string, fieldValue(person, 0, n, 0).value, `${e} ${row.attribute}: seed value differs`);
          counts.seedRows++;
        } else if (aged && row.recorded_position <= aged.head) {
          agedFieldRow(aged.cut, account, person, n, row as Parameters<typeof agedFieldRow>[4]);
          counts.agedRows++;
        } else counts.campaignRows++;
      }
      fields.set(e, own as Row[]);
    }
  }
  return { fields, counts };
}

/**
 * After a cell: every field of every subject the production tape wrote, read back at the terminal cut, must equal the
 * sender's record of the last acknowledged (or recovered) write per field: the same row ID, value and position.
 */
export async function productionReadback(reader: DatomicClient, db: string, terminal: number,
  expected: ReadonlyMap<string, readonly Row[]>) {
  const owners = [...expected.keys()];
  let checked = 0;
  for (let i = 0; i < owners.length; i += 64) {
    const batch = owners.slice(i, i + 64);
    const rows = await reader.rows(db, { entityIds: batch, basis: { recordedPosition: terminal, validAt: SEED_VALID_FROM } });
    for (const e of batch) {
      const key = (r: Pick<Row, "attribute" | "id" | "value_string" | "recorded_position">) =>
        [r.attribute, r.id, r.value_string, r.recorded_position].join("\u0000");
      const got = rows.filter((r) => r.entity_id === e && fieldNumber(r.attribute) !== undefined).map(key).sort();
      const want = expected.get(e)!.map(key).sort();
      assert.deepEqual(got, want, `${e}: current fields differ from the acknowledged writes`);
      checked += want.length;
    }
  }
  return { subjects: owners.length, fields: checked };
}

type Settled = { account: number; due: number; end?: number; status: string; saveKey?: string; rows?: number; facts?: number;
  generalIdentity?: boolean; receipt?: unknown;
  stage?: { subjectSave?: string; nativeIoStats?: { reads?: Record<string, number> } } };
const summary = (values: number[]) => { const h = new Histogram(); for (const v of values) h.recordMs(v); return h.summary(); };
const mean = (xs: number[]) => xs.length ? Number((xs.reduce((a, b) => a + b, 0) / xs.length).toFixed(4)) : null;

/**
 * What the card reports for a production cell (neighbour commits; the quiet account is P6): rates per commit and per
 * row, per-commit latency, save completion (first row offered to last row acknowledged), storage reads per commit in
 * the first 60 s and after 150 s, and the split between the per-subject ordered writer and the general writer.
 */
export function productionCellMetrics(writes: readonly Settled[], start: number, seconds: number) {
  const neighbours = writes.filter((w) => w.account !== 0 && w.saveKey !== undefined);
  const acked = neighbours.filter((w) => w.receipt && w.end !== undefined);
  const half = start + seconds * 500, end = start + seconds * 1000;
  const inWindow = acked.filter((w) => w.status === "acked" && w.end! < end);
  const latency = (rows: readonly Settled[]) => summary(rows.map((w) => w.end! - w.due));
  const reads = (rows: readonly Settled[]) => rows.map((w) => w.stage?.nativeIoStats?.reads?.["sql"]).filter((x): x is number => typeof x === "number");
  const saves = new Map<string, { first: number; last: number; rows: number; done: number; total: number }>();
  for (const w of neighbours) {
    const s = saves.get(w.saveKey!) ?? { first: w.due, last: -Infinity, rows: 0, done: 0, total: 0 };
    s.first = Math.min(s.first, w.due); s.total++;
    if (w.receipt && w.end !== undefined) { s.last = Math.max(s.last, w.end); s.done++; }
    s.rows += w.rows ?? 1;
    saves.set(w.saveKey!, s);
  }
  const complete = [...saves.values()].filter((s) => s.done === s.total);
  const path = (subject: boolean) => {
    const rows = acked.filter((w) => Boolean(w.stage?.subjectSave) === subject);
    const late = rows.filter((w) => w.due >= start + 150_000);
    return { commits: rows.length, perSecond: Number((rows.filter((w) => w.status === "acked" && w.end! < end).length / seconds).toFixed(3)),
      latency: latency(rows), lateLatency: latency(rows.filter((w) => w.due >= half)), lateReadsPerCommit: mean(reads(late)) };
  };
  return {
    offered: { commits: neighbours.length, rows: neighbours.reduce((n, w) => n + (w.rows ?? 1), 0), saves: saves.size,
      commitsPerSecond: Number((neighbours.length / seconds).toFixed(3)),
      rowsPerSecond: Number((neighbours.reduce((n, w) => n + (w.rows ?? 1), 0) / seconds).toFixed(3)) },
    stored: { commitsPerSecond: Number((inWindow.length / seconds).toFixed(3)),
      rowsPerSecond: Number((inWindow.reduce((n, w) => n + (w.rows ?? 1), 0) / seconds).toFixed(3)),
      durable: acked.length, expired: neighbours.filter((w) => w.status === "expired-before-dispatch").length,
      notDurable: neighbours.length - acked.length },
    commitLatency: latency(acked), commitLatencySecondHalf: latency(acked.filter((w) => w.due >= half)),
    saveCompletion: summary(complete.map((s) => s.last - s.first)),
    saveCompletionSecondHalf: summary(complete.filter((s) => s.first >= half).map((s) => s.last - s.first)),
    incompleteSaves: saves.size - complete.length,
    readsPerCommit: { firstMinute: mean(reads(acked.filter((w) => w.due < start + 60_000))),
      late: mean(reads(acked.filter((w) => w.due >= start + 150_000))), sampled: reads(acked).length },
    writerPath: { subject: path(true), general: path(false) },
    generalIdentityCommits: neighbours.filter((w) => w.generalIdentity).length,
  };
}
