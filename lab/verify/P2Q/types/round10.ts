import { Effect } from "effect";
import {
  constructReadDispatch,
  constructReadSurface,
  constructSnapshotReads,
  createReadConstructor,
} from "@triplex-build/triplex/runtime";
const symbol: unique symbol = Symbol("typedRead");
const table = { read: () => [] as const, [symbol]: () => [] as const };
const dispatch = constructReadDispatch(table, () => Effect.succeed([]));
const surface = constructReadSurface(table, (run, args) => run(...args));
const snapshotTable = {
  [symbol]: { run: () => Effect.succeed([]), basis: () => undefined, rawHistory: false },
  read: { run: () => Effect.succeed([]), basis: () => undefined, rawHistory: false },
};
const snapshot = createReadConstructor().snapshot(snapshotTable, { wrap: (e) => e });
type Assert<T extends true> = T;
type Equal<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
export type DispatchKeys = Assert<Equal<keyof typeof dispatch, keyof typeof table>>;
export type SurfaceKeys = Assert<Equal<keyof typeof surface, keyof typeof table>>;
export type SnapshotKeys = Assert<Equal<keyof typeof snapshot, keyof typeof snapshotTable>>;
// [EXP-P2Q] Why: numeric TypeScript keys become strings in JavaScript; reject that unsupported correspondence.
// Rejected: accepting a number key while asserting identical runtime and public type keys.
// @ts-expect-error numeric keys cannot retain their type identity
constructReadDispatch({ 1: () => [] }, () => Effect.void);
// @ts-expect-error numeric keys cannot retain their type identity
constructReadSurface({ 1: () => [] }, () => Effect.void);
// @ts-expect-error numeric keys cannot retain their type identity
constructSnapshotReads({ 1: snapshotTable.read }, { wrap: (e) => e });

const broad: Record<string, () => readonly []> = {};
// @ts-expect-error an unbounded key set cannot be equated with finite runtime own keys
constructReadDispatch(broad, () => Effect.void);
