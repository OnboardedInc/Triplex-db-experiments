// lab/scenarios/lib/gen.mjs: seeded, deterministic command streams for the GS scenarios (TARGETS section 6).
//
// [EXP-W01] Why: one generator shared by every scenario, so the same seed gives the same bytes for the
// command stream, the reads and (through O-REPLAY) the golden answers. Everything here is logical: entity
// ids, command ids and assertion refs carry no run identity. The runner maps them to physical ids with a
// run prefix (so reruns can share one preloaded world scope) and strips the prefix again before comparing.
// Business (valid) time is explicit on every assert and fixed below, so no golden answer depends on the
// wall clock; record time comes only from receipts at run time.
// Rejected: Math.random or Date.now anywhere in here (non-reproducible); one entity per subject (TARGETS P4
// asks for a subgraph; the subject world is placement -> worker and placement <- i9, 2 hops at 10k).
import { createHash } from 'node:crypto';

export const GEN_VERSION = 'w01-gen/1';
const day = 86_400_000;
/** Fixed business-time instants (valid time). Wall-clock "today" in the lab is 2026-11-07. */
export const BT = Object.freeze({
  MAR3: Date.UTC(2026, 2, 3),
  OCT1: Date.UTC(2026, 9, 1),
  OCT15: Date.UTC(2026, 9, 15),
  T0: Date.UTC(2026, 8, 1), // default validFrom for onboarding facts
  NOW: Date.UTC(2026, 10, 7, 12), // the validAt every "current" read uses
  MIDNIGHT: Date.UTC(2026, 10, 8),
  DAY: day,
});

// ------------------------------------------------------------------ deterministic randomness

export function rngFor(seed, stream) {
  const h = createHash('sha256').update(`${seed}:${stream}`).digest();
  let a = h.readUInt32LE(0) || 1;
  const next = () => { // mulberry32
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (lo, hi) => lo + Math.floor(next() * (hi - lo + 1)), // inclusive
    pick: list => list[Math.floor(next() * list.length)],
    chance: p => next() < p,
    shuffle: list => { const out = [...list]; for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(next() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; } return out; },
  };
}

// ------------------------------------------------------------------ vocabulary (Onboarded-shaped)

export const ents = sid => ({ placement: `placement:${sid}`, worker: `worker:${sid}`, i9: `i9:${sid}` });
/** Entities a subject pull reads. Shared configuration subjects (account, release, location) are one entity each. */
export const subjectEntities = sid => /^acct/.test(sid) ? [`account:${sid}`] : /^rel/.test(sid) ? [`release:${sid}`] : /^loc/.test(sid) ? [`location:${sid}`] : Object.values(ents(sid));
const BRANCHES = ['branch:atl', 'branch:chi', 'branch:dal', 'branch:den', 'branch:phx', 'branch:sea'];
const FIRST = ['Ana', 'Ben', 'Caro', 'Dev', 'Eli', 'Fay', 'Gus', 'Hana', 'Ivo', 'Jae', 'Kai', 'Lea'];
const LAST = ['Okafor', 'Silva', 'Nguyen', 'Cohen', 'Park', 'Haddad', 'Moreau', 'Ito', 'Diaz', 'Kowal'];
const STREETS = ['Oak St', 'Elm Ave', 'Pine Rd', 'Maple Dr', 'Cedar Ln', 'Birch Way'];
export const VALUE = {
  str: value => ({ type: 'string', value }),
  int: n => ({ type: 'integer', value: String(n) }), // int64 as canonical decimal text (Value.ts Int64Decimal)
  ref: value => ({ type: 'ref', value }),
  dt: value => ({ type: 'datetime', value }),
  bool: value => ({ type: 'boolean', value }),
};
/** Numbers rule (TARGETS section 6): money in cents, hours in tenths, both int64 decimal text. */
export const payRateCents = rng => 1200 + rng.int(0, 80) * 25; // $12.00 .. $32.00 in quarter steps, many at or above $16.50
export const name = rng => `${rng.pick(FIRST)} ${rng.pick(LAST)}`;
export const address = rng => `${rng.int(10, 9999)} ${rng.pick(STREETS)}`;
/** Values the engine cannot hold. 2^63 is outside int64 for Triplex itself; 2^60 is valid int64 but outside
 * QLever's 60-bit inline integers (TARGETS section 3: QLever must reject outside +-2^59, never wrap). */
