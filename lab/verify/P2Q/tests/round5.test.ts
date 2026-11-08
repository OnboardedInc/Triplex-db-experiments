// [CX-VP2Q-5] Why: test semantic distinctions and bounded traversal independently of builder examples.
// Rejected: testing only the four original socket shapes (cannot expose false outage classifications).
import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { TypeExpr } from "@triplex-build/triplex/config";
import { DatabaseScope, ReadError } from "@triplex-build/triplex/runtime";
import { makeQleverClient, QleverHttpError } from "../../../../packages/qlever/src/QleverClient.js";
import { makeQleverNativeQueries } from "../../../../packages/qlever/src/native/NativeQueries.js";
import { makeQleverQueryExecutor } from "../../../../packages/qlever/src/QleverQueryExecutor.js";
import { BasisNotAvailable, ReplicaUnavailable, isUnreachable } from "../../../../packages/qlever/src/broker/errors.js";
import { writeJson } from "./harness.js";

const socket = () => Object.assign(new Error("other side closed"), { code: "UND_ERR_SOCKET" });
const wrap = (cause: unknown) => new TypeError("terminated", { cause });
const nested = (count: number, leaf: unknown) => {
  let root = leaf;
  for (let i = 0; i < count; i++) root = wrap(root);
  return root;
};
const selfCycle = () => { const e = wrap(undefined); e.cause = e; return e; };
const twoCycle = (transport: boolean) => {
  const a = wrap(undefined), b = transport ? socket() : wrap(undefined);
  a.cause = b; Object.assign(b, { cause: a }); return a;
};
const http400 = () => Object.assign(new QleverHttpError(400, "invalid connection query"), { cause: socket() });
const basis = () => new BasisNotAvailable({ required: 4096, observed: 2048, replica: "test", surface: "native", waitedMs: 1, cause: socket() });
const cases: { name: string; make: () => any; unreachable: boolean; boundary?: string }[] = [
  { name: "node32-socket", make: () => nested(31, socket()), unreachable: true },
  { name: "node33-socket", make: () => nested(32, socket()), unreachable: false, boundary: "beyond documented bound" },
  { name: "node10001-socket", make: () => nested(10000, socket()), unreachable: false, boundary: "beyond documented bound" },
  { name: "self-cycle", make: selfCycle, unreachable: false },
  { name: "two-cycle", make: () => twoCycle(false), unreachable: false },
  { name: "cycle-with-socket", make: () => twoCycle(true), unreachable: true },
  { name: "aggregate-errors-only", make: () => new AggregateError([socket()], "all candidates failed"), unreachable: false, boundary: ".errors is not a cause edge" },
  { name: "aggregate-with-cause", make: () => new AggregateError([new Error("detail")], "all candidates failed", { cause: socket() }), unreachable: true },
  // [EXP-P2Q] Why: the round-five structured-only rule supersedes the old fetch-failed prose expectation.
  // Rejected: accepting this wrapper as transport (neither cause node carries transport identity).
  { name: "aggregate-fetch-wrapper", make: () => new TypeError("fetch failed", { cause: new AggregateError([socket()], "all candidates failed") }), unreachable: false, boundary: "message text is no longer transport identity; .errors is not a cause edge" },
  { name: "aggregate-mixed", make: () => new AggregateError([http400(), socket()], "all candidates failed"), unreachable: false, boundary: "mixed errors have no unambiguous single transport cause" },
  { name: "abort-default", make: () => new DOMException("This operation was aborted", "AbortError"), unreachable: true },
  { name: "timeout-default", make: () => new DOMException("The operation was aborted due to timeout", "TimeoutError"), unreachable: true },
  { name: "timeout-structured", make: () => wrap(Object.assign(new Error("elapsed"), { code: "UND_ERR_BODY_TIMEOUT" })), unreachable: true },
  { name: "abort-nested", make: () => wrap(new DOMException("This operation was aborted", "AbortError")), unreachable: true },
  { name: "type-no-cause", make: () => new TypeError("terminated"), unreachable: false },
  { name: "type-decode-no-cause", make: () => new TypeError("Cannot decode the connection field"), unreachable: false },
  { name: "nested-json-decode", make: () => wrap(new SyntaxError("Invalid JSON in connection field")), unreachable: false },
  { name: "ordinary-json-decode", make: () => wrap(new SyntaxError("Invalid JSON")), unreachable: false },
  { name: "select-decode", make: () => new TypeError("QLever did not return a SPARQL SELECT result"), unreachable: false },
  { name: "wrapped-http400", make: () => wrap(http400()), unreachable: false },
  { name: "wrapped-http503", make: () => wrap(new QleverHttpError(503, "unavailable")), unreachable: true },
  { name: "typed-basis", make: basis, unreachable: false },
  { name: "wrapped-basis", make: () => wrap(basis()), unreachable: false },
];
const failure = (effect: any): Promise<any> => Effect.runPromise(Effect.match(effect, {
  onFailure: (error) => error,
  onSuccess: () => { throw new Error("expected failure"); },
}));
const read = (surface: string, cause: any) => {
  const client = {
    ...makeQleverClient("http://127.0.0.1:7070"),
    query: async (sparql: string) => {
      if (sparql.startsWith("SELECT ?position")) return [{ position: { type: "literal", value: "2048" }, incarnation: { type: "literal", value: "round5" } }];
      throw cause;
    },
  };
  if (surface === "native") return failure(makeQleverNativeQueries(client, DatabaseScope.test("round5"), { awaitBasisMs: 50 }).select(
    { name: "round5", parameters: TypeExpr.any, row: TypeExpr.any }, {}, () => "SELECT ?s WHERE { ?s ?p ?o }", { basis: { recordedPosition: 1024 } },
  ));
  const snapshot = { basis: 1024, marker: { position: 2048, epoch: 1, incarnation: "round5" }, fencedIncarnation: "round5", surface: "datalog", started: performance.now() };
  const gate = Object.assign(async () => snapshot, { inTransaction: async () => snapshot, after: async () => {} });
  return failure(makeQleverQueryExecutor(client, "round5", { resolveBasis: gate }).execute({ find: ["?v"], where: [["s:round5", ":v/f0", "?v"]] }, false, { validAt: 0, recordedPosition: 1024 }));
};

