import { writeFile } from "node:fs/promises";
import { makeXtdbClient } from "../../src/XtdbClient.js";

const client = makeXtdbClient(process.env.XTDB_URL ?? "postgres://xtdb:xtdb@127.0.0.1:5442/xtdb");
const source =
  "(SELECT CAST('-9223372036854775808' AS BIGINT) AS v UNION ALL SELECT CAST('9223372036854775807' AS BIGINT) AS v UNION ALL SELECT CAST('9007199254740993' AS BIGINT) AS v) values_";
try {
  const candidates = [
    {
      name: "native-bigint-extrema",
      sql: `SELECT CAST(MIN(v) AS TEXT) AS low, CAST(MAX(v) AS TEXT) AS high FROM ${source}`,
    },
    {
      name: "server-sorted-extrema",
      sql: `SELECT CAST(v AS TEXT) AS high FROM ${source} ORDER BY v DESC LIMIT 1`,
    },
    {
      name: "decimal-extrema-control",
      sql: `SELECT CAST(MAX(CAST(v AS DECIMAL(32,0))) AS TEXT) AS high FROM ${source}`,
    },
  ];
  const observations = await Promise.all(
    candidates.map(async ({ name, sql }) => {
      try {
        return { name, sql, rows: await client.query(sql), processed: true };
      } catch (error) {
        return { name, sql, processed: false, error: String(error) };
      }
    }),
  );
  const output = new URL(`./integer-extrema-${Date.now()}.json`, import.meta.url);
  await writeFile(
    output,
    JSON.stringify({ kind: "parallel-native-capability-probe", observations }, null, 2) + "\n",
  );
  console.log(JSON.stringify({ evidence: output.pathname, observations }));
} finally {
  await client.close();
}
