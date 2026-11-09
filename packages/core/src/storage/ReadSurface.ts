import { Effect } from "effect";
import type { ReadError } from "../errors/index.js";
import type { ResolvedTemporalBasis } from "../Temporal.js";

export interface SnapshotReadPolicy {
  readonly wrap: <A, E, R>(
    effect: Effect.Effect<A, E, R>,
    basis?: ResolvedTemporalBasis,
    rawHistory?: boolean,
  ) => Effect.Effect<A, E | ReadError, R>;
}

const wrapped = new WeakSet<Function>();
export const isConstructedRead = (value: unknown): boolean =>
  typeof value === "function" && wrapped.has(value);

type Operation = (...args: any[]) => any;

// [EXP-P2Q] Why: the table is the only source of public read functions; no inherited callable can escape construction.
// Rejected: enumerating interface AST members (heritage and merged declarations are invisible to that guard).
export const constructReadSurface = <const T extends Record<string, Operation>>(
  operations: T,
  invoke: (operation: Operation, args: any[], name: keyof T) => any,
): T => {
  const surface = Object.create(null);
  for (const name of Object.keys(operations)) {
    const operation = operations[name]!;
    const call = (...args: any[]) => invoke(operation, args, name);
    wrapped.add(call);
    Object.defineProperty(surface, name, { value: call, enumerable: true });
  }
  return Object.freeze(surface) as T;
};

// [EXP-P2Q] Why: resolved keyof includes inherited and declaration-merged methods, and excludes extra runtime methods.
// Rejected: structural assignment alone (allows additional properties from spreads and inherited implementations).
export const exactReadService =
  <Public>() =>
  <const Actual extends Public>(
    service: Actual & Record<Exclude<keyof Actual, keyof Public>, never>,
  ): Actual =>
    Object.freeze(Object.assign(Object.create(null), service)) as Actual;

// [EXP-P2Q] Why: query facade tables translate arguments only; the sole answering continuation owns the policies.
// Rejected: accepting arbitrary answering effects in those tables (could skip the native/Datalog basis gate).
export const constructReadDispatch = <
  const T extends Record<string, (...args: any[]) => readonly any[]>,
  R,
>(
  operations: T,
  run: (...args: any[]) => R,
): { readonly [K in keyof T]: (...args: Parameters<T[K]>) => R } =>
  constructReadSurface(operations, (operation, args) => run(...operation(...args))) as unknown as {
    readonly [K in keyof T]: (...args: Parameters<T[K]>) => R;
  };

interface SnapshotOperation {
  readonly run: (...args: any[]) => Effect.Effect<any, any, any>;
  readonly basis: (...args: any[]) => ResolvedTemporalBasis | undefined;
  readonly rawHistory: boolean;
}

// [EXP-P2Q] Why: new repository operations must declare their cut and history semantics in the same table as execution.
// Rejected: a second list of basis selectors (new operations could silently default to the current cut).
export const constructSnapshotReads = <const T extends Record<string, SnapshotOperation>>(
  operations: T,
  policy: SnapshotReadPolicy,
): { readonly [K in keyof T]: T[K]["run"] } => {
  const dispatch = Object.fromEntries(
    Object.entries(operations).map(([name, operation]) => [
      name,
      (...args: any[]) =>
        policy.wrap(
          Effect.suspend(() => operation.run(...args)),
          operation.basis(...args),
          operation.rawHistory,
        ),
    ]),
  );
  return constructReadSurface(dispatch, (operation, args) => operation(...args)) as {
    readonly [K in keyof T]: T[K]["run"];
  };
};
