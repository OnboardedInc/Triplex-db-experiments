/**
 * `evaluate` and `reconcile` over typed inputs (SPEC 1, 4, 6, 7 and 8). Pure: nothing here reads a clock, a random source or
 * the environment; "now" is always `basis.validTime` (SPEC 1).
 */
import { createHash } from "node:crypto";
import {
  addBusinessDays,
  endOfDay,
  isInstant,
  parseDate,
  startOfDate,
  startOfDay,
} from "./dates.js";
import { quote } from "./json.js";
import type { Activation, CompiledRelease, RuleId, RuleParams } from "./release.js";
import { resolveRelease } from "./release.js";
import type { AttrSpec, Erased, RawValue, Value, W0ErrorCode } from "./schema.js";
import { ATTRIBUTES, NOT_A_VALUE, allowedKind, checkValue, isPlacementId } from "./schema.js";

/** SPEC 4.1 basis: `tx` 0 to 2^53 - 1, `validTime` an instant. */
export interface Basis {
  readonly tx: number;
  readonly validTime: string;
}

/** SPEC 4.2 fact. `tx` is the commit position of the transaction that asserted it. */
export interface Fact {
  readonly e: string;
  readonly a: string;
  readonly v: RawValue;
  readonly tx: number;
}

/** SPEC 4.2 world: the store's answer at the basis for one subject. Fact order carries no meaning (SPEC 4.2 item 5). */
export interface World {
  readonly subject: string;
  readonly facts: readonly Fact[];
}

export interface Failure {
  readonly error: W0ErrorCode;
}

export interface Task {
  readonly dueAt: string | null;
  readonly id: string;
  readonly kind: string;
  readonly overdue: boolean;
  readonly rule: RuleId;
}
export interface Obligation {
  readonly boundary: string;
  readonly id: string;
  readonly kind: string;
  readonly rule: RuleId;
}
export interface Flag {
  readonly name: string;
  readonly rule: RuleId;
}
export interface TraceEntry {
  readonly inputs: readonly number[];
  readonly key: string;
  readonly row: number;
  readonly rule: RuleId;
}
export interface WorkItem {
  readonly id: string;
  readonly inputs: readonly number[];
  readonly key: string;
  readonly kind: string;
  /** the payload as canonical JSON text (SPEC 9); `publish` compares exactly these bytes (SPEC 8.8) */
  readonly payload: string;
  readonly rule: RuleId;
  readonly version: string;
}

/** SPEC 8.1 output object; every array is already in its SPEC 8.7 order. */
export interface Output {
  readonly basis: Basis;
  readonly dependencies: readonly (readonly [string, string])[];
  readonly flags: readonly Flag[];
  readonly obligations: readonly Obligation[];
  readonly release: string;
  readonly subject: string;
  readonly tasks: readonly Task[];
  readonly trace: readonly TraceEntry[];
  readonly workItems: readonly WorkItem[];
}

export const isFailure = (x: Output | Failure): x is Failure => (x as Failure).error !== undefined;

const MAX_SAFE = 9007199254740991;

/** SPEC 4.4 step 2: `W0.E_BASIS` when `basis.validTime` is not a valid instant or `basis.tx` is outside 0 to 2^53 - 1. */
export function checkBasis(basis: Basis): W0ErrorCode | null {
  if (!isInstant(basis.validTime)) return "W0.E_BASIS";
  if (!Number.isSafeInteger(basis.tx) || basis.tx < 0 || basis.tx > MAX_SAFE) return "W0.E_BASIS";
  return null;
}

interface IFact {
  readonly v: Value;
  readonly tx: number;
}

/** One entity's facts: a slot per attribute of its kind (by `AttrSpec.ord`), a list for many-cardinality attributes. */
interface Entity {
  readonly attrs: ReadonlyMap<string, AttrSpec>;
  readonly slots: (IFact | ManySlot | undefined)[];
}
interface ManySlot {
  readonly facts: IFact[];
  readonly values: Set<string>;
}

/** A validated world, indexed by entity id and then by attribute. */
export interface WorldIndex {
  readonly subject: string;
  readonly entities: ReadonlyMap<string, Entity>;
  readonly factCount: number;
}

const SEP = "\u0000";

/** The one-cardinality fact `(e, a)` of a validated world, or undefined (⊥). */
function getOne(idx: WorldIndex, e: string, a: string): IFact | undefined {
  const ent = idx.entities.get(e);
  if (ent === undefined) return undefined;
  const spec = ent.attrs.get(a);
  return spec === undefined ? undefined : (ent.slots[spec.ord] as IFact | undefined);
}

