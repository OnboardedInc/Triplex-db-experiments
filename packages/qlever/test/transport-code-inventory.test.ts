// [EXP-P2Q] Why: dependency additions must fail until every code has an explicit reviewed decision.
// Rejected: deriving acceptance from a prefix or importing the table as its own coverage oracle.
import fs from "node:fs";
import path from "node:path";
import dns from "node:dns";
import { describe, expect, it } from "vitest";
import { QLEVER_ERROR_CODE_TABLE } from "../src/broker/transport-codes.js";
import { isUnreachable } from "../src/broker/errors.js";

const root = path.resolve(import.meta.dirname, "../../..");
const decisions = new Map<string, boolean>(
  QLEVER_ERROR_CODE_TABLE.map((row) => [row.code, row.transport]),
);
const inventory = (source: string) =>
  [...new Set(source.match(/\bUND_ERR[A-Z_0-9]*\b/g) ?? [])].sort();
const missing = (source: string) => inventory(source).filter((code) => !decisions.has(code));

it("reviews every installed Undici error-module code and the actual fetch runtime inventory", () => {
  const store = path.join(root, "node_modules/.pnpm");
  const modules = fs
    .readdirSync(store)
    .filter((name) => /^undici@\d/.test(name))
    .map((name) => ({
      name,
      source: fs.readFileSync(
        path.join(store, name, "node_modules/undici/lib/core/errors.js"),
        "utf8",
      ),
    }));
  expect(modules.length).toBeGreaterThan(0);
  const natives = (process as unknown as { binding(name: string): Record<string, string> }).binding(
    "natives",
  );
  const bundle = natives["internal/deps/undici/undici"]!;
  const start = bundle.indexOf("// lib/core/errors.js");
  expect(start).toBeGreaterThanOrEqual(0);
  const end = bundle.indexOf("\n// lib/", start + 5);
  expect(end).toBeGreaterThan(start);
  modules.push({ name: `Node ${process.version} fetch`, source: bundle.slice(start, end) });
  for (const { name, source } of modules) {
    expect(inventory(source).length, name).toBeGreaterThan(10);
    expect(
      missing(source),
      `Unreviewed Undici code(s) in ${name}; audit transport vs parser/resource/validation`,
    ).toEqual([]);
  }
});

it("detects a dependency transport-code addition rather than silently defaulting it to non-transport", () => {
  expect(missing("class FutureTransportError { code = 'UND_ERR_NEW_TRANSPORT' }")).toEqual([
    "UND_ERR_NEW_TRANSPORT",
  ]);
});

it("covers pinned Node net/DNS documentation and all pinned libuv DNS errno constants", () => {
  const sources = path.join(root, "lab/experiments/EXP-P2Q-qlever-log-broker/sources-round6");
  const dnsDoc = fs
    .readFileSync(path.join(sources, "dns.md"), "utf8")
    .split("## Error codes")[1]!
    .split("## Implementation")[0]!;
  const names = [...dnsDoc.matchAll(/`dns\.([A-Z]+)`/g)].map((match) => match[1]!);
  expect(names).toHaveLength(24);
  for (const name of names) {
    const code = (dns as unknown as Record<string, unknown>)[name];
    expect(typeof code).toBe("string");
    expect(decisions.get(code as string), name).toBe(true);
  }
  const uv = fs.readFileSync(path.join(sources, "libuv-errors.txt"), "utf8");
  for (const match of uv.matchAll(/UV_(EAI_[A-Z_]+)/g)) expect(decisions.get(match[1]!)).toBe(true);
  for (const file of ["net.md", "dns.md"]) {
    const codes = new Set(
      fs.readFileSync(path.join(sources, file), "utf8").match(/\b(?:E[A-Z]+|ERR_[A-Z_]+)\b/g),
    );
    for (const code of codes) expect(decisions.has(code), `${file}: ${code}`).toBe(true);
  }
});

describe("one exact-code decision table", () => {
  it("has unique codes, source citations and explicit reasons", () => {
    expect(decisions.size).toBe(QLEVER_ERROR_CODE_TABLE.length);
    for (const row of QLEVER_ERROR_CODE_TABLE) {
      expect(row.source).toBeTruthy();
      expect(row.reason).toBeTruthy();
    }
  });
  it.each(QLEVER_ERROR_CODE_TABLE)(
    "$code: $transport at root and nested",
    ({ code, transport }) => {
      const cause = Object.assign(new Error("opaque"), { code });
      expect(isUnreachable(cause)).toBe(transport);
      expect(isUnreachable(new TypeError("connection", { cause }))).toBe(transport);
      if (!transport) {
        Object.assign(cause, { cause: Object.assign(new Error("opaque"), { code: "ECONNRESET" }) });
        expect(isUnreachable(cause)).toBe(false);
      }
    },
  );
});
