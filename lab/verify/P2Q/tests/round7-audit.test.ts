// [CX-VP2Q-4-R7] Why: compare decisions with independently read dependency classes and pinned primary docs.
// Rejected: a table enumerating itself as proof of source coverage.
import fs from "node:fs";
import path from "node:path";
import dns from "node:dns";
import { createHash } from "node:crypto";
import ts from "typescript";
import { expect, it } from "vitest";
import { QLEVER_ERROR_CODE_TABLE } from "../../../../packages/qlever/src/broker/transport-codes.js";
import { REPO, writeJson } from "./harness.js";
const hash = (text: string) => createHash("sha256").update(text).digest("hex");
const decisions = new Map<string, boolean>(QLEVER_ERROR_CODE_TABLE.map(row => [row.code, row.transport]));
const transportClasses = new Set(["ConnectTimeoutError", "HeadersTimeoutError", "BodyTimeoutError", "AbortError", "RequestAbortedError", "ClientDestroyedError", "ClientClosedError", "SocketError", "ResponseContentLengthMismatchError", "SecureProxyConnectionError", "ProxyConnectionError"]);
const parse = (source: string) => {
  const ast = ts.createSourceFile("errors.js", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  const rows: any[] = [];
  const walk = (node: ts.Node, className = "") => {
    if (ts.isVariableDeclaration(node) && node.initializer && ts.isClassExpression(node.initializer)) className = node.name.getText(ast);
    if (ts.isClassDeclaration(node) || ts.isClassExpression(node)) className = node.name?.text ?? className;
    if (ts.isBinaryExpression(node) && ts.isPropertyAccessExpression(node.left) && node.left.name.text === "code" && ts.isStringLiteral(node.right) && node.right.text.startsWith("UND_ERR")) rows.push({ className, code: node.right.text, expectedTransport: transportClasses.has(className), observed: decisions.get(node.right.text) });
    ts.forEachChild(node, child => walk(child, className));
  };
  walk(ast);
  return rows;
};
it("round7 independent installed and bundled Undici class audit", () => {
  const store = path.join(REPO, "node_modules/.pnpm");
  const modules = fs.readdirSync(store).filter(name => /^undici@\d/.test(name)).map(name => {
    const file = path.join(store, name, "node_modules/undici/lib/core/errors.js");
    const source = fs.readFileSync(file, "utf8");
    const docs = fs.readFileSync(path.join(store, name, "node_modules/undici/docs/docs/api/Errors.md"), "utf8");
    return { name, file, source, docs, sha256: hash(source), docsSha256: hash(docs), rows: parse(source) };
  });
  const bundle = (process as any).binding("natives")["internal/deps/undici/undici"] as string;
  const start = bundle.indexOf("// lib/core/errors.js");
  const end = bundle.indexOf("\n// lib/", start + 5);
  const source = bundle.slice(start, end);
  const bundled = { name: `Node ${process.version} / undici ${process.versions.undici}`, sha256: hash(source), rows: parse(source), literalCodes: [...new Set(source.match(/\bUND_ERR[A-Z_0-9]*\b/g))].sort() };
  const modulesReport = modules.map(({ source, docs, ...record }) => ({ ...record, docCodes: [...new Set(docs.match(/\bUND_ERR[A-Z_0-9]*\b/g))].sort() }));
  writeJson("round7-source-class-audit.json", { decisions: QLEVER_ERROR_CODE_TABLE.length, transport: QLEVER_ERROR_CODE_TABLE.filter(row => row.transport).length, nonTransport: QLEVER_ERROR_CODE_TABLE.filter(row => !row.transport).length, modules: modulesReport, bundled });
  expect(modules.length).toBe(3);
  for (const module of [...modules, bundled]) {
    expect(module.rows.length).toBeGreaterThan(15);
    for (const row of module.rows) expect(row.observed, `${module.name}: ${row.className} ${row.code}`).toBe(row.expectedTransport);
  }
  for (const module of modulesReport) for (const code of module.docCodes) expect(decisions.has(code), `${module.name} docs ${code}`).toBe(true);
  for (const code of bundled.literalCodes) expect(decisions.has(code)).toBe(true);
});
it("round7 fresh pinned Node source documents match the cited evidence and catalog", async () => {
  const base = "https://raw.githubusercontent.com/nodejs/node/v22.23.2/";
  const documents = [
    { file: "net.md", route: "doc/api/net.md" },
    { file: "dns.md", route: "doc/api/dns.md" },
    { file: "errors.md", route: "doc/api/errors.md" },
    { file: "node-uv-h.txt", route: "deps/uv/include/uv.h" },
    { file: "libuv-errors.txt", route: "deps/uv/docs/src/errors.rst" },
  ];
  const records: any[] = [], contents = new Map<string,string>();
  for (const doc of documents) {
    const url = base + doc.route;
    const response = await fetch(url, { signal: AbortSignal.timeout(20000) });
    if (!response.ok) throw new Error(`${url} HTTP ${response.status}`);
    const bytes = await response.text();
    const retained = fs.readFileSync(path.join(REPO, "lab/experiments/EXP-P2Q-qlever-log-broker/sources-round6", doc.file), "utf8");
    records.push({ url, file: doc.file, bytes: Buffer.byteLength(bytes), sha256: hash(bytes), retainedSha256: hash(retained), matchesRetained: bytes === retained });
    contents.set(doc.file, bytes);
  }
  const section = contents.get("dns.md")!.split("## Error codes")[1]!.split("## Implementation")[0]!;
  const names = [...section.matchAll(/`dns\.([A-Z]+)`/g)].map(match => match[1]!);
  const dnsRows = names.map(name => ({ name, code: (dns as any)[name], transport: decisions.get((dns as any)[name]) }));
  const uvDns = [...new Set(contents.get("libuv-errors.txt")!.match(/UV_EAI_[A-Z_]+/g))].map(code => ({ code: code.replace(/^UV_/, ""), transport: decisions.get(code.replace(/^UV_/, "")) }));
  const docCodes = [...new Set((contents.get("net.md")! + contents.get("dns.md")!).match(/\b(?:E[A-Z]+|ERR_[A-Z_]+)\b/g))].sort().map(code => ({ code, decision: decisions.get(code) ?? null }));
  writeJson("round7-fresh-node-source-audit.json", { records, dnsRows, uvDns, docCodes });
  expect(records.every(record => record.matchesRetained)).toBe(true);
  expect(dnsRows).toHaveLength(24);
  expect(dnsRows.every(row => row.transport === true)).toBe(true);
  expect(uvDns.every(row => row.transport === true)).toBe(true);
  expect(docCodes.every(row => row.decision !== null)).toBe(true);
});
