import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import path from "node:path";
import { test } from "node:test";
import { pathToFileURL } from "node:url";
import { makePostgresObserver, safeErrorInfo } from "./observe-postgres.mjs";

const require = createRequire(new URL("../../package.json", import.meta.url));
const queryModule = path.resolve(path.dirname(require.resolve("postgres")), "../../src/query.js");
// Use the REAL pinned lazy Query class without a connection or backend. A plain
// eager Promise fake would miss the exact observation hazard under review.
const { Query } = await import(pathToFileURL(queryModule).href);
const fixture = (options = {}) => {
  const events = [],
    failures = [],
    calls = [],
    originals = [];
  const observer = makePostgresObserver({
    emit: options.emit ?? ((event) => events.push(event)),
    onFailure: (error) => failures.push(error),
  });
  let handlers = 0,
    cancels = 0,
    originalReserve;
  const pool = {
    typed(value, type) {
      return { value, type };
    },
    reserve() {
      originalReserve = (async () => {
        if (options.reserveError) throw options.reserveError;
        const connection = {
          unsafe(...args) {
            calls.push({ receiver: this, args });
            if (options.unsafeError) throw options.unsafeError;
            const handler = (query) => {
              handlers++;
              if (options.rejectError) query.reject(options.rejectError);
              else if (!options.pending) query.resolve([{ value: "unit" }]);
            };
            handler.debug = false;
            const query = new Query(args[0], args[1], handler, (pending) => {
              cancels++;
              pending.reject(options.cancelError ?? new Error("unit cancel"));
            });
            originals.push({
              query,
              then: query.then,
              catch: query.catch,
              finally: query.finally,
              handler,
              connection,
            });
            return query;
          },
          release() {
            if (options.releaseError) throw options.releaseError;
            return "released";
          },
        };
        return connection;
      })();
      return originalReserve;
    },
    async end() {
      if (options.endError) throw options.endError;
      return "ended";
    },
  };
  const factory = function (...args) {
    calls.push({ factoryReceiver: this, factoryArgs: args });
    return pool;
  };
  factory.marker = { original: true };
  const wrappedFactory = observer.wrapFactory(factory);
  const actualPool = wrappedFactory("postgresql://redacted-component-only", { max: 20 });
  return {
    observer,
    wrappedFactory,
    factory,
    actualPool,
    pool,
    events,
    failures,
    calls,
    originals,
    get handlers() {
      return handlers;
    },
    get cancels() {
      return cancels;
    },
    get originalReserve() {
      return originalReserve;
    },
  };
};

test("preserves pool, reserve promise, typed objects and the original lazy pending query", async () => {
  const f = fixture();
  assert.equal(f.actualPool, f.pool);
  assert.equal(f.wrappedFactory.marker, f.factory.marker);
  const reservation = f.pool.reserve();
  assert.equal(reservation, f.originalReserve);
  const lease = await reservation;
  const negativeZero = f.pool.typed(-0, 701),
    exact = f.pool.typed(9223372036854775807n, 20);
  const parameters = [negativeZero, exact];
  const pending = lease.unsafe("SELECT $1 AS value", parameters);
  const original = f.originals[0];
  assert.equal(pending, original.query);
  assert.equal(pending.then, original.then);
  assert.equal(pending.catch, original.catch);
  assert.equal(pending.finally, original.finally);
  assert.equal(pending.handler.debug, original.handler.debug);
  assert.equal(pending.executed, false);
  assert.equal(f.handlers, 0);
  await Promise.resolve();
  assert.equal(
    f.handlers,
    0,
    "Observation must not eagerly start the query even after a microtask",
  );
  assert.equal(f.calls.at(-1).args[1], parameters);
  assert.equal(f.calls.at(-1).args[1][0], negativeZero);
  assert(Object.is(negativeZero.value, -0));
  assert.equal(exact.value, 9223372036854775807n);
  assert.deepEqual(await pending, [{ value: "unit" }]);
  assert.equal(f.handlers, 1);
  assert.equal(lease.release(), "released");
  assert.equal(await f.pool.end(), "ended");
  const issued = f.events.find((event) => event.type === "query-issued");
  assert.equal(issued.parameters[0].binary64, "8000000000000000");
  assert.equal(issued.parameters[1].decimal, "9223372036854775807");
  assert.deepEqual(f.observer.snapshot(), {
    pools: 1,
    openPools: 0,
    leases: 1,
    unreleasedLeases: 0,
    queries: { issued: 1, dispatched: 1, fulfilled: 1, rejected: 0, cancelRequests: 0 },
    unsettledQueries: 0,
    observerErrors: 0,
  });
});

test("preserves lazy rejection and the exact original error object", async () => {
  const error = new Error("actual driver rejection");
  const f = fixture({ rejectError: error });
  const lease = await f.pool.reserve();
  const pending = lease.unsafe("SELECT 1", []);
  assert.equal(f.handlers, 0);
  await assert.rejects(pending, (actual) => actual === error);
  assert.equal(f.observer.snapshot().queries.rejected, 1);
  lease.release();
  await f.pool.end();
  assert.equal(f.failures.length, 0);
});

