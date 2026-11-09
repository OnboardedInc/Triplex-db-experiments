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

type Operation = (...args: any[]) => any;

// [EXP-P2Q] Why: the table is the only source of public read functions; no inherited callable can escape construction.
// Rejected: enumerating interface AST members (heritage and merged declarations are invisible to that guard).
const buildReadSurface = <const T extends Record<PropertyKey, Operation>>(
  operations: T,
  invoke: (operation: Operation, args: any[], name: keyof T) => any,
): T => {
  const surface = Object.create(null);
  for (const [name, operation] of operationEntries(operations)) {
    const call = (...args: any[]) => invoke(operation, args, name);
    Object.defineProperty(surface, name, { value: call, enumerable: true });
  }
  return Object.freeze(surface) as T;
};

export const constructReadSurface = <const T extends Record<PropertyKey, Operation>>(
  operations: T & SupportedTableKeys<T>,
  invoke: (operation: Operation, args: any[], name: keyof T) => any,
): T => buildReadSurface(operations, invoke);

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
  const T extends Record<PropertyKey, (...args: any[]) => readonly any[]>,
  R,
>(
  operations: T & SupportedTableKeys<T>,
  run: (...args: any[]) => R,
): { readonly [K in keyof T]: (...args: Parameters<T[K]>) => R } =>
  buildReadSurface(operations, (operation, args) => run(...operation(...args))) as unknown as {
    readonly [K in keyof T]: (...args: Parameters<T[K]>) => R;
  };

interface SnapshotOperation {
  readonly run: (...args: any[]) => Effect.Effect<any, any, any>;
  readonly basis: (...args: any[]) => ResolvedTemporalBasis | undefined;
  readonly rawHistory: boolean;
}

type PolicyRead<F extends SnapshotOperation["run"]> = (
  ...args: Parameters<F>
) => Effect.Effect<
  Effect.Success<ReturnType<F>>,
  Effect.Error<ReturnType<F>> | ReadError,
  Effect.Services<ReturnType<F>>
>;

// [EXP-P2Q] Why: new repository operations must declare their cut and history semantics in the same table as execution.
// Rejected: a second list of basis selectors (new operations could silently default to the current cut).
export const constructSnapshotReads = <const T extends Record<PropertyKey, SnapshotOperation>>(
  operations: T & SupportedTableKeys<T>,
  policy: SnapshotReadPolicy,
): { readonly [K in keyof T]: PolicyRead<T[K]["run"]> } => {
  const dispatch: Record<PropertyKey, Operation> = Object.create(null);
  const applyPolicy = policy.wrap.bind(policy);
  for (const [key, operation] of operationEntries(operations, false)) {
    const { run, basis, rawHistory } = operation as SnapshotOperation;
    if (typeof run !== "function" || typeof basis !== "function" || typeof rawHistory !== "boolean")
      throw new TypeError("Invalid snapshot operation");
    dispatch[key] = (...args: any[]) =>
      applyPolicy(
        Effect.suspend(() => run(...args)),
        basis(...args),
        rawHistory,
      );
  }

  return buildReadSurface(dispatch, (operation, args) => operation(...args)) as {
    readonly [K in keyof T]: PolicyRead<T[K]["run"]>;
  };
};

type SupportedTableKeys<T> = string extends keyof T
  ? never
  : symbol extends keyof T
    ? never
    : Extract<keyof T, number> extends never
      ? unknown
      : never;

// [EXP-P2Q] Why: keyof includes symbols and hidden own entries; inherited/accessor tables cannot preserve that correspondence.
// Rejected: Object.entries (silently omits symbol and non-enumerable operations).
const operationEntries = (
  table: object,
  callable = true,
): readonly (readonly [PropertyKey, any])[] => {
  const prototype = Object.getPrototypeOf(table);
  if (prototype !== null && prototype !== Object.prototype)
    throw new TypeError("Inherited operation table");
  return Reflect.ownKeys(table).map((key) => {
    if (typeof key === "string" && String(Number(key)) === key)
      throw new TypeError("Numeric operation key");
    const descriptor = Object.getOwnPropertyDescriptor(table, key)!;
    if (!("value" in descriptor) || (callable && typeof descriptor.value !== "function"))
      throw new TypeError("Operation must be an own data property");
    return [key, descriptor.value] as const;
  });
};

// [EXP-P2Q] Why: only this service's private wrapper can mint its provenance; another constructor's function proves nothing here.
// Rejected: one global WeakSet shared by generic continuations (the round-ten native symbol probe borrowed that identity).
export const createReadConstructor = () => {
  const wrapped = new WeakSet<Function>();
  const protect = <T extends Record<PropertyKey, Operation>>(surface: T): T => {
    const result = buildReadSurface(surface, (operation, args) => operation(...args));
    for (const key of Reflect.ownKeys(result)) wrapped.add(result[key]!);
    return result;
  };
  return Object.freeze({
    isRead: (value: unknown): boolean => typeof value === "function" && wrapped.has(value),
    snapshot: <const T extends Record<PropertyKey, SnapshotOperation>>(
      table: T & SupportedTableKeys<T>,
      policy: SnapshotReadPolicy,
    ) => protect(constructSnapshotReads<T>(table, policy)),
    dispatch: <const T extends Record<PropertyKey, (...args: any[]) => readonly any[]>, R>(
      table: T & SupportedTableKeys<T>,
      run: (...args: any[]) => R,
    ) => protect(constructReadDispatch<T, R>(table, run)),
  });
};
