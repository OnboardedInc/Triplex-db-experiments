import { qleverConnectionModeOf } from "../src/QleverClient.js";
import { randomUUID } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { makeQleverClient } from "../src/QleverClient.js";
const client = makeQleverClient("http://127.0.0.1:7019"),
  run = randomUUID();
const results = await Promise.allSettled(
  [0, 1, 2].map(async (index) => {
    const graph = `<urn:triplex:update-shape:${run}:${index}>`;
    await client.update(`INSERT DATA { GRAPH ${graph} { <urn:meta> <urn:position> "0" } }`);
    const source = `GRAPH ${graph} { <urn:meta> <urn:position> "0" }`,
      guard = `FILTER NOT EXISTS { GRAPH ${graph} { <urn:new> <urn:id> ?existingId } }`,
      values = `VALUES (?s ?p ?new) { (<urn:new> <urn:id> "1") (<urn:meta> <urn:position> "1") }`;
    const where =
      index === 0
        ? `${values} ${source} ${guard}`
        : index === 1
          ? `${source} ${guard} ${values}`
          : `{ SELECT * WHERE { ${source} ${guard} } } ${values}`;
    try {
      await client.update(
        `DELETE { GRAPH ${graph} { ?s ?p ?old } } INSERT { GRAPH ${graph} { ?s ?p ?new } } WHERE { ${where} OPTIONAL { GRAPH ${graph} { ?s ?p ?old } } }`,
      );
      return {
        strategy: ["values-first", "guard-first", "isolated-guard-subquery"][index],
        rows: await client.query(
          `SELECT ?position WHERE { GRAPH ${graph} { <urn:meta> <urn:position> ?position } }`,
        ),
      };
    } catch (error) {
      return {
        strategy: ["values-first", "guard-first", "isolated-guard-subquery"][index],
        error: String(error),
      };
    }
  }),
);
const path = `qualification/evidence/qlever-update-shapes-${run}.json`;
await writeFile(path, JSON.stringify({ qleverConnectionMode: qleverConnectionModeOf(), run, results }, null, 2) + "\n");
console.log(path, JSON.stringify(results, null, 2));