/** The facts of the many-cardinality attribute `(e, a)` of a validated world. */
function getMany(idx: WorldIndex, e: string, a: string): readonly IFact[] {
  const ent = idx.entities.get(e);
  if (ent === undefined) return EMPTY;
  const spec = ent.attrs.get(a);
  return spec === undefined
    ? EMPTY
    : ((ent.slots[spec.ord] as ManySlot | undefined)?.facts ?? EMPTY);
}

/**
 * SPEC 4.4 step 3 for one world, then the index the rules read. Checks run in this order and the first failure wins:
 * 1. `W0.E_UNKNOWN` when the subject is not a placement id;
 * 2. for each fact in array order, reachable or not (SPEC 4.2 item 4, case C44): `W0.E_UNKNOWN` (entity not allowed, or
 *    attribute not of that kind), then `W0.E_VALUE`, then `W0.E_BASIS` (tx below 1 or above basis.tx); the first failing fact
 *    decides (case C43);
 * 3. `W0.E_CARDINALITY` (two facts on one `(e, a)` of a one-cardinality attribute, or on one `(e, a, v)` of a many-cardinality
 *    one). It runs only after every fact of the world has passed step 2, so a later fact's E_UNKNOWN beats an earlier
 *    duplicate (Q53 reading A03).
 * Each distinct entity id is classified once (SPEC 4.2 item 3) and its facts go to per-attribute slots.
 */
export function indexWorld(world: World, basisTx: number): WorldIndex | W0ErrorCode {
  const S = world.subject;
  if (typeof S !== "string" || !isPlacementId(S)) return "W0.E_UNKNOWN";
  const entities = new Map<string, Entity>();
  let duplicate = false;
  const facts = world.facts;
  for (let k = 0; k < facts.length; k++) {
    const f = facts[k]!;
    let ent = entities.get(f.e);
    if (ent === undefined) {
      const kind = typeof f.e === "string" ? allowedKind(f.e, S) : null;
      if (kind === null) return "W0.E_UNKNOWN";
      const attrs = ATTRIBUTES[kind];
      ent = { attrs, slots: Array.from<IFact | ManySlot | undefined>({ length: attrs.size }) };
      entities.set(f.e, ent);
    }
    const spec = ent.attrs.get(f.a);
    if (spec === undefined) return "W0.E_UNKNOWN";
    // An owned entity of an allowed id is owned by S (SPEC 4.2 item 3), so S is the owner every owned ref is checked against.
    const v = checkValue(spec, f.v, S);
    if (v === NOT_A_VALUE) return "W0.E_VALUE";
    if (!Number.isSafeInteger(f.tx) || f.tx < 1 || f.tx > basisTx) return "W0.E_BASIS";
    // A typed caller's fact is reused when its value needed no normalisation (bigint to number).
    const fact: IFact = v === f.v ? (f as IFact) : { v, tx: f.tx };
    const slot = ent.slots[spec.ord];
    if (spec.many) {
      if (slot === undefined)
        ent.slots[spec.ord] = { facts: [fact], values: new Set([v as string]) };
      else {
        const m = slot as ManySlot;
        if (m.values.has(v as string)) duplicate = true;
        else m.values.add(v as string);
        m.facts.push(fact);
      }
    } else if (slot !== undefined) duplicate = true;
    else ent.slots[spec.ord] = fact;
  }
  if (duplicate) return "W0.E_CARDINALITY";
  return { subject: S, entities, factCount: facts.length };
}

const sha256hex = (s: string): string => createHash("sha256").update(s, "utf8").digest("hex");

const EMPTY: readonly IFact[] = [];
const isErased = (v: Value): v is Erased => typeof v === "object";

/** ascending distinct integers (SPEC 8.7 `inputs`) */
function sortedDistinct(xs: number[]): number[] {
  if (xs.length < 2) return xs;
  xs.sort((a, b) => a - b);
  let w = 1;
  for (let k = 1; k < xs.length; k++) if (xs[k] !== xs[w - 1]) xs[w++] = xs[k]!;
  xs.length = w;
  return xs;
}

interface Decision {
  readonly id: string;
  readonly target: string | null;
  readonly verdict: string | null;
  readonly counting: boolean;
  readonly proposal: boolean;
  /** SPEC 6.2 item 2: the greatest tx among `(S, decisions, D)`, `(D, target)`, `(D, verdict)`, `(D, author)` */
  readonly pos: number;
  /** the tx values of the present facts among those four */
  readonly txs: readonly number[];
}

/**
 * SPEC 7: evaluates the eleven rules over a validated world and assembles the SPEC 8.1 output.
 */
