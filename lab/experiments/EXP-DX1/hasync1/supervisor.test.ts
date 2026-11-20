import test from "node:test";
import assert from "node:assert/strict";
import { Supervisor, type Port } from "./supervisor.ts";

function fixture(overrides: Partial<Port> = {}) {
  const calls: string[] = [];
  const expected = { cluster: "1", epoch: "current", primary: "pg-a", transactor: "datomic-a" };
  const port: Port = {
    identity: { timeline: 1, ...expected },
    seal: () => calls.push("seal"),
    drain: async () => {
      calls.push("drain");
    },
    primary: async () => ({ sync: true, flush: "0/04", waitingMs: 0 }),
    candidate: async () => ({ cluster: "1", timeline: 1, receive: "0/06", replay: "0/06" }),
    fence: async () => {
      calls.push("fence");
      return { proof: { ...expected, method: "startup-latch-and-stop" }, finalFlush: "0/05" };
    },
    promote: async () => {
      calls.push("promote");
      return 2;
    },
    activate: async () => {
      calls.push("activate");
    },
    publish: () => calls.push("publish"),
    observe: () => {},
    ...overrides,
  };
  return { calls, port, run: new Supervisor(port, "0/03") };
}

test("planned move seals, finishes the prefix, then changes writer once", async () => {
  const { calls, run } = fixture();
  await run.run("planned", "two-copy");
  assert.deepEqual(calls, ["seal", "drain", "fence", "promote", "activate", "publish"]);
  await assert.rejects(run.run("planned", "two-copy"), /one promotion/i);
});

test("health failures alone never authorize promotion", async () => {
  const { calls, run } = fixture({
    primary: async () => undefined,
    fence: async () => {
      throw Error("fencing authority unreachable");
    },
  });
  await assert.rejects(
    run.run("fault", "single-copy-after-fence"),
    /fencing authority unreachable/,
  );
  assert.deepEqual(calls, ["seal"]);
});

test("rejects a mismatched fence and a wrong survivor", async () => {
  const stale = fixture({
    fence: async () => ({
      proof: {
        cluster: "1",
        epoch: "previous",
        primary: "pg-a",
        transactor: "datomic-a",
        method: "startup-latch-and-stop",
      },
      finalFlush: "0/05",
    }),
  });
  await assert.rejects(stale.run.run("planned", "two-copy"), /different owner/);
  assert.deepEqual(stale.calls, ["seal", "drain"]);
  const wrong = fixture({
    candidate: async () => ({ cluster: "2", timeline: 1, receive: "0/06", replay: "0/06" }),
  });
  await assert.rejects(wrong.run.run("planned", "two-copy"), /wrong standby cluster/i);
  assert.deepEqual(wrong.calls, []);
});

test("a failed two-copy policy leaves ingress sealed", async () => {
  const { calls, run } = fixture({
    activate: async () => {
      throw Error("replacement unavailable");
    },
  });
  await assert.rejects(run.run("planned", "two-copy"), /replacement unavailable/);
  assert.deepEqual(calls, ["seal", "drain", "fence", "promote"]);
});
