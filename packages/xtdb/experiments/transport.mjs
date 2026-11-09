// @ts-nocheck -- [EXP-CHECKJS-R2] generated/optional runtime modules unavailable in standalone source checking; dynamic collections, runtime Buffer-to-JSON coercion, or validated values without static narrowing. Binding errors remain checked by lab/bin/checkjs.mjs.
import postgres from "postgres";
import { performance } from "node:perf_hooks";
import { mkdir, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";

const url = process.env.XTDB_URL ?? "postgres://xtdb:xtdb@127.0.0.1:5442/xtdb";
const sql = postgres(url, { max: 1, fetch_types: false, prepare: false, onnotice: () => {} });
const evidence = {
  observedAt: new Date().toISOString(),
  profile: "local-v1",
  probes: [],
  limitations: ["Functional probes; no percentile or physical resource reclamation claim."],
};
const memory = () =>
  execFileSync("docker", ["stats", "--no-stream", "--format", "{{json .}}", "triplex-xtdb-local"], {
    encoding: "utf8",
  }).trim();
try {
  for (const query of [
    "SELECT 1 AS ready",
    "SHOW SNAPSHOT_TOKEN",
    "SHOW CLOCK_TIME",
    "SHOW AWAIT_TOKEN",
    "SELECT CAST(9223372036854775807 AS BIGINT) AS exact, CAST(-1.25 AS DOUBLE PRECISION) AS fractional",
  ]) {
    const start = performance.now();
    const rows = await sql.unsafe(query);
    evidence.probes.push({ query, rows: [...rows], elapsedMs: performance.now() - start });
  }
  for (const query of [
    "SELECT pg_sleep(10.0)",
    "FROM GENERATE_SERIES(1,10000000) AS system(_id) ORDER BY _id",
  ]) {
    const before = memory();
    const start = performance.now();
    const pending = sql.unsafe(query).execute();
    const timer = setTimeout(() => pending.cancel(), 500);
    let outcome;
    try {
      const rows = await pending;
      outcome = { completed: true, rows: rows.length };
    } catch (error) {
      outcome = { code: error.code, message: error.message };
    } finally {
      clearTimeout(timer);
    }
    const elapsedMs = performance.now() - start;
    const reuse = await sql.unsafe("SELECT 1 AS reusable");
    evidence.probes.push({ query, outcome, elapsedMs, reuse: [...reuse], before, after: memory() });
  }
} finally {
  await sql.end();
  const root = new URL("../../../qualification/evidence/", import.meta.url);
  await mkdir(root, { recursive: true });
  const output = new URL(`transport-${Date.now()}.json`, root);
  await writeFile(output, JSON.stringify(evidence, null, 2) + "\n");
  console.log(output.pathname);
}