export function evaluateIndexed(idx: WorldIndex, rel: CompiledRelease, basis: Basis): Output {
  const S = idx.subject;
  const v = basis.validTime;
  const get = (e: string, a: string): IFact | undefined => getOne(idx, e, a);

  // ---- references (SPEC 4.2 item 4, 6.3) ----
  const startF = get(S, "startDate");
  const startDay = startF === undefined ? -1 : parseDate(startF.v as string);
  const locF = get(S, "location");
  const L = locF === undefined ? null : (locF.v as string);
  const jurF = L === null ? undefined : get(L, "jurisdiction");
  /** SPEC 6.3 `jur(S)`: the value of `(L, jurisdiction)`, or ⊥ */
  const J = jurF === undefined ? null : (jurF.v as string);
  const docFacts = getMany(idx, S, "documents");
  const decFacts = getMany(idx, S, "decisions");

  // ---- outputs under construction ----
  const deps = new Set<string>();
  const dep = (e: string, a: string): void => {
    deps.add(e + SEP + a);
  };
  const trace: TraceEntry[] = [];
  const tasks: { dueAt: string | null; id: string; kind: string; rule: RuleId }[] = [];
  const obligations: Obligation[] = [];
  const flags: Flag[] = [];
  const workItems: WorkItem[] = [];

  // ---- SPEC 6.2 decisions, proposals and commit order ----
  const decisions: Decision[] = [];
  for (const df of decFacts) {
    const D = df.v as string;
    const t = get(D, "target");
    const ve = get(D, "verdict");
    const au = get(D, "author");
    const txs = [df.tx];
    let pos = df.tx;
    for (const f of [t, ve, au]) {
      if (f !== undefined) {
        txs.push(f.tx);
        if (f.tx > pos) pos = f.tx;
      }
    }
    // SPEC 6.2 item 1: complete only with all three facts; incomplete records are read but never count or propose (14 row 10).
    const complete = t !== undefined && ve !== undefined && au !== undefined;
    const author = au === undefined ? null : (au.v as string);
    decisions.push({
      id: D,
      target: t === undefined ? null : (t.v as string),
      verdict: ve === undefined ? null : (ve.v as string),
      // SPEC 6.2 items 3 and 4: person or system counts; agent is a proposal (14 row 11, case C16).
      counting: complete && (author === "person" || author === "system"),
      proposal: complete && author === "agent",
      pos,
      txs,
    });
  }
  const decisionDeps = (): void => {
    dep(S, "decisions");
    for (const d of decisions) {
      dep(d.id, "target");
      dep(d.id, "verdict");
      dep(d.id, "author");
    }
  };
  /** SPEC 6.2 item 5 `final(T, m)`: the counting decision on T with pos >= m and the greatest pos, then the greatest id. */
  const final = (T: string, m: number): Decision | null => {
    let best: Decision | null = null;
    for (const d of decisions) {
      if (!d.counting || d.target !== T || d.pos < m) continue;
      if (best === null || d.pos > best.pos || (d.pos === best.pos && d.id > best.id)) best = d;
    }
    return best;
  };
  /** SPEC 6.2 items 6 and 7: the four facts' positions of every counting decision (or proposal) on T */
  const factsOf = (T: string, want: "counting" | "proposal", into: number[]): void => {
    for (const d of decisions) if (d[want] && d.target === T) for (const tx of d.txs) into.push(tx);
  };

  // ---- SPEC 5.1 and 6.3 scoped entries ----
  const scopeIn = <R extends RuleId>(id: R): boolean => {
    const s = rel.entries[id].scope;
    return s !== null && J !== null && s.jurisdictions.has(J);
  };
  const paramsOf = <R extends RuleId>(id: R): RuleParams[R] => {
    const e = rel.entries[id];
    return scopeIn(id) ? e.scope!.params : e.params;
  };
  /** A scoped entry adds `S.location` and `L.jurisdiction` to the rule's read set (SPEC 6.3, 14 row 45). */
  const scopeDeps = (id: RuleId): void => {
    if (rel.entries[id].scope === null) return;
    dep(S, "location");
    if (L !== null) dep(L, "jurisdiction");
  };
  /** ... and the `S.location` and `(L, jurisdiction)` facts, when present, to the inputs of each of its trace entries. */
  const scopeInputs = (id: RuleId, into: number[]): number[] => {
    if (rel.entries[id].scope !== null) {
      if (locF !== undefined) into.push(locF.tx);
      if (jurF !== undefined) into.push(jurF.tx);
    }
    return into;
  };
  const pushTx = (into: number[], ...fs: (IFact | undefined)[]): number[] => {
    for (const f of fs) if (f !== undefined) into.push(f.tx);
    return into;
  };
  const addTrace = (rule: RuleId, key: string, row: number, inputs: number[]): number[] => {
    const sorted = sortedDistinct(scopeInputs(rule, inputs));
    trace.push({ inputs: sorted, key, row, rule });
    return sorted;
  };
  /** SPEC 8.2: the task id is `S#kind`, or `S#kind#key` for the keyed rules DOCEXP and PROP. */
  const addTask = (rule: RuleId, kind: string, key: string | null, dueAt: string | null): void => {
    tasks.push({
      dueAt,
      id: key === null ? S + "#" + kind : S + "#" + kind + "#" + key,
      kind,
      rule,
    });
  };
  /** SPEC 8.4: id over `{key, kind, rule, subject}`, version over `{inputs, payload, release}`, both canonical JSON. */
  const addWork = (
    rule: RuleId,
    kind: string,
    key: string,
    payload: string,
    inputs: readonly number[],
  ): void => {
    const id =
      "wi:" +
      sha256hex(
        '{"key":' +
          quote(key) +
          ',"kind":' +
          quote(kind) +
          ',"rule":"' +
          rule +
          '","subject":' +
          quote(S) +
          "}",
      );
    const version =
      "wv:" +
      sha256hex(
        '{"inputs":[' +
          inputs.join(",") +
          '],"payload":' +
          payload +
          ',"release":' +
          quote(rel.hash) +
          "}",
      );
    workItems.push({ id, inputs, key, kind, payload, rule, version });
  };
  const jsonOrNull = (s: string | null): string => (s === null ? "null" : quote(s));

  // ---- SPEC 7.1 LIFE: start-date lifecycle ----
  {
    dep(S, "startDate");
    scopeDeps("LIFE");
    let row: number;
    if (startF === undefined) {
      row = 1;
      flags.push({ name: "start-unknown", rule: "LIFE" });
    } else if (v < startOfDate(startF.v as string)) {
      row = 2;
      flags.push({ name: "pre-start", rule: "LIFE" });
      obligations.push({
        boundary: startOfDate(startF.v as string),
        id: S + "#start",
        kind: "start",
        rule: "LIFE",
      });
    } else {
      row = 3;
    }
    addTrace("LIFE", "", row, pushTx([], startF));
  }

  // ---- SPEC 7.2 I9S1: I-9 Section 1 ----
  const ssnF = get(S, "ssn");
  {
    const s1F = get(S, "section1AttestedAt");
    dep(S, "startDate");
    dep(S, "section1AttestedAt");
    dep(S, "ssn");
    scopeDeps("I9S1");
    const due = startDay < 0 ? null : endOfDay(startDay);
    let row: number;
    // Row 1: an erased marker counts as present (SPEC 7.2, 14 row 14, case C07).
    if (s1F !== undefined && ssnF !== undefined) row = 1;
    else {
      row = 2;
      addTask("I9S1", "i9.section1", null, due);
    }
    addTrace("I9S1", "", row, pushTx([], startF, s1F, ssnF));
  }

  // ---- SPEC 7.3 I9S2: I-9 Section 2 ----
  {
    dep(S, "startDate");
    decisionDeps();
    scopeDeps("I9S2");
    const bd = paramsOf("I9S2").businessDays;
    const due = startDay < 0 ? null : endOfDay(addBusinessDays(startDay, bd));
    const f = final("i9.section2", 0);
    let row: number;
    if (f !== null && f.verdict === "approve") row = 1;
    else if (f !== null && f.verdict === "waive") {
      row = 2;
      flags.push({ name: "i9-section2-waived", rule: "I9S2" });
    } else if (f !== null && f.verdict === "reject") {
      row = 3;
      addTask("I9S2", "i9.section2", null, due);
    } else {
      row = 4;
      addTask("I9S2", "i9.section2", null, due);
    }
    const inputs = pushTx([], startF);
    factsOf("i9.section2", "counting", inputs); // SPEC 7.3 inputs, 14 row 19
    addTrace("I9S2", "", row, inputs);
  }

  // ---- SPEC 7.4 EVSUB: E-Verify case submission ----
  const evF = get(S, "everifyStatus");
  {
    const resF = get(S, "everifySubmitResult");
    dep(S, "startDate");
    dep(S, "ssn");
    dep(S, "everifyStatus");
    dep(S, "everifySubmitResult");
    scopeDeps("EVSUB");
    const bd = paramsOf("EVSUB").businessDays;
    const due = startDay < 0 ? null : endOfDay(addBusinessDays(startDay, bd));
    let row: number;
    let submit = false;
    if (evF !== undefined) row = 1;
    else if (ssnF === undefined) {
      row = 2;
      addTask("EVSUB", "everify.collect-ssn", null, due);
    } else if (isErased(ssnF.v)) {
      row = 3;
      addTask("EVSUB", "everify.ssn-erased", null, due);
    } else if (!/^[0-9]{9}$/.test(ssnF.v as string)) {
      row = 4;
      addTask("EVSUB", "everify.fix-ssn", null, due);
    } else if (resF !== undefined && resF.v === "accepted") row = 5;
    else if (resF !== undefined && resF.v === "rejected") {
      row = 6;
      addTask("EVSUB", "everify.submit-rejected", null, due);
    } else {
      row = 7;
      submit = true;
    }
    const inputs = addTrace("EVSUB", "", row, pushTx([], startF, ssnF, evF, resF));
    // SPEC 8.4 payload: {"startDate": S.startDate}, or null for the value when the start date is absent (case C50).
    if (submit)
      addWork(
        "EVSUB",
        "everify.submit-case",
        "",
        '{"startDate":' + jsonOrNull(startF ? (startF.v as string) : null) + "}",
        inputs,
      );
  }

  // ---- SPEC 7.5 EVSTAT: E-Verify case status ----
  {
    const atF = get(S, "everifyStatusAt");
    dep(S, "everifyStatus");
    dep(S, "everifyStatusAt");
    scopeDeps("EVSTAT");
    const status = evF === undefined ? null : (evF.v as string);
    let row: number;
    let work: [string, string] | null = null;
    if (status === null || status === "pending") row = 1;
    else if (status === "tnc") {
      row = 2;
      const n = paramsOf("EVSTAT").tncBusinessDays;
      const due =
        atF === undefined
          ? null
          : endOfDay(addBusinessDays(parseDate((atF.v as string).slice(0, 10)), n));
      addTask("EVSTAT", "everify.tnc", null, due);
      work = ["notify.everify-tnc", '{"dueAt":' + jsonOrNull(due) + "}"];
    } else if (status === "authorized") {
      row = 3;
      flags.push({ name: "everify-authorized", rule: "EVSTAT" });
    } else {
      row = 4; // fnc
      addTask("EVSTAT", "everify.fnc", null, null);
      work = ["notify.everify-fnc", "{}"];
    }
    const inputs = addTrace("EVSTAT", "", row, pushTx([], evF, atF));
    if (work !== null) addWork("EVSTAT", work[0], "", work[1], inputs);
  }

  // ---- SPEC 7.6 BGC: background check ----
  {
    const bgcF = get(S, "bgcStatus");
    dep(S, "bgcStatus");
    decisionDeps();
    scopeDeps("BGC");
    const status = bgcF === undefined ? null : (bgcF.v as string);
    const f = final("bgc.adjudication", 0);
    let row: number;
    let work: string | null = null;
    if (status === null) {
      row = 1;
      work = "bgc.order";
    } else if (status === "pending" || status === "clear") row = 2;
    else if (f !== null && (f.verdict === "approve" || f.verdict === "waive")) row = 3;
    else if (f !== null && f.verdict === "reject") {
      row = 4;
      addTask("BGC", "bgc.adverse-action", null, null);
      work = "notify.pre-adverse-action";
    } else {
      row = 5;
      addTask("BGC", "bgc.adjudicate", null, null);
    }
    const inputs = pushTx([], bgcF);
    factsOf("bgc.adjudication", "counting", inputs);
    const sorted = addTrace("BGC", "", row, inputs);
    if (work !== null) addWork("BGC", work, "", "{}", sorted);
  }

  // ---- SPEC 7.7 DOCEXP: document expiry and reverification, keyed by document ----
  {
    dep(S, "documents");
    scopeDeps("DOCEXP");
    const lead = paramsOf("DOCEXP").leadDays;
    const docs = docFacts
      .map((df) => ({ df, d: df.v as string }))
      .sort((x, y) => (x.d < y.d ? -1 : x.d > y.d ? 1 : 0));
    for (const { d } of docs) {
      dep(d, "docType");
      dep(d, "expiresOn");
      dep(d, "reverified");
    }
    if (docs.length === 0) addTrace("DOCEXP", "", 0, []); // SPEC 7.7: no documents gives one row-0 entry (14 row 17)
    for (const { df, d } of docs) {
      const dt = get(d, "docType");
      const ex = get(d, "expiresOn");
      const rv = get(d, "reverified");
      const type = dt === undefined ? null : (dt.v as string);
      let row: number;
      let expired = false;
      if (type === null || !Object.prototype.hasOwnProperty.call(lead, type)) row = 1;
      else if (rv !== undefined && rv.v === true) row = 2;
      else if (ex === undefined) {
        row = 3;
        addTask("DOCEXP", "doc.expiry-missing", d, null);
      } else {
        const exDay = parseDate(ex.v as string);
        const B = endOfDay(exDay); // the document is valid through its expiry date
        const W = startOfDay(exDay + 1 - lead[type]!); // SPEC 7.7, 14 row 22: with lead 0, W = B
        if (v < W) {
          row = 4;
          obligations.push({
            boundary: W,
            id: S + "#doc.window#" + d,
            kind: "doc.window",
            rule: "DOCEXP",
          });
        } else if (v < B) {
          row = 5;
          addTask("DOCEXP", "doc.reverify", d, B);
        } else {
          row = 6;
          addTask("DOCEXP", "doc.reverify", d, B);
          expired = true;
        }
      }
      const inputs = addTrace("DOCEXP", d, row, pushTx([df.tx], dt, ex, rv));
      if (expired)
        addWork(
          "DOCEXP",
          "notify.document-expired",
          d,
          '{"docType":' + quote(type!) + ',"expiresOn":' + quote(ex!.v as string) + "}",
          inputs,
        );
    }
  }

  // ---- SPEC 7.8 MINWAGE: pay rate at or above the minimum wage, two hops away ----
  const payF = get(S, "payRateCents");
  {
    const sources = paramsOf("MINWAGE").floorSources;
    const useState = sources.includes("jurisdiction.stateMinWageCents");
    const useLocal = sources.includes("location.localMinWageCents");
    dep(S, "startDate");
    dep(S, "payRateCents");
    dep(S, "location");
    // jurisdiction.stateMinWageCents reads L.jurisdiction and J.stateMinWageCents; location.localMinWageCents reads
    // L.localMinWageCents. L.x yields no pair without S.location, J.x none without (L, jurisdiction) (SPEC 6.3, 14 row 39).
    const stateF = useState && J !== null ? get(J, "stateMinWageCents") : undefined;
    const localF = useLocal && L !== null ? get(L, "localMinWageCents") : undefined;
    if (useState && L !== null) dep(L, "jurisdiction");
    if (useState && J !== null) dep(J, "stateMinWageCents");
    if (useLocal && L !== null) dep(L, "localMinWageCents");
    scopeDeps("MINWAGE");
    const due = startF === undefined ? null : startOfDate(startF.v as string);
    // SPEC 7.8 floor: the greatest value among the present facts named by the floor sources (14 row 20).
    let floor = -1;
    if (stateF !== undefined) floor = stateF.v as number;
    if (localF !== undefined && (localF.v as number) > floor) floor = localF.v as number;
    let row: number;
    let below = false;
    if (payF === undefined) {
      row = 1;
      addTask("MINWAGE", "pay.rate-missing", null, due);
    } else if (locF === undefined) {
      row = 2;
      addTask("MINWAGE", "pay.location-missing", null, due);
    } else if (floor < 0) {
      row = 3;
      addTask("MINWAGE", "pay.floor-unknown", null, due);
    } else if ((payF.v as number) >= floor) row = 4;
    else {
      row = 5;
      addTask("MINWAGE", "pay.below-minimum", null, due);
      below = true;
    }
    // Input facts: every fact whose pair is in the read set.
    const inputs = addTrace(
      "MINWAGE",
      "",
      row,
      pushTx([], startF, payF, locF, useState ? jurF : undefined, stateF, localF),
    );
    if (below)
      addWork(
        "MINWAGE",
        "notify.pay-below-minimum",
        "",
        '{"floorCents":' + floor + ',"payRateCents":' + (payF!.v as number) + "}",
        inputs,
      );
  }

  // ---- SPEC 7.9 OT: overtime ----
  {
    const wmF = get(S, "weeklyMinutes");
    dep(S, "weeklyMinutes");
    scopeDeps("OT");
    // Threshold from scope.params when jur(S) is listed (compared by id only), else from params (SPEC 5.1, 7.9, 14 row 45).
    const threshold = paramsOf("OT").thresholdMinutes;
    let row: number;
    if (wmF === undefined) row = 1;
    else if ((wmF.v as number) > threshold) {
      row = 2;
      flags.push({ name: "overtime", rule: "OT" });
    } else row = 3;
    addTrace("OT", "", row, pushTx([], wmF));
  }

  // ---- SPEC 7.10 PAYCHG: a pay change over the threshold needs a fresh approval ----
  {
    const baseF = get(S, "baselinePayRateCents");
    dep(S, "payRateCents");
    dep(S, "baselinePayRateCents");
    decisionDeps();
    scopeDeps("PAYCHG");
    const threshold = paramsOf("PAYCHG").thresholdCents;
    let row: number;
    let work = false;
    if (payF === undefined || baseF === undefined) row = 1;
    else {
      // Both operands are in 0 to 2^53 - 1, so the difference is exact (SPEC 7.10); absolute value, strict > (14 row 21).
      const pay = payF.v as number;
      const base = baseF.v as number;
      const delta = pay >= base ? pay - base : base - pay;
      // Fresh approval only: pos >= tx(S.payRateCents); the same transaction counts (SPEC 7.10, 14 row 12).
      const f = final("pay.change", payF.tx);
      if (delta <= threshold) row = 2;
      else if (f !== null && (f.verdict === "approve" || f.verdict === "waive")) row = 3;
      else if (f !== null && f.verdict === "reject") {
        row = 4;
        addTask("PAYCHG", "pay.change-rejected", null, null);
      } else {
        row = 5;
        addTask("PAYCHG", "pay.change-approval", null, null);
        work = true;
      }
    }
    const inputs = pushTx([], payF, baseF);
    factsOf("pay.change", "counting", inputs);
    const sorted = addTrace("PAYCHG", "", row, inputs);
    if (work)
      addWork(
        "PAYCHG",
        "notify.pay-change-approval",
        "",
        '{"baselinePayRateCents":' +
          (baseF!.v as number) +
          ',"payRateCents":' +
          (payF!.v as number) +
          "}",
        sorted,
      );
  }

  // ---- SPEC 7.11 PROP: agent proposals wait for a human decision, keyed by target ----
  {
    decisionDeps();
    scopeDeps("PROP");
    const targets = [...new Set(decisions.filter((d) => d.proposal).map((d) => d.target!))].sort();
    if (targets.length === 0) {
      // SPEC 7.11 no proposals: one row-0 entry whose inputs are every fact whose pair is in the read set, incomplete and
      // non-proposal records included (14 row 18).
      const inputs: number[] = [];
      for (const d of decisions) for (const tx of d.txs) inputs.push(tx);
      addTrace("PROP", "", 0, inputs);
    }
    for (const T of targets) {
      let p = -1;
      for (const d of decisions) if (d.proposal && d.target === T && d.pos > p) p = d.pos;
      // Row 1: a counting decision on T with pos >= p (the latest proposal's pos) resolves the item (14 row 13).
      const resolved = decisions.some((d) => d.counting && d.target === T && d.pos >= p);
      let row: number;
      if (resolved) row = 1;
      else {
        row = 2;
        addTask("PROP", "review.proposal", T, null);
      }
      const inputs: number[] = [];
      factsOf(T, "proposal", inputs);
      factsOf(T, "counting", inputs);
      addTrace("PROP", T, row, inputs);
    }
  }

  // ---- SPEC 8 assembly ----
  // 8.2 overdue at v >= dueAt; 8.3 a due obligation for every task with dueAt and v < dueAt (14 row 7).
  const outTasks: Task[] = tasks.map((t) => ({
    dueAt: t.dueAt,
    id: t.id,
    kind: t.kind,
    overdue: t.dueAt !== null && v >= t.dueAt,
    rule: t.rule,
  }));
  for (const t of tasks)
    if (t.dueAt !== null && v < t.dueAt)
      obligations.push({ boundary: t.dueAt, id: t.id + "@due", kind: "due", rule: t.rule });

  // 8.7 orders. Every string the rules produce is printable ASCII, where JavaScript order is byte order.
  const byId = <X extends { id: string }>(a: X, b: X): number =>
    a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  outTasks.sort(byId);
  obligations.sort(byId);
  workItems.sort(byId);
  flags.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  // Trace entries were added in release order and, within a keyed rule, in ascending key order.
  // Dependencies: by entity id then attribute; "\u0000" sorts below every printable character, so "e\0a" order is that order.
  const depKeys = [...deps].sort();
  const dependencies = depKeys.map((k) => {
    const cut = k.indexOf(SEP);
    return [k.slice(0, cut), k.slice(cut + 1)] as const;
  });

  return {
    basis: { tx: basis.tx, validTime: basis.validTime },
    dependencies,
    flags,
    obligations,
    release: rel.hash,
    subject: S,
    tasks: outTasks,
    trace,
    workItems,
  };
}