describe("round5 independent cause-walk variations", () => {
  it.each(cases)("predicate $name", ({ name, make, unreachable, boundary }) => {
    const cause = make();
    const start = performance.now();
    const observed = isUnreachable(cause);
    writeJson(`round5-predicate-${name}.json`, { expected: unreachable, observed, elapsedMs: performance.now() - start, boundary, name: cause.name, message: cause.message });
    expect(observed).toBe(unreachable);
  });
  describe.each(["native", "datalog"])("%s answer boundary", (surface) => {
    it.each(cases)("$name", async ({ name, make, unreachable, boundary }) => {
      const cause = make();
      const error = await read(surface, cause);
      writeJson(`round5-${surface}-${name}.json`, { expectedUnreachable: unreachable, boundary, error: { tag: error._tag, reason: error.reason ?? null, message: error.message, required: error.required ?? null, observed: error.observed ?? null, replica: error.replica ?? null }, preservesCause: error === cause || error.cause === cause });
      expect(error).toBeInstanceOf(ReadError);
      if (unreachable) {
        expect(error).toBeInstanceOf(ReplicaUnavailable);
        expect(error).toMatchObject({ reason: "replica-unreachable", required: 1024, observed: 2048, replica: "the QLever replica", surface });
        expect(error.cause).toBe(cause);
      } else {
        expect(error).not.toBeInstanceOf(ReplicaUnavailable);
        if (cause instanceof BasisNotAvailable) expect(error).toBe(cause);
        else expect(error.cause).toBe(cause);
      }
    });
  });
  it("reads at most 32 cause properties in a long chain", () => {
    let reads = 0;
    let error: any = socket();
    for (let i = 0; i < 1000; i++) {
      const child = error;
      error = { name: "TypeError", message: "terminated", get cause() { reads++; return child; } };
    }
    expect(isUnreachable(error)).toBe(false);
    writeJson("round5-cause-access-bound.json", { reads });
    expect(reads).toBe(32);
  });
});
