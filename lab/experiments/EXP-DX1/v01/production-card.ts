import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import type { DatomicClient } from "../../../../packages/datomic/dist/index.js";
import { fieldCount, fieldValue, taskSerial } from "../../../bench/lib/deep-world.ts";
import { SEED_VALID_FROM } from "../../../bench/lib/world.ts";
import { loadParams, productionOffers, slotAttribute, tapeReport, type ProductionOffer, type Shape, type TapeEdge } from "../w1/field/production.ts";
import { agedFieldRow } from "../prep1/ceiling-seed.ts";
import { keyFor, root, task, type Write } from "../scale1/decision/plan.ts";
import { loadMixParams, mixOffers, mixReport, newPersonBase, type MixKind, type MixOffer, type OwnerRef, type RefTarget } from "../w1/field/production-mix.ts";
import { Histogram } from "../../../bench/lib/hist.ts";
import { cellPath, ratedTape, serverCells, type ServerCell, type WindowSeconds } from "./server-workload.ts";

// [DX-INT1] Why: the version 0.1 card measures real traffic. The production-shaped tape (REAL2, real2/PRODUCTION-TAPE.md)
// replaces the card's neighbour saves in its loaded cells, in either commit shape, while the quiet account keeps the
// card's own stream so the P6 pairs stay comparable. Saturday's tape stays selectable so earlier cards reproduce.
// Rejected: a second runner (the card's admission, journal and receipt checks must judge the new saves) and changing
// the quiet stream (its solo and loaded halves would no longer be the same tape).
// [DX-CARD2] The "-noburst" tapes are the same process without the end-of-cell burst (w1/field/production.ts edge
// "spread"): no account has a save due at the cell's last instant. Their offers and hashes differ from the measured
// "production-R" and "production-S", which stay as they were so the cards of 2026-11-23 reproduce.
// [DX-S4] "production-M" is the real mix of saves (w1/field/production-mix.ts: most saves create an entity), at the same
// saves per second as shape S in each cell; "production-M-burst" is the creation burst (every save creates something).
// Both are sent only through the product's path (DX_S2_PRODUCT=1). R, S and the default are unchanged.
export const cardTapes = ["saturday", "production-R", "production-S", "production-R-noburst", "production-S-noburst",
  "production-M", "production-M-burst"] as const;
