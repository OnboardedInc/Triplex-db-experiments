import { writeFile } from "node:fs/promises";
import { makeQleverClient } from "../../packages/qlever/src/QleverClient.js";
const client = makeQleverClient("http://127.0.0.1:7019"),
  value = JSON.stringify({ high: "\ud800", low: "\udfff", valid: "😀" });
const quoted = JSON.stringify(value);
const candidates = [
  { name: "json-quoted", expression: quoted },
  { name: "unicode-backslash", expression: quoted.replaceAll("\\\\", "\\u005c") },
  {
    name: "concat-split",
    expression: `CONCAT(${value
      .split("\\u")
      .map(
        (part, index) =>
          `${index ? `${JSON.stringify("\\")},` : ""}${JSON.stringify(index ? "u" + part : part)}`,
      )
      .join(",")})`,
  },
];
const outcomes = await Promise.all(
  candidates.map(async (candidate) => {
    try {
      const rows = await client.query(`SELECT (${candidate.expression} AS ?value) WHERE {}`, {
        timeoutMs: 3000,
      });
      return { ...candidate, rows, pass: rows[0]?.["value"]?.value === value };
    } catch (error) {
      return { ...candidate, pass: false, error: String(error) };
    }
  }),
);
const artifact = {
  at: new Date().toISOString(),
  expected: value,
  outcomes,
  nativeMutationRequests: 0,
};
const path = `qualification/evidence/qlever-unicode-literal-candidates-${Date.now()}.json`;
await writeFile(path, JSON.stringify(artifact, null, 2) + "\n");
console.log(JSON.stringify({ path, outcomes }, null, 2));
