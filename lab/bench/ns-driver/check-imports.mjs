// [EXP-NSR] Why: walk the entire evaluator import closure and reject computed imports, symlink crossings and package dependencies. Rejected: a grep of just the entry file.
import fs from "node:fs";
import ts from "typescript";
import path from "node:path";
import { createHash } from "node:crypto";
export function checkImports(entry, root = path.resolve(import.meta.dirname, "../../..")) {
  root = fs.realpathSync(root);
  const visited = new Map();
  // [EXP-NSR-R2] Why: rejecting unused loader capabilities closes aliases and runtime paths without pretending spelling checks prove a graph (F2). Rejected: admitting every Node builtin and inspecting only calls named require.
  const builtins = new Set([
    "node:fs",
    "node:path",
    "node:crypto",
    "node:perf_hooks",
    "node:net",
    "node:util",
    "node:os",
  ]);
  const forbidden = new Set([
    "require",
    "createRequire",
    "module",
    "Worker",
    "SharedWorker",
    "eval",
    "Function",
    "global",
    "globalThis",
    "WebAssembly",
    "Reflect",
  ]);
  const refuse = () => {
    throw Error("Driver dynamic execution/import or runtime loader refused: " + relativeFile);
  };
  let relativeFile;
  function visit(file) {
    file = fs.realpathSync(file);
    const relative = path.relative(root, file);
    relativeFile = relative;
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
    let sysctlImport = false;
    const walk = (node) => {
      if (ts.isImportEqualsDeclaration(node) || ts.isImportTypeNode(node)) refuse();
      if (ts.isIdentifier(node) && forbidden.has(node.text)) refuse();
      if (
        ts.isPropertyAccessExpression(node) &&
        ["constructor", "prototype", "__proto__", "getPrototypeOf", "setPrototypeOf"].includes(
          node.name.text,
        )
      )
        refuse();
      if (
        ts.isStringLiteral(node) &&
        ["constructor", "prototype", "__proto__"].includes(node.text) &&
        ts.isElementAccessExpression(node.parent)
      )
        refuse();
      if (ts.isIdentifier(node) && node.text === "process") {
        const parent = node.parent;
        if (
          !ts.isPropertyAccessExpression(parent) ||
          parent.expression !== node ||
          !["argv", "stdout", "hrtime", "exitCode"].includes(parent.name.text)
        )
          refuse();
      }
      if (ts.isIdentifier(node) && node.text === "execFileSync") {
        const parent = node.parent;
        if (ts.isImportSpecifier(parent)) {
          if (parent.propertyName) refuse();
        } else if (!ts.isCallExpression(parent) || parent.expression !== node) refuse();
      }

      if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
        if (node.moduleSpecifier) {
          if (!ts.isStringLiteral(node.moduleSpecifier)) throw Error("Driver dynamic import");
          const spec = node.moduleSpecifier.text;
          if (spec === "node:crypto" || spec === "node:util" || spec === "node:perf_hooks") {
            const allowed = {
              "node:crypto": ["createHash", "createHmac", "randomUUID"],
              "node:util": ["TextDecoder"],
              "node:perf_hooks": ["monitorEventLoopDelay"],
            }[spec];
            const bindings = node.importClause?.namedBindings;
            if (
              !ts.isImportDeclaration(node) ||
              node.importClause?.name ||
              !bindings ||
              !ts.isNamedImports(bindings) ||
              bindings.elements.some((e) => !allowed.includes((e.propertyName ?? e.name).text))
            )
              refuse();
          }
          if (spec === "node:child_process") {
            const bindings = node.importClause?.namedBindings;
            if (
              relative !== "lab/bench/ns-driver/clock.mjs" ||
              !bindings ||
              !ts.isNamedImports(bindings) ||
              bindings.elements.length !== 1 ||
              bindings.elements[0].name.text !== "execFileSync" ||
              bindings.elements[0].propertyName
            )
              refuse();
            sysctlImport = true;
          }
          specs.push(spec);
        }
      }
      if (ts.isCallExpression(node) || ts.isNewExpression(node)) {
        const name = node.expression.getText(ast);
        if (ts.isElementAccessExpression(node.expression)) refuse();
        if (name === "execFileSync") {
          const args = node.arguments;
          if (
            !sysctlImport ||
            args.length !== 3 ||
            !ts.isObjectLiteralExpression(args[2]) ||
            args[2].properties.length !== 1 ||
            !ts.isPropertyAssignment(args[2].properties[0]) ||
            args[2].properties[0].name.getText(ast) !== "encoding" ||
            !ts.isStringLiteral(args[2].properties[0].initializer) ||
            args[2].properties[0].initializer.text !== "utf8" ||
            !ts.isStringLiteral(args[0]) ||
            args[0].text !== "/usr/sbin/sysctl" ||
            !ts.isArrayLiteralExpression(args[1]) ||
            args[1].elements.map((x) => (ts.isStringLiteral(x) ? x.text : "")).join("|") !==
              "-n|kern.bootsessionuuid"
          )
            refuse();
        }
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
      if (builtins.has(spec) || (spec === "node:child_process" && sysctlImport)) continue;
      if (spec.startsWith("node:")) refuse();
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