test("preserves cancellation return/target and observes actual driver settlement", async () => {
  const error = new Error("original cancellation");
  const f = fixture({ pending: true, cancelError: error });
  const lease = await f.pool.reserve();
  const pending = lease.unsafe("SELECT 1", []);
  const rejection = assert.rejects(pending, (actual) => actual === error);
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(f.handlers, 1);
  assert.equal(pending.cancel(), null);
  await rejection;
  assert.equal(f.cancels, 1);
  assert.equal(pending.cancel(), null);
  assert.equal(f.cancels, 1);
  assert.equal(f.observer.snapshot().queries.cancelRequests, 2);
  assert.equal(f.observer.snapshot().queries.rejected, 1);
  lease.release();
  await f.pool.end();
});

test("preserves reserve, unsafe, release and end failures instead of wrapping them", async () => {
  for (const kind of ["reserveError", "unsafeError", "releaseError", "endError"]) {
    const error = new Error(kind),
      f = fixture({ [kind]: error });
    if (kind === "reserveError")
      await assert.rejects(f.pool.reserve(), (actual) => actual === error);
    else {
      const lease = await f.pool.reserve();
      if (kind === "unsafeError")
        assert.throws(
          () => lease.unsafe("SELECT 1", []),
          (actual) => actual === error,
        );
      if (kind === "releaseError")
        assert.throws(
          () => lease.release(),
          (actual) => actual === error,
        );
      else lease.release();
      if (kind === "endError") await assert.rejects(f.pool.end(), (actual) => actual === error);
      else await f.pool.end();
    }
    assert.equal(f.failures.length, 0, "A real driver failure is not an observer failure");
  }
});

test("multiple consumers settle one unchanged pending query only once", async () => {
  const f = fixture();
  const lease = await f.pool.reserve();
  const pending = lease.unsafe("SELECT 1", []);
  const first = pending.then((value) => value),
    second = pending.then((value) => value);
  assert.deepEqual(await first, await second);
  assert.equal(f.handlers, 1);
  assert.equal(f.observer.snapshot().queries.fulfilled, 1);
  lease.release();
  await f.pool.end();
});

test("an observation sink failure cannot prevent a real query from settling or releasing", async () => {
  const f = fixture({
    emit: () => {
      throw new RangeError("bounded trace budget");
    },
  });
  const lease = await f.pool.reserve();
  const pending = lease.unsafe("SELECT 1", []);
  assert.equal(f.handlers, 0);
  assert.deepEqual(await pending, [{ value: "unit" }]);
  lease.release();
  await f.pool.end();
  assert(f.failures.length > 0);
  assert.equal(f.observer.snapshot().unsettledQueries, 0);
  assert.equal(f.observer.snapshot().unreleasedLeases, 0);
});

test("echoed SQL/tokens remain only in original errors across every driver error route", async () => {
  const sentinel = "SYNTHETIC_PRIVATE_AWAIT_SENTINEL_FOR_COMPONENT_TEST";
  for (const kind of ["rejectError", "unsafeError", "reserveError", "releaseError", "endError"]) {
    const error = new Error(`driver echoed SET AWAIT_TOKEN = '${sentinel}'`);
    error.name = "PostgresError";
    error.code = "P0004";
    const f = fixture({ [kind]: error });
    if (kind === "reserveError")
      await assert.rejects(f.pool.reserve(), (actual) => actual === error);
    else {
      const lease = await f.pool.reserve();
      if (kind === "unsafeError")
        assert.throws(
          () => lease.unsafe(`SET AWAIT_TOKEN = '${sentinel}'`, []),
          (actual) => actual === error,
        );
      else if (kind === "rejectError")
        await assert.rejects(
          lease.unsafe(`SET AWAIT_TOKEN = '${sentinel}'`, []),
          (actual) => actual === error,
        );
      else await lease.unsafe(`SET AWAIT_TOKEN = '${sentinel}'`, []);
      if (kind === "releaseError")
        assert.throws(
          () => lease.release(),
          (actual) => actual === error,
        );
      else lease.release();
      if (kind === "endError") await assert.rejects(f.pool.end(), (actual) => actual === error);
      else await f.pool.end();
    }
    const encoded = JSON.stringify(f.events);
    assert(!encoded.includes(sentinel), "A synthetic private token appeared in observer events");
    const descriptions = f.events.filter((event) => event.error).map((event) => event.error);
    assert(descriptions.length > 0);
    for (const description of descriptions) {
      assert.equal(description.name, "PostgresError");
      assert.equal(description.sqlState, "P0004");
      assert.equal(
        description.messageSha256,
        createHash("sha256").update(error.message).digest("hex"),
      );
      assert.equal(description.messageUtf8Bytes, Buffer.byteLength(error.message));
      assert(!Object.hasOwn(description, "message"));
    }
    assert(error.message.includes(sentinel), "Instrumentation mutated the real propagated error");
  }
});

test("safe observer-failure descriptions never copy arbitrary names, codes or message text", () => {
  const sentinel = "SYNTHETIC_PRIVATE_OBSERVER_FAILURE";
  const described = safeErrorInfo({ name: sentinel, code: sentinel, message: sentinel });
  assert.equal(described.name, "OtherError");
  assert(!Object.hasOwn(described, "sqlState"));
  assert(!JSON.stringify(described).includes(sentinel));
  assert.equal(described.messageSha256, createHash("sha256").update(sentinel).digest("hex"));
  assert.deepEqual(
    safeErrorInfo({
      get message() {
        throw new Error(sentinel);
      },
    }),
    { name: "UninspectableError" },
  );
});
