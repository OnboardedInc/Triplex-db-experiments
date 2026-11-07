/**
 * Turns trace events and seed batches into Triplex transact operations, and records what each
 * command adds to and removes from its subject's world (for the expected-state model).
 *
 * Every trace command for subject i:
 *   - compare-and-set on the subject's last position: retract the live `:placement/stamp` fact with a
 *     TripleLive precondition, assert stamp+1 (TARGETS section 2 "Conflicts");
 *   - links a new event entity `evt:<i>:<seq>` from the placement and asserts its facts;
 *   - a correction also retracts the live `:worker/address` and asserts a new one valid from 30 days
 *     before the scheduled time (TARGETS section 2 "Corrections").
 * Asserted facts total exactly `event.facts`.
 */
import { SEED_VALID_FROM, ids, memberOf, type Fact, type Value } from "./world.ts";
import { TRACE_DEFAULTS, type TraceEvent } from "./trace.ts";
import { hash2 } from "./rng.ts";

export interface SubjectState {
  stamp: number;
  stampId: string;
  address: string;
  addressId: string;
}

export interface BuiltCommand {
  readonly commandId: string;
  readonly operations: any[];
  readonly preconditions: any[];
  /** World members (memberOf) added and removed by this command. */
  readonly added: Fact[];
  readonly removed: Fact[];
  readonly newStamp: number;
  readonly newAddress: string | null;
  /** Valid-time range the command affects: [from, to) with to = null for open. */
  readonly validRange: { from: number; to: number | null };
}

const KIND_ATTR: Record<string, string> = { person: ":evidence-note", system: ":signal", agent: ":proposal", runtime: ":outcome" };

function eventValue(kind: string, seq: number, j: number): Value {
  const x = hash2(`${seq}.${j}`)[0];
  if (kind === "person" && j === 0) return { type: "blob", value: `sha256:${x.toString(16).padStart(8, "0")}`, mimeType: "image/jpeg", size: 20_000 + (x % 500_000) };
  switch (j % 5) {
    case 0: return { type: "string", value: `${kind}-${x.toString(36)}` };
    case 1: return { type: "integer", value: String(x % 1_000_000) };
    case 2: return { type: "string", value: `${x % 1000}.${String(x % 100).padStart(2, "0")}` };
    case 3: return { type: "boolean", value: (x & 1) === 1 };
    default: return { type: "datetime", value: SEED_VALID_FROM + (x % 1_000_000) * 1000 };
  }
}

export function buildTraceCommand(opts: { runTag: string; event: TraceEvent; state: SubjectState; scheduledAbsMs: number }): BuiltCommand {
  const { event, state } = opts;
  const i = event.subject;
  const pl = ids.placement(i);
  const evt = ids.event(i, event.seq);
  const validFrom = Math.floor(opts.scheduledAbsMs);
  const added: Fact[] = [];
  const removed: Fact[] = [];
  const operations: any[] = [];
  const preconditions: any[] = [{ _tag: "TripleLive", id: state.stampId }];
  const assert = (f: Fact, from = validFrom) => {
    added.push(f);
    operations.push({ op: "assert", entityId: f.e, attribute: f.a, value: f.v, validFrom: from });
  };
  operations.push({ op: "retract", id: state.stampId });
  removed.push({ e: pl, a: ":placement/stamp", v: { type: "integer", value: String(state.stamp) } });
  const newStamp = state.stamp + 1;
  assert({ e: pl, a: ":placement/stamp", v: { type: "integer", value: String(newStamp) } });
  assert({ e: pl, a: ":placement/event", v: { type: "ref", value: evt } });
  let rest = event.facts - 2;
  let newAddress: string | null = null;
  let rangeFrom = validFrom;
  if (event.correction) {
    const back = validFrom - TRACE_DEFAULTS.correctionBackMs;
    operations.push({ op: "retract", id: state.addressId });
    preconditions.push({ _tag: "TripleLive", id: state.addressId });
    removed.push({ e: ids.worker(i), a: ":worker/address", v: { type: "string", value: state.address } });
    newAddress = `${hash2(`corr${event.seq}`)[0] % 9000 + 100} Corrected Ave`;
    assert({ e: ids.worker(i), a: ":worker/address", v: { type: "string", value: newAddress } }, back);
    rangeFrom = back;
    rest--;
  }
  const prefix = KIND_ATTR[event.kind]!;
  for (let j = 0; j < rest; j++) assert({ e: evt, a: `${prefix}/k${j}`, v: eventValue(event.kind, event.seq, j) });
  return {
    commandId: `${opts.runTag}:t${event.seq}`,
    operations,
    preconditions,
    added,
    removed,
    newStamp,
    newAddress,
    validRange: { from: rangeFrom, to: null },
  };
}

/** Plain assert operations for a list of seed facts. */
export const seedOps = (facts: readonly Fact[]) =>
  facts.map((f) => ({ op: "assert", entityId: f.e, attribute: f.a, value: f.v, validFrom: SEED_VALID_FROM }));

export const members = (facts: readonly Fact[]) => facts.map((f) => memberOf(f.e, f.a, f.v));
