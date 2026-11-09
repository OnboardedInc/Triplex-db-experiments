// [EXP-K01-R13] Why: check helper name resolution for every engine command, including the two captured failures after owned storage was created. Rejected: syntax-only checking, which accepts unbound names inside unexecuted branches.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import ts from "typescript";
const root = path.resolve(import.meta.dirname, "../../..");
const engine = path.join(root, "lab/bin/engine.mjs");
function missingNames(text: string) {
  const opts: ts.CompilerOptions = {
    allowJs: true,
    checkJs: true,
    noEmit: true,
    skipLibCheck: true,
    module: ts.ModuleKind.NodeNext,
    moduleResolution: ts.ModuleResolutionKind.NodeNext,
    target: ts.ScriptTarget.ES2022,
    allowImportingTsExtensions: true,
    types: ["node"],
    typeRoots: [path.join(root, "node_modules/@types")],
  };
  const host = ts.createCompilerHost(opts),
    original = host.readFile.bind(host);
  host.readFile = (file) => (path.resolve(file) === engine ? text : original(file));
  const program = ts.createProgram([engine], opts, host);
  return program
    .getSemanticDiagnostics(program.getSourceFile(engine))
    .filter((d) => [2304, 2552, 18004].includes(d.code))
    .map((d) => ts.flattenDiagnosticMessageText(d.messageText, " "));
}
test("golden and fresh helper binding reproduces both captured failures and current engine has no unbound names", () => {
  const f = JSON.parse(
    fs.readFileSync(new URL("./fixtures/g0-smoke13.json", import.meta.url), "utf8"),
  );
  for (const e of f.errors) assert.match(e.bytes, /ReferenceError: sha256File is not defined/);
  const source = fs.readFileSync(engine, "utf8");
  assert.deepEqual(missingNames(source), []);
  const prior = source.replace("sha256, sha256File, sleep", "sha256, sleep");
  assert.notEqual(prior, source);
  const bad = missingNames(prior);
  assert.equal(bad.filter((m) => m.includes("sha256File")).length, 3);
});
