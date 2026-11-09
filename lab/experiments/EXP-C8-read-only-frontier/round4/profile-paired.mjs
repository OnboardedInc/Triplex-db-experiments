import { readFileSync, writeFileSync } from "node:fs";
// [EXP-C8-R4] Why: inspect native scan/cardinality evidence for the same captured SPARQL.
// Rejected: inferring physical scans from logical GRAPH text alone.
const out = "lab/experiments/EXP-C8-read-only-frontier/round4";
const results = [];
for (const variant of ["original", "dataset", "unscoped"]) {
  const query = readFileSync(`${out}/paired/baseline-${variant}-1.rq`, "utf8");
  const started = performance.now();
  try {
    const response = await fetch("http://127.0.0.1:7070/?timeout=30000ms", {
      method: "POST",
      headers: {
        "Content-Type": "application/sparql-query",
        Accept: "application/qlever-results+json",
        "Query-Id": `c8-r4-paired-profile-${variant}`,
      },
      body: query,
      signal: AbortSignal.timeout(31000),
    });
    const body = await response.json();
    writeFileSync(`${out}/paired/profile-${variant}.json`, JSON.stringify(body, null, 2) + "\n");
    results.push({
      variant,
      ms: performance.now() - started,
      status: response.status,
      keys: Object.keys(body),
    });
  } catch (error) {
    results.push({ variant, ms: performance.now() - started, error: String(error) });
  }
  writeFileSync(`${out}/paired/profile-results.json`, JSON.stringify(results, null, 2) + "\n");
  console.log(results.at(-1));
}
