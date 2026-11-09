// [EXP-NSR] Why: walk the entire evaluator import closure and reject computed imports, symlink crossings and package dependencies. Rejected: a grep of just the entry file.
import fs from "node:fs";
import ts from "typescript";
import path from "node:path";
import { builtinModules } from "node:module";
import { createHash } from "node:crypto";
export function checkImports(entry, root = path.resolve(import.meta.dirname, "../../..")) {
  root = fs.realpathSync(root);
  const visited = new Map();
  function visit(file) {
    file = fs.realpathSync(file);
    const relative = path.relative(root, file);
    if (relative.split(path.sep).includes("packages") || relative.startsWith(".."))
      throw Error("Driver candidate/outside import: " + file);
    if (visited.has(relative)) return;
    const text = fs.readFileSync(file, "utf8");
    visited.set(relative, createHash("sha256").update(text).digest("hex"));
    const ast = ts.createSourceFile(
      file,
      text,
      ts.ScriptTarget.Latest,
      true,
      file.endsWith(".ts") ? ts.ScriptKind.TS : ts.ScriptKind.JS,
    );
    if (ast.parseDiagnostics.length) throw Error("Driver parse failure");
    const specs = [];
    const walk = (node) => {
      if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
        if (node.moduleSpecifier) {
          if (!ts.isStringLiteral(node.moduleSpecifier)) throw Error("Driver dynamic import");
          specs.push(node.moduleSpecifier.text);
        }
      }
      if (ts.isCallExpression(node) || ts.isNewExpression(node)) {
        const name = node.expression.getText(ast);
        if (
          node.expression.kind === ts.SyntaxKind.ImportKeyword ||
          /(?:^|\.)(require|createRequire|eval|Function)$/.test(name)
        )
          throw Error("Driver dynamic execution/import");
      }
      ts.forEachChild(node, walk);
    };
    walk(ast);
    for (const spec of specs) {
      if (spec.startsWith("node:") && builtinModules.includes(spec.slice(5))) continue;
      if (!spec.startsWith(".")) throw Error("Driver package import: " + spec);
      visit(path.resolve(path.dirname(file), spec));
    }
  }
  visit(entry);
  const files = Object.fromEntries([...visited].sort(([a], [b]) => a.localeCompare(b)));
  return { files, bundleSha256: createHash("sha256").update(JSON.stringify(files)).digest("hex") };
}
if (process.argv[1] && path.resolve(process.argv[1]) === import.meta.filename)
  console.log(
    JSON.stringify(checkImports(path.resolve(process.argv[2] ?? "lab/bench/ns-driver/driver.mjs"))),
  );
