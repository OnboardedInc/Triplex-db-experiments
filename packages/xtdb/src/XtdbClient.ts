import postgres from "postgres";

import { jsonParameterProblem } from "./codecs.js";

export interface XtdbBasis {
  readonly snapshotToken?: string;
  readonly clockTime?: string;
  readonly awaitToken?: string;
}

export interface XtdbQueryOptions {
  readonly signal?: AbortSignal;
  readonly timeoutMs?: number;
  /** Native statements already use $n. Never rewrite XTQL symbols or quoted text. */
  readonly parameterSyntax?: "postgresql";
}

export interface XtdbStatement {
  readonly sql: string;
  readonly params?: readonly unknown[];
  readonly parameterSyntax?: "postgresql";
}

export interface XtdbClient {
  query<T extends Record<string, unknown> = Record<string, unknown>>(
    sql: string,
    params?: readonly unknown[],
    basis?: XtdbBasis,
    options?: XtdbQueryOptions,
  ): Promise<T[]>;
  submit(statements: readonly XtdbStatement[]): Promise<unknown>;
  close(): Promise<void>;
}

/** A synchronous processing failure is a known rejection, unlike transport loss. */
export class XtdbTransactionRejected extends Error {
  constructor(readonly detail: unknown) {
    super(
      `XTDB rejected transaction: ${detail instanceof Error ? detail.message : String(detail)}`,
    );
  }
}

/** Convert SQL placeholders without rewriting quoted text or SQL comments. */
export const postgresPlaceholders = (sql: string): string => {
  let output = "";
  let quoted: "'" | '"' | null = null;
  let lineComment = false;
  let blockComment = false;
  let parameter = 0;
  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i]!;
    const next = sql[i + 1];
    if (lineComment) {
      output += ch;
      if (ch === "\n") lineComment = false;
    } else if (blockComment) {
      output += ch;
      if (ch === "*" && next === "/") {
        output += next;
        i++;
        blockComment = false;
      }
    } else if (quoted !== null) {
      output += ch;
      if (ch === quoted) {
        if (next === quoted) {
          output += next;
          i++;
        } else quoted = null;
      }
    } else if (ch === "-" && next === "-") {
      output += "--";
      i++;
      lineComment = true;
    } else if (ch === "/" && next === "*") {
      output += "/*";
      i++;
      blockComment = true;
    } else if (ch === "'" || ch === '"') {
      quoted = ch;
      output += ch;
    } else output += ch === "?" ? `$${++parameter}` : ch;
  }
  return output;
};

const literal = (input: string) => `'${input.replaceAll("'", "''")}'`;

