/**
 * Commit-group payloads: the broker's own record of every term it writes (R13 6.2 "pure quad deltas",
 * R17 2.1 item 6: delete terms must come from the broker's record, never from a read-back of QLever).
 *
 * A member's rows are complete `TripleRow`s with final positions; its priors are the committed versions of
 * the rows it retracts. The quads written to QLever are a pure function of rows (`rowFields`), so a frame
 * needs no engine state to apply, and replaying frames j+1..n onto any state at or after j converges
 * (R13 6.2 idempotence property). Rows are stored as arrays in `columns` order, which is about 40 percent
 * smaller than keyed JSON on a host volume that is 97 percent full.
 */
import type { TripleRow } from "@triplex-build/triplex/runtime";
import { columns } from "./columns.js";

export interface MemberClaim {
  readonly commandId: string;
  readonly txId: string;
  readonly timestamp: number;
}
export interface FrameMember {
  readonly stamp?: number;
  readonly operationId: string;
  readonly attemptId: string;
  /** Packed positions of this member's transacts, in ordinal order (Q31c consecutive ordinals). */
  readonly positions: readonly number[];
  readonly claims: readonly MemberClaim[];
  readonly rows: readonly TripleRow[];
  readonly priors: readonly TripleRow[];
  /** Subjects written (journal entities excluded), for the feed and per-subject CAS replay. */
  readonly subjects: readonly string[];
}
export interface CommitGroupPayload {
  readonly v: 1;
  readonly stream: string;
  readonly lsn: number;
  readonly epoch: number;
  readonly members: readonly FrameMember[];
}

type Wire = {
  v: 1;
  s: string;
  l: number;
  e: number;
  m: {
    t?: number;
    o: string;
    a: string;
    p: number[];
    c: [string, string, number][];
    r: unknown[][];
    b: unknown[][];
    s: string[];
  }[];
};
const rowToArray = (row: TripleRow): unknown[] => columns.map((column) => row[column]);
const rowFromArray = (cells: readonly unknown[]): TripleRow =>
  Object.fromEntries(
    columns.map((column, i) => [column, cells[i] ?? null]),
  ) as unknown as TripleRow;

export const encodeCommitGroup = (payload: CommitGroupPayload): Buffer =>
  Buffer.from(
    JSON.stringify({
      v: 1,
      s: payload.stream,
      l: payload.lsn,
      e: payload.epoch,
      m: payload.members.map((member) => ({
        ...(member.stamp === undefined ? {} : { t: member.stamp }),
        o: member.operationId,
        a: member.attemptId,
        p: [...member.positions],
        c: member.claims.map((claim) => [claim.commandId, claim.txId, claim.timestamp]),
        r: member.rows.map(rowToArray),
        b: member.priors.map(rowToArray),
        s: [...member.subjects],
      })),
    } satisfies Wire),
  );

export const decodeCommitGroup = (bytes: Buffer): CommitGroupPayload => {
  const wire = JSON.parse(bytes.toString("utf8")) as Wire;
  if (wire.v !== 1) throw new TypeError(`Unknown commit-group payload version ${String(wire.v)}`);
  return {
    v: 1,
    stream: wire.s,
    lsn: wire.l,
    epoch: wire.e,
    members: wire.m.map((member) => {
      if (member.t !== undefined && (!Number.isSafeInteger(member.t) || member.t < 0))
        throw new TypeError("Unsafe broker decision stamp");
      return {
        ...(member.t === undefined ? {} : { stamp: member.t }),
        operationId: member.o,
        attemptId: member.a,
        positions: member.p,
        claims: member.c.map(([commandId, txId, timestamp]) => ({ commandId, txId, timestamp })),
        rows: member.r.map(rowFromArray),
        priors: member.b.map(rowFromArray),
        subjects: member.s,
      };
    }),
  };
};