export type CardTape = (typeof cardTapes)[number];
/** Reads a recorded or passed tape name. A record without one predates the tape setting, so it ran Saturday's tape. */
export function parseCardTape(text: string | undefined): CardTape {
  const tape = cardTapes.find((t) => t === (text ?? "saturday"));
  assert(tape, "Choose --tape saturday, production-R, production-S, production-R-noburst, production-S-noburst, production-M or production-M-burst");
  return tape;
}
// [DX-S1] Why: the owner chose one commit per subject's save as the product's save shape (lab/V0.1.md, 2026-11-24), so a
// new card's save loads run shape S unless another tape is named; the realistic card keeps its own tape. Only new runs
// take this default: a recorded campaign without a tape name is still read as Saturday's (parseCardTape).
// Rejected: changing parseCardTape's fallback (an old campaign would be re-assembled as shape S) and removing the other
// tapes (earlier cards must reproduce).
// [DX-INT3] With CARD2's tapes on the branch the default is shape S without the end-of-cell burst (the card's P2 rule of
// 2026-11-24 judges second halves of 300 s cells; the burst tape stays selectable as production-S).
export const defaultCardTape: CardTape = "production-S-noburst";
// [DX-S1] Default-off writer options a card arm may run with: wide saves (W2), general-writer hints (W3), per-subject
// writer hints (W4). run.ts passes them to the arm, adopted-server.ts records the ones set, adopted.ts checks the
// writer's readback, and the card names them. Rejected: passing the whole environment (unrecorded settings).
// [DX-S2] DX_S2_PRODUCT (0 or 1, recorded either way) sends every card save through the product's path (TriplesLive and
// the Datomic adapter) with the SDK's orderedSaves option off or on; unset, the lab producer as before. It is a client
// setting, so no writer reads it back.
// [DX-S3] DX_S3_OWNERS=1 (with DX_S2_PRODUCT=1 and TX2_SUBJECT_WIDE=1): the several-owners option in the writers
// (TX2_SUBJECT_SEVERAL_OWNERS, forwarded by stack/up.sh) and in the SDK (severalOwners); recorded only when on.
// [DX-S4] DX_S4_CREATE=1 (with DX_S3_OWNERS=1): the creation option in the writers (TX2_SUBJECT_CREATE, forwarded by
// stack/up.sh) and in the SDK (creationSaves); recorded only when on.
export const writerOptionNames = ["TX2_SUBJECT_WIDE", "TX2_GENERAL_PREFETCH", "TX2_SUBJECT_HINTS", "DX_S2_PRODUCT", "DX_S3_OWNERS", "DX_S4_CREATE"] as const;
// [DX-INT3] Default-off read gateway options a card arm may run with (W3): the bound on reads waiting for a permit and
// the web-thread counters. stack/up.sh passes them to the gateways only when set. run.ts passes them to the arm and
// adopted-server.ts records the ones set. Why: before this run.ts dropped them, so W3's published "bound on" arm would
// have run with the bound off. Rejected: passing the whole environment (unrecorded settings).
export const readQueueOptionNames = ["DX_READ_WAIT_LIMIT", "DX_THREAD_COUNTERS"] as const;
export const readQueueOptionsSet = (env: NodeJS.ProcessEnv) => {
  const limit = env.DX_READ_WAIT_LIMIT, counters = env.DX_THREAD_COUNTERS;
  assert(limit === undefined || limit === "" || (/^[1-9][0-9]{0,3}$/.test(limit) && Number(limit) <= 4096), "DX_READ_WAIT_LIMIT is 1..4096");
  assert(counters === undefined || /^[01]$/.test(counters), "DX_THREAD_COUNTERS is 0 or 1");
  return { ...(limit ? { DX_READ_WAIT_LIMIT: limit } : {}), ...(counters === "1" ? { DX_THREAD_COUNTERS: "1" } : {}) } as Record<string, string>;
};
export const writerOptionsSet = (env: NodeJS.ProcessEnv) => {
  for (const name of writerOptionNames) assert(env[name] === undefined || /^[01]$/.test(env[name]!), name + " is 0 or 1");
  return Object.fromEntries(writerOptionNames.flatMap((name) => env[name] === "1" || (name === "DX_S2_PRODUCT" && env[name] === "0")
    ? [[name, env[name]!]] : [])) as Record<string, "0" | "1">;
};
export const newRunTape = (text: string | undefined, age: string | undefined): CardTape =>
  parseCardTape(text ?? (age === "realistic" ? "saturday" : defaultCardTape));
export const tapeShape = (tape: CardTape): Shape | undefined =>
  tape.startsWith("production-R") ? "R" : tape.startsWith("production-S") || tape.startsWith("production-M") ? "S" : undefined;
/** [DX-S4] Tape M's variant, or undefined for the other tapes. Its cells hold shape S's saves per account. */
export type MixVariant = "mix" | "burst";
export const tapeMix = (tape: CardTape): MixVariant | undefined =>
  tape === "production-M" ? "mix" : tape === "production-M-burst" ? "burst" : undefined;
