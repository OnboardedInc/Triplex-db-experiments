import { createHash } from "node:crypto";
import {
  deepTasks,
  deepTaskFacts,
  fieldCount,
  fieldValue,
  integer,
  saveLimit,
  seedClosed,
  seedSaves,
  stepCount,
  stepId,
  string,
  taskId,
  taskSerial,
} from "./deep-world.ts";
import { hash2, Rng, seedOf } from "./rng.ts";
import { segments, TRACE_DEFAULTS, zipfCdf, type TraceEvent, type WriterKind } from "./trace.ts";
import type { Fact } from "./world.ts";

export const DEEP_RATE = 1.6;
export const deepSeed = (scope: number) => `deep-v1-s${scope}`;
type Intent = {
  task: number;
  serial: number;
  saves: number;
  step: number | null;
  closes: boolean;
  fresh: boolean;
};
export type DeepEvent = TraceEvent & { deep: Intent };
const syntheticSerial = (person: number, task: number) => 10_000_000 + person * 10000 + task;

// [DX-SCALE1] Why: a two-percent daily roster must stay a two-percent roster through bursts. Rejected: a uniform draw outside it or the original 2,000-second rotation, both of which introduce extra people over a working day.
export function deepRoster(seed: string, people: number, day: number) {
  const month = Math.floor(day / 30),
    daily = Math.max(1, Math.round(people * 0.02)),
    monthly = Math.max(daily, Math.round(people * 0.38));
  const rng = new Rng(seedOf(`${seed}:month:${month}`));
  const shuffled = Int32Array.from({ length: people }, (_, i) => i);
  for (let i = 0; i < monthly; i++) {
    const j = i + rng.int(people - i);
    [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
  }
  const offset = Math.floor(((day % 30) * monthly) / 30);
  return Array.from({ length: daily }, (_, k) => shuffled[(offset + k) % monthly]!);
}
const pickRank = (cdf: Float64Array, value: number) => {
  let lo = 0,
    hi = cdf.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (cdf[mid]! < value) lo = mid + 1;
    else hi = mid;
  }
  return lo;
};

type TaskState = { index: number; serial: number; saves: number };
function initialTasks(person: number) {
  const open: TaskState[] = [];
  for (let t = 0; t < deepTasks(person); t++) {
    const serial = taskSerial(person, t);
    if (!seedClosed(serial)) open.push({ index: t, serial, saves: seedSaves(serial) });
  }
  return { open, next: Number(deepTasks(person)) };
}
function nextIntent(
  state: ReturnType<typeof initialTasks>,
  kind: WriterKind,
  i: number,
  seq: number,
): Intent {
  const draw = hash2(`task:${seq}`)[0];
  if (kind !== "person") {
    const t = draw % deepTasks(i);
    return { task: t, serial: taskSerial(i, t), saves: 0, step: null, closes: false, fresh: false };
  }
  const fresh = !state.open.length;
  if (fresh) {
    const t = state.next++;
    state.open.push({ index: t, serial: syntheticSerial(i, t), saves: 0 });
  }
  const slot = draw % state.open.length,
    t = state.open[slot]!;
  const limit = saveLimit(t.serial),
    count = stepCount(t.serial),
    before = Math.floor((t.saves * count) / limit);
  const after = Math.floor((++t.saves * count) / limit),
    closes = t.saves === limit;
  if (closes) state.open.splice(slot, 1);
  return {
    task: t.index,
    serial: t.serial,
    saves: t.saves,
    step: after > before ? before : null,
    closes,
    fresh,
  };
}