export const UNREPRESENTABLE = { int64Overflow: '9223372036854775808', beyondQlever60: '1152921504606846976' };

/**
 * Placeholder release contents for content addressing only. W0's real rules, due times and evaluation belong to
 * EXP-D01 (TARGETS 6.1); R2 changes three requirements of R1 as TARGETS 6.1 item 2 says.
 */
export const RELEASES = {
  R1: { name: 'R1', requirements: ['i9.section1.due=P1D', 'i9.section2.due=P3D', 'everify.due=P3D', 'background-check.required', 'doc.expiry.check', 'pay.min-wage.location', 'hours.overtime>400tenths'] },
  R2: { name: 'R2', requirements: ['i9.section1.due=P1D', 'i9.section2.due=P2D', 'everify.due=P2D', 'background-check.required', 'doc.expiry.check', 'pay.min-wage.location', 'hours.overtime>400tenths', 'pay.rate>=1650cents'] },
};

// ------------------------------------------------------------------ stream builder

/**
 * Commands are per subject (one subject's world each) except bulk-lane imports. The builder keeps the live
 * assertion ref of every (entity, attribute) so card-one updates retract exactly the previous assertion, and
 * EntityState preconditions name the complete live set (Triple.ts EntityStatePrecondition).
 */
export class Stream {
  constructor() { this.commands = []; this.live = new Map(); this.byCommandId = new Map(); }
  liveRefs(entityId) { return [...(this.live.get(entityId)?.values() ?? [])].flat(); }
  /** Start a command. Returns a small op builder; call .done() to append. */
  command({ subject, writer, at = 0, tags = {}, commandId }) {
    const index = this.commands.length;
    const ops = [], pending = [];
    const self = this;
    const actor = `${writer}:${subject ?? 'bulk'}`;
    const b = {
      index,
      assert(entityId, attribute, value, entityType, { validFrom = BT.T0, validTo, many = false } = {}) {
        const ref = `a:${index}:${ops.length}`;
        const op = { op: 'assert', ref, entityId, attribute, value, entityType, createdBy: actor, validFrom };
        if (validTo !== undefined) op.validTo = validTo;
        ops.push(op); pending.push({ kind: 'assert', entityId, attribute, ref, many });
        return b;
      },
      /** Card-one set: retract the current live assertion of (entity, attribute) if any, then assert. */
      set(entityId, attribute, value, entityType, opts = {}) {
        if (pending.some(p => p.kind === 'assert' && p.entityId === entityId && p.attribute === attribute))
          throw new Error(`generator bug: command ${index} sets ${entityId} ${attribute} twice`);
        const current = self.live.get(entityId)?.get(attribute);
        for (const ref of current ?? []) { ops.push({ op: 'retract', target: ref }); pending.push({ kind: 'retract', entityId, attribute, ref }); }
        return b.assert(entityId, attribute, value, entityType, opts);
      },
      retract(entityId, attribute) {
        for (const ref of self.live.get(entityId)?.get(attribute) ?? []) { ops.push({ op: 'retract', target: ref }); pending.push({ kind: 'retract', entityId, attribute, ref }); }
        return b;
      },
      currentRef(entityId, attribute) { return self.live.get(entityId)?.get(attribute)?.[0]; },
      /** Commit the command. `applies: false` means the generator expects it not to change state. */
      done({ preconditions, applies = true } = {}) {
        const meta = { actor, commandId: commandId ?? `cmd:${index}` };
        if (preconditions) meta.preconditions = preconditions;
        const command = { index, subject, writer, at, meta, operations: ops, tags };
        self.commands.push(command);
        if (applies) self.apply(pending);
        return command;
      },
      entityState(entityId) { return { _tag: 'EntityState', entityId, targets: self.liveRefs(entityId) }; },
    };
    return b;
  }
  apply(pending) {
    for (const p of pending) {
      const attrs = this.live.get(p.entityId) ?? new Map();
      this.live.set(p.entityId, attrs);
      if (p.kind === 'retract') {
        const left = (attrs.get(p.attribute) ?? []).filter(r => r !== p.ref);
        if (left.length) attrs.set(p.attribute, left); else attrs.delete(p.attribute);
      } else {
        attrs.set(p.attribute, p.many ? [...(attrs.get(p.attribute) ?? []), p.ref] : [p.ref]);
      }
    }
  }
  /** Re-send of an earlier command with the same commandId (duplicate signal or lost-ACK retry). */
  resend(original, { at, tags }) {
    const index = this.commands.length;
    const operations = original.operations.map((op, k) => op.op === 'assert' ? { ...op, ref: `a:${index}:${k}` } : { ...op });
    const command = { index, subject: original.subject, writer: original.writer, at, meta: { ...original.meta }, operations,
      tags: { ...tags, resendOf: original.index } };
    this.commands.push(command);
    return command;
  }
}

