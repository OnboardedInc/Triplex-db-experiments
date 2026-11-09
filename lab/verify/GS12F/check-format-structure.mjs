import fs from "node:fs";
import ts from "typescript";
import { createHash } from "node:crypto";

// [CX-VGS12F] Why: bind formatted reviewer tools to the exact executed predicates.
// Rejected: byte/token comparison (formatting adds trailing commas); SourceFile.text
// also contains all source whitespace, so it is excluded from structural comparison.
const compile = (path) =>
  ts.transpileModule(fs.readFileSync(path, "utf8"), {
    compilerOptions: {
      target: ts.ScriptTarget.ESNext,
      module: ts.ModuleKind.ESNext,
      removeComments: true,
    },
  }).outputText;
const tree = (text) => {
  const root = ts.createSourceFile(
    "probe.js",
    text,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.JS,
  );
  function walk(node) {
    const children = [];
    ts.forEachChild(node, (child) => {
      children.push(walk(child));
    });
    return {
      kind: node.kind,
      ...(node.kind !== ts.SyntaxKind.SourceFile && typeof node.text === "string"
        ? { text: node.text }
        : {}),
      children,
    };
  }
  return JSON.stringify(walk(root));
};
const rows = [];
for (const name of ["adversarial.test.ts", "controls.test.ts"]) {
  const before = tree(compile(`lab/verify/GS12F/evidence/executed-reviewer-sources/${name}`));
  const after = tree(compile(`lab/verify/GS12F/${name}`));
  const equal = before === after;
  rows.push({
    name,
    identicalTranspiledStructureAndLiteralText: equal,
    beforeSha256: createHash("sha256").update(before).digest("hex"),
    afterSha256: createHash("sha256").update(after).digest("hex"),
  });
  if (!equal) process.exitCode = 1;
}
console.log(JSON.stringify(rows, null, 2));