/** Bound the caller's wait including pool acquisition, not backend execution. */
const withDeadline = async <A>(
  work: (signal: AbortSignal) => Promise<A>,
  options?: XtdbQueryOptions,
): Promise<A> => {
  const controller = new AbortController();
  const signal =
    options?.signal === undefined
      ? controller.signal
      : AbortSignal.any([controller.signal, options.signal]);
  signal.throwIfAborted();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let handler: (() => void) | undefined;
  try {
    const interrupted = new Promise<never>((_resolve, reject) => {
      handler = () => reject(signal.reason ?? new Error("XTDB operation canceled"));
      signal.addEventListener("abort", handler, { once: true });
    });
    if (options?.timeoutMs !== undefined)
      timer = setTimeout(
        () => controller.abort(new Error("XTDB operation deadline exceeded")),
        options.timeoutMs,
      );
    return await Promise.race([work(signal), interrupted]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
    if (handler !== undefined) signal.removeEventListener("abort", handler);
  }
};

export const makeXtdbClient = (
  url: string,
  options: {
    readonly maxConnections?: number;
    readonly connectTimeoutSeconds?: number;
    readonly transactionTimeoutMs?: number;
  } = {},
): XtdbClient => {
  const pool = postgres(url, {
    max: options.maxConnections ?? 20,
    prepare: false,
    connect_timeout: options.connectTimeoutSeconds ?? 10,
    onnotice: () => {},
  });
  let latestAwaitToken: string | undefined;
  const parameters = (values: readonly unknown[]) =>
    values.map((value) => {
      // PostgreSQL text is UTF-8. Node's encoder silently replaces isolated
      // UTF-16 surrogates, so reject them before any transaction submission.
      if (typeof value === "string" && !value.isWellFormed())
        throw new TypeError(
          "XTDB text requires well-formed Unicode; isolated UTF-16 surrogates are not representable",
        );
      // The native-f64-parameters-v1 public probe observed -0 returning as the
      // integer text "0" in SQL and XTQL, while native double literals retained
      // their sign. Number.isSafeInteger(-0) is true, and ordinary numeric text
      // serialization also prints "0": preserve both float8 type and spelling.
      // See experiments/native-f64-parameters.ts and ECMAScript SameValue:
      // https://tc39.es/ecma262/#sec-samevalue
      const negativeZero = typeof value === "number" && Object.is(value, -0);
      const oid =
        value === null
          ? 0
          : typeof value === "string"
            ? 25
            : typeof value === "boolean"
              ? 16
              : typeof value === "bigint"
                ? 20
                : typeof value === "number"
                  ? Number.isSafeInteger(value) && !negativeZero
                    ? 20
                    : 701
                  : 114;
      // [EXP-F02b] RULINGS Q30c / EXP-F02 finding 2: a JSON parameter would turn -0 into 0 and
      // cannot carry a bigint; refuse it here, before submission, rather than send a changed value.
      if (oid === 114) {
        const problem = jsonParameterProblem(value);
        if (problem !== undefined)
          throw new TypeError(`XTDB JSON parameter cannot be sent exactly: ${problem}`);
      }
      return pool.typed(
        negativeZero ? "-0.0" : typeof value === "bigint" ? value.toString() : value,
        oid,
      );
    });

  return {
    async query<T extends Record<string, unknown>>(
      sql: string,
      params: readonly unknown[] = [],
      basis?: XtdbBasis,
      queryOptions?: XtdbQueryOptions,
    ): Promise<T[]> {
      return withDeadline(async (signal) => {
        signal.throwIfAborted();
        const connection = await pool.reserve();
        let pending: ReturnType<typeof connection.unsafe> | undefined;
        let deferredRelease = false;
        let timeout: ReturnType<typeof setTimeout> | undefined;
        let abortHandler: (() => void) | undefined;
        try {
          signal.throwIfAborted();
          const awaitToken = basis?.awaitToken ?? latestAwaitToken;
          if (awaitToken !== undefined)
            await connection.unsafe(`SET AWAIT_TOKEN = ${literal(awaitToken)}`);
          const settings: string[] = [];
          if (basis?.snapshotToken !== undefined)
            settings.push(`SNAPSHOT_TOKEN = ${literal(basis.snapshotToken)}`);
          if (basis?.clockTime !== undefined)
            settings.push(`CLOCK_TIME = TIMESTAMP WITH TIME ZONE ${literal(basis.clockTime)}`);
          signal.throwIfAborted();
          pending = connection.unsafe(
            `${settings.length ? `SETTING ${settings.join(", ")} ` : ""}${queryOptions?.parameterSyntax === "postgresql" ? sql : postgresPlaceholders(sql)}`,
            parameters(params),
          );
          const query = pending;
          const cancellation = new Promise<never>((_resolve, reject) => {
            abortHandler = () => {
              // This requests protocol cancellation. Backend termination must be
              // independently observed; a rejected client wait is not evidence.
              void Promise.resolve(query.cancel()).catch(() => {});
              reject(signal.reason ?? new Error("XTDB query deadline exceeded"));
            };
            signal.addEventListener("abort", abortHandler, { once: true });
          });
          try {
            return Array.from(await Promise.race([query, cancellation])) as T[];
          } catch (error) {
            // Never hand a connection with still-running server work to a new
            // caller. Release only after the actual driver query settles.
            deferredRelease = true;
            void Promise.resolve(query).then(
              () => connection.release(),
              () => connection.release(),
            );
            throw error;
          }
        } finally {
          if (timeout !== undefined) clearTimeout(timeout);
          if (abortHandler !== undefined) signal.removeEventListener("abort", abortHandler);
          if (!deferredRelease) connection.release();
        }
      }, queryOptions);
    },
    async submit(statements) {
      return withDeadline(
        async (signal) => {
          const connection = await pool.reserve();
          let committing = false;
          const run = async (
            sql: string,
            params: readonly unknown[] = [],
            parameterSyntax?: "postgresql",
          ) => {
            signal.throwIfAborted();
            const pending = connection.unsafe(
              parameterSyntax === "postgresql" ? sql : postgresPlaceholders(sql),
              parameters(params),
            );
            const cancel = () => {
              void Promise.resolve(pending.cancel()).catch(() => {});
            };
            signal.addEventListener("abort", cancel, { once: true });
            try {
              return await pending;
            } finally {
              signal.removeEventListener("abort", cancel);
            }
          };
          try {
            await run("BEGIN READ WRITE");
            for (const statement of statements) {
              await run(statement.sql, statement.params, statement.parameterSyntax);
            }
            signal.throwIfAborted();
            committing = true;
            await run("COMMIT SYNC");
            const tokens = await run("SHOW AWAIT_TOKEN");
            const token = tokens[0] === undefined ? undefined : Object.values(tokens[0])[0];
            if (typeof token === "string") latestAwaitToken = token;
            return { awaitToken: latestAwaitToken };
          } catch (error) {
            try {
              await connection.unsafe("ROLLBACK");
            } catch {
              /* transport may be gone */
            }
            // P0004 is the observed, definitive XTDB ASSERT processing failure.
            // Other COMMIT errors (including an indexing wait timeout) may follow
            // successful submission and must remain indeterminate until resolved.
            if (
              !committing ||
              (error instanceof Error && "code" in error && error.code === "P0004")
            ) {
              throw new XtdbTransactionRejected(error);
            }
            throw error;
          } finally {
            connection.release();
          }
        },
        { timeoutMs: options.transactionTimeoutMs ?? 30_000 },
      );
    },
    async close() {
      await pool.end({ timeout: 5 });
    },
  };
};