// ------------------------------------------------------------------ templates

export const T = {
  /** A new placement world: 12 facts on 3 entities, written into builder `c`. */
  onboardInto(c, rng, sid, { validFrom = BT.T0 } = {}) {
    const e = ents(sid), opt = { validFrom };
    c.assert(e.placement, ':placement/worker', VALUE.ref(e.worker), 'Placement', opt)
      .assert(e.placement, ':placement/branch', VALUE.ref(rng.pick(BRANCHES)), 'Placement', opt)
      .assert(e.placement, ':placement/payRateCents', VALUE.int(payRateCents(rng)), 'Placement', opt)
      .assert(e.placement, ':placement/startDate', VALUE.dt(BT.OCT1 + rng.int(0, 60) * day), 'Placement', opt)
      .assert(e.placement, ':placement/status', VALUE.str('onboarding'), 'Placement', opt)
      .assert(e.placement, ':placement/weeklyHoursTenths', VALUE.int(rng.int(200, 500)), 'Placement', opt)
      .assert(e.worker, ':worker/name', VALUE.str(name(rng)), 'Worker', opt)
      .assert(e.worker, ':worker/addressLine', VALUE.str(address(rng)), 'Worker', opt)
      .assert(e.worker, ':worker/email', VALUE.str(`w${sid.replace(/\W/g, '')}@example.test`), 'Worker', opt)
      .assert(e.i9, ':i9/placement', VALUE.ref(e.placement), 'I9', opt)
      .assert(e.i9, ':i9/section1Status', VALUE.str('pending'), 'I9', opt)
      .assert(e.i9, ':i9/section2Status', VALUE.str('pending'), 'I9', opt);
    return c;
  },
  /** One per-subject onboarding command. */
  onboard(stream, rng, sid, { at = 0, writer = 'person', validFrom = BT.T0, phase } = {}) {
    const c = stream.command({ subject: sid, writer, at, tags: { template: 'onboard', ...(phase ? { phase } : {}) } });
    return T.onboardInto(c, rng, sid, { validFrom }).done();
  },
  /** Setup-phase onboarding through the bulk lane: `perCommand` subjects per command (not measured). */
  onboardBulk(stream, rng, sids, { perCommand = 10, writer = 'bulk', validFrom = BT.T0 } = {}) {
    const out = [];
    for (let i = 0; i < sids.length; i += perCommand) {
      const c = stream.command({ subject: null, writer, at: 0, tags: { template: 'onboardBulk', phase: 'setup' } });
      for (const sid of sids.slice(i, i + perCommand)) T.onboardInto(c, rng, sid, { validFrom });
      out.push(c.done());
    }
    return out;
  },
  /** I-9 Section 1 submit by the worker: 10 facts (TARGETS scenario 2). */
  section1Submit(stream, rng, sid, { at = 0 } = {}) {
    const e = ents(sid), opt = { validFrom: BT.NOW - rng.int(1, 600) * 1000 };
    const c = stream.command({ subject: sid, writer: 'person', at, tags: { template: 'section1Submit' } });
    c.set(e.i9, ':i9/section1Status', VALUE.str('submitted'), 'I9', opt)
      .assert(e.i9, ':i9/citizenship', VALUE.str(rng.pick(['citizen', 'lpr', 'authorized-alien'])), 'I9', opt)
      .assert(e.i9, ':i9/lastName', VALUE.str(rng.pick(LAST)), 'I9', opt)
      .assert(e.i9, ':i9/firstName', VALUE.str(rng.pick(FIRST)), 'I9', opt)
      .assert(e.i9, ':i9/dateOfBirth', VALUE.dt(Date.UTC(1970 + rng.int(0, 35), rng.int(0, 11), rng.int(1, 28))), 'I9', opt)
      .assert(e.i9, ':i9/signedAt', VALUE.dt(opt.validFrom), 'I9', opt)
      .assert(e.i9, ':i9/preparerUsed', VALUE.bool(rng.chance(0.1)), 'I9', opt)
      .assert(e.i9, ':i9/ssnLast4', VALUE.str(String(rng.int(1000, 9999))), 'I9', opt)
      .assert(e.i9, ':i9/addressLine', VALUE.str(address(rng)), 'I9', opt)
      .assert(e.i9, ':i9/otherLastNames', VALUE.str('N/A'), 'I9', opt);
    return c.done();
  },
  /** E-Verify status signal from a vendor: 5 facts (system writer). `seq` is the vendor sequence. */
  everifySignal(stream, rng, sid, seq, { at = 0 } = {}) {
    const e = ents(sid), opt = { validFrom: BT.NOW - 3600_000 + seq * 1000 };
    const c = stream.command({ subject: sid, writer: 'system', at, tags: { template: 'everifySignal', seq } });
    const status = ['open', 'pending-referral', 'referred', 'employment-authorized', 'closed'][Math.min(4, seq)];
    c.set(e.i9, ':i9/everifyStatus', VALUE.str(status), 'I9', opt)
      .set(e.i9, ':i9/everifySeq', VALUE.int(seq), 'I9', opt)
      .set(e.i9, ':i9/everifyCase', VALUE.str(`EV${String(rng.int(1e6, 9e6))}`), 'I9', opt)
      .set(e.i9, ':i9/everifyReceivedAt', VALUE.dt(opt.validFrom), 'I9', opt)
      .set(e.i9, ':i9/everifyVendor', VALUE.str('everify-gw'), 'I9', opt);
    return c.done();
  },
  /** A late older vendor revision, acknowledged as superseded (TARGETS 6.1 GS.03): journaled on the subject's
   * signal log entity, current I-9 values untouched. The superseded decision is W0's; O-DOMAIN owns it. */
  everifySuperseded(stream, sid, seq, { at = 0, commandId } = {}) {
    const c = stream.command({ subject: sid, writer: 'system', at, commandId, tags: { template: 'everifySuperseded', seq } });
    c.assert(`signal:${sid}`, ':signal/supersededRevision', VALUE.int(seq), 'SignalLog', { validFrom: BT.NOW - 3600_000 + seq * 1000, many: true });
    return c.done();
  },
  /** Pay rate changed retroactively from `from` (a valid-time correction): old value bounded, new value open. */
  rateCorrection(stream, rng, sid, from, { at = 0 } = {}) {
    const e = ents(sid);
    const c = stream.command({ subject: sid, writer: 'person', at, tags: { template: 'rateCorrection', correction: true, validRange: [from, null] } });
    const current = c.currentRef(e.placement, ':placement/payRateCents');
    const old = stream.commands.flatMap(cmd => cmd.operations).find(op => op.ref === current);
    c.retract(e.placement, ':placement/payRateCents')
      .assert(e.placement, ':placement/payRateCents', old.value, 'Placement', { validFrom: old.validFrom, validTo: from })
      .assert(e.placement, ':placement/payRateCents', VALUE.int(Number(old.value.value) + 25 * rng.int(1, 20)), 'Placement', { validFrom: from });
    const done = c.done();
    stream.live.get(e.placement).set(':placement/payRateCents', [`a:${done.index}:${done.operations.length - 2}`, `a:${done.index}:${done.operations.length - 1}`]);
    return done;
  },
  /** A numeric write with an explicit integer text (unrepresentable-value probes; TARGETS section 6 numbers rule). */
  numericWrite(stream, sid, attribute, text, { at = 0, laneDependent = false } = {}) {
    const c = stream.command({ subject: sid, writer: 'system', at, tags: { template: 'numericWrite', numeric: text, ...(laneDependent ? { laneDependent: true } : {}) } });
    c.assert(ents(sid).placement, attribute, { type: 'integer', value: text }, 'Placement', { validFrom: BT.NOW - 60_000 });
    return c.done({ applies: !laneDependent });
  },
  /** A content-addressed release (configuration) and its requirement list; returns the release subject id. */
  releaseDefine(stream, release, { at = 0, phase } = {}) {
    const hash = sha256(JSON.stringify(release)).slice(0, 12);
    const sid = `rel${hash}`;
    const c = stream.command({ subject: sid, writer: 'person', at, tags: { template: 'releaseDefine', ...(phase ? { phase } : {}) } });
    c.assert(`release:${sid}`, ':release/name', VALUE.str(release.name), 'Release', { validFrom: BT.T0 })
      .assert(`release:${sid}`, ':release/contentSha256', VALUE.str(sha256(JSON.stringify(release))), 'Release', { validFrom: BT.T0 });
    for (const r of release.requirements) c.assert(`release:${sid}`, ':release/requirement', VALUE.str(r), 'Release', { validFrom: BT.T0, many: true });
    c.done();
    return sid;
  },
  /** Activation is a fact: the account's active release. */
  activate(stream, acct, relSid, { at = 0, phase } = {}) {
    const c = stream.command({ subject: acct, writer: 'person', at, tags: { template: 'activate', release: relSid, ...(phase ? { phase } : {}) } });
    c.set(`account:${acct}`, ':account/activeRelease', VALUE.ref(`release:${relSid}`), 'Account', { validFrom: BT.T0 });
    return c.done();
  },
  /** Reviewer decision on Section 2 with compare-and-set on the I-9 entity (scenario 7). */
  reviewDecision(stream, sid, decision, { at = 0, race, applies = true, reviewer = 'r1' } = {}) {
    const e = ents(sid), opt = { validFrom: BT.NOW - 60_000 };
    const pre = { _tag: 'EntityState', entityId: e.i9, targets: stream.liveRefs(e.i9) };
    const c = stream.command({ subject: sid, writer: 'person', at, tags: { template: 'reviewDecision', decision, race, reviewer } });
    c.set(e.i9, ':i9/section2Status', VALUE.str(decision === 'approve' ? 'approved' : 'waived'), 'I9', opt)
      .assert(e.i9, ':i9/reviewedBy', VALUE.str(`reviewer:${reviewer}`), 'I9', opt);
    return c.done({ preconditions: [pre], applies });
  },
  /** "Address wrong since October": retract the open address, re-assert it bounded, assert the fix from OCT1. */
  addressCorrection(stream, rng, sid, { at = 0 } = {}) {
    const e = ents(sid);
    const c = stream.command({ subject: sid, writer: 'person', at, tags: { template: 'addressCorrection', correction: true, validRange: [BT.OCT1, null] } });
    const current = c.currentRef(e.worker, ':worker/addressLine');
    const old = stream.commands.flatMap(cmd => cmd.operations).find(op => op.ref === current);
    c.retract(e.worker, ':worker/addressLine')
      .assert(e.worker, ':worker/addressLine', old.value, 'Worker', { validFrom: old.validFrom, validTo: BT.OCT1 })
      .assert(e.worker, ':worker/addressLine', VALUE.str(address(rng)), 'Worker', { validFrom: BT.OCT1 });
    // Both bounded and open address assertions stay live; the next correction must retract both.
    const done = c.done();
    const attrs = stream.live.get(e.worker);
    attrs.set(':worker/addressLine', [`a:${done.index}:${done.operations.length - 2}`, `a:${done.index}:${done.operations.length - 1}`]);
    return done;
  },
  /** One writer-trace command: 5 to 50 facts about one subject (TARGETS section 2). */
  traceCommand(stream, rng, sid, { at = 0, writer, facts } = {}) {
    const e = ents(sid), opt = { validFrom: BT.NOW - rng.int(1, 86_400) * 1000 };
    const c = stream.command({ subject: sid, writer, at, tags: { template: 'trace', facts } });
    c.set(e.placement, ':placement/lastActivity', VALUE.str(`${writer}-${rng.int(1, 1e6)}`), 'Placement', opt);
    for (let k = 1; k < facts; k++) {
      const slot = k; // one attribute per fact in the command; the set per writer is bounded (49)
      c.set(e.placement, `:trace/${writer}${slot}`, k % 3 === 0 ? VALUE.int(rng.int(0, 1e9)) : VALUE.str(`v${rng.int(0, 1e6)}`), 'Placement', opt);
    }
    return c.done();
  },
};

