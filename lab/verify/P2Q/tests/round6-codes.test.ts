// [EXP-P2Q] Why: enumerate the audited table through real exported clients at direct/nested socket error depths.
// Rejected: testing table membership alone (does not prove client propagation and basis-aware errors).
// [CX-VP2Q-4-R6] Why: independently verify structured identities, every bounded depth and message non-observation.
// Rejected: equating a passing socket example with coverage of the clients' OS transport errors.
import http from "node:http";
import net from "node:net";
import util from "node:util";
import { Effect } from "effect";
import { describe, expect, it, vi } from "vitest";
import { DatabaseScope } from "@triplex-build/triplex/runtime";
import { TypeExpr } from "@triplex-build/triplex/config";
import { makeQleverClient } from "../../../../packages/qlever/src/QleverClient.js";
import { makeFreshConnectionClient } from "../../../../packages/qlever/src/broker/http.js";
import { makeQleverNativeQueries } from "../../../../packages/qlever/src/native/NativeQueries.js";
import { makeQleverQueryExecutor } from "../../../../packages/qlever/src/QleverQueryExecutor.js";
import { QLEVER_ERROR_CODE_TABLE } from "../../../../packages/qlever/src/broker/transport-codes.js";
import { writeJson } from "./harness.js";

const coded = (code: string, cause?: unknown) =>
  Object.assign(new Error("opaque", { cause }), { code });
const failed = (effect: any): Promise<any> =>
  Effect.runPromise(
    Effect.match(effect, {
      onFailure: (error) => error,
      onSuccess: () => {
        throw new Error("expected failure");
      },
    }),
  );
const read = (surface: string, query: (sparql: string, opts?: any) => Promise<any>) => {
  const client = {
    ...makeQleverClient("http://127.0.0.1:7070"),
    query: (sparql: string, opts?: any) =>
      sparql.startsWith("SELECT ?position")
        ? Promise.resolve([
            {
              position: { type: "literal", value: "2048" },
              incarnation: { type: "literal", value: "round6" },
            },
          ])
        : query(sparql, opts),
  };
  if (surface === "native")
    return failed(
      makeQleverNativeQueries(client, DatabaseScope.test("round6"), {
        awaitBasisMs: 50,
        defaultTimeoutMs: 2000,
      }).select(
        { name: "round6", parameters: TypeExpr.any, row: TypeExpr.any },
        {},
        () => "SELECT ?s WHERE { ?s ?p ?o }",
        { basis: { recordedPosition: 1024 } },
      ),
    );
  const snapshot = {
    basis: 1024,
    marker: { position: 2048, epoch: 1, incarnation: "round6" },
    fencedIncarnation: "round6",
    surface: "datalog",
    started: performance.now(),
  };
  const gate = Object.assign(async () => snapshot, {
    inTransaction: async () => snapshot,
    after: async () => {},
  });
  return failed(
    makeQleverQueryExecutor(client, "round6", {
      resolveBasis: gate,
      timeoutMs: 2000,
      nativeTimeoutMs: 2000,
    }).execute({ find: ["?v"], where: [["s:round6", ":v/f0", "?v"]] }, false, {
      validAt: 0,
      recordedPosition: 1024,
    }),
  );
};

// [CX-VP2Q-4-R6] Why: exercise the real clients' socket-error propagation without changing host networking.
// Rejected: generating an outage by stopping a shared engine (unrelated clients would be affected).
describe("round6 real exported clients propagate missing OS transport codes", () => {
  const matrix = QLEVER_ERROR_CODE_TABLE.filter((row) => row.transport).flatMap(
    ({ code, transport }) =>
      [0, 1].flatMap((depth) =>
        ["standard", "fresh"].flatMap((kind) =>
          ["native", "datalog"].map((surface) => ({ code, transport, depth, kind, surface })),
        ),
      ),
  );
  it.each(matrix)(
    "$kind $surface $code depth=$depth",
    async ({ code, transport, depth, kind, surface }) => {
      const server = http.createServer((_req, _res) => {});
      await new Promise<void>((resolve, reject) => {
        server.once("error", reject);
        server.listen(0, "127.0.0.1", resolve);
      });
      const url = `http://127.0.0.1:${(server.address() as any).port}`;
      const factory = kind === "standard" ? makeQleverClient : makeFreshConnectionClient;
      const client = factory(url);
      const original = net.Socket.prototype.connect;
      let injected = 0;
      const mock = vi.spyOn(net.Socket.prototype, "connect").mockImplementation(function (
        this: net.Socket,
        ...args: any[]
      ): net.Socket {
        const connected = (original as any).apply(this, args);
        // [EXP-P2Q] Why: Undici retries pre-request UND_ERR_SOCKET; establish a running request first.
        // Rejected: repeated pre-connect injection (it tests the client's retry loop and can exhaust memory).
        if (injected === 0) {
          injected++;
          const cause = depth === 0 ? coded(code) : new TypeError("opaque", { cause: coded(code) });
          this.once("connect", () => setImmediate(() => this.destroy(cause)));
        }
        return connected;
      } as any);
      try {
        const error = await read(surface, (sparql, options) => client.query(sparql, options));
        const chain: any[] = [];
        let current = error;
        for (let i = 0; current && i < 8; i++, current = current.cause)
          chain.push({
            name: current.name,
            code: current.code ?? null,
            message: current.message,
            reason: current.reason ?? null,
          });
        const uv = [...util.getSystemErrorMap()].find(([, value]) => value[0] === code);
        writeJson(`round6-table-${kind}-${surface}-${code}-${depth}.json`, {
          code,
          transport,
          depth,
          kind,
          surface,
          endpoint: url,
          injected,
          uv,
          injection:
            "one synthetic code after connection establishment with the response held open; no OS network outage induced",
          chain,
        });
        expect(injected).toBeGreaterThan(0);
        expect(chain.some((cause) => cause.code === code)).toBe(true);
        if (transport)
          expect(error).toMatchObject({
            reason: "replica-unreachable",
            required: 1024,
            observed: 2048,
            replica: "the QLever replica",
            surface,
          });
        else expect(error.reason).not.toBe("replica-unreachable");
      } finally {
        mock.mockRestore();
        await client.close();
        server.closeAllConnections();
        await new Promise<void>((resolve) => server.close(() => resolve()));
      }
    },
  );
});
