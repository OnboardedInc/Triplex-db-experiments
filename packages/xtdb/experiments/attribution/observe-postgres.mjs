/** Experimental observation of the pinned postgres3.4.9 objects, never SQL evaluation. */
import { createHash } from "node:crypto";

const digest = (value) => createHash("sha256").update(value).digest("hex");
const bits = (value) => {
  const buffer = new ArrayBuffer(8);
  new DataView(buffer).setFloat64(0, value, false);
  return Buffer.from(buffer).toString("hex");
};
export const describeParameter = (value, oid) => ({
  oid,
  ...(value === null
    ? { kind: "null" }
    : typeof value === "number"
      ? { kind: "number", binary64: bits(value), negativeZero: Object.is(value, -0) }
      : typeof value === "string"
        ? { kind: "string", utf8Bytes: Buffer.byteLength(value), sha256: digest(value) }
        : typeof value === "bigint"
          ? { kind: "bigint", decimal: value.toString() }
          : typeof value === "boolean"
            ? { kind: "boolean", value }
            : { kind: typeof value, inspected: false }),
});
export const safeErrorInfo = (error) => {
  try {
    const knownNames = new Set([
      "Error",
      "TypeError",
      "RangeError",
      "SyntaxError",
      "ReferenceError",
      "AbortError",
      "TimeoutError",
      "PostgresError",
      "AggregateError",
    ]);
    const message = String(error?.message ?? error);
    const code =
      typeof error?.code === "string" && /^[0-9A-Z]{5}$/.test(error.code) ? error.code : undefined;
    return {
      name: knownNames.has(error?.name) ? error.name : "OtherError",
      ...(code === undefined ? {} : { sqlState: code }),
      messageSha256: digest(message),
      messageUtf8Bytes: Buffer.byteLength(message),
    };
  } catch {
    return { name: "UninspectableError" };
  }
};
export const statementKind = (sql) => {
  const text = String(sql).trim();
  if (/^SET AWAIT_TOKEN\b/i.test(text)) return "await-token-setting";
  if (/^COMMIT SYNC\b/i.test(text)) return "commit-sync-composite";
  if (/^BEGIN\b/i.test(text)) return "begin";
  if (/^SHOW AWAIT_TOKEN\b/i.test(text)) return "await-token-result";
  if (/^ROLLBACK\b/i.test(text)) return "rollback";
  if (/^ASSERT\b/i.test(text)) return "assert";
  if (/^CREATE TABLE\b/i.test(text)) return "initialization";
  if (/^INSERT INTO tx_assertions\b/i.test(text)) return "assertion-insert";
  if (/^INSERT INTO\b/i.test(text)) return "metadata-insert";
  if (/^SELECT position FROM tx_meta\b/i.test(text)) return "basis-select";
  if (/^SELECT tx_id FROM tx_claims\b/i.test(text)) return "claim-select";
  if (/^SELECT operation_id FROM tx_attempts\b/i.test(text)) return "operation-receipt-select";
  if (/^SELECT 1 AS present\b/i.test(text)) return "integer-presence-select";
  if (/^SELECT .* FROM tx_assertions\b/is.test(text) && /\bid = \$\d+\b/.test(text))
    return "identity-lookup-select";
  if (/^SELECT\b/i.test(text)) return "answer-or-other-select";
  return "other";
};