// ------------------------------------------------------------------ the fixed writer trace (TARGETS section 2)

/** Fact count by the declared mix: 60% 5 to 10, 30% 11 to 25, 10% 26 to 50. */
export const factCount = rng => { const r = rng.next(); return r < 0.6 ? rng.int(5, 10) : r < 0.9 ? rng.int(11, 25) : rng.int(26, 50); };
/** Writer mix 40/30/10/20 by command count. */
export const writerKind = rng => { const r = rng.next(); return r < 0.4 ? 'person' : r < 0.7 ? 'system' : r < 0.8 ? 'agent' : 'runtime'; };
export const MEAN_FACTS = 0.6 * 7.5 + 0.3 * 18 + 0.1 * 38;

/**
 * Open-loop schedule of trace commands for `durationMs`: steady `factsPerSecond`, with bursts of `burstFactor`
 * for `burstMs` every `burstEveryMs` (first burst at `burstOffsetMs`). Subjects come from a pool of
 * `subjects` trace subjects (onboarded first, at time 0, as bulk). Duplicates (10% of system signals) and
 * lost ACKs (1%) are marked; the runner performs them. Returns the trace subjects for onboarding.
 */
export function writerTrace(seed, { durationMs, streamName = 'writer-trace', factsPerSecond = 15, burstFactor = 50, burstMs = 60_000, burstEveryMs = 600_000,
  burstOffsetMs = Infinity, subjects = 200, prefix = 'tr', dupRate = 0.1, lostAckRate = 0.01, startAt = 0 } = {}) {
  const rng = rngFor(seed, streamName);
  const pool = Array.from({ length: subjects }, (_, n) => `${prefix}${String(n).padStart(5, '0')}`);
  const rateAt = t => { const inBurst = t >= burstOffsetMs && ((t - burstOffsetMs) % burstEveryMs) < burstMs; return (inBurst ? burstFactor : 1) * factsPerSecond / MEAN_FACTS; };
  const events = [];
  let t = startAt;
  while (t < startAt + durationMs) {
    t += -Math.log(1 - rng.next()) / rateAt(t - startAt) * 1000; // Poisson arrivals at the current rate
    if (t >= startAt + durationMs) break;
    const at = Math.round(t), writer = writerKind(rng), sid = rng.pick(pool), facts = factCount(rng), valueSeed = rng.int(0, 2 ** 31);
    const dup = writer === 'system' && rng.chance(dupRate), lost = !dup && rng.chance(lostAckRate), dupDelay = rng.int(0, 2000);
    const holder = {};
    events.push({ at, emit: stream => { holder.cmd = T.traceCommand(stream, rngFor(valueSeed, 'trace-values'), sid, { at, writer, facts }); holder.cmd.tags.trace = true; if (lost) holder.cmd.tags.lostAck = true; } });
    if (dup) events.push({ at: at + dupDelay, emit: stream => stream.resend(holder.cmd, { at: at + dupDelay, tags: { trace: true, duplicate: true } }) });
    if (lost) events.push({ at, emit: stream => stream.resend(holder.cmd, { at, tags: { trace: true, lostAckRetry: true } }) });
  }
  return { pool, events };
}

