// [CX-VP2Q-4-R6] Why: independently verify structured identities, every bounded depth and message non-observation.
// Rejected: equating a passing socket example with coverage of the clients' OS transport errors.
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import net from "node:net";
import util from "node:util";
import { Effect } from "effect";
import ts from "typescript";
import { describe, expect, it, vi } from "vitest";
import { DatabaseScope } from "@triplex-build/triplex/runtime";
import { TypeExpr } from "@triplex-build/triplex/config";
import { makeQleverClient, QleverHttpError, QleverDecodeError } from "../../../../packages/qlever/src/QleverClient.js";
import { makeFreshConnectionClient } from "../../../../packages/qlever/src/broker/http.js";
import { makeQleverNativeQueries } from "../../../../packages/qlever/src/native/NativeQueries.js";
import { makeQleverQueryExecutor } from "../../../../packages/qlever/src/QleverQueryExecutor.js";
import { BasisNotAvailable, isUnreachable } from "../../../../packages/qlever/src/broker/errors.js";
import { REPO, writeJson } from "./harness.js";

const codes = ["ECONNREFUSED", "ECONNRESET", "ECONNABORTED", "EPIPE", "ETIMEDOUT", "EHOSTUNREACH", "ENETUNREACH", "ENOTFOUND", "EAI_AGAIN", "ABORT_ERR", "UND_ERR_SOCKET", "UND_ERR_CONNECT_TIMEOUT", "UND_ERR_HEADERS_TIMEOUT", "UND_ERR_BODY_TIMEOUT", "UND_ERR_ABORTED", "EHOSTDOWN", "ENETDOWN"];
const coded = (code: string, cause?: unknown) => Object.assign(new Error("opaque", { cause }), { code });
const nest = (depth: number, leaf: unknown): any => {
  let e = leaf;
  for (let i = 0; i < depth; i++) e = new TypeError("connection decode text is not identity", { cause: e });
  return e;
};
const failed = (effect: any): Promise<any> => Effect.runPromise(Effect.match(effect, {
  onFailure: (error) => error, onSuccess: () => { throw new Error("expected failure"); },
}));
const read = (surface: string, query: (sparql: string, opts?: any) => Promise<any>) => {
  const client = { ...makeQleverClient("http://127.0.0.1:7070"), query: (sparql: string, opts?: any) => sparql.startsWith("SELECT ?position")
    ? Promise.resolve([{ position: { type: "literal", value: "2048" }, incarnation: { type: "literal", value: "round6" } }]) : query(sparql, opts) };
  if (surface === "native") return failed(makeQleverNativeQueries(client, DatabaseScope.test("round6"), { awaitBasisMs: 50 }).select(
    { name: "round6", parameters: TypeExpr.any, row: TypeExpr.any }, {}, () => "SELECT ?s WHERE { ?s ?p ?o }", { basis: { recordedPosition: 1024 } },
  ));
  const snapshot = { basis: 1024, marker: { position: 2048, epoch: 1, incarnation: "round6" }, fencedIncarnation: "round6", surface: "datalog", started: performance.now() };
  const gate = Object.assign(async () => snapshot, { inTransaction: async () => snapshot, after: async () => {} });
  return failed(makeQleverQueryExecutor(client, "round6", { resolveBasis: gate }).execute({ find: ["?v"], where: [["s:round6", ":v/f0", "?v"]] }, false, { validAt: 0, recordedPosition: 1024 }));
};

