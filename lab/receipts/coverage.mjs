// [EXP-QNODELAY] Why: discover timing readers and serializers before consulting
// the reviewed inventory. Rejected: discovering only existing receipt constructor
// calls (missed C8), or automatically exempting new tests/non-Q-looking files.
import fs from "node:fs";
import ts from "typescript";
import path from "node:path";
import { createHash } from "node:crypto";

export const timingPattern =
  /\b(?:\w*(?:Ms|Milliseconds|Seconds|Ns)\w*|\w*[pP]\d{1,3}|ms|latenc\w*|duration\w*|elapsed\w*)\b|performance\.now|hrtime/;
export const serializationPattern =
  /JSON\.stringify|writeFile|appendFile|createWriteStream|console\.(?:log|info)|stdout\.write|json\.dump|\bprint\(/;
const extensions = /\.(?:[cm]?[jt]s|tsx|jsx|py|sh)$/;
const excluded = new Set([
  "node_modules",
  "dist",
  ".git",
  ".vite",
  ".vite-temp",
  "coverage",
  "__pycache__",
]);
export const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");
export function discoverSources(root) {
  const files = [];
  const visit = (relative) => {
    for (const entry of fs.readdirSync(path.join(root, relative), { withFileTypes: true })) {
      if (entry.isSymbolicLink() || excluded.has(entry.name)) continue;
      const file = path.posix.join(relative, entry.name);
      if (entry.isDirectory()) visit(file);
      else if (extensions.test(entry.name) && entry.name !== ".writer-shapes.ts") {
        const text = fs.readFileSync(path.join(root, file), "utf8");
        if (timingPattern.test(text) || serializationPattern.test(text))
          files.push({
            path: file,
            sha256: digest(text),
            timing: timingPattern.test(text),
            serialization: serializationPattern.test(text),
            text,
          });
      }
    }
  };
  for (const tree of ["lab", "packages"]) if (fs.existsSync(path.join(root, tree))) visit(tree);
  return files.sort((a, b) => a.path.localeCompare(b.path));
}
export function auditSources(sources, inventory) {
  const errors = [];
  const entries = new Map(inventory.map((entry) => [entry.path, entry]));
  for (const source of sources) {
    const reviewed = entries.get(source.path);
    if (!reviewed) {
      errors.push(`${source.path}: new timing/serialization source requires review`);
      continue;
    }
    if (source.sha256 !== reviewed.sha256)
      errors.push(`${source.path}: changed timing/serialization source requires review`);
    if (
      !reviewed.reason ||
      !["labeled", "forwarded", "non-qlever", "fixture", "contract", "external-mode"].includes(
        reviewed.role,
      )
    )
      errors.push(`${source.path}: missing source classification`);
    if (
      reviewed.role === "labeled" &&
      (!/qleverConnectionMode/.test(source.text) ||
        !/\b(?:qleverLatencyReceipt|latencyReceipt|recordedConnectionMode)\s*\(/.test(source.text))
    )
      errors.push(`${source.path}: QLever timing writer lacks checked mode boundary`);
    if (
      reviewed.role === "external-mode" &&
      (!source.text.includes("qleverConnectionMode") ||
        !source.text.includes("--connection-mode") ||
        !source.text.includes("keep-alive") ||
        !source.text.includes("per-request"))
    )
      errors.push(
        `${source.path}: external timing parser must require explicit validated attribution`,
      );
    if (reviewed.role === "labeled" && /\.[cm]?[jt]sx?$/.test(source.path)) {
      const ast = ts.createSourceFile(source.path, source.text, ts.ScriptTarget.Latest, true);
      function inspect(node) {
        if (
          ts.isCallExpression(node) &&
          node.expression.getText(ast) === "JSON.stringify" &&
          ts.isObjectLiteralExpression(node.arguments[0])
        ) {
          const object = node.arguments[0];
          const fields = object.properties
            .filter((p) => ts.isPropertyAssignment(p) || ts.isShorthandPropertyAssignment(p))
            .map((p) => p.name.getText(ast));
          if (
            fields.some((name) => /^(?:ms|.*(?:Ms|Milliseconds)|p\d{1,3})$/.test(name)) &&
            !fields.includes("qleverConnectionMode")
          )
            errors.push(`${source.path}: standalone timing literal lacks mode`);
        }
        ts.forEachChild(node, inspect);
      }
      inspect(ast);
    }
    entries.delete(source.path);
  }
  for (const file of entries.keys()) errors.push(`${file}: stale reviewed source entry`);
  return errors;
}