/** SPEC 1 `evaluate(world, release, basis)` over typed inputs: SPEC 4.4 steps 2 and 3, then the rules. */
export function evaluateWorld(world: World, rel: CompiledRelease, basis: Basis): Output | Failure {
  const b = checkBasis(basis);
  if (b !== null) return { error: b };
  const idx = indexWorld(world, basis.tx);
  if (typeof idx === "string") return { error: idx };
  return evaluateIndexed(idx, rel, basis);
}

/** SPEC 4.4 step 4 for one activation: `W0.E_VALUE`, then `W0.E_BASIS` (Q53 reading A05). */
export function checkActivation(a: Activation, basisTx: number): W0ErrorCode | null {
  if (
    typeof a.release !== "string" ||
    !/^sha256:[0-9a-f]{64}$/.test(a.release) ||
    !isInstant(a.from)
  )
    return "W0.E_VALUE";
  if (!Number.isSafeInteger(a.tx) || a.tx < 1 || a.tx > basisTx) return "W0.E_BASIS";
  return null;
}

/**
 * SPEC 1 `reconcile`: `evaluate(world, resolveRelease(activations, basis.validTime), basis)`. Validation order (SPEC 4.4):
 * basis, world, then each activation in array order, then W0.E_NO_RELEASE (Q53 reading A05).
 */
