// [EXP-P2Q] Why: transport classification must depend on request identities, including real abort/timeouts.
// Rejected: reproducing these errors with prose-only mocks (the removed heuristic would pass them).
import http from "node:http";
import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { TypeExpr } from "@triplex-build/triplex/config";
import { DatabaseScope } from "@triplex-build/triplex/runtime";
import {
  makeQleverClient,
  QleverHttpError,
  QleverRequestError,
  QleverDecodeError,
} from "../src/QleverClient.js";
import { makeFreshConnectionClient } from "../src/broker/http.js";
import { BasisNotAvailable, isUnreachable } from "../src/broker/errors.js";
import { makeQleverNativeQueries } from "../src/native/NativeQueries.js";
import { makeQleverQueryExecutor } from "../src/QleverQueryExecutor.js";

const wrap = (cause: unknown) => new TypeError("fetch failed", { cause });
const coded = (cause?: unknown) =>
  Object.assign(new Error("opaque", { cause }), { code: "ECONNRESET" });

describe("structured transport identity", () => {
  it.each([
    "connection",
    "ECONNRESET",
    "fetch failed",
    "deadline",
    "aborted",
    "timeout",
    "socket hang up",
    "terminated",
  ])("never uses message text: %s", (message) => {
    expect(isUnreachable(new Error(message))).toBe(false);
    expect(isUnreachable(new TypeError(message))).toBe(false);
    expect(isUnreachable(wrap(new SyntaxError(message)))).toBe(false);
  });
  it.each([0, 1, 8, 30])(
    "keeps protected failures distinct at depth %i after a positive transport code",
    (depth) => {
      for (const leaf of [
        new SyntaxError("opaque"),
        new QleverDecodeError("opaque"),
        new QleverHttpError(400, "opaque"),
        new BasisNotAvailable({
          required: 4,
          observed: 2,
          replica: "test",
          surface: "native",
          waitedMs: 1,
        }),
      ]) {
        let error: unknown = leaf;
        for (let i = 0; i < depth; i++) error = wrap(error);
        expect(isUnreachable(coded(error))).toBe(false);
      }
    },
  );
  it("requires exact codes or real exception identities", () => {
    expect(isUnreachable({ code: "prefix_ECONNRESET_suffix" })).toBe(false);
    expect(isUnreachable({ name: "AbortError", message: "aborted" })).toBe(false);
    expect(isUnreachable(new DOMException("opaque", "AbortError"))).toBe(true);
    expect(isUnreachable(new DOMException("opaque", "TimeoutError"))).toBe(true);
    expect(isUnreachable(new QleverRequestError("timeout"))).toBe(true);
    expect(isUnreachable(new QleverRequestError("aborted", new Error("opaque reason")))).toBe(true);
  });
});

describe.each([makeQleverClient, makeFreshConnectionClient])(
  "real request abort/timeout",
  (maker) => {
    it.each(["timeout", "abort"])(
      "recognizes %s without relying on the reason's prose",
      async (kind) => {
        const server = http.createServer((_req, res) => {
          res.writeHead(200);
          res.flushHeaders();
        });
        await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
        const url = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
        const client = maker(url);
        const controller = new AbortController();
        const reason = new Error("opaque caller reason");
        const timer =
          kind === "abort" ? setTimeout(() => controller.abort(reason), 100) : undefined;
        try {
          const error = await client
            .query("SELECT ?s WHERE { ?s ?p ?o }", {
              timeoutMs: kind === "timeout" ? 100 : 5000,
              ...(kind === "abort" ? { signal: controller.signal } : {}),
            })
            .then(
              () => {
                throw new Error("expected failure");
              },
              (cause: unknown) => cause,
            );
          expect(isUnreachable(error)).toBe(true);
          expect(error).toBeInstanceOf(QleverRequestError);
          expect(error).toMatchObject({ kind: kind === "timeout" ? "timeout" : "aborted" });
        } finally {
          clearTimeout(timer);
          await client.close();
          server.closeAllConnections();
          await new Promise<void>((resolve) => server.close(() => resolve()));
        }
      },
    );
  },
);

it.each(["native", "datalog"])(
  "%s preserves a nested decode failure after a transport-coded wrapper",
  async (surface) => {
    const cause = coded(wrap(new QleverDecodeError("connection field")));
    const client = {
      ...makeQleverClient("http://127.0.0.1:7070"),
      query: async (sparql: string) => {
        if (sparql.startsWith("SELECT ?position"))
          return [{ position: { type: "literal", value: "2048" } }];
        throw cause;
      },
    };
    const snapshot = {
      basis: 1024,
      marker: { position: 2048, epoch: 1, incarnation: "test" },
      fencedIncarnation: "test",
      surface: "datalog" as const,
      started: 0,
    };
    const gate = Object.assign(async () => snapshot, {
      inTransaction: async () => snapshot,
      after: async () => {},
    });
    const effect =
      surface === "native"
        ? makeQleverNativeQueries(client, DatabaseScope.test("decode"), { awaitBasisMs: 1 }).select(
            { name: "decode", parameters: TypeExpr.any, row: TypeExpr.any },
            {},
            () => "SELECT ?s WHERE { ?s ?p ?o }",
          )
        : makeQleverQueryExecutor(client, "decode", { resolveBasis: gate }).execute({
            find: ["?v"],
            where: [["s", ":v", "?v"]],
          });
    const error = await Effect.runPromise(
      Effect.match(effect as Effect.Effect<unknown, unknown>, {
        onFailure: (e) => e,
        onSuccess: () => {
          throw new Error("expected failure");
        },
      }),
    );
    expect(error).toMatchObject({ _tag: "ReadError", cause });
    expect((error as { reason?: unknown }).reason).not.toBe("replica-unreachable");
  },
);