/**
 * Common shape of a scenario stream: scenario subjects and the trace pool onboarded in the setup phase (bulk
 * lane), then the fixed writer trace and the scenario's own events for the live phase. Events are
 * `{ at, emit(stream, rng) }`, emitted in time order so per-subject stream order equals send order.
 */
export function scenarioStream(spec, params, { subjects = [], events = [], onboardOptions } = {}) {
  const stream = new Stream();
  const rng = rngFor(spec.seed, `scenario-${spec.id}`);
  const setupRng = rngFor(spec.seed, `setup-${spec.setupStream ?? spec.id}`); // GS.11 shares GS.10 setup
  const trace = params.trace ? writerTrace(spec.seed, { ...params.trace, durationMs: params.liveMs, streamName: `trace-${spec.id}` }) : { pool: [], events: [] };
  if (subjects.length) T.onboardBulk(stream, setupRng, subjects, onboardOptions);
  if (trace.pool.length) T.onboardBulk(stream, setupRng, trace.pool);
  const all = [...trace.events.map((e, k) => ({ ...e, order: [0, k] })), ...events.map((e, k) => ({ ...e, order: [1, k] }))]
    .sort((x, y) => x.at - y.at || x.order[0] - y.order[0] || x.order[1] - y.order[1]);
  for (const e of all) e.emit(stream, rng);
  return { stream, traceSubjects: trace.pool, rng };
}

