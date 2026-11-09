// [EXP-QNODELAY] Why: prove the actual inventoried writer constructors retain a
// required mode in both JS and TS. Rejected: testing only a detached interface,
// or accepting a constructor hidden behind any/spread without an explicit field.
import assert from "node:assert/strict";
import { discoverSources, auditSources } from "./coverage.mjs";
import fs from "node:fs";
import { createHash } from "node:crypto";
import ts from "typescript";
import { execFileSync } from "node:child_process";

const reviewed = JSON.parse(fs.readFileSync("lab/receipts/source-inventory.json", "utf8"));
const discovered = discoverSources(process.cwd());
const errors = auditSources(discovered, reviewed);
assert.deepEqual(errors, [], "timing source coverage failed\n" + errors.join("\n"));
const inventory = [];
for (const source of discovered) {
  if (reviewed.find((entry) => entry.path === source.path).role !== "labeled") continue;
  const ast = ts.createSourceFile(source.path, source.text, ts.ScriptTarget.Latest, true);
  let constructors = 0;
  function count(node) {
    if (
      ts.isCallExpression(node) &&
      ["latencyReceipt", "qleverLatencyReceipt"].includes(node.expression.getText(ast))
    )
      constructors++;
    ts.forEachChild(node, count);
  }
  count(ast);
  if (constructors) inventory.push({ path: source.path, constructors });
}
const inputPaths = [
  ...discovered.map((entry) => entry.path),
  "lab/receipts/source-inventory.json",
  "lab/receipts/check-writers.mjs",
  "lab/receipts/latency.mjs",
  "lab/receipts/latency.d.mts",
  "lab/receipts/typecheck.ts",
  "lab/receipts/coverage.mjs",
];
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const sourceHashes = Object.fromEntries(
  inputPaths.map((file) => [file, hash(fs.readFileSync(file))]),
);
const expressions = [];
for (const entry of inventory) {
  const ast = ts.createSourceFile(
    entry.path,
    fs.readFileSync(entry.path, "utf8"),
    ts.ScriptTarget.Latest,
    true,
  );
  assert.equal(ast.parseDiagnostics.length, 0, `syntax error: ${entry.path}`);
  let constructors = 0;
  const walk = (node) => {
    if (
      ts.isCallExpression(node) &&
      ["latencyReceipt", "qleverLatencyReceipt"].includes(node.expression.getText(ast))
    ) {
      constructors++;
      const argument = node.arguments[0];
      assert(
        ts.isObjectLiteralExpression(argument),
        `${entry.path}: use an explicit typed receipt literal`,
      );
      assert(
        argument.properties.some(
          (property) =>
            (ts.isPropertyAssignment(property) || ts.isShorthandPropertyAssignment(property)) &&
            property.name.getText(ast) === "qleverConnectionMode",
        ),
        `${entry.path}: mode missing`,
      );
      // The shape comes from this exact source call; unrelated payload properties
      // remain present, while dynamic values are opaque. No code in the writer runs.
      const keys = argument.properties
        .filter(
          (property) =>
            ts.isPropertyAssignment(property) || ts.isShorthandPropertyAssignment(property),
        )
        .map((property) => property.name.getText(ast));
      const properties = keys.map(
        (key) => `${key}: ${key === "qleverConnectionMode" ? '"keep-alive"' : "undefined"}`,
      );
      expressions.push(`${node.expression.getText(ast)}({ ${properties.join(", ")} });`);
    }
    ts.forEachChild(node, walk);
  };
  walk(ast);
  assert.equal(constructors, entry.constructors, `writer inventory changed: ${entry.path}`);
}
const file = "lab/receipts/.writer-shapes.ts";
const prelude = 'import { latencyReceipt, qleverLatencyReceipt } from "./latency.mjs";\n';
const compile = (text) => {
  fs.writeFileSync(file, prelude + text);
  const program = ts.createProgram([file], {
    noEmit: true,
    strict: true,
    skipLibCheck: true,
    target: ts.ScriptTarget.ESNext,
    module: ts.ModuleKind.NodeNext,
    moduleResolution: ts.ModuleResolutionKind.NodeNext,
    types: ["node"],
  });
  return ts.getPreEmitDiagnostics(program);
};
try {
  const good = compile(expressions.join("\n"));
  assert.equal(
    good.length,
    0,
    ts.formatDiagnostics(good, {
      getCurrentDirectory: () => process.cwd(),
      getNewLine: () => "\n",
      getCanonicalFileName: (x) => x,
    }),
  );
  const missing = compile(
    expressions
      .map((expression) =>
        expression
          .replace('qleverConnectionMode: "keep-alive", ', "")
          .replace('qleverConnectionMode: "keep-alive"', ""),
      )
      .join("\n"),
  );
  assert.equal(
    missing.length,
    expressions.length,
    "each actual writer shape must fail typechecking without its mode",
  );
  assert(
    missing.every((diagnostic) => [2345, 2353, 2561].includes(diagnostic.code)),
    "expected required-property argument errors",
  );
  // Compile the runtime JS implementation independently of its declaration sidecar.
  execFileSync(
    "node_modules/.bin/tsc",
    [
      "--noEmit",
      "--allowJs",
      "--checkJs",
      "--types",
      "node",
      "--strict",
      "--skipLibCheck",
      "--target",
      "ESNext",
      "--module",
      "NodeNext",
      "lab/receipts/latency.mjs",
    ],
    { stdio: "pipe" },
  );
  for (const [file, digest] of Object.entries(sourceHashes))
    assert.equal(hash(fs.readFileSync(file)), digest, `source changed: ${file}`);
  console.log(
    JSON.stringify({
      sourceHashes,
      discoveredTimingOrSerializationFiles: discovered.length,
      inventoriedFiles: inventory.length,
      writerShapes: expressions.length,
      withMode: "typechecks",
      withoutMode: "all refused",
      runtimeJs: "typechecked",
    }),
  );
} finally {
  fs.rmSync(file, { force: true });
}