export const tapeEdge = (tape: CardTape): TapeEdge => tape.endsWith("-noburst") ? "spread" : "calibrated";
export const tapeTitle = (tape: CardTape) => tapeMix(tape) ? (tapeMix(tape) === "burst"
  ? "the creation burst of tape M (every save creates a subject or an enrolment, one commit each)"
  : "tape M, the real mix of saves (most of them create an entity; one commit per subject's save), at shape S's saves per second")
  : tape === "saturday"
  ? "Saturday's tape (every neighbour save a one- or two-field replacement, nearly every save a subject not seen before)"
  : `the production-shaped tape, shape ${tapeShape(tape)} (${tapeShape(tape) === "R"
    ? "one commit per form row at the fixed row rates" : "one commit per subject's save, at the same saves as shape R"})` +
    (tapeEdge(tape) === "spread" ? ", with the end-of-cell burst removed (no save due at a cell's last instant; its offers and tape hashes differ from the measured " +
      `production-${tapeShape(tape)} tape of 2026-11-23, which stays selectable)` : "");

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
/** [DX-S4] One owner of a tape M save, named in the card's database: its fields, and each reference slot's target. */
export type MixWriteOwner = { entity: string; role: OwnerRef["role"]; person: number; slots: number[]; refs: Record<number, string>; creates: boolean };
export type MixWrite = ProductionWrite & { mix: { kind: MixKind; owners: MixWriteOwner[] } };
export const isMix = (e: Write): e is MixWrite => (e as MixWrite).mix !== undefined;
const mixParamsFile = new URL("../real2/production-mix.json", import.meta.url).pathname;
let mixLoaded: ReturnType<typeof loadMixParams> | undefined;
export const productionMixParams = () => (mixLoaded ??= loadMixParams(mixParamsFile));
/**
 * [DX-S4] How the card names tape M's owners: a subject's task and root (its profile) as the seed has them; every entity
 * the tape creates under its own prefix with the cell's label, so cells of one campaign never share one.
 */
export function mixEntity(account: number, ref: OwnerRef, label: string) {
  const ns = "acct/" + keyFor(account) + "/";
  return ref.role === "task" ? task(account, ref.person)
    : ref.role === "profile" ? (ref.person < newPersonBase ? root(account, ref.person) : `${ns}s4/${label}/subject/${ref.person}`)
    : `${ns}s4/${label}/${ref.role}/${ref.person}/${ref.n}`;
}
const mixTarget = (account: number, t: RefTarget, label: string) =>
  "constant" in t ? "acct/" + keyFor(account) + "/s4/" + t.constant : mixEntity(account, t, label);

/**
 * The neighbour commits of one loaded cell. `fold` maps a tape person onto the database's people (the identity at full
 * size; the toy folds onto its few people per account, keeping each tape person on one toy subject).
 */
export function productionNeighbours(shape: Shape, rate: number, rowTargets: readonly number[], seconds: number,
  label: string, fold?: (account: number, person: number) => number, edge: TapeEdge = "calibrated", mix?: MixVariant): ProductionWrite[] {
  const { params } = productionParams();
  const offers = productionOffers(params, shape, productionBand(rate), rowTargets, seconds, edge);
  if (mix) return mixNeighbours(offers, rate, seconds, label, fold, mix);
  const ordinal = new Map<number, number>();
  const ladder = ladderFacts(process.env);
  assert(ladder === undefined || shape === "S", "The save-size ladder rewrites shape S saves only");
  return offers.map((o: ProductionOffer) => {
    const person = fold ? fold(o.account, o.person) : o.person;
    const i = ordinal.get(o.account) ?? 0;
    ordinal.set(o.account, i + 1);
    // [DX-S1] The save-size ladder keeps the tape's subjects and times and gives every save exactly N facts.
    const slots = ladder === undefined ? [...o.slots] : Array.from({ length: ladder }, (_, n) => n);
    const rows = ladder ?? (o.slots.filter((s) => s < fieldExtraBase).length || 1);
    return {
      account: o.account, ordinal: i, subject: person, ms: o.ms, width: slots.length,
      version: [label, o.account, i].join("/"), owner: task(o.account, person), person,
      slots, saveKey: o.account + "/" + o.save, rows, gap: o.gap,
    };
  });
}

