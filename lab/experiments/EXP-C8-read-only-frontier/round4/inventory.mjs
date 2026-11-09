import { writeFileSync } from "node:fs";
// [EXP-C8-R4] Why: inspect resident size without modifying or cleaning any shared graph.
// Rejected: deriving current triple count from old test receipts.
const results = [];
for (const [name, query] of [
  ["stats", null],
  ["all-named-triples", "SELECT (COUNT(*) AS ?triples) WHERE { GRAPH ?g { ?s ?p ?o } }"],
  ["default-triples", "SELECT (COUNT(*) AS ?triples) WHERE { ?s ?p ?o }"],
  [
    "c8-graphs",
    'SELECT ?g (COUNT(*) AS ?parents) WHERE { GRAPH ?g { ?s <urn:triplex:field:attribute> ":c8/parent" } } GROUP BY ?g',
  ],
]) {
  const start = performance.now();
  try {
    const response = await fetch(
      query ? "http://127.0.0.1:7070/?timeout=30000ms" : "http://127.0.0.1:7070/?cmd=stats",
      {
        method: query ? "POST" : "GET",
        headers: query
          ? { "Content-Type": "application/sparql-query", "Query-Id": `c8-r4-inventory-${name}` }
          : {},
        ...(query ? { body: query } : {}),
        signal: AbortSignal.timeout(31000),
      },
    );
    results.push({
      name,
      query,
      at: new Date().toISOString(),
      ms: performance.now() - start,
      status: response.status,
      body: await response.json(),
    });
  } catch (error) {
    results.push({ name, query, ms: performance.now() - start, error: String(error) });
  }
  writeFileSync(
    "lab/experiments/EXP-C8-read-only-frontier/round4/inventory.json",
    JSON.stringify(results, null, 2) + "\n",
  );
  console.log(name, JSON.stringify(results.at(-1)));
}