describe("round6 structured transport and protected-depth matrix", () => {
  it.each(codes)("%s at every inspectable depth, predicate and both surfaces", async (code) => {
    const rows: any[] = [], mismatches: any[] = [];
    for (let depth = 0; depth < 32; depth++) {
      const cause = nest(depth, coded(code));
      const row: any = { depth, predicate: isUnreachable(cause), surfaces: {} };
      for (const surface of ["native", "datalog"]) {
        const error = await read(surface, async () => { throw cause; });
        row.surfaces[surface] = { reason: error.reason ?? null, required: error.required ?? null, observed: error.observed ?? null, replica: error.replica ?? null, preservesCause: error.cause === cause };
        if (error.reason !== "replica-unreachable" || error.required !== 1024 || error.observed !== 2048 || error.replica !== "the QLever replica" || error.cause !== cause) mismatches.push({ depth, surface, observed: row.surfaces[surface] });
      }
      if (!row.predicate) mismatches.push({ depth, surface: "predicate", observed: false });
      rows.push(row);
    }
    writeJson(`round6-depth-${code}.json`, { code, rows, mismatches });
    expect(mismatches).toEqual([]);
  });

  it("protected decode, HTTP 4xx and basis identities dominate codes at all inspected depths and fail closed beyond", async () => {
    const rows: any[] = [], mismatches: any[] = [];
    const factories = {
      syntax: () => new SyntaxError("opaque"),
      decode: () => new QleverDecodeError("opaque"),
      http400: () => new QleverHttpError(400, "opaque"),
      http401: () => new QleverHttpError(401, "opaque"),
      http404: () => new QleverHttpError(404, "opaque"),
      http429: () => new QleverHttpError(429, "opaque"),
      basis: () => new BasisNotAvailable({ required: 4096, observed: 2048, replica: "test", surface: "native", waitedMs: 1 }),
    };
    for (const [kind, factory] of Object.entries(factories)) for (const depth of [...Array.from({ length: 32 }, (_, i) => i), 32, 33, 64, 1000]) {
      const leaf: any = factory();
      leaf.cause = coded("ECONNRESET");
      const cause = depth === 0 ? Object.assign(leaf, { code: "ECONNRESET" }) : coded("ECONNRESET", nest(depth - 1, leaf));
      const row: any = { kind, depth, predicate: isUnreachable(cause), reasons: {} };
      if (row.predicate) mismatches.push({ kind, depth, surface: "predicate" });
      for (const surface of ["native", "datalog"]) {
        const error = await read(surface, async () => { throw cause; });
        row.reasons[surface] = error.reason ?? null;
        if (error.reason === "replica-unreachable") mismatches.push({ kind, depth, surface });
        if (kind === "basis" && depth === 0 && error !== cause) mismatches.push({ kind, depth, surface, identityLost: true });
      }
      rows.push(row);
    }
    writeJson("round6-protected-depths.json", { rows, mismatches });
    expect(mismatches).toEqual([]);
  });

  it("no classifier path observes message, stack or string conversion", () => {
    let reads = 0;
    const tripwire = () => { reads++; throw new Error("classifier read prose"); };
    const rows: any[] = [];
    for (let depth = 0; depth < 32; depth++) for (const transport of [false, true]) {
      let current: any = transport ? coded("UND_ERR_SOCKET") : new TypeError("opaque");
      for (let i = 0; i <= depth; i++) {
        Object.defineProperty(current, "message", { get: tripwire, configurable: true });
        Object.defineProperty(current, "stack", { get: tripwire, configurable: true });
        current.toString = tripwire;
        current[Symbol.toPrimitive] = tripwire;
        if (i < depth) current = new Error("opaque", { cause: current });
      }
      const observed = isUnreachable(current);
      rows.push({ depth, transport, observed });
      expect(observed).toBe(transport);
    }
    const source = fs.readFileSync(path.join(REPO, "packages/qlever/src/broker/errors.ts"), "utf8");
    const ast = ts.createSourceFile("errors.ts", source, ts.ScriptTarget.Latest, true);
    let classifier: ts.Node | undefined;
    const find = (node: ts.Node) => { if (ts.isVariableDeclaration(node) && node.name.getText(ast) === "isUnreachable") classifier = node.initializer; ts.forEachChild(node, find); };
    find(ast);
    if (!classifier) throw new Error("classifier not found");
    const properties = new Set<string>(), calls = new Set<string>();
    const scan = (node: ts.Node) => {
      if (ts.isPropertyAccessExpression(node)) properties.add(node.name.text);
      if (ts.isElementAccessExpression(node)) throw new Error("new computed access needs review");
      if (ts.isCallExpression(node)) calls.add(node.expression.getText(ast));
      ts.forEachChild(node, scan);
    };
    scan(classifier);
    writeJson("round6-no-message-observation.json", { reads, rows, properties: [...properties], calls: [...calls] });
    expect(reads).toBe(0);
    expect([...properties].sort()).toEqual(["add", "cause", "code", "has", "name", "status", "test"]);
    expect([...calls].every(call => call === "seen.has" || call === "seen.add" || call.endsWith(".test"))).toBe(true);
  });
});

