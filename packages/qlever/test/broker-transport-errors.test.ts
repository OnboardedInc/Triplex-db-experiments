// [EXP-P2Q] Why: client causes can wrap transport codes or contain cycles and excessive depth.
// Rejected: recognizing the outer word "terminated" (ordinary type/decode errors can use it).
import { describe, expect, it } from "vitest";
import { QleverHttpError } from "../src/QleverClient.js";
import { BasisNotAvailable, isUnreachable } from "../src/broker/errors.js";

const socket = () => Object.assign(new Error("other side closed"), { code: "UND_ERR_SOCKET" });
const wrap = (cause: unknown) => new TypeError("terminated", { cause });

describe("broker nested transport classification", () => {
  it.each([
    "UND_ERR_SOCKET",
    "UND_ERR_CONNECT_TIMEOUT",
    "UND_ERR_HEADERS_TIMEOUT",
    "UND_ERR_BODY_TIMEOUT",
    "ECONNRESET",
  ])("recognizes nested %s without changing the cause", (code) => {
    const cause = Object.assign(new Error("transport detail"), { code });
    const error = wrap(wrap(cause));
    expect(isUnreachable(error)).toBe(true);
    expect((error.cause as Error).cause).toBe(cause);
  });
  it.each([
    new TypeError("terminated"),
    new TypeError("arbitrary type error"),
    new SyntaxError("invalid JSON"),
    new TypeError("QLever did not return a SPARQL SELECT result"),
  ])("keeps ordinary errors distinct: %s", (error) => expect(isUnreachable(error)).toBe(false));
  it("stops at HTTP 4xx and typed basis failures despite transport-like causes", () => {
    const http = new QleverHttpError(400, "invalid connection query");
    Object.assign(http, { cause: socket() });
    const basis = new BasisNotAvailable({
      required: 4096,
      observed: 2048,
      replica: "test",
      surface: "native",
      waitedMs: 1,
      cause: socket(),
    });
    expect(isUnreachable(wrap(http))).toBe(false);
    expect(isUnreachable(wrap(basis))).toBe(false);
    expect(isUnreachable(wrap(new QleverHttpError(503, "unavailable")))).toBe(true);
  });
  it("terminates on cyclic cause chains", () => {
    const first = wrap(undefined),
      second = wrap(first);
    first.cause = second;
    expect(isUnreachable(first)).toBe(false);
    const transport = socket();
    Object.assign(transport, { cause: first });
    first.cause = transport;
    expect(isUnreachable(first)).toBe(true);
  });
  it("bounds long acyclic chains to 32 nodes", () => {
    let reachable: unknown = socket();
    for (let i = 0; i < 31; i++) reachable = wrap(reachable);
    expect(isUnreachable(reachable)).toBe(true);
    expect(isUnreachable(wrap(reachable))).toBe(false);
  });
});