// [DX-S4] Tape M's neighbour commits: each account offers as many saves as shape S's cell does, drawn from the mix.
// A toy fold maps an existing subject onto the toy's people; a new subject keeps its own number (it is created).
function mixNeighbours(sOffers: readonly ProductionOffer[], rate: number, seconds: number, label: string,
  fold: ((account: number, person: number) => number) | undefined, mix: MixVariant): MixWrite[] {
  assert(ladderFacts(process.env) === undefined, "The save-size ladder rewrites shape S saves only");
  const saves = Array.from({ length: 9 }, (_, n) => new Set(sOffers.filter((o) => o.account === n + 1).map((o) => o.save)).size);
  const offers = mixOffers(productionMixParams().params, productionBand(rate), saves, seconds, mix === "burst");
  const ordinal = new Map<number, number>();
  const person = (account: number, p: number) => p < newPersonBase && fold ? fold(account, p) : p;
  return offers.map((o: MixOffer) => {
    const i = ordinal.get(o.account) ?? 0;
    ordinal.set(o.account, i + 1);
    const owners = o.owners.map((w) => {
      const ref = { ...w, person: person(o.account, w.person) };
      return { entity: mixEntity(o.account, ref, label), role: w.role, person: ref.person, slots: [...w.slots], creates: w.creates,
        refs: Object.fromEntries(Object.entries(w.refs).map(([slot, t]) => [slot, mixTarget(o.account,
          "constant" in t ? t : { ...t, person: person(o.account, t.person) }, label)])) };
    });
    const p = person(o.account, o.person);
    return {
      account: o.account, ordinal: i, subject: p, ms: o.ms, width: o.slots.length,
      version: [label, o.account, i].join("/"), owner: owners[0]!.entity, person: p,
      slots: owners.flatMap((w) => w.slots), saveKey: o.account + "/" + o.save, rows: 1, gap: null,
      mix: { kind: o.kind, owners },
    };
  });
}

// [DX-S1] The save-size ladder (rd1 saves arm, DX_RD3_WINDOWS=ladder): DX_S1_LADDER_FACTS=N gives every neighbour save
// of a shape S cell exactly the fields :task/field-0 to :task/field-(N-1): the seeded fields are replaced and the rest are
// first writes (then replacements on the subject's later saves). The tape's subjects, accounts and times are unchanged.
// Rejected: a separate tape generator (the card's preload, identity, journal and read-back checks must judge these saves).
export const ladderSizes = [5, 10, 17, 50, 100, 340, 1000] as const;
export function ladderFacts(env: NodeJS.ProcessEnv): number | undefined {
  const text = env.DX_S1_LADDER_FACTS;
  if (text === undefined || text === "") return undefined;
  const n = Number(text);
  assert(/^[1-9][0-9]{0,3}$/.test(text) && n <= 4000, "DX_S1_LADDER_FACTS is 1 to 4000");
  return n;
}

/** Row targets for the nine neighbour accounts: the cell's offered rows minus the quiet account's saves. */
export function rowTargets(rate: number, seconds: number, quiet: number) {
  const remaining = rate * seconds - quiet;
  return Array.from({ length: 9 }, (_, n) => Math.floor(remaining / 9) + Number(n < remaining % 9));
}

export const sortTape = (tape: Write[]) =>
  tape.sort((a, b) => a.ms - b.ms || a.account - b.account || a.ordinal - b.ordinal);

/** A full-size loaded cell on the production tape: the card's own quiet stream, then the production neighbours. */
export function fullCellTape(shape: Shape, cell: ServerCell, seconds: WindowSeconds, edge: TapeEdge = "calibrated", mix?: MixVariant) {
  assert(cell.loaded);
  const quiet = ratedTape(100_000, cell, seconds).filter((e) => e.account === 0);
  return sortTape([...quiet, ...productionNeighbours(shape, cell.rate, rowTargets(cell.rate, seconds, quiet.length), seconds, cellPath(cell), undefined, edge, mix)]);
}

/**
 * The card's input binds every loaded cell's tape report before the first offer, so the card can show that each cell
 * offered the tape its report describes. Undefined for Saturday's tape, so earlier inputs stay byte-identical.
 */