// [DX-SCALE1] Why: both the frozen event digest and the real writer use these logical edits; volatile receipt IDs and absolute wall times are bound separately at execution. Rejected: hashing only a scheduled command's size and subject.
export function deepEdits(subject: number, seq: number, kind: WriterKind, d: Intent): Fact[] {
  const task = taskId(subject, d.task),
    set = (a: string, v: Fact["v"]): Fact => ({ e: task, a, v });
  if (kind !== "person") {
    const family = { system: "signal", agent: "proposal", runtime: "reconcile" }[kind];
    return [
      set(`:${family}/sequence`, integer(seq)),
      set(`:${family}/result`, string(`${family}-${seq % 7}`)),
      set(`:${family}/input`, fieldValue(subject, d.task, 0, seq + 1)),
      set(`:${family}/revision`, integer(seq + 1)),
    ];
  }
  const edits: Fact[] = [set(":task/progress", integer(d.saves))];
  const n = fieldCount(d.serial),
    offset = hash2(`field:${seq}`)[0] % n;
  for (let j = 0; j < 3; j++) {
    const f = (offset + j) % n;
    edits.push(set(`:task/field-${f}`, fieldValue(subject, d.task, f, seq + 1)));
  }
  if (d.step !== null)
    edits.push({
      e: stepId(subject, d.task, d.step),
      a: ":subtask/completedAt",
      v: { type: "datetime", value: 1_700_000_000_000 + seq + 1 },
    });
  if (d.closes) edits.push(set(":task/status", string("complete")));
  if (!d.fresh) return edits;
  const replaced = new Set(edits.map((r) => `${r.e}\0${r.a}`));
  return [
    ...deepTaskFacts(subject, d.task, d.serial, true).filter(
      (r) => !replaced.has(`${r.e}\0${r.a}`),
    ),
    ...edits,
  ];
}
export function makeDeepTrace(seed: string, subjects: number, durationS: number) {
  const rng = new Rng(seedOf(`${seed}:traffic`)),
    events: DeepEvent[] = [];
  const state = new Map<number, ReturnType<typeof initialTasks>>(),
    digest = createHash("sha256");
  let seq = 0,
    day = -1,
    roster: number[] = [],
    cdf = new Float64Array(0) as Float64Array;
  const stats = new Map<number, number>();
  for (const window of segments(durationS)) {
    const rate = DEEP_RATE * (window.burst ? TRACE_DEFAULTS.burstMultiplier : 1);
    for (let t = window.start + rng.exp(rate); t < window.end; t += rng.exp(rate)) {
      const d = Math.floor(t / 86400);
      if (day !== d) {
        day = d;
        roster = deepRoster(seed, subjects, day);
        cdf = zipfCdf(roster.length, TRACE_DEFAULTS.zipfS);
      }
      const rank =
        rng.next() < TRACE_DEFAULTS.activePickShare
          ? pickRank(cdf, rng.next())
          : rng.int(roster.length);
      const subject = roster[rank]!,
        u = rng.next();
      const kind: WriterKind =
        u < 0.4 ? "person" : u < 0.7 ? "system" : u < 0.8 ? "agent" : "runtime";
      const person = state.get(subject) ?? initialTasks(subject);
      state.set(subject, person);
      const deep = nextIntent(person, kind, subject, seq);
      const correction = rng.next() < TRACE_DEFAULTS.correctionRate,
        ackLoss = rng.next() < TRACE_DEFAULTS.ackLossRate;
      const edits = deepEdits(subject, seq, kind, deep),
        facts = 1 + edits.length + Number(correction);
      const original: DeepEvent = {
        seq: seq++,
        subject,
        kind,
        facts,
        correction,
        ackLoss,
        deep,
        atMs: Math.round(t * 1e6) / 1000,
        resend: false,
        burst: window.burst,
        active: true,
        stream: "background",
      };
      events.push(original);
      stats.set(facts, (stats.get(facts) ?? 0) + 1);
      digest.update(JSON.stringify([original, edits]) + "\n");
      if (kind === "system" && rng.next() < TRACE_DEFAULTS.systemDuplicateRate) {
        const [min, max] = TRACE_DEFAULTS.duplicateDelayMs,
          atMs = Math.round((original.atMs + min + rng.next() * (max - min)) * 1000) / 1000;
        if (atMs < durationS * 1000) {
          const resend = { ...original, atMs, resend: true, ackLoss: false };
          events.push(resend);
          digest.update(JSON.stringify(resend) + "\n");
        }
      }
    }
  }
  events.sort((a, b) => a.atMs - b.atMs || a.seq - b.seq || Number(a.resend) - Number(b.resend));
  return {
    events,
    sha256: digest.digest("hex"),
    activeSubjects: new Set(state.keys()),
    sizeClasses: [...stats]
      .sort(([a], [b]) => a - b)
      .map(([n, count]) => ({ min: n, max: n, share: count / seq })),
  };
}