// [CX-VP2Q-4-R6] Why: exercise the real clients' socket-error propagation without changing host networking.
// Rejected: generating an outage by stopping a shared engine (unrelated clients would be affected).
describe("round6 real exported clients propagate missing OS transport codes", () => {
  const matrix = ["EHOSTDOWN", "ENETDOWN"].flatMap(code => ["standard", "fresh"].flatMap(kind => ["native", "datalog"].map(surface => ({ code, kind, surface }))));
  it.each(matrix)("$kind $surface $code", async ({ code, kind, surface }) => {
    const server = http.createServer((_req, res) => res.end('{"results":{"bindings":[]}}'));
    await new Promise<void>((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
    const url = `http://127.0.0.1:${(server.address() as any).port}`;
    const factory = kind === "standard" ? makeQleverClient : makeFreshConnectionClient;
    const client = factory(url);
    const original = net.Socket.prototype.connect;
    let injected = 0;
    const mock = vi.spyOn(net.Socket.prototype, "connect").mockImplementation(function (this: net.Socket, ...args: any[]): net.Socket {
      const connected = (original as any).apply(this, args);
      injected++;
      queueMicrotask(() => this.destroy(coded(code)));
      return connected;
    } as any);
    try {
      const error = await read(surface, (sparql, options) => client.query(sparql, options));
      const chain: any[] = [];
      let current = error;
      for (let i = 0; current && i < 8; i++, current = current.cause) chain.push({ name: current.name, code: current.code ?? null, message: current.message, reason: current.reason ?? null });
      const uv = [...util.getSystemErrorMap()].find(([, value]) => value[0] === code);
      writeJson(`round6-client-${kind}-${surface}-${code}.json`, { code, kind, surface, endpoint: url, injected, uv, injection: "synthetic errno on the real client-owned net.Socket; no OS network outage induced", chain });
      expect(injected).toBeGreaterThan(0);
      expect(chain.some(cause => cause.code === code)).toBe(true);
      expect(error).toMatchObject({ reason: "replica-unreachable", required: 1024, observed: 2048, replica: "the QLever replica", surface });
    } finally {
      mock.mockRestore();
      await client.close();
      server.closeAllConnections();
      await new Promise<void>(resolve => server.close(() => resolve()));
    }
  });
});

it("round6 local Node socket path preserves errno identities", () => {
  const natives = (process as any).binding("natives");
  const source: string = natives._http_client;
  const start = source.indexOf("function socketErrorListener(err)");
  const end = source.indexOf("function socketOnEnd()", start);
  const snippet = source.slice(start, end);
  const undici: string = natives["internal/deps/undici/undici"];
  const codes = [...new Set(undici.match(/UND_ERR_[A-Z_]+/g))].sort();
  writeJson("round6-runtime-error-audit.json", { node: process.version, socketErrorListener: snippet, runtimeUndiciCodes: codes, systemNetworkErrors: [...util.getSystemErrorMap()].filter(([, value]) => /^(EHOSTDOWN|ENETDOWN|ENETUNREACH|EHOSTUNREACH|ECONNREFUSED|ECONNRESET)$/.test(value[0])) });
  expect(snippet).toContain("emitErrorEvent(req, err)");
});
