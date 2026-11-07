import { randomUUID } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { makeQleverClient } from "../src/QleverClient.js";
import { numericOrderKey } from "../src/rdf.js";
const client = makeQleverClient("http://127.0.0.1:7019"),
  run = randomUUID();
const values = `VALUES (?candidate ?active) { ("${numericOrderKey(300)}" true) ("${numericOrderKey(500)}" false) }`;
const candidates = [
  {
    strategy: "unbound-invalid",
    sparql: `SELECT (MIN(?next) AS ?boundary) WHERE { ${values} BIND(IF(?active,?candidate,1/0) AS ?next) }`,
  },
  {
    strategy: "string-sentinel",
    sparql: `SELECT (MIN(?next) AS ?boundary) WHERE { ${values} BIND(IF(?active,?candidate,"ffffffffffffffff") AS ?next) }`,
  },
  {
    strategy: "filtered-subquery",
    sparql: `SELECT (MIN(?next) AS ?boundary) WHERE { { SELECT ?candidate WHERE { ${values} FILTER(?active) } } BIND(?candidate AS ?next) }`,
  },
];
const results = await Promise.all(
  candidates.map(async (candidate) => ({
    ...candidate,
    rows: await client.query(candidate.sparql),
  })),
);
const path = `qualification/evidence/qlever-boundary-shapes-${run}.json`;
await writeFile(
  path,
  JSON.stringify({ run, expected: numericOrderKey(300), results }, null, 2) + "\n",
);
console.log(path, JSON.stringify(results, null, 2));
