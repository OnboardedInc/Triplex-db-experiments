import { writeFile } from "node:fs/promises";
import { makeXtdbClient } from "../../src/XtdbClient.js";
const client = makeXtdbClient(process.env.XTDB_URL ?? "postgres://xtdb:xtdb@127.0.0.1:5442/xtdb");
try {
  const [{ scope_key }] = await client.query<{ scope_key: string }>(
    "SELECT scope_key FROM tx_assertions WHERE value_type = 'integer' AND attribute = ':i' LIMIT 1",
  );
  const candidates = [
    {
      name: "guard-input-before-cast",
      sql: "SELECT CAST(CASE WHEN value_type = 'integer' THEN value_string ELSE NULL END AS DECIMAL(32,0)) AS v FROM tx_assertions WHERE scope_key = ? AND value_type = 'integer'",
    },
    {
      name: "filter-before-cast",
      sql: "SELECT CAST(value_string AS DECIMAL(32,0)) AS v FROM (SELECT value_string FROM tx_assertions WHERE scope_key = ? AND value_type = 'integer') ints",
    },
  ];
  const observations = await Promise.all(
    candidates.map(async ({ name, sql }) => {
      try {
        return { name, passed: true, rows: await client.query(sql, [scope_key]) };
      } catch (error) {
        return { name, passed: false, error: String(error) };
      }
    }),
  );
  const output = new URL(`./integer-casts-${Date.now()}.json`, import.meta.url);
  await writeFile(
    output,
    JSON.stringify({ kind: "parallel-sql-correctness-probe", observations }, null, 2) + "\n",
  );
  console.log(JSON.stringify({ evidence: output.pathname, observations }));
} finally {
  await client.close();
}
