import { writeFile } from "node:fs/promises";
import { makeQleverClient } from "../../packages/qlever/src/QleverClient.js";
const client = makeQleverClient("http://127.0.0.1:7019"),
  value = JSON.stringify({
    high: "\ud800",
    low: "\udfff",
    valid: "😀",
    path: "C:\\users",
    uppercase: "\\U0000D800",
  }),
  slash = "\\";
const quoted = JSON.stringify(value);
const candidates = [
  {
    name: "escaped-u-letter",
    expression: quoted
      .replaceAll(slash + slash + "u", slash + slash + slash + "u0075")
      .replaceAll(slash + slash + "U", slash + slash + slash + "u0055"),
  },
  {
    name: "escaped-u-letter-long",
    expression: quoted
      .replaceAll(slash + slash + "u", slash + slash + slash + "U00000075")
      .replaceAll(slash + slash + "U", slash + slash + slash + "U00000055"),
  },
  {
    name: "split-concat",
    expression: `CONCAT(${value
      .split(slash)
      .map((part, index) => `${index ? `${JSON.stringify(slash)},` : ""}${JSON.stringify(part)}`)
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
const path = `qualification/evidence/qlever-unicode-escape-letter-candidates-${Date.now()}.json`;
await writeFile(path, JSON.stringify(artifact, null, 2) + "\n");
console.log(JSON.stringify({ path, outcomes }, null, 2));
