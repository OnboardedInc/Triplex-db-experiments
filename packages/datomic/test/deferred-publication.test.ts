import { expect, it } from "vitest";
import { DeferredPublications } from "../../../lab/bench/lib/deferred-publication.ts";

const key = { source: "source", stream: "stream", epoch: "0", position: "1" };
const tick = () => new Promise<void>((resolve) => setImmediate(resolve));

// [DX-T1-5] Why: acknowledgement releases a bound capture; drain must prove every expected witness persisted.
// Rejected: timing a fake fast ACK while silently dropping or re-timestamping failed evidence writes.
it("holds a capture until completion, persists it once and drains all remaining captures", async () => {
  const token = {},
    calls: unknown[] = [];
  const record = { ...key, publicationId: "op", recordId: "a".repeat(64), atNs: "1" };
  const queue = new DeferredPublications(
    {
      capture: (k, id) => {
        expect(k).toEqual(key);
        expect(id).toBe("op");
        return token;
      },
      persistCaptured: (t) => {
        calls.push(t);
        return record;
      },
    },
    () => ({ ...record }),
  );
  queue.capture(key, "op", "b".repeat(32), true);
  await tick();
  expect(calls).toEqual([]);
  queue.release(key);
  expect(calls).toEqual([]);
  const result = await queue.flush();
  expect(calls).toEqual([token]);
  expect(result).toMatchObject({ captured: 1, persisted: 1, pending: 0 });
  queue.capture(key, "op", null, true);
  expect(() => queue.capture(key, "other", null, true)).toThrow("identity");
  expect((await queue.flush()).persisted).toBe(1);
});

it("refuses failed or foreign witness results at the final validity boundary", async () => {
  for (const corrupt of [false, true]) {
    const queue = new DeferredPublications(
      {
        capture: () => ({}),
        persistCaptured: () => {
          if (!corrupt) throw Error("disk refused");
          return {
            ...key,
            source: "foreign",
            publicationId: "op",
            recordId: "a".repeat(64),
            atNs: "1",
          };
        },
      },
      () => undefined,
    );
    queue.capture(key, "op", null, false);
    await expect(queue.flush()).rejects.toThrow(corrupt ? "binding" : "disk refused");
  }
});

it("rejects a persistence scheduled before the measured completion boundary", async () => {
  const record = { ...key, publicationId: "op", recordId: "a".repeat(64), atNs: "1" };
  const queue = new DeferredPublications(
    { capture: () => ({}), persistCaptured: () => record },
    () => record,
  );
  queue.capture(key, "op", null, true);
  queue.release(key, Date.now() + 1000000);
  await expect(queue.flush()).rejects.toThrow("before measured completion");
});

// [DX-T1-9] Why: final validity waits for worker persistence and independent readback, including asynchronous failure.
// Rejected: counting a queued message as a durable witness or swallowing a worker's rejected write.
it("drains asynchronous persistence and refuses an asynchronous storage failure", async () => {
  let resolve!: (value: any) => void;
  const record = { ...key, publicationId: "op", recordId: "a".repeat(64), atNs: "1" };
  let stored: unknown;
  const pending = new Promise<any>((r) => {
    resolve = r;
  });
  const queue = new DeferredPublications(
    { capture: () => ({}), persistCaptured: () => pending },
    () => stored,
  );
  queue.capture(key, "op", null, false);
  let complete = false;
  const flush = queue.flush().then((value) => {
    complete = true;
    return value;
  });
  await tick();
  expect(complete).toBe(false);
  stored = record;
  resolve(record);
  expect(await flush).toMatchObject({ captured: 1, persisted: 1, pending: 0 });
  const bad = new DeferredPublications(
    {
      capture: () => ({}),
      persistCaptured: async () => {
        throw Error("worker storage failed");
      },
    },
    () => undefined,
  );
  bad.capture(key, "op", null, false);
  await expect(bad.flush()).rejects.toThrow("worker storage failed");
});