export function reconcileWorld(
  world: World,
  activations: readonly Activation[],
  basis: Basis,
): Output | Failure {
  const b = checkBasis(basis);
  if (b !== null) return { error: b };
  const idx = indexWorld(world, basis.tx);
  if (typeof idx === "string") return { error: idx };
  for (const a of activations) {
    const e = checkActivation(a, basis.tx);
    if (e !== null) return { error: e };
  }
  const rel = resolveRelease(activations, basis.validTime);
  if (typeof rel === "string") return { error: rel };
  return evaluateIndexed(idx, rel, basis);
}

/** SPEC 9 canonical JSON of an `evaluate` or `reconcile` output, written field by field in sorted key order. */
export function outputJson(o: Output): string {
  let s =
    '{"basis":{"tx":' +
    o.basis.tx +
    ',"validTime":' +
    quote(o.basis.validTime) +
    '},"dependencies":[';
  for (let k = 0; k < o.dependencies.length; k++) {
    const d = o.dependencies[k]!;
    s += (k ? ",[" : "[") + quote(d[0]) + "," + quote(d[1]) + "]";
  }
  s += '],"flags":[';
  for (let k = 0; k < o.flags.length; k++) {
    const f = o.flags[k]!;
    s += (k ? "," : "") + '{"name":' + quote(f.name) + ',"rule":"' + f.rule + '"}';
  }
  s += '],"obligations":[';
  for (let k = 0; k < o.obligations.length; k++) {
    const b = o.obligations[k]!;
    s +=
      (k ? "," : "") +
      '{"boundary":' +
      quote(b.boundary) +
      ',"id":' +
      quote(b.id) +
      ',"kind":' +
      quote(b.kind) +
      ',"rule":"' +
      b.rule +
      '"}';
  }
  s += '],"release":' + quote(o.release) + ',"subject":' + quote(o.subject) + ',"tasks":[';
  for (let k = 0; k < o.tasks.length; k++) {
    const t = o.tasks[k]!;
    s +=
      (k ? "," : "") +
      '{"dueAt":' +
      (t.dueAt === null ? "null" : quote(t.dueAt)) +
      ',"id":' +
      quote(t.id) +
      ',"kind":' +
      quote(t.kind) +
      ',"overdue":' +
      (t.overdue ? "true" : "false") +
      ',"rule":"' +
      t.rule +
      '"}';
  }
  s += '],"trace":[';
  for (let k = 0; k < o.trace.length; k++) {
    const t = o.trace[k]!;
    s +=
      (k ? "," : "") +
      '{"inputs":[' +
      t.inputs.join(",") +
      '],"key":' +
      quote(t.key) +
      ',"row":' +
      t.row +
      ',"rule":"' +
      t.rule +
      '"}';
  }
  s += '],"workItems":[';
  for (let k = 0; k < o.workItems.length; k++) {
    const w = o.workItems[k]!;
    s +=
      (k ? "," : "") +
      '{"id":' +
      quote(w.id) +
      ',"inputs":[' +
      w.inputs.join(",") +
      '],"key":' +
      quote(w.key) +
      ',"kind":' +
      quote(w.kind) +
      ',"payload":' +
      w.payload +
      ',"rule":"' +
      w.rule +
      '","version":' +
      quote(w.version) +
      "}";
  }
  return s + "]}";
}

/** SPEC 9 canonical JSON of an operation's result: the output, or `{"error": "<code>"}` (SPEC 4.4). */
export const resultJson = (r: Output | Failure): string =>
  isFailure(r) ? '{"error":' + quote(r.error) + "}" : outputJson(r);
