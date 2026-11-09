// [EXP-K01-R8] Why: derive coverage from the adapter's declarations, including side tables. Rejected: another hand-maintained value-column whitelist (missed native validation inputs).
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
export function adapterSchema(sources) {
    const parsed = Object.entries(sources).map(([file, text]) => ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true));
    let assertionColumns;
    const visit = (node, fn) => {
        fn(node);
        node.forEachChild((n) => visit(n, fn));
    };
    for (const source of parsed)
        visit(source, (node) => {
            if (!ts.isVariableDeclaration(node) ||
                node.name.getText(source) !== "assertionColumns" ||
                !node.initializer)
                return;
            const init = ts.isAsExpression(node.initializer)
                ? node.initializer.expression
                : node.initializer;
            if (!ts.isArrayLiteralExpression(init) || !init.elements.every(ts.isStringLiteral))
                throw Error("G0 unsupported assertion schema");
            if (assertionColumns)
                throw Error("G0 duplicate assertion schema");
            assertionColumns = init.elements.map((e) => e.text);
        });
    if (!assertionColumns?.length)
        throw Error("G0 missing assertion schema");
    const tables = {};
    for (const source of parsed)
        visit(source, (node) => {
            let sql;
            if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node))
                sql = node.text;
            else if (ts.isTemplateExpression(node) && /^\s*CREATE TABLE\b/i.test(node.head.text)) {
                sql = node.head.text;
                for (const span of node.templateSpans) {
                    if (!/^assertionColumns\.join\(["']?, ?["']?\)$/.test(span.expression.getText(source)))
                        throw Error("G0 unsupported dynamic table schema");
                    sql += assertionColumns.join(", ") + span.literal.text;
                }
            }
            else
                return;
            sql = sql.trim();
            if (!/^CREATE TABLE\b/i.test(sql))
                return;
            const m = /^CREATE TABLE (tx_[a-z_]+) \(([^)]+)\)$/.exec(sql);
            if (!m)
                throw Error("G0 unsupported table declaration: " + sql);
            const cols = m[2].split(",").map((c) => c.trim());
            if (cols.some((c) => !/^[_a-z][_a-z0-9]*$/.test(c)) ||
                new Set(cols).size !== cols.length ||
                !cols.includes("scope_key") ||
                tables[m[1]])
                throw Error("G0 ambiguous schema");
            tables[m[1]] = Object.freeze(cols);
        });
    for (const t of ["tx_assertions", "tx_claims", "tx_attempts", "tx_meta"])
        if (!tables[t])
            throw Error("G0 missing core table " + t);
    return Object.freeze(Object.fromEntries(Object.entries(tables).sort()));
}
export function schemaSources(root = path.resolve(import.meta.dirname, "../../../packages/xtdb/src")) {
    const files = {};
    const walk = (dir) => {
        for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
            const f = path.join(dir, e.name);
            if (e.isDirectory())
                walk(f);
            else if (e.isFile() && e.name.endsWith(".ts"))
                files[path.relative(root, f)] = fs.readFileSync(f, "utf8");
        }
    };
    walk(root);
    return files;
}
export const storedFields = adapterSchema(schemaSources("/Users/sam/projects/triplex-db-2/.claude/worktrees/verify-p5a/packages/xtdb/src"));
