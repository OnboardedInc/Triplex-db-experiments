// [CX-VQNODELAY-R2] Why: execute builder checker with scratch and executable paths confined to reviewer ownership. Rejected: editing the checker under review. Only four path literals below differ, including the pinned compiler import.
// [EXP-QNODELAY] Why: prove the actual inventoried writer constructors retain a
// required mode in both JS and TS. Rejected: testing only a detached interface,
// or accepting a constructor hidden behind any/spread without an explicit field.
import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import ts from "/Users/sam/projects/triplex-db-2/node_modules/.pnpm/typescript@6.0.2/node_modules/typescript/lib/typescript.js";
import { execFileSync } from "node:child_process";

const inventory = JSON.parse(
  fs.readFileSync("lab/experiments/EXP-QNODELAY/round2/receipt-writers.json", "utf8"),
);
const inputPaths = [
  ...inventory.map((entry) => entry.path),
  "lab/receipts/check-writers.mjs",
  "lab/receipts/latency.mjs",
  "lab/receipts/latency.d.mts",
  "lab/receipts/typecheck.ts",
  "lab/experiments/EXP-QNODELAY/round2/receipt-writers.json",
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
const file = "lab/verify/QNODELAY/round2/.writer-shapes.ts";
const prelude = 'import { latencyReceipt, qleverLatencyReceipt } from "../../../receipts/latency.mjs";\n';
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
    "/Users/sam/projects/triplex-db-2/node_modules/.bin/tsc",
    [
      "--noEmit",
      "--allowJs",
      "--checkJs",
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