export function tapeBinding(tape: CardTape, seconds: WindowSeconds) {
  const shape = tapeShape(tape);
  if (!shape) return undefined;
  return { name: tape, paramsSha256: productionParams().sha256,
    ...(tapeMix(tape) ? { mixParamsSha256: productionMixParams().sha256 } : {}),
    cells: serverCells.filter((c) => c.loaded).map((cell) => {
    const report = cardTapeReport(fullCellTape(shape, cell, seconds, tapeEdge(tape), tapeMix(tape)), seconds);
    return { cell: cellPath(cell), tapeSha256: report.tapeSha256, reportSha256: createHash("sha256").update(JSON.stringify(report)).digest("hex") };
  }) };
}

/** The tape report REAL2 writes beside each production run, for the card's neighbour commits. */
export function cardTapeReport(tape: readonly Write[], seconds: number) {
  const { params, sha256 } = productionParams();
  // [DX-S4] Tape M's report: kinds, creations, owners, facts and the enrolment tail (w1/field/production-mix.ts).
  if (tape.some(isMix)) {
    const offers = tape.filter(isMix).map((e) => ({ ms: e.ms, account: e.account, person: e.person, subtask: 0 as const, ordinal: 0 as const,
      extra: false as const, save: Number(e.saveKey.split("/")[1]), kind: e.mix.kind, slots: e.slots, gap: null,
      owners: e.mix.owners.map((w) => ({ role: w.role, person: w.person, n: 0, slots: w.slots, refs: w.refs as never, creates: w.creates })) }));
    return { paramsSha256: productionMixParams().sha256, tapeSha256: createHash("sha256").update(JSON.stringify(tape)).digest("hex"),
      ...mixReport(offers, seconds) };
  }
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
 * [DX-S4] Tape M's predecessors: every task it writes as productionPredecessors reads it; every subject root it writes
 * (the profile) holds no `:task/field-*` row but an earlier cell's of this campaign; every entity it creates is absent.
 * An entity the tape creates and later writes again (attribute writes after a creation) is the tape's own.
 */
export async function mixPredecessors(reader: DatomicClient, db: string, head: number, seedCut: number,
  writes: readonly MixWrite[], aged?: { cut: AgedCut; head: number }) {
  const tasks = new Map<string, { account: number; person: number }>(), roots = new Set<string>(), created = new Set<string>();
  const accountOf = new Map<string, number>();
  for (const w of writes) for (const o of w.mix.owners) {
    accountOf.set(o.entity, w.account);
    if (o.creates) created.add(o.entity);
    else if (o.role === "task") tasks.set(o.entity, { account: w.account, person: o.person });
    else if (o.role === "profile" && o.person < newPersonBase) roots.add(o.entity);
  }
  for (const e of created) { tasks.delete(e); roots.delete(e); }
  const base = await productionPredecessors(reader, db, head, seedCut, [...tasks.values()], aged);
  const fields = new Map(base.fields);
  const list = [...roots];
  let rootRows = 0;
  for (let i = 0; i < list.length; i += 64) {
    const batch = list.slice(i, i + 64);
    const rows = await reader.rows(db, { entityIds: batch, basis: { recordedPosition: head, validAt: SEED_VALID_FROM } });
    for (const e of batch) {
      const own = rows.filter((r) => r.entity_id === e && fieldNumber(r.attribute) !== undefined);
      for (const r of own) assert(r.recorded_position > (aged?.head ?? seedCut), `${e} ${r.attribute}: not this campaign's`);
      rootRows += own.length;
      fields.set(e, own as Row[]);
    }
  }
  const ids = [...created];
  for (let i = 0; i < ids.length; i += 64) {
    const rows = await reader.rows(db, { entityIds: ids.slice(i, i + 64), basis: { recordedPosition: head, validAt: SEED_VALID_FROM } });
    assert.equal(rows.length, 0, "tape M: an entity the cell creates exists before it");
  }
  return { fields, accountOf, counts: { ...base.counts, roots: roots.size, rootRows, created: created.size } };
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
