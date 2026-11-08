// Plants each fault in packages/w0/src, runs the new golden harness (and, for comparison, the old 1.1.1 harness that compares
// with `expected` re-serialized by the kernel's own writer), records the failing tests, and restores the file.
import { execFileSync } from "node:child_process";
import { copyFileSync, readFileSync, rmSync, writeFileSync } from "node:fs";

const PKG = "/Users/sam/projects/triplex-db-2/.claude/worktrees/w0-kernel-112/packages/w0/";
const SCRATCH = new URL(".", import.meta.url).pathname;
const OLD = PKG + "test/zz-old-harness.test.ts";

const mutants = [
  {
    name: "W1 writer: \\u escapes in uppercase hex",
    category: "JSON writer",
    file: "src/json.ts",
    from: 'out += "\\\\u" + c.toString(16).padStart(4, "0");',
    to: 'out += "\\\\u" + c.toString(16).toUpperCase().padStart(4, "0");',
  },
  {
    name: "W2 writer: object keys in UTF-16 code unit order (default sort) instead of code point order",
    category: "JSON writer",
    file: "src/json.ts",
    from: "const keys = [...v.m.keys()].sort(cmpCodePoints);",
    to: "const keys = [...v.m.keys()].sort();",
  },
  {
    name: "D1 decoding: invalid UTF-8 replaced with U+FFFD (fatal: false)",
    category: "input decoding",
    file: "src/json.ts",
    from: 'new TextDecoder("utf-8", { fatal: true, ignoreBOM: true })',
    to: 'new TextDecoder("utf-8", { fatal: false, ignoreBOM: true })',
  },
  {
    name: "D2 decoding: a leading byte order mark is stripped instead of refused",
    category: "input decoding",
    file: "src/json.ts",
    from: 'if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) return null;\n  try {\n    return new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes);',
    to: 'try {\n    return new TextDecoder("utf-8", { fatal: true, ignoreBOM: false }).decode(bytes);',
  },
  {
    name: "R1 rule: MINWAGE row 4 needs pay strictly above the floor (>= becomes >)",
    category: "rule",
    file: "src/kernel.ts",
    from: "} else if ((payF.v as number) >= floor) row = 4;",
    to: "} else if ((payF.v as number) > floor) row = 4;",
  },
];

function run(testFile) {
  const out = SCRATCH + "vitest.json";
  rmSync(out, { force: true });
  try {
    execFileSync("./node_modules/.bin/vitest", ["--run", testFile, "--reporter=json", "--outputFile=" + out], {
      cwd: PKG,
      stdio: "ignore",
    });
  } catch {
    // a failing run exits non-zero; the JSON report says which tests failed
  }
  const r = JSON.parse(readFileSync(out, "utf8"));
  const failed = r.testResults.flatMap((f) =>
    f.assertionResults.filter((a) => a.status !== "passed").map((a) => a.title),
  );
  return { total: r.numTotalTests, passed: r.numPassedTests, failed };
}

copyFileSync(SCRATCH + "old-harness.test.ts", OLD);
const results = [];
try {
  const baseNew = run("test/cases.test.ts");
  const baseOld = run("test/zz-old-harness.test.ts");
  results.push({ name: "baseline (no fault)", new: baseNew, old: baseOld });
  for (const m of mutants) {
    const path = PKG + m.file;
    const orig = readFileSync(path, "utf8");
    const n = orig.split(m.from).length - 1;
    if (n !== 1) throw new Error(`${m.name}: pattern found ${n} times`);
    writeFileSync(path, orig.replace(m.from, m.to));
    try {
      results.push({ name: m.name, category: m.category, file: m.file, new: run("test/cases.test.ts"), old: run("test/zz-old-harness.test.ts") });
    } finally {
      writeFileSync(path, orig);
    }
  }
} finally {
  rmSync(OLD, { force: true });
}
const report = results.map((r) => ({
  ...r,
  new: { ...r.new, failed: r.new.failed.map((t) => t.split(" ")[0]) },
  old: { ...r.old, failed: r.old.failed.map((t) => t.split(" ")[0]) },
}));
process.stdout.write(JSON.stringify(report, null, 2) + "\n");