// ------------------------------------------------------------------ background world (the rung)

export const RUNGS = { smoke: 500, '10k': 10_000, '100k': 100_000, '1m': 1_000_000, '10m': 10_000_000 };
export const worldSid = n => `w${String(n).padStart(8, '0')}`;
/** World subject n: 5 facts (placement worker ref, branch, pay rate, start date; worker name). Pure in (seed, n). */
export function worldOps(seed, n) {
  const rng = rngFor(seed, `world:${n}`);
  const sid = worldSid(n), e = ents(sid), opt = { validFrom: BT.T0 };
  const who = 'bulk:hris';
  return [
    { op: 'assert', entityId: e.placement, attribute: ':placement/worker', value: VALUE.ref(e.worker), entityType: 'Placement', createdBy: who, ...opt },
    { op: 'assert', entityId: e.placement, attribute: ':placement/branch', value: VALUE.ref(rng.pick(BRANCHES)), entityType: 'Placement', createdBy: who, ...opt },
    { op: 'assert', entityId: e.placement, attribute: ':placement/payRateCents', value: VALUE.int(payRateCents(rng)), entityType: 'Placement', createdBy: who, ...opt },
    { op: 'assert', entityId: e.placement, attribute: ':placement/startDate', value: VALUE.dt(BT.OCT1 + rng.int(0, 60) * day), entityType: 'Placement', createdBy: who, ...opt },
    { op: 'assert', entityId: e.worker, attribute: ':worker/name', value: VALUE.str(name(rng)), entityType: 'Worker', createdBy: who, ...opt },
  ];
}
export const WORLD_BATCH = 100; // subjects per bulk-lane command

