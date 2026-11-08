// [EXP-P2Q] Why: outages after the gate must keep basis context; query errors must remain distinct.
// Rejected: probe-only tests (they never exercise the failing answer-request boundary).
import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { TypeExpr } from "@triplex-build/triplex/config";
import { DatabaseScope } from "@triplex-build/triplex/runtime";
import { makeQleverClient, QleverHttpError } from "../src/QleverClient.js";
import { makeQleverQueryExecutor } from "../src/QleverQueryExecutor.js";
import type { QleverQueryOptions } from "../src/QleverQueryExecutor.js";
import type { ReplicaSnapshot } from "../src/broker/broker.js";
import { BasisNotAvailable, ReplicaUnavailable } from "../src/broker/errors.js";
import { makeQleverNativeQueries } from "../src/native/NativeQueries.js";

const snapshot: ReplicaSnapshot = {
  basis: 1024,
  marker: { position: 2048, epoch: 1, incarnation: "answer-errors" },
  fencedIncarnation: "answer-errors",
  surface: "datalog",
  started: 0,
};
const gate: NonNullable<QleverQueryOptions["resolveBasis"]> = Object.assign(async () => snapshot, {
  inTransaction: async () => snapshot,
  after: async () => {},
});
const failure = <A>(effect: Effect.Effect<A, unknown>) =>
  Effect.runPromise(
    Effect.match(effect, {
      onFailure: (error) => error,
      onSuccess: () => {
        throw new Error("Expected failure");
      },
    }),
  );
const read = (surface: "native" | "datalog", cause: Error, broker = true) => {
  const client = {
    ...makeQleverClient("http://127.0.0.1:7070"),
    query: async (query: string) => {
      if (query.startsWith("SELECT ?position"))
        return [
          {
            position: { type: "literal", value: "2048" },
            incarnation: { type: "literal", value: "answer-errors" },
          },
        ];
      throw cause;
    },
  };
  if (surface === "native")
    return failure(
      makeQleverNativeQueries(
        client,
        DatabaseScope.test("answer-errors"),
        broker ? { awaitBasisMs: 1 } : {},
      ).select(
        { name: "answer-errors", parameters: TypeExpr.any, row: TypeExpr.any },
        {},
        () => "SELECT ?s WHERE { ?s ?p ?o }",
        { basis: { recordedPosition: 1024 } },
      ),
    );
  return failure(
    makeQleverQueryExecutor(client, "answer-errors", broker ? { resolveBasis: gate } : {}).execute(
      { find: ["?v"], where: [["subject", ":value", "?v"]] },
      false,
      { validAt: 0, recordedPosition: 1024 },
    ),
  );
};

describe.each(["native", "datalog"] as const)("%s broker answer errors", (surface) => {
  it.each([new Error("ECONNRESET after basis probe"), new QleverHttpError(503, "unavailable")])(
    "classifies transport/5xx failures with the requested and observed basis",
    async (cause) => {
      const error = await read(surface, cause);
      expect(error).toBeInstanceOf(ReplicaUnavailable);
      expect(error).toMatchObject({
        reason: "replica-unreachable",
        required: 1024,
        observed: 2048,
        replica: "the QLever replica",
        surface,
        cause,
      });
    },
  );
  it("keeps query rejection distinct, even when its text mentions a connection", async () => {
    const cause = new QleverHttpError(400, "invalid connection query");
    const error = await read(surface, cause);
    expect(error).not.toBeInstanceOf(ReplicaUnavailable);
    expect(error).toMatchObject({ _tag: "ReadError", cause });
  });
  it("preserves an existing basis-not-reached failure", async () => {
    const cause = new BasisNotAvailable({
      required: 1024,
      observed: 0,
      replica: "test",
      surface,
      waitedMs: 1,
    });
    expect(await read(surface, cause)).toBe(cause);
  });
  it("preserves A0 transport failure wrapping", async () => {
    const cause = new Error("ECONNRESET after basis probe");
    const error = await read(surface, cause, false);
    expect(error).not.toBeInstanceOf(ReplicaUnavailable);
    expect(error).toMatchObject({ _tag: "ReadError", cause });
  });
});