export function makePostgresObserver({ emit, onFailure = () => {} }) {
  let poolSequence = 0,
    leaseSequence = 0,
    querySequence = 0,
    observerErrors = 0;
  const pools = new WeakMap(),
    leases = new WeakMap(),
    queries = new WeakSet();
  const openPools = new Set(),
    activeLeases = new Set(),
    unsettled = new Set();
  const counts = { issued: 0, dispatched: 0, fulfilled: 0, rejected: 0, cancelRequests: 0 };
  const fail = (error) => {
    observerErrors++;
    try {
      onFailure(error);
    } catch {
      /* Observation must not replace a driver outcome. */
    }
  };
  const record = (event) => {
    try {
      emit({ ...event, atProcessMonotonicMs: performance.now() });
    } catch (error) {
      fail(error);
    }
  };
  const replace = (object, key, value) => {
    const descriptor = Object.getOwnPropertyDescriptor(object, key);
    Object.defineProperty(object, key, {
      configurable: true,
      enumerable: descriptor?.enumerable ?? false,
      writable: true,
      value,
    });
  };
  const observeNativePromise = (promise, fulfilled, rejected) => {
    // reserve/end are eager native async promises in the pinned driver. Return
    // their ORIGINAL promise; this reaction only observes/wraps the resolved lease.
    const reaction = Promise.prototype.then.call(
      promise,
      (value) => {
        try {
          fulfilled(value);
        } catch (error) {
          fail(error);
        }
      },
      (error) => {
        try {
          rejected(error);
        } catch (failure) {
          fail(failure);
        }
      },
    );
    void reaction.catch(fail);
    return promise;
  };
  const observeQuery = (query, context) => {
    if (queries.has(query)) return query;
    queries.add(query);
    const queryId = ++querySequence;
    counts.issued++;
    unsettled.add(queryId);
    const issuedAt = performance.now();
    record({ type: "query-issued", queryId, ...context });
    try {
      // postgres3.4.9 Query.handle() invokes handler lazily after the APP calls
      // then/catch/finally/execute. Its own resolve/reject closures receive driver
      // settlement. Hook those callbacks: never observe by calling query.then(),
      // never return a replacement promise, and leave all lazy methods untouched.
      // https://raw.githubusercontent.com/porsager/postgres/v3.4.9/src/query.js
      if (
        !["handler", "resolve", "reject", "cancel"].every(
          (name) => typeof query[name] === "function",
        )
      )
        throw new TypeError("Unsupported pinned PostgreSQL Query shape");
      const handler = query.handler,
        resolve = query.resolve,
        reject = query.reject,
        cancel = query.cancel;
      let dispatchedAt,
        settled = false;
      replace(
        query,
        "handler",
        new Proxy(handler, {
          apply(target, receiver, argumentsList) {
            dispatchedAt = performance.now();
            counts.dispatched++;
            record({
              type: "query-handler-dispatch",
              queryId,
              poolId: context.poolId,
              leaseId: context.leaseId,
              afterIssueMs: dispatchedAt - issuedAt,
            });
            return Reflect.apply(target, receiver, argumentsList);
          },
        }),
      );
      const settle = (status, value) => {
        if (settled) return;
        settled = true;
        unsettled.delete(queryId);
        counts[status]++;
        const now = performance.now();
        record({
          type: "query-driver-settlement",
          queryId,
          poolId: context.poolId,
          leaseId: context.leaseId,
          status,
          afterIssueMs: now - issuedAt,
          ...(dispatchedAt === undefined ? {} : { afterHandlerDispatchMs: now - dispatchedAt }),
          ...(status === "rejected"
            ? { error: safeErrorInfo(value) }
            : { resultRowCount: Array.isArray(value) ? value.length : null }),
        });
      };
      replace(query, "resolve", function (...args) {
        settle("fulfilled", args[0]);
        return Reflect.apply(resolve, this, args);
      });
      replace(query, "reject", function (...args) {
        settle("rejected", args[0]);
        return Reflect.apply(reject, this, args);
      });
      replace(query, "cancel", function (...args) {
        counts.cancelRequests++;
        record({
          type: "query-cancel-request",
          queryId,
          poolId: context.poolId,
          leaseId: context.leaseId,
        });
        return Reflect.apply(cancel, this, args);
      });
    } catch (error) {
      fail(error);
    }
    return query;
  };
  const observeLease = (lease, poolId, leaseId, typedParameters) => {
    let context = leases.get(lease);
    if (!context) {
      context = { poolId, leaseId };
      leases.set(lease, context);
      const unsafe = lease.unsafe,
        release = lease.release;
      if (typeof unsafe !== "function" || typeof release !== "function")
        throw new TypeError("Unsupported reserved SQL shape");
      replace(lease, "unsafe", function (...args) {
        const sql = String(args[0]);
        const parameters = Array.isArray(args[1])
          ? args[1].map((value) => typedParameters.get(value) ?? { kind: "untracked-parameter" })
          : [];
        const kind = statementKind(sql);
        const details = {
          poolId: context.poolId,
          leaseId: context.leaseId,
          kind,
          sqlSha256: digest(sql),
          sql: kind === "await-token-setting" ? "SET AWAIT_TOKEN = <redacted>" : sql,
          parameters,
        };
        let pending;
        try {
          pending = Reflect.apply(unsafe, this, args);
        } catch (error) {
          record({ type: "unsafe-synchronous-error", ...details, error: safeErrorInfo(error) });
          throw error;
        }
        return observeQuery(pending, details);
      });
      replace(lease, "release", function (...args) {
        try {
          const result = Reflect.apply(release, this, args);
          activeLeases.delete(context.leaseId);
          record({ type: "lease-release", poolId: context.poolId, leaseId: context.leaseId });
          return result;
        } catch (error) {
          record({
            type: "lease-release-error",
            poolId: context.poolId,
            leaseId: context.leaseId,
            error: safeErrorInfo(error),
          });
          throw error;
        }
      });
    } else {
      if (activeLeases.has(context.leaseId))
        throw new TypeError("One reserved SQL object reused while active");
      context.poolId = poolId;
      context.leaseId = leaseId;
    }
    activeLeases.add(leaseId);
    return lease;
  };
  const observePool = (pool, options) => {
    if (pools.has(pool)) return pool;
    const poolId = ++poolSequence;
    pools.set(pool, poolId);
    openPools.add(poolId);
    const typedParameters = new WeakMap();
    const reserve = pool.reserve,
      typed = pool.typed,
      end = pool.end;
    record({ type: "pool-created", poolId, maximumConnections: options?.max ?? null });
    replace(pool, "typed", function (...args) {
      const parameter = Reflect.apply(typed, this, args);
      if (parameter !== null && ["object", "function"].includes(typeof parameter))
        typedParameters.set(parameter, describeParameter(args[0], args[1]));
      return parameter;
    });
    replace(pool, "reserve", function (...args) {
      const leaseId = ++leaseSequence,
        began = performance.now();
      record({ type: "reserve-start", poolId, leaseId });
      let promise;
      try {
        promise = Reflect.apply(reserve, this, args);
      } catch (error) {
        record({ type: "reserve-error", poolId, leaseId, error: safeErrorInfo(error) });
        throw error;
      }
      return observeNativePromise(
        promise,
        (lease) => {
          observeLease(lease, poolId, leaseId, typedParameters);
          record({ type: "reserve-fulfilled", poolId, leaseId, waitMs: performance.now() - began });
        },
        (error) =>
          record({
            type: "reserve-error",
            poolId,
            leaseId,
            waitMs: performance.now() - began,
            error: safeErrorInfo(error),
          }),
      );
    });
    replace(pool, "end", function (...args) {
      record({ type: "pool-end-start", poolId });
      const promise = Reflect.apply(end, this, args);
      return observeNativePromise(
        promise,
        () => {
          openPools.delete(poolId);
          record({ type: "pool-end-fulfilled", poolId });
        },
        (error) => record({ type: "pool-end-error", poolId, error: safeErrorInfo(error) }),
      );
    });
    return pool;
  };
  return {
    wrapFactory: (factory) =>
      new Proxy(factory, {
        apply(target, receiver, args) {
          return observePool(Reflect.apply(target, receiver, args), args[1]);
        },
      }),
    snapshot: () => ({
      pools: poolSequence,
      openPools: openPools.size,
      leases: leaseSequence,
      unreleasedLeases: activeLeases.size,
      queries: { ...counts },
      unsettledQueries: unsettled.size,
      observerErrors,
    }),
  };
}
