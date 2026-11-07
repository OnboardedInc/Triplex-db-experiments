/**
 * Seeding a rung through the public writer (the bulk lane; not measured as P2).
 *
 * Order: shared account worlds, then subjects in index order (every own fact). History depth is grown
 * in place later, during the run, on the P4 matched sample (TARGETS 1.1 P4 item 2). Commands hold at most `batchFacts` operations. Seeding stops
 * early at `budgetMs`; the run then covers the subjects seeded so far and says so (rungAchieved).
 * Commands are applied one at a time: concurrent commits within one XTDB runtime conflict on the
 * scope position (observed 2026-11-07, `triplex-cas-conflict`), and seeding is not what is measured.
 */
import type { CompositionHandle, Receipt } from "./composition.ts";
import { seedOps } from "./commands.ts";
import { SEED_VALID_FROM, accountsFor, ownFacts, seedAddress, sharedFacts, versioned, ids, memberOf, type Fact } from "./world.ts";
import type { SubjectState } from "./commands.ts";

export interface RecordedCommand {
  readonly commandId: string;
  readonly operations: any[];
  readonly preconditions: any[];
  readonly actor?: string;
  readonly receipt: { txId: string; position: number; instant: number; assertionIds: (string | null)[] };
}

export interface SeedResult {
  seededSubjects: number;
  complete: boolean;
  commands: number;
  assertions: number;
  retractions: number;
  wallMs: number;
  factsPerS: number;
  commitMs: { p50: number; max: number };
  failures: { tag: string; commandId: string; message: string }[];
  firstPosition: number;
  lastPosition: number;
  lastInstant: number;
  positions: number[];
  state: Map<number, SubjectState>;
  versionIds: Map<number, string[]>;
  recorded: RecordedCommand[];
}

/** Assertion ids aligned with operations (null at retracts), matched by fact member text. */
export function alignIds(operations: readonly any[], receipt: Receipt): (string | null)[] {
  const byMember = new Map<string, string[]>();
  for (const t of receipt.triples) {
    const key = memberOf(t.entityId, t.attribute, t.value);
    const list = byMember.get(key) ?? [];
    list.push(t.id);
    byMember.set(key, list);
  }
  return operations.map((op) => (op.op === "assert" ? (byMember.get(memberOf(op.entityId, op.attribute, op.value))?.shift() ?? null) : null));
}

