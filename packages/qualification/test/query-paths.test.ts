import { afterEach, describe, expect, it } from "vitest";
import {
  loadQualificationBackend,
  qualificationBackendName,
  qualificationQueryPath,
  qualificationQueryPaths,
} from "../src/index.js";

const before = { backend: process.env["TRIPLEX_BACKEND"], path: process.env["TRIPLEX_QUERY_PATH"] };
afterEach(() => {
  for (const [key, value] of [
    ["TRIPLEX_BACKEND", before.backend],
    ["TRIPLEX_QUERY_PATH", before.path],
  ]) {
    if (value === undefined) delete process.env[key!];
    else process.env[key!] = value;
  }
});

describe("five public query surface registry", () => {
  it("keeps five surfaces over three foundation identities", () => {
    expect(Object.keys(qualificationQueryPaths)).toHaveLength(5);
    expect(new Set(Object.values(qualificationQueryPaths).map((path) => path.backend)).size).toBe(
      3,
    );
    delete process.env["TRIPLEX_BACKEND"];
    process.env["TRIPLEX_QUERY_PATH"] = "xtdb-native";
    expect(qualificationBackendName()).toBe("xtdb");
    expect(qualificationQueryPath()).toBe("xtdb-native");
  });
  it("rejects mismatched foundations rather than silently selecting another surface", () => {
    process.env["TRIPLEX_BACKEND"] = "qlever";
    process.env["TRIPLEX_QUERY_PATH"] = "xtdb-native";
    expect(qualificationQueryPath).toThrow();
  });
  // [EXP-000] Why: our lanes (xtdb, qlever) never load DuckDB, and packages/duckdb/dist is
  // not built in this checkout, so this case failed on every pure run. It is opt-in and the
  // lab G0 gate lists it as an expected skip (lab/config/g0-expected-skips.json).
  // Rejected: building DuckDB in G0 (native build cost for a backend outside our scope).
  it.runIf(process.env["TRIPLEX_DUCKDB"] === "1")("loads the real built DuckDB async factory once and exposes the synchronous runtime facade", async () => {
    delete process.env["TRIPLEX_BACKEND"];
    process.env["TRIPLEX_QUERY_PATH"] = "duckdb-datalog";
    const backend = await loadQualificationBackend();
    expect(backend.name).toBe("duckdb");
    expect(backend.makeRuntime()).toBe(backend.makeRuntime());
    expect(backend.artifact).toContain("packages/duckdb/dist/index.js");
  });
});
