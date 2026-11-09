// [EXP-QNODELAY] Why: review input boundaries from entry points/imports/receipt paths,
// never from timing units or writer spellings. Rejected: finite output regexes.
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import ts from "typescript";
export const hashSource = (text) => createHash("sha256").update(text).digest("hex");
const excluded = new Set([
  "node_modules",
  "dist",
  ".git",
  ".vite",
  ".vite-temp",
  "coverage",
  "__pycache__",
]);
function importsOf(file, text) {
  const imports = [];
  if (/\.[cm]?[jt]sx?$/.test(file)) {
    const ast = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
    const walk = (n) => {
      if (ts.isImportDeclaration(n) && ts.isStringLiteral(n.moduleSpecifier))
        imports.push(n.moduleSpecifier.text);
      if (
        ts.isCallExpression(n) &&
        n.expression.kind === ts.SyntaxKind.ImportKeyword &&
        ts.isStringLiteral(n.arguments[0])
      )
        imports.push(n.arguments[0].text);
      ts.forEachChild(n, walk);
    };
    walk(ast);
  }
  return imports;
}
export function readerSources(root) {
  const result = [];
  function visit(dir) {
    for (const e of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
      if (e.isSymbolicLink() || excluded.has(e.name)) continue;
      const file = path.posix.join(dir, e.name);
      if (e.isDirectory()) visit(file);
      else if (/\.(?:[cm]?[jt]s|tsx|jsx|py|sh)$/.test(e.name)) {
        const text = fs.readFileSync(path.join(root, file), "utf8");
        const imports = importsOf(file, text);
        result.push({ path: file, sha256: hashSource(text), imports, text });
      }
    }
  }
  for (const tree of ["lab", "packages"]) if (fs.existsSync(path.join(root, tree))) visit(tree);
  // [EXP-QNODELAY] Why: the load verifier calls this shared external aggregator.
  // Rejected: checking only its caller after aggregation already consumed bytes.
  const external = "qualification/devloop/compare.mjs";
  if (fs.existsSync(path.join(root, external))) {
    const text = fs.readFileSync(path.join(root, external), "utf8");
    result.push({
      path: external,
      sha256: hashSource(text),
      imports: importsOf(external, text),
      text,
    });
  }
  return result.sort((a, b) => a.path.localeCompare(b.path));
}
export function auditReaders(sources, inventory) {
  const failures = [];
  const reviewed = new Map(inventory.sources.map((s) => [s.path, s]));
  for (const source of sources) {
    const entry = reviewed.get(source.path);
    if (!entry) {
      failures.push(`${source.path}: unreviewed input boundary`);
      continue;
    }
    if (entry.sha256 !== source.sha256)
      failures.push(`${source.path}: input-boundary review is stale`);
    if (!entry.reason || !["reader", "schema", "non-reader"].includes(entry.role))
      failures.push(`${source.path}: reader classification missing`);
    if (entry.role === "reader") {
      if (source.path.endsWith(".py")) {
        if (
          !/from latency_reader import read_latency_receipt/.test(source.text) ||
          !/read_latency_receipt\(/.test(source.text)
        )
          failures.push(`${source.path}: Python reader must call the shared schema wrapper`);
      } else {
        if (
          !source.imports.some(
            (p) =>
              p.startsWith(".") &&
              path.posix.normalize(path.posix.join(path.posix.dirname(source.path), p)) ===
                "lab/receipts/parse.ts",
          )
        )
          failures.push(`${source.path}: receipt reader must import the parser`);
        const ast = ts.createSourceFile(source.path, source.text, ts.ScriptTarget.Latest, true);
        let calls = 0;
        const walk = (n) => {
          if (
            ts.isCallExpression(n) &&
            ["parseLatencyReceipt", "parseLatencyReceipts"].includes(n.expression.getText(ast))
          )
            calls++;
          ts.forEachChild(n, walk);
        };
        walk(ast);
        if (calls < entry.boundaries)
          failures.push(`${source.path}: receipt parser boundary removed`);
      }
    }
    reviewed.delete(source.path);
  }
  for (const file of reviewed.keys()) failures.push(`${file}: stale source classification`);
  const paths = new Set(sources.map((s) => s.path));
  for (const file of inventory.entryPoints)
    if (!paths.has(file)) failures.push(`${file}: missing gate/report entry point`);
  // [EXP-QNODELAY] Why: retain import graph evidence for reader classification.
  // Rejected: using timing-field spellings to remove source from review.
  const graph = Object.fromEntries(sources.map((s) => [s.path, s.imports]));
  return { failures, graph };
}