export async function seedRung(opts: {
  comp: CompositionHandle;
  subjects: number;
  runTag: string;
  batchFacts: number;
  budgetMs: number;
  recordSubjects: Set<number>;
  recordAccounts: Set<number>;
  /** Subjects whose versioned-fact ids are kept for in-place history growth (P4 matched sample). */
  historySubjects: Set<number>;
  log: (line: string) => void;
}): Promise<SeedResult> {
  const { comp } = opts;
  const accounts = accountsFor(opts.subjects);
  const started = performance.now();
  const state = new Map<number, SubjectState>();
  const versionIds = new Map<number, string[]>();
  const recorded: RecordedCommand[] = [];
  const positions: number[] = [];
  const latencies: number[] = [];
  const failures: { tag: string; commandId: string; message: string }[] = [];
  let commands = 0, assertions = 0, retractions = 0, lastInstant = 0;
  let n = 0;

  const commit = async (operations: any[], label: string, record: boolean, preconditions: any[] = []) => {
    const commandId = `${opts.runTag}:seed:${label}`;
    const meta = { commandId, actor: "bulk-seed", ...(preconditions.length ? { preconditions } : {}) };
    for (let attempt = 1; ; attempt++) {
      const t0 = performance.now();
      let out = await comp.transact(operations, meta);
      if (!out.ok && out.tag === "CommandAlreadyCommittedError") {
        const found = await comp.transactionByCommand(commandId);
        if (found.ok && found.value) out = { ok: true, value: receiptOfRecord(found.value) };
      }
      latencies.push(performance.now() - t0);
      if (out.ok) {
        const receipt = out.value;
        commands++;
        positions.push(receipt.position);
        lastInstant = Math.max(lastInstant, receipt.instant);
        for (const op of operations) op.op === "assert" ? assertions++ : retractions++;
        if (record) recorded.push({ commandId, operations, preconditions, actor: "bulk-seed", receipt: { txId: receipt.txId, position: receipt.position, instant: receipt.instant, assertionIds: alignIds(operations, receipt) } });
        return receipt;
      }
      failures.push({ tag: out.tag, commandId, message: String(out.error?.message ?? out.error ?? "").slice(0, 300) });
      if (attempt >= 8) throw new Error(`seed command ${commandId} failed ${attempt} times: ${out.tag} ${String(out.error?.message ?? out.error ?? "").slice(0, 300)}`);
      await new Promise((r) => setTimeout(r, 500 * attempt));
    }
  };
  const idOf = (receipt: Receipt, e: string, a: string) => receipt.triples.find((t) => t.entityId === e && t.attribute === a)?.id;

  // 1. shared worlds
  for (let a = 0; a < accounts; a++) {
    const facts = sharedFacts(a);
    for (let k = 0; k < facts.length; k += opts.batchFacts)
      await commit(seedOps(facts.slice(k, k + opts.batchFacts)), `acct${a}.${k}`, opts.recordAccounts.has(a));
  }
  opts.log(`seed: ${accounts} shared account worlds in ${((performance.now() - started) / 1000).toFixed(1)} s`);
  // 2. subjects, version 0
  let batch: Fact[] = [], members: number[] = [];
  const flush = async () => {
    if (!batch.length) return;
    const receipt = await commit(seedOps(batch), `s${members[0]}-${members.at(-1)}`, members.some((i) => opts.recordSubjects.has(i)));
    for (const i of members) {
      const stampId = idOf(receipt, ids.placement(i), ":placement/stamp");
      const addressId = idOf(receipt, ids.worker(i), ":worker/address");
      if (!stampId || !addressId) throw new Error(`seed receipt lacks ids for subject ${i}`);
      if (opts.historySubjects.has(i)) {
        const vIds = versioned(i, 0).map((f) => idOf(receipt, f.e, f.a)!);
        if (vIds.some((x) => !x)) throw new Error(`seed receipt lacks versioned ids for subject ${i}`);
        versionIds.set(i, vIds);
      }
      state.set(i, { stamp: 0, stampId, stampValidFrom: SEED_VALID_FROM, address: seedAddress(i), addressId, addressValidFrom: SEED_VALID_FROM });
    }
    n = members.at(-1)! + 1;
    batch = [];
    members = [];
  };
  let stoppedEarly = false;
  for (let i = 0; i < opts.subjects; i++) {
    const facts = ownFacts(i, accounts);
    if (batch.length + facts.length > opts.batchFacts) {
      await flush();
      if (performance.now() - started > opts.budgetMs) { stoppedEarly = true; break; }
      if (commands % 100 === 0) opts.log(`seed: ${n} subjects, ${assertions} assertions, ${((performance.now() - started) / 1000).toFixed(0)} s`);
    }
    batch.push(...facts);
    members.push(i);
  }
  if (!stoppedEarly) await flush();
  const seeded = n;
  opts.log(`seed: ${seeded} subjects in ${((performance.now() - started) / 1000).toFixed(1)} s`);
  const wallMs = performance.now() - started;
  latencies.sort((x, y) => x - y);
  return {
    seededSubjects: seeded, complete: seeded === opts.subjects, commands, assertions, retractions, wallMs,
    factsPerS: assertions / (wallMs / 1000),
    commitMs: { p50: latencies[Math.floor(latencies.length / 2)] ?? 0, max: latencies.at(-1) ?? 0 },
    failures, firstPosition: Math.min(...positions), lastPosition: Math.max(...positions), lastInstant, positions, state, versionIds, recorded,
  };
}

/** A receipt rebuilt from a durable TransactionRecord (lost-ACK and outcome-unknown resolution). */
export function receiptOfRecord(record: any): Receipt {
  return {
    txId: record.txId,
    position: record.position,
    instant: record.instant,
    triples: (record.changes ?? []).filter((c: any) => c.op === "assert").map((c: any) => ({ id: c.tripleId, entityId: c.entityId, attribute: c.attribute, value: c.value, validFrom: c.validFrom, validTo: c.validTo })),
  };
}
