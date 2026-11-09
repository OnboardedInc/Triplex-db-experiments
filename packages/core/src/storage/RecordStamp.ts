import { BasisNotAvailable } from "../errors/index.js";

export interface RecordCut {
  readonly position: number;
  readonly recordedAt: number;
}
export interface CommitStamp {
  readonly instant: number;
  readonly decided: boolean;
}
export const STAMP_PLACEHOLDER = -(2 ** 52);
const LIMIT = 2 ** 43 * 1000;
const check = (stamp: number): number => {
  if (!Number.isSafeInteger(stamp) || stamp < 0 || stamp >= LIMIT) {
    throw new RangeError("Record stamp is outside the exact microsecond range");
  }
  return stamp;
};
export const instantOf = (stamp: number): number => check(stamp) / 1000;
export const stampOf = (instant: number): number => {
  const nearest = Math.round(instant * 1000);
  for (const stamp of [nearest, nearest - 1, nearest + 1]) {
    if (Number.isSafeInteger(stamp) && stamp >= 0 && stamp < LIMIT && stamp / 1000 === instant)
      return stamp;
  }
  throw new RangeError("Instant is not an exact record stamp");
};
export const stampCut = (instant: number): number => {
  if (!Number.isFinite(instant) || instant < 0 || instant >= 2 ** 43)
    throw new RangeError("Invalid record cut");
  let stamp = Math.floor(instant * 1000);
  // [EXP-RT01] Why: multiplication can round across the quotient boundary. Rejected: floor alone (fails near 2248).
  while (stamp + 1 < LIMIT && (stamp + 1) / 1000 <= instant) stamp++;
  while (stamp / 1000 > instant) stamp--;
  return check(stamp);
};
export const nextStamp = (previous: number, clock: number): number =>
  check(Math.max(check(previous) + 1, stampCut(clock)));

export const gateRecordedAt = async (input: {
  readonly recordedAt: number;
  readonly readCut: () => Promise<RecordCut>;
  readonly awaitCut: (stamp: number, deadlineMs: number) => Promise<RecordCut>;
  readonly deadlineMs: number;
  readonly surface: string;
}): Promise<RecordCut> => {
  const start = performance.now();
  const required = stampCut(input.recordedAt);
  let cut = await input.readCut();
  if (stampOf(cut.recordedAt) >= required) return cut;
  if (input.recordedAt <= Date.now() + input.deadlineMs)
    cut = await input.awaitCut(required, input.deadlineMs);
  if (stampOf(cut.recordedAt) >= required) return cut;
  throw new BasisNotAvailable({
    axis: "recordedAt",
    required: input.recordedAt,
    observed: cut.recordedAt,
    waitedMs: performance.now() - start,
    surface: input.surface,
    message: "Record-time watermark has not reached the requested cut",
  });
};

export const bindCommit = <A>(
  value: A,
  commit: { readonly positions: ReadonlyMap<number, number>; readonly instant: number },
): A => {
  const visit = (item: unknown, depth: number): unknown => {
    if (depth > 4 || item === null || typeof item !== "object") return item;
    if (Array.isArray(item)) return item.map((entry) => visit(entry, depth + 1));
    if (Object.getPrototypeOf(item) !== Object.prototype) return item;
    return Object.fromEntries(
      Object.entries(item).map(([key, entry]) => [
        key,
        key === "position" && typeof entry === "number"
          ? (commit.positions.get(entry) ?? entry)
          : (key === "instant" || key === "recordedAt") && entry === STAMP_PLACEHOLDER
            ? commit.instant
            : visit(entry, depth + 1),
      ]),
    );
  };
  return visit(value, 0) as A;
};
