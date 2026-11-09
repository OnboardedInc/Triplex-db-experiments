import { qleverConnectionModeOf } from "../src/QleverClient.js";
import { randomUUID } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { makeQleverClient } from "../src/QleverClient.js";

const client = makeQleverClient("http://127.0.0.1:7019");
const run = randomUUID(),
  prefix = `urn:triplex:probe:${run}`;
const result: Record<string, unknown> = {
  qleverConnectionMode: qleverConnectionModeOf(),
  run,
  at: new Date().toISOString(),
  version: await client.command("stats"),
};
const experiments = await Promise.allSettled([
  (async () => {
    const g = `<${prefix}:cas>`;
    await client.update(`INSERT DATA { GRAPH ${g} { <urn:meta> <urn:position> 0 } }`);
    const responses = await Promise.allSettled(
      Array.from({ length: 16 }, (_, i) =>
        client.update(
          `DELETE { GRAPH ${g} { <urn:meta> <urn:position> 0 } } INSERT { GRAPH ${g} { <urn:meta> <urn:position> 1 . <urn:claim:${i}> <urn:won> true } } WHERE { GRAPH ${g} { <urn:meta> <urn:position> 0 } }`,
        ),
      ),
    );
    const rows = await client.query(`SELECT ?s ?p ?o WHERE { GRAPH ${g} { ?s ?p ?o } }`);
    return {
      experiment: "native-conditional-cas-16",
      fulfilled: responses.filter((x) => x.status === "fulfilled").length,
      positions: rows.filter((r) => r["p"]?.value === "urn:position"),
      claims: rows.filter((r) => r["p"]?.value === "urn:won"),
      pass: rows.filter((r) => r["p"]?.value === "urn:won").length === 1,
    };
  })(),
  (async () => {
    const inputs = [
      "1.0000000000000002e0",
      "9007199254740991",
      "576460752303423487",
      "576460752303423488",
      "9223372036854775807",
    ];
    const observations = await Promise.all(
      inputs.map(async (input) => {
        try {
          return { input, rows: await client.query(`SELECT (${input} AS ?value) WHERE {}`) };
        } catch (error) {
          return { input, error: String(error) };
        }
      }),
    );
    return { experiment: "native-number-precision", observations };
  })(),
  (async () => {
    const g = `<${prefix}:failed-request>`;
    let error: unknown;
    try {
      await client.update(
        `INSERT DATA { GRAPH ${g} { <urn:first> <urn:state> "should-rollback" } }; INSERT { GRAPH ${g} { <urn:second> <urn:state> ?o } } WHERE { SERVICE <http://127.0.0.1:1> { ?s ?p ?o } }`,
        { timeoutMs: 3000 },
      );
    } catch (cause) {
      error = String(cause);
    }
    const immediately = await client.query(
      `SELECT ?s ?o WHERE { GRAPH ${g} { ?s <urn:state> ?o } }`,
    );
    await client.update(
      `INSERT DATA { GRAPH <${prefix}:publish> { <urn:publication> <urn:state> "tick" } }`,
    );
    const afterPublication = await client.query(
      `SELECT ?s ?o WHERE { GRAPH ${g} { ?s <urn:state> ?o } }`,
    );
    return {
      experiment: "failed-multi-update-rollback",
      error,
      immediately,
      afterPublication,
      atomicRollback: error !== undefined && afterPublication.length === 0,
    };
  })(),
]);
for (let i = 0; i < experiments.length; i++) result[`experiment${i + 1}`] = experiments[i];
await writeFile(
  `qualification/evidence/qlever-native-capabilities-${Date.now()}.json`,
  JSON.stringify(result, null, 2) + "\n",
);
console.log(JSON.stringify(result, null, 2));
await client.close();