// ------------------------------------------------------------------ canonical rows and digests

/** Canonical value text, identical for O-REPLAY output values and Triplex runtime values. */
export function canonValue(v) {
  switch (v.type) {
    case 'number': case 'datetime': return `${v.type}:${String(Number(v.value))}`;
    case 'json': return `json:${JSON.stringify(v.canonical ?? v.value)}`;
    case 'blob': return `blob:${v.value}|${v.mimeType}|${v.size}|${v.filename ?? ''}`;
    default: return `${v.type}:${String(v.value)}`;
  }
}
const opt = x => (x && typeof x === 'object' && '_tag' in x) ? (x._tag === 'Some' ? x.value : null) : (x ?? null);
/** A visible row in comparison form: logical ids, no assertion id, no record time. */
export function canonRow(row, unprefix = s => s) {
  const value = row.value.type === 'ref' ? { ...row.value, value: unprefix(row.value.value) } : row.value;
  return [unprefix(row.entityId), row.attribute, canonValue(value), Number(row.validFrom), opt(row.validTo) === null ? null : Number(opt(row.validTo)),
    opt(row.entityType), opt(row.createdBy) === null ? null : unprefix(opt(row.createdBy))];
}
export function digestRows(rows) {
  const lines = rows.map(r => JSON.stringify(r)).sort();
  return createHash('sha256').update(lines.join('\n')).digest('hex').slice(0, 24);
}
export const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
